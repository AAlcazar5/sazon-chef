// backend/src/services/coachCookWriteback.ts
// W-B1 — Cook Mode in coach chat.
//
// Cooking is not its own screen: it happens inside the existing Sazon chat.
// This service mirrors coachMemoryWriteback's detect→apply shape — a pure
// detector callers can dry-run, plus a side-effecting applier — but the
// side-effect is the Cook Log (CookEvent), so a cook conversation
// *accumulates* the same structured signal a guided cook mode would
// (asteroid: Sazon is the cooking-memory layer; the chat is the surface).
//
// recipeId is optional: a cook described in chat is often not tied to a
// Sazon recipe (the §9a ingest path — recordCookEvent already supports a
// null recipeId).

import { recordCookEvent } from './cookEventService';

export type CookIntent =
  | { kind: 'made_it' }
  | { kind: 'scale'; factor: number }
  | { kind: 'scale'; servings: number }
  | { kind: 'swap'; from: string; to: string }
  | { kind: 'note'; text: string };

const MADE_IT_PATTERNS: RegExp[] = [
  /\bi (?:made|cooked|finished) (?:it|this|that|them|the recipe)\b/i,
  /\bturned out (?:great|well|amazing|delicious|perfect)\b/i,
];

const FACTOR_PATTERNS: Array<{ rx: RegExp; factor: number }> = [
  { rx: /\bdoubled\b/i, factor: 2 },
  { rx: /\btripled\b/i, factor: 3 },
  { rx: /\bhalved\b/i, factor: 0.5 },
];

const SERVINGS_RX = /\bto (\d+) servings?\b/i;

const SWAP_PATTERNS: Array<{ rx: RegExp; order: 'fwd' | 'rev' }> = [
  // "swapped X for|with Y" / "subbed X for|with Y" → from X, to Y
  { rx: /\b(?:swapped|subbed) (.+?) (?:for|with) (.+?)(?:[.,!?]|$)/i, order: 'fwd' },
  // "used Y instead of X" → from Y, to X
  { rx: /\bused (.+?) instead of (.+?)(?:[.,!?]|$)/i, order: 'fwd' },
];

const NOTE_RX = /\bnote:\s*(.+)/i;

export function detectCookIntents(content: unknown): CookIntent[] {
  if (typeof content !== 'string' || content.length === 0) return [];

  const intents: CookIntent[] = [];
  const seen = new Set<string>();
  const push = (intent: CookIntent) => {
    const key = JSON.stringify(intent);
    if (seen.has(key)) return;
    seen.add(key);
    intents.push(intent);
  };

  if (MADE_IT_PATTERNS.some((rx) => rx.test(content))) {
    push({ kind: 'made_it' });
  }

  const factorHit = FACTOR_PATTERNS.find(({ rx }) => rx.test(content));
  if (factorHit) {
    push({ kind: 'scale', factor: factorHit.factor });
  } else {
    const servingsMatch = content.match(SERVINGS_RX);
    if (servingsMatch) {
      push({ kind: 'scale', servings: Number(servingsMatch[1]) });
    }
  }

  for (const { rx } of SWAP_PATTERNS) {
    const m = content.match(rx);
    if (m) {
      push({ kind: 'swap', from: m[1].trim(), to: m[2].trim() });
      break; // one swap per utterance
    }
  }

  const noteMatch = content.match(NOTE_RX);
  if (noteMatch) {
    push({ kind: 'note', text: noteMatch[1].trim() });
  }

  return intents;
}

function payloadFor(intent: CookIntent): {
  type: 'made_it' | 'scale' | 'swap' | 'note';
  payload: Record<string, unknown>;
} {
  const base = { source: 'coach_chat' as const };
  switch (intent.kind) {
    case 'made_it':
      return { type: 'made_it', payload: { ...base } };
    case 'scale':
      return {
        type: 'scale',
        payload:
          'factor' in intent
            ? { ...base, factor: intent.factor }
            : { ...base, servings: intent.servings },
      };
    case 'swap':
      return {
        type: 'swap',
        payload: { ...base, from: intent.from, to: intent.to },
      };
    case 'note':
      return { type: 'note', payload: { ...base, text: intent.text } };
  }
}

/**
 * Append detected cook intents to the acting user's Cook Log.
 *
 * IDOR: every event is written under exactly the `userId` passed in — a
 * chat turn can only ever extend its own author's log. Per-intent failures
 * are swallowed (captured upstream) so one bad write neither aborts the
 * rest nor throws back into the SSE response stream.
 */
export async function applyCookIntents(
  userId: string,
  recipeId: string | null,
  intents: ReadonlyArray<CookIntent>,
): Promise<void> {
  if (!intents || intents.length === 0) return;

  for (const intent of intents) {
    const { type, payload } = payloadFor(intent);
    try {
      await recordCookEvent({ userId, recipeId, type, payload });
    } catch {
      // Stream-safe: never let a Cook Log write break the chat turn.
    }
  }
}
