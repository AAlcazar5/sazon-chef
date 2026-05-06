// backend/src/services/selfImprovement/synthesisService.ts
// Tier M2 — weekly synthesis routine. Reads last 7 days of observations +
// persona + brand-voice + recent decisions + the active synthesis prompt,
// calls Sonnet 4.6 to produce ≤10 ranked proposals, filters anything that
// violates banned vocabulary, writes `.context/proposals/<date>.md`.
//
// Kill switch: SELF_IMPROVEMENT_ENGINE_ENABLED=false short-circuits before
// any tokens are spent. Designed for the cron in ecosystem.config.cjs.

import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger';

export const DEFAULT_SONNET_MODEL = 'claude-sonnet-4-6';
export const MAX_PROPOSALS = 10;

export const BANNED_TERMS = [
  /\bcut\b/i,
  /\bbulk\b/i,
  /\bmacro-friendly\b/i,
  /\bmaintain\b/i,
  /Fast Food Makeovers/i,
  /\bCookbook\b/i,
  /\bguilt-free\b/i,
  /\bskinny\b/i,
  /optimize/i,
];

export interface Proposal {
  id: string;
  slug: string;
  source: string;
  pattern: string;
  proposedChange: string;
  personaFit: number;
  voiceFit: number;
  effort: 'S' | 'M' | 'L';
  impact: 'low' | 'med' | 'high';
  targetMetric: string;
  openQuestion: string;
}

export interface SynthesisInputs {
  observations: string;
  persona: string;
  brandVoice: string;
  deletedFeatures: string;
  recentDecisions: string;
  promptVersion: string;
  prompt: string;
}

export interface SynthesisDeps {
  callLLM?: (prompt: string) => Promise<string>;
  now?: () => Date;
  contextRoot?: string;
  plansRoot?: string;
  outputRoot?: string;
}

export interface SynthesisResult {
  status: 'ok' | 'kill-switch' | 'no-observations' | 'error';
  proposalsWritten: number;
  filteredOut: number;
  outputPath: string | null;
  reason?: string;
}

export function violatesBannedVocab(text: string): boolean {
  return BANNED_TERMS.some((re) => re.test(text));
}

export function validateProposal(p: Partial<Proposal>): p is Proposal {
  return (
    typeof p.id === 'string' &&
    typeof p.slug === 'string' &&
    typeof p.source === 'string' &&
    typeof p.pattern === 'string' &&
    typeof p.proposedChange === 'string' &&
    typeof p.personaFit === 'number' &&
    typeof p.voiceFit === 'number' &&
    typeof p.effort === 'string' &&
    typeof p.impact === 'string' &&
    typeof p.targetMetric === 'string' &&
    typeof p.openQuestion === 'string' &&
    p.personaFit >= 1 &&
    p.personaFit <= 5 &&
    p.voiceFit >= 1 &&
    p.voiceFit <= 5
  );
}

export function parseLLMProposals(raw: string): Proposal[] {
  // Expect a JSON array; tolerate code-fence wrapping.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: Proposal[] = [];
  for (const item of parsed) {
    if (item && typeof item === 'object' && validateProposal(item as Partial<Proposal>)) {
      out.push(item as Proposal);
    }
  }
  return out;
}

export function filterBannedAndCap(proposals: Proposal[]): {
  kept: Proposal[];
  filtered: number;
} {
  const kept: Proposal[] = [];
  let filtered = 0;
  for (const p of proposals) {
    const blob = `${p.pattern} ${p.proposedChange} ${p.openQuestion}`;
    if (violatesBannedVocab(blob)) {
      filtered += 1;
      continue;
    }
    kept.push(p);
    if (kept.length >= MAX_PROPOSALS) break;
  }
  return { kept, filtered };
}

function readIfExists(p: string): string {
  try {
    return fs.readFileSync(p, 'utf-8');
  } catch {
    return '';
  }
}

function readObservationsForWindow(
  contextRoot: string,
  windowDays: number,
  now: Date,
): string {
  const cutoff = now.getTime() - windowDays * 86_400_000;
  const observationsRoot = path.join(contextRoot, 'observations');
  if (!fs.existsSync(observationsRoot)) return '';
  const blocks: string[] = [];
  for (const feed of fs.readdirSync(observationsRoot)) {
    const feedDir = path.join(observationsRoot, feed);
    if (!fs.statSync(feedDir).isDirectory()) continue;
    for (const file of fs.readdirSync(feedDir)) {
      if (!file.endsWith('.md')) continue;
      const fp = path.join(feedDir, file);
      const stat = fs.statSync(fp);
      if (stat.mtimeMs < cutoff) continue;
      blocks.push(`### feed: ${feed} — ${file}\n\n${fs.readFileSync(fp, 'utf-8')}`);
    }
  }
  return blocks.join('\n\n---\n\n');
}

function readRecentDecisions(contextRoot: string, windowDays: number, now: Date): string {
  const cutoff = now.getTime() - windowDays * 86_400_000;
  const decisionsRoot = path.join(contextRoot, 'decisions');
  if (!fs.existsSync(decisionsRoot)) return '';
  const blocks: string[] = [];
  for (const bucket of ['accepted', 'deferred', 'needs-data', 'rejected']) {
    const dir = path.join(decisionsRoot, bucket);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.md')) continue;
      const fp = path.join(dir, file);
      const stat = fs.statSync(fp);
      if (stat.mtimeMs < cutoff) continue;
      blocks.push(`### bucket: ${bucket} — ${file}\n\n${fs.readFileSync(fp, 'utf-8')}`);
    }
  }
  return blocks.join('\n\n---\n\n');
}

export function findActivePromptFile(contextRoot: string): {
  version: string;
  body: string;
} | null {
  const files = fs
    .readdirSync(contextRoot)
    .filter((f) => /^synthesis-prompt-v\d+\.md$/.test(f))
    .sort();
  if (files.length === 0) return null;
  const last = files[files.length - 1];
  const m = last.match(/v(\d+)/);
  return {
    version: m ? `v${m[1]}` : 'v1',
    body: fs.readFileSync(path.join(contextRoot, last), 'utf-8'),
  };
}

export function buildLLMPrompt(inputs: SynthesisInputs): string {
  return [
    inputs.prompt,
    '',
    '---',
    '',
    '# OBSERVATIONS (last 7 days)',
    inputs.observations || '_(none)_',
    '',
    '# PERSONA',
    inputs.persona,
    '',
    '# BRAND VOICE',
    inputs.brandVoice,
    '',
    '# DELETED FEATURES (pre-rejection list)',
    inputs.deletedFeatures,
    '',
    '# RECENT DECISIONS (last 28 days)',
    inputs.recentDecisions || '_(none)_',
    '',
    '---',
    '',
    'Output a JSON array of at most 10 proposal objects. Each object must have:',
    '`id` (e.g. "P-006"), `slug` (kebab-case), `source`, `pattern`, `proposedChange`,',
    '`personaFit` (1-5), `voiceFit` (1-5), `effort` ("S" | "M" | "L"),',
    '`impact` ("low" | "med" | "high"), `targetMetric`, `openQuestion`. JSON only — no prose.',
  ].join('\n');
}

export function renderProposalsMarkdown(
  proposals: Proposal[],
  promptVersion: string,
  now: Date,
): string {
  const dateStr = now.toISOString().slice(0, 10);
  const lines: string[] = [
    `---`,
    `date: ${dateStr}`,
    `synthesis_prompt_version: ${promptVersion}`,
    `proposal_count: ${proposals.length}`,
    `mode: automated`,
    `status: PENDING`,
    `---`,
    ``,
    `# Proposals — Week of ${dateStr}`,
    ``,
  ];
  for (const p of proposals) {
    lines.push(
      `## ${p.id} — ${p.slug}`,
      ``,
      `**Source:** ${p.source}`,
      `**Pattern observed:** ${p.pattern}`,
      `**Proposed change:** ${p.proposedChange}`,
      `**Persona fit (1–5):** ${p.personaFit}`,
      `**Voice fit (1–5):** ${p.voiceFit}`,
      `**Estimated effort:** ${p.effort}`,
      `**Expected impact:** ${p.impact} — target metric \`${p.targetMetric}\``,
      `**Open question:** ${p.openQuestion}`,
      ``,
      `---`,
      ``,
    );
  }
  return lines.join('\n');
}

export async function runWeeklySynthesis(
  deps: SynthesisDeps = {},
): Promise<SynthesisResult> {
  if (process.env.SELF_IMPROVEMENT_ENGINE_ENABLED === 'false') {
    logger.info('selfImprovement.synthesis.killSwitchOn');
    return {
      status: 'kill-switch',
      proposalsWritten: 0,
      filteredOut: 0,
      outputPath: null,
      reason: 'SELF_IMPROVEMENT_ENGINE_ENABLED=false',
    };
  }

  const now = deps.now ? deps.now() : new Date();
  const contextRoot =
    deps.contextRoot ?? path.resolve(process.cwd(), '../.context');
  const plansRoot =
    deps.plansRoot ?? path.resolve(process.cwd(), '../plans');
  const outputRoot =
    deps.outputRoot ?? path.resolve(contextRoot, 'proposals');

  const observations = readObservationsForWindow(contextRoot, 7, now);
  if (!observations.trim()) {
    return {
      status: 'no-observations',
      proposalsWritten: 0,
      filteredOut: 0,
      outputPath: null,
      reason: 'No observation files in the last 7 days',
    };
  }

  const promptInfo = findActivePromptFile(contextRoot);
  if (!promptInfo) {
    return {
      status: 'error',
      proposalsWritten: 0,
      filteredOut: 0,
      outputPath: null,
      reason: 'No synthesis-prompt-vN.md file found',
    };
  }

  const persona = readIfExists(path.join(plansRoot, 'persona.md'));
  const brandVoice = readIfExists(path.join(plansRoot, 'brand-voice.md'));
  const deletedFeatures = readIfExists(path.join(plansRoot, 'DELETED_FEATURES.md'));
  const recentDecisions = readRecentDecisions(contextRoot, 28, now);

  const prompt = buildLLMPrompt({
    observations,
    persona,
    brandVoice,
    deletedFeatures,
    recentDecisions,
    promptVersion: promptInfo.version,
    prompt: promptInfo.body,
  });

  const callLLM = deps.callLLM;
  if (!callLLM) {
    return {
      status: 'error',
      proposalsWritten: 0,
      filteredOut: 0,
      outputPath: null,
      reason: 'No LLM transport configured',
    };
  }

  let raw: string;
  try {
    raw = await callLLM(prompt);
  } catch (err) {
    logger.error({ err }, 'selfImprovement.synthesis.llmFailed');
    return {
      status: 'error',
      proposalsWritten: 0,
      filteredOut: 0,
      outputPath: null,
      reason: 'LLM call failed',
    };
  }

  const parsed = parseLLMProposals(raw);
  const { kept, filtered } = filterBannedAndCap(parsed);

  fs.mkdirSync(outputRoot, { recursive: true });
  const outputPath = path.join(outputRoot, `${now.toISOString().slice(0, 10)}.md`);
  fs.writeFileSync(
    outputPath,
    renderProposalsMarkdown(kept, promptInfo.version, now),
    'utf-8',
  );

  return {
    status: 'ok',
    proposalsWritten: kept.length,
    filteredOut: filtered,
    outputPath,
  };
}
