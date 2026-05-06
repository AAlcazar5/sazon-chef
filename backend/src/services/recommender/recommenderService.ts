// ROADMAP 4.0 TB2.1 — LLM-as-ranker (cold-start policy).
//
// Single-shot Claude Haiku call: structured user context + top-50
// retrieval candidates → { recipeId, confidence, reason, runnerUpIds }.
// Strict guardrails: invalid JSON / API throw / unknown recipeId all
// fall back to the retrieval-cosine top-1; confidence below threshold
// returns null so the caller can show graceful UX.

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../utils/logger';

export interface UserContext {
  tasteSummary: string;
  lastCooks: string[];
  dietary: string[];
  pantrySummary: string;
  timeOfDay: string;
  dayOfWeek: string;
  daysSinceCook: number;
  expiringItems: string[];
}

export interface RankCandidate {
  id: string;
  title: string;
  cuisine: string;
  cookTime: number;
  retrievalScore: number;
}

export interface RankInput {
  userContext: UserContext;
  candidates: RankCandidate[];
  callLLM?: (prompt: string) => Promise<string>;
  confidenceThreshold?: number;
  model?: string;
}

export interface RankResult {
  recipeId: string;
  confidence: number;
  reason: string;
  runnerUpIds: string[];
  source: 'llm' | 'retrieval_fallback';
}

const REASON_MAX = 120;
const DEFAULT_THRESHOLD = 0.5;
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

export function buildPrompt(input: RankInput): string {
  const ctx = input.userContext;
  const candidateLines = input.candidates
    .map(
      (c) =>
        `- ${c.id}: "${c.title}" (${c.cuisine}, ${c.cookTime}m, retrieval=${c.retrievalScore.toFixed(2)})`,
    )
    .join('\n');
  const dietary = ctx.dietary.length > 0 ? ctx.dietary.join(', ') : 'none';
  const expiring =
    ctx.expiringItems.length > 0 ? ctx.expiringItems.join(', ') : 'none';
  return [
    'You are picking ONE recipe from a candidate list for a user who is about to cook tonight.',
    '',
    `User taste: ${ctx.tasteSummary}`,
    `Last cooks: ${ctx.lastCooks.join(' | ') || 'none'}`,
    `Dietary: ${dietary}`,
    `Pantry: ${ctx.pantrySummary}`,
    `Expiring: ${expiring}`,
    `Context: ${ctx.dayOfWeek} ${ctx.timeOfDay}, ${ctx.daysSinceCook}d since last cook`,
    '',
    'Candidates:',
    candidateLines,
    '',
    'Output STRICTLY this JSON shape and nothing else:',
    '{',
    '  "recipeId": string,',
    '  "confidence": number 0..1,',
    '  "selfRating": integer 1..5,',
    '  "reason": string ≤120 chars (warm, lifestyle voice; never bodybuilder/macro-cult),',
    '  "runnerUpIds": string[3]',
    '}',
  ].join('\n');
}

function fallbackTop1(candidates: RankCandidate[]): RankResult | null {
  if (candidates.length === 0) return null;
  const top = [...candidates].sort(
    (a, b) => b.retrievalScore - a.retrievalScore,
  )[0];
  return {
    recipeId: top.id,
    confidence: 0.5,
    reason: 'Best match from your recent cooking pattern.',
    runnerUpIds: [],
    source: 'retrieval_fallback',
  };
}

function parseLLMResponse(
  raw: string,
  candidateIds: Set<string>,
): {
  recipeId: string;
  confidence: number;
  reason: string;
  runnerUpIds: string[];
} | null {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Try to extract a JSON object substring (LLMs sometimes wrap in prose).
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object') return null;
  if (typeof parsed.recipeId !== 'string') return null;
  if (!candidateIds.has(parsed.recipeId)) return null;

  let confidence: number | null = null;
  if (typeof parsed.confidence === 'number') {
    confidence = parsed.confidence;
  } else if (typeof parsed.selfRating === 'number') {
    const sr = Math.max(1, Math.min(5, parsed.selfRating));
    confidence = sr / 5;
  }
  if (confidence == null || !Number.isFinite(confidence)) return null;
  confidence = Math.max(0, Math.min(1, confidence));

  let reason =
    typeof parsed.reason === 'string' ? parsed.reason.trim() : 'Top pick.';
  if (reason.length > REASON_MAX) reason = reason.slice(0, REASON_MAX - 1) + '…';

  let runnerUpIds: string[] = [];
  if (Array.isArray(parsed.runnerUpIds)) {
    runnerUpIds = parsed.runnerUpIds
      .filter((s: unknown): s is string => typeof s === 'string')
      .filter((s: string) => candidateIds.has(s));
  }

  return { recipeId: parsed.recipeId, confidence, reason, runnerUpIds };
}

async function defaultCallLLM(prompt: string, model: string): Promise<string> {
  const client = getClient();
  if (!client) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  const message = await client.messages.create({
    model,
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = message.content?.[0];
  if (!block || block.type !== 'text') {
    throw new Error('Empty LLM response');
  }
  return block.text;
}

export async function rankWithLLM(
  input: RankInput,
): Promise<RankResult | null> {
  if (input.candidates.length === 0) return null;
  const threshold = input.confidenceThreshold ?? DEFAULT_THRESHOLD;
  const model = input.model ?? DEFAULT_MODEL;
  const callLLM =
    input.callLLM ?? ((prompt: string) => defaultCallLLM(prompt, model));

  let raw: string;
  try {
    raw = await callLLM(buildPrompt(input));
  } catch (err) {
    logger.warn({ err }, 'TB2 rankWithLLM API failure, falling back');
    return fallbackTop1(input.candidates);
  }

  const candidateIds = new Set(input.candidates.map((c) => c.id));
  const parsed = parseLLMResponse(raw, candidateIds);
  if (!parsed) return fallbackTop1(input.candidates);

  if (parsed.confidence < threshold) {
    return null;
  }

  return { ...parsed, source: 'llm' };
}
