// Tier Y-6 — voice hands-free navigation.
//
// Pure transcript → cook command. Deterministic intents (step nav, scale,
// repeat) resolve entirely locally — ZERO network, works offline (the
// kitchen-wifi principle; mirrors backend detectCookIntents/planCookTurn
// on the client). Only a genuine question falls through to `freeform`,
// which the caller routes to a grounded coach turn. Empty/garbage → none.

export type VoiceCookCommand =
  | { kind: 'step-nav'; dir: 'next' | 'prev' }
  | { kind: 'repeat' }
  | { kind: 'scale'; factor: number }
  | { kind: 'scale'; servings: number }
  | { kind: 'freeform'; text: string }
  | { kind: 'none' };

const PREV_RE = /\b(go back|back|previous)\b/;
const NEXT_RE = /\b(next|continue|go on)\b/;
const REPEAT_RE = /\b(repeat|say (?:that|it) again|again)\b/;
const FACTORS: Array<{ re: RegExp; factor: number }> = [
  { re: /\bdouble\b/, factor: 2 },
  { re: /\btriple\b/, factor: 3 },
  { re: /\b(halve|half)\b/, factor: 0.5 },
];
const SERVINGS_RE = /\b(\d+)\s+servings?\b/;

export function resolveVoiceCookCommand(transcript: string): VoiceCookCommand {
  if (typeof transcript !== 'string') return { kind: 'none' };
  const raw = transcript.trim();
  if (raw.length === 0) return { kind: 'none' };
  const t = raw.toLowerCase();

  // Order: nav → repeat → scale → freeform. Prev before next so "go back"
  // never reads as a "go on".
  if (PREV_RE.test(t)) return { kind: 'step-nav', dir: 'prev' };
  if (NEXT_RE.test(t)) return { kind: 'step-nav', dir: 'next' };
  if (REPEAT_RE.test(t)) return { kind: 'repeat' };

  for (const { re, factor } of FACTORS) {
    if (re.test(t)) return { kind: 'scale', factor };
  }
  const servings = t.match(SERVINGS_RE);
  if (servings) return { kind: 'scale', servings: Number(servings[1]) };

  return { kind: 'freeform', text: raw };
}
