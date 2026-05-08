// Group 10Y Phase 6: Coach memory service.
//
// Extracts long-term memories from a recent transcript using a small Sonnet
// call, dedupes them against the user's existing memories with a deterministic
// token-cosine similarity (cheap stand-in for real embeddings), and exposes a
// top-K reader for system-prompt injection.
//
// TODO Phase 7+: replace token-cosine with real text embeddings (OpenAI, Voyage,
// or a local model) for higher-quality dedupe and clustering.
// TODO Phase 7+: migrate `enqueueExtraction` from `setImmediate` to a proper
// queue (BullMQ / pg-boss) once the worker process is stood up.

import { z } from 'zod';
import type Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { COACH_MODELS, getAnthropicClient } from './coachService';

export type MemoryKind = 'preference' | 'goal' | 'constraint' | 'milestone';

const MEMORY_KINDS: ReadonlySet<MemoryKind> = new Set([
  'preference',
  'goal',
  'constraint',
  'milestone',
]);

const memorySchema = z.object({
  kind: z.enum(['preference', 'goal', 'constraint', 'milestone']),
  content: z.string().min(2).max(280),
  confidence: z.number().min(0).max(1),
});

const responseSchema = z.object({
  memories: z.array(memorySchema).max(8),
});

export type NewMemory = z.infer<typeof memorySchema>;

export interface StoredMemory {
  id: string;
  userId: string;
  kind: string;
  content: string;
  confidence: number;
  sourceConversationId: string | null;
  sourceMessageId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const EXTRACTION_SYSTEM_PROMPT = `You are an information extractor. Read the recent chat between Sazon and the user, and pull out durable, long-term FACTS about the user that should persist across sessions.

Only return memories of these four kinds:
- "preference": durable taste / cuisine / texture / format preferences ("loves spicy food", "prefers one-pan dinners")
- "goal": durable nutrition / fitness / lifestyle goals ("cutting for summer", "training for marathon in October")
- "constraint": allergens, dietary rules, equipment limits, time limits ("no dairy", "no oven", "weekday cooks must be < 25 min")
- "milestone": meaningful achievements or status changes ("hit 10 lb loss", "ran first 5k")

Rules:
- Skip transient facts ("I'm hungry today"). Skip recipe-specific feedback. Skip anything already implied by allergens/dietary profile.
- Each content string is 2-280 chars, lowercase, no quotes.
- Confidence reflects how clearly the user stated it (0.5 = inferred, 0.95 = explicit).
- Return AT MOST 5 memories per call. Return [] if nothing durable surfaced.

Return ONLY raw JSON with this exact shape — no markdown, no commentary, no code fences:
{ "memories": [{ "kind": "preference"|"goal"|"constraint"|"milestone", "content": "string", "confidence": 0.0-1.0 }] }`;

const EXTRACTION_MAX_TOKENS = 600;

interface ExtractInput {
  userId: string;
  conversationId: string;
  recentTurns: Array<{ role: 'user' | 'assistant'; content: string }>;
  anthropic?: Anthropic;
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function extractText(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') return '';
  return block.text.trim();
}

export async function extractMemories(input: ExtractInput): Promise<NewMemory[]> {
  let client: Anthropic;
  if (input.anthropic) {
    client = input.anthropic;
  } else {
    try {
      client = getAnthropicClient();
    } catch {
      return [];
    }
  }

  const transcript = input.recentTurns
    .map((t) => `${t.role.toUpperCase()}: ${t.content}`)
    .join('\n\n');

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: COACH_MODELS.free,
      max_tokens: EXTRACTION_MAX_TOKENS,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `<transcript>\n${transcript}\n</transcript>\n\nReturn JSON only.`,
        },
      ],
    });
  } catch {
    return [];
  }

  const text = extractText(response);
  if (!text) return [];
  const parsed = tryParseJson(text);
  if (!parsed) return [];
  const result = responseSchema.safeParse(parsed);
  if (!result.success) return [];
  return result.data.memories;
}

const TOKEN_RE = /[a-z0-9]+/g;

function tokenize(s: string): string[] {
  return (s.toLowerCase().match(TOKEN_RE) ?? []).filter((t) => t.length > 1);
}

function cosineSimilarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const counts = (xs: string[]): Map<string, number> => {
    const m = new Map<string, number>();
    for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
    return m;
  };
  const ca = counts(ta);
  const cb = counts(tb);
  let dot = 0;
  for (const [k, v] of ca) {
    const w = cb.get(k);
    if (w) dot += v * w;
  }
  let na = 0;
  for (const v of ca.values()) na += v * v;
  let nb = 0;
  for (const v of cb.values()) nb += v * v;
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

const DUPLICATE_THRESHOLD = 0.82;
const EXISTING_LOOKUP_LIMIT = 200;

interface DedupeInput {
  userId: string;
  candidates: NewMemory[];
  sourceConversationId?: string;
  sourceMessageId?: string;
}

export interface DedupeResult {
  created: StoredMemory[];
  merged: StoredMemory[];
}

export async function dedupeAgainstExisting(
  input: DedupeInput,
): Promise<DedupeResult> {
  const existing = (await prisma.coachMemory.findMany({
    where: { userId: input.userId },
    orderBy: { updatedAt: 'desc' },
    take: EXISTING_LOOKUP_LIMIT,
  })) as StoredMemory[];

  const created: StoredMemory[] = [];
  const merged: StoredMemory[] = [];

  for (const cand of input.candidates) {
    const match = existing.find(
      (e) => e.kind === cand.kind && cosineSimilarity(e.content, cand.content) >= DUPLICATE_THRESHOLD,
    );
    if (match) {
      const bump = Math.min(0.1, 1 - match.confidence);
      const updated = (await prisma.coachMemory.update({
        where: { id: match.id },
        data: { confidence: Math.min(1, match.confidence + bump) },
      })) as StoredMemory;
      merged.push(updated);
      continue;
    }
    const row = (await prisma.coachMemory.create({
      data: {
        userId: input.userId,
        kind: cand.kind,
        content: cand.content,
        confidence: cand.confidence,
        sourceConversationId: input.sourceConversationId ?? null,
        sourceMessageId: input.sourceMessageId ?? null,
      },
    })) as StoredMemory;
    created.push(row);
  }

  return { created, merged };
}

const RECENCY_HALF_LIFE_DAYS = 30;

function recencyWeight(updatedAt: Date, now: Date): number {
  const ageDays = Math.max(0, (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
  return Math.exp(-ageDays / RECENCY_HALF_LIFE_DAYS);
}

export async function topMemoriesForUser(
  userId: string,
  k = 20,
): Promise<StoredMemory[]> {
  const rows = (await prisma.coachMemory.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: EXISTING_LOOKUP_LIMIT,
  })) as StoredMemory[];

  const now = new Date();
  const scored = rows.map((r) => ({
    row: r,
    score: recencyWeight(r.updatedAt, now) * r.confidence,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((s) => s.row);
}

export function enqueueExtraction(
  userId: string,
  conversationId: string,
  recentTurns: Array<{ role: 'user' | 'assistant'; content: string }>,
): void {
  // Fire-and-forget. TODO Phase 7+: move to a real queue.
  setImmediate(async () => {
    try {
      const candidates = await extractMemories({
        userId,
        conversationId,
        recentTurns,
      });
      if (candidates.length === 0) return;
      await dedupeAgainstExisting({
        userId,
        candidates,
        sourceConversationId: conversationId,
      });
    } catch {
      // never throw out of fire-and-forget
    }
  });
}

// Bonus: certain memory kinds should bump UserPreferences fields. Conservative
// keyword matcher — only obvious phrases trigger a write.
interface MaybeUpdatePrefsInput {
  userId: string;
  memories: NewMemory[];
}

const GOAL_PHRASE_MAP: ReadonlyArray<{ test: RegExp; goal: string }> = [
  { test: /\b(cut|cutting|lose weight|losing weight|fat loss)\b/i, goal: 'lose_weight' },
  { test: /\b(bulk|bulking|gain muscle|build muscle)\b/i, goal: 'gain_muscle' },
  { test: /\b(maintain|maintenance)\b/i, goal: 'maintain' },
  { test: /\b(recomp|recomposition)\b/i, goal: 'recomp' },
];

export async function maybeUpdateUserPreferences(
  input: MaybeUpdatePrefsInput,
): Promise<void> {
  const goalMem = input.memories.find((m) => m.kind === 'goal');
  if (!goalMem) return;
  const match = GOAL_PHRASE_MAP.find((g) => g.test.test(goalMem.content));
  if (!match) return;
  const physical = await prisma.userPhysicalProfile.findUnique({
    where: { userId: input.userId },
  });
  if (!physical) return;
  if (physical.fitnessGoal === match.goal) return;
  await prisma.userPhysicalProfile.update({
    where: { userId: input.userId },
    data: { fitnessGoal: match.goal },
  });
}

// Re-export kinds set for other modules that want to validate.
export { MEMORY_KINDS };
