// backend/src/services/voiceToneClassifier.ts
// Tier U voice-grade pass — Claude Haiku tone classifier.
//
// Implements the `classifyTone` dependency that voiceScorer.scoreVoice
// injects: judges a recipe's title + description against Sazon's canonical
// 1–5 brand-voice scale (.claude/context/guards/brand-voice.md). Haiku is
// the right model — voice judgment is its strength and the call is tiny.
//
// Failures (rate limit, garbage output) reject; scoreVoice catches and
// falls back to heuristics-only, so a classifier outage degrades to a
// conservative score rather than blocking the run.

import { getAnthropicClient } from './coachService';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const TONE_MIN = 1;
const TONE_MAX = 5;

export interface ToneInput {
  title: string;
  description: string;
}

/** Minimal Anthropic seam — just the `messages.create` we depend on. */
export interface MessageCreator {
  messages: {
    create: (args: unknown) => Promise<{
      content: Array<{ type: string; text?: string }>;
    }>;
  };
}

export interface TonePrompt {
  system: string;
  user: string;
}

export function buildTonePrompt(input: ToneInput): TonePrompt {
  const system = [
    "You grade a recipe's writing voice for Sazon — a food app whose voice",
    'is "a witty friend who reads Bon Appétit and texts you screenshots of',
    'recipes." Warm, informed, curious. Never coachy, preachy, or optimizing.',
    '',
    'Grade the title + description on this 1–5 scale:',
    '  5 — reads like Bon Appétit / Ottolenghi: evocative, specific, alive',
    '  4 — sounds like Sazon: friendly, informed, appetizing',
    '  3 — generic but fine: accurate, flat, no personality',
    '  2 — macro-cult / coachy: "fuel", "clean", "guilt-free", gym-bro tone',
    '  1 — "healthy low-cal protein blast": pure diet-app sludge',
    '',
    'Reply with only the integer 1, 2, 3, 4, or 5. No words, no punctuation.',
  ].join('\n');

  const user = [
    `Title: ${input.title}`,
    `Description: ${input.description}`,
    '',
    'Grade (1-5):',
  ].join('\n');

  return { system, user };
}

function clampRound(n: number): number {
  const r = Math.round(n);
  if (r < TONE_MIN) return TONE_MIN;
  if (r > TONE_MAX) return TONE_MAX;
  return r;
}

export function parseToneResponse(raw: string): number {
  const text = raw.trim();
  if (text.length === 0) {
    throw new Error('voiceToneClassifier: empty classifier response');
  }

  // 1. JSON forms — bare number or { grade | score } envelope.
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed === 'number' && Number.isFinite(parsed)) {
      return clampRound(parsed);
    }
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      const v = obj.grade ?? obj.score;
      if (typeof v === 'number' && Number.isFinite(v)) {
        return clampRound(v);
      }
    }
  } catch {
    // Not JSON — fall through to numeric extraction.
  }

  // 2. Last standalone 1–5 in the text. "Last" because any preamble the
  // model adds ("On a scale of 1-5, I'd say 3") puts the answer at the end;
  // \b-bounded single digits ignore years/counts like "1920s".
  const grades = text.match(/\b[1-5]\b/g);
  if (!grades) {
    throw new Error(
      `voiceToneClassifier: no grade in response ${JSON.stringify(raw)}`,
    );
  }
  return clampRound(Number(grades[grades.length - 1]));
}

export async function classifyTone(
  input: ToneInput,
  client?: MessageCreator,
): Promise<number> {
  // Confine the SDK type-widening to one adapter line — the rest of the
  // path stays type-checked rather than blanket `as unknown as`.
  const c: MessageCreator =
    client ?? {
      messages: {
        create: (args) =>
          getAnthropicClient().messages.create(args as never),
      },
    };
  const { system, user } = buildTonePrompt(input);

  const response = await c.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 8,
    temperature: 0,
    system,
    messages: [{ role: 'user', content: user }],
  });

  const block = response.content.find(
    (b): b is { type: string; text: string } =>
      b.type === 'text' && typeof b.text === 'string',
  );
  if (!block) {
    throw new Error('voiceToneClassifier: no text block in classifier response');
  }
  return parseToneResponse(block.text);
}
