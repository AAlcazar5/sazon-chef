// backend/src/services/selfImprovement/selfAuditService.ts
// Tier M6 — quarterly self-audit. Reads `.context/learnings/proposals-
// outcomes.md` + the current `synthesis-prompt-vN.md`, calls Opus to draft
// a v(N+1) candidate that re-weights based on what won/lost. Writes the
// draft as `.context/synthesis-prompt-v(N+1)-candidate.md` — never
// overwrites the active vN. Manual rename gate: a human drops the
// `-candidate` suffix to promote.
//
// Refuses to run if the ledger has fewer than MIN_MEASURED_PROPOSALS rows
// (8 by default — below that, the training signal is too sparse for Opus
// to weight reliably).
//
// Kill switch: SELF_IMPROVEMENT_ENGINE_ENABLED=false short-circuits.

import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger';

export const DEFAULT_OPUS_MODEL = 'claude-opus-4-7';
export const MIN_MEASURED_PROPOSALS = 8;
export const PROMPT_FILE_RE = /^synthesis-prompt-v(\d+)\.md$/;

export interface SelfAuditDeps {
  callLLM?: (prompt: string) => Promise<string>;
  now?: () => Date;
  contextRoot?: string;
}

export interface SelfAuditResult {
  status:
    | 'ok'
    | 'kill-switch'
    | 'insufficient-signal'
    | 'no-active-prompt'
    | 'error';
  candidatePath: string | null;
  activeVersion: number | null;
  candidateVersion: number | null;
  measuredProposals: number;
  reason?: string;
}

/**
 * Count tagged outcome rows in the proposals-outcomes ledger.
 *
 * The ledger header documents the schema as a markdown table (rows starting
 * with `| 20YY-`), so we count those. Comments + section headers are skipped.
 */
export function countMeasuredProposals(ledger: string): number {
  const lines = ledger.split('\n');
  let count = 0;
  for (const line of lines) {
    // A measured row starts with `| 20XX-` (the date column).
    if (/^\|\s*20\d{2}-\d{2}-\d{2}\s*\|/.test(line)) count += 1;
  }
  return count;
}

/**
 * Find the highest-numbered active synthesis prompt in `contextRoot`.
 * Returns null if none exists. Candidate suffixes (`-candidate.md`) are
 * ignored — only promoted versions count.
 */
export function findActivePromptVersion(contextRoot: string): {
  version: number;
  path: string;
} | null {
  if (!fs.existsSync(contextRoot)) return null;
  let best: { version: number; path: string } | null = null;
  for (const file of fs.readdirSync(contextRoot)) {
    const match = file.match(PROMPT_FILE_RE);
    if (!match) continue;
    const version = parseInt(match[1], 10);
    if (!Number.isFinite(version)) continue;
    if (!best || version > best.version) {
      best = { version, path: path.join(contextRoot, file) };
    }
  }
  return best;
}

/** Build the prompt sent to Opus. */
export function buildAuditPrompt(args: {
  ledger: string;
  activePrompt: string;
  activeVersion: number;
}): string {
  return [
    `You are auditing the recursive self-improvement engine for the Sazon Chef app.`,
    `Your job: read the proposals-outcomes ledger and the current synthesis prompt`,
    `(version ${args.activeVersion}), then draft v${args.activeVersion + 1} of the`,
    `synthesis prompt with explicit rationale.`,
    ``,
    `## Proposals-outcomes ledger`,
    args.ledger,
    ``,
    `## Active synthesis prompt (v${args.activeVersion})`,
    args.activePrompt,
    ``,
    `## Output format (markdown)`,
    `Return a complete markdown document that begins with a frontmatter block:`,
    ``,
    `---`,
    `version: ${args.activeVersion + 1}`,
    `drafted: <ISO date>`,
    `status: candidate`,
    `---`,
    ``,
    `# Synthesis Prompt v${args.activeVersion + 1} — candidate`,
    ``,
    `## Rationale`,
    ``,
    `What patterns won, what to weight differently, what to pre-reject. 4–8 bullets.`,
    ``,
    `## Prompt`,
    ``,
    `The full new prompt body, ready to drop into the synthesis routine.`,
  ].join('\n');
}

/** Render a fallback candidate when no LLM is configured (test mode). */
export function renderFallbackCandidate(args: {
  activeVersion: number;
  activePrompt: string;
  measuredProposals: number;
  now: Date;
}): string {
  return [
    `---`,
    `version: ${args.activeVersion + 1}`,
    `drafted: ${args.now.toISOString().slice(0, 10)}`,
    `status: candidate`,
    `source: fallback (no LLM configured)`,
    `---`,
    ``,
    `# Synthesis Prompt v${args.activeVersion + 1} — candidate (fallback)`,
    ``,
    `## Rationale`,
    ``,
    `- ${args.measuredProposals} measured proposals informed this draft.`,
    `- Fallback path fired because no LLM was configured. Re-run M6 with`,
    `  ANTHROPIC_API_KEY set and SELF_IMPROVEMENT_ENGINE_ENABLED unset to`,
    `  produce an Opus-drafted v${args.activeVersion + 1}.`,
    `- The active v${args.activeVersion} prompt is preserved verbatim below as`,
    `  the candidate body so promotion is a no-op until a real audit runs.`,
    ``,
    `## Prompt`,
    ``,
    args.activePrompt,
  ].join('\n');
}

export async function runSelfAudit(deps: SelfAuditDeps = {}): Promise<SelfAuditResult> {
  if (process.env.SELF_IMPROVEMENT_ENGINE_ENABLED === 'false') {
    return {
      status: 'kill-switch',
      candidatePath: null,
      activeVersion: null,
      candidateVersion: null,
      measuredProposals: 0,
      reason: 'kill-switch',
    };
  }

  const now = deps.now ? deps.now() : new Date();
  const contextRoot =
    deps.contextRoot ?? path.resolve(process.cwd(), '../.context');
  const ledgerPath = path.join(contextRoot, 'learnings', 'proposals-outcomes.md');

  // 1. Insufficient-signal gate.
  const ledger = fs.existsSync(ledgerPath)
    ? fs.readFileSync(ledgerPath, 'utf-8')
    : '';
  const measured = countMeasuredProposals(ledger);
  if (measured < MIN_MEASURED_PROPOSALS) {
    return {
      status: 'insufficient-signal',
      candidatePath: null,
      activeVersion: null,
      candidateVersion: null,
      measuredProposals: measured,
      reason: `ledger has ${measured} measured proposals; need ≥ ${MIN_MEASURED_PROPOSALS}`,
    };
  }

  // 2. Find the active prompt.
  const active = findActivePromptVersion(contextRoot);
  if (!active) {
    return {
      status: 'no-active-prompt',
      candidatePath: null,
      activeVersion: null,
      candidateVersion: null,
      measuredProposals: measured,
      reason: 'no synthesis-prompt-vN.md in context root',
    };
  }
  const activePrompt = fs.readFileSync(active.path, 'utf-8');
  const candidateVersion = active.version + 1;
  const candidatePath = path.join(
    contextRoot,
    `synthesis-prompt-v${candidateVersion}-candidate.md`,
  );

  // 3. Draft the candidate. LLM if available, fallback otherwise.
  let candidateBody: string;
  if (deps.callLLM) {
    try {
      const prompt = buildAuditPrompt({
        ledger,
        activePrompt,
        activeVersion: active.version,
      });
      candidateBody = await deps.callLLM(prompt);
    } catch (err) {
      logger.warn({ err }, 'selfAudit.llmError');
      return {
        status: 'error',
        candidatePath: null,
        activeVersion: active.version,
        candidateVersion,
        measuredProposals: measured,
        reason: 'llm-call-failed',
      };
    }
  } else {
    candidateBody = renderFallbackCandidate({
      activeVersion: active.version,
      activePrompt,
      measuredProposals: measured,
      now,
    });
  }

  // 4. Write the candidate. NEVER overwrite the active vN.
  fs.writeFileSync(candidatePath, candidateBody, 'utf-8');

  return {
    status: 'ok',
    candidatePath,
    activeVersion: active.version,
    candidateVersion,
    measuredProposals: measured,
  };
}
