// backend/src/services/voiceRewriter.ts
// Tier U voice rewrite pass — Claude Haiku description rewriter.
//
// Rewrites a recipe's description into Sazon's brand voice
// (.claude/context/guards/brand-voice.md) WITHOUT touching the dish:
// no invented ingredients, techniques, or claims — only the prose.
// The runner re-scores the result via voiceScorer and the Tier D8
// rewriteCopy() regression guard, so a flat rewrite is simply refused.
//
// Mirrors voiceToneClassifier's testable shape: pure prompt builder +
// pure parser + a thin network fn with an injected client seam.

import { getAnthropicClient } from './coachService';
import type { MessageCreator } from './voiceToneClassifier';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const MAX_DESCRIPTION_CHARS = 260;

export interface RewriteInput {
  title: string;
  description: string;
  cuisine: string;
}

export interface RewritePrompt {
  system: string;
  user: string;
}

export function buildRewritePrompt(input: RewriteInput): RewritePrompt {
  const system = [
    'You rewrite recipe descriptions for Sazon — a food app whose voice is',
    '"a witty friend who reads Bon Appétit and texts you screenshots of',
    'recipes." Warm, specific, sensory, a little playful. Aim for the voice',
    'of Bon Appétit or Ottolenghi headnotes: evocative, never flat.',
    '',
    'Hard rules:',
    '- Rewrite the DESCRIPTION ONLY. Return just the new description prose.',
    '- Never invent, change, add, or remove ingredients, techniques, times,',
    '  or nutrition. The dish is fixed — only the writing changes.',
    `- Keep it under ${MAX_DESCRIPTION_CHARS} characters. One or two sentences.`,
    '- Banned vocabulary (diet-app / gym-bro register): "macro", "macro-',
    '  friendly", "guilt-free", "low-cal", "protein blast", "clean eating",',
    '  "fuel", "shredded", "skinny". Describe the food, not a diet.',
    '- No clickbait, no ALL CAPS, no emoji, no quotes around the output.',
  ].join('\n');

  const user = [
    `Cuisine: ${input.cuisine}`,
    `Title (do not change): ${input.title}`,
    `Current description: ${input.description}`,
    '',
    'Rewrite the description:',
  ].join('\n');

  return { system, user };
}

function stripFence(s: string): string {
  if (!s.startsWith('```')) return s;
  const withoutOpen = s.replace(/^```[^\n]*\n?/, '');
  return withoutOpen.replace(/\n?```$/, '').trim();
}

function unwrapQuotes(s: string): string {
  const pairs: Array<[string, string]> = [
    ['"', '"'],
    ['“', '”'],
    ["'", "'"],
  ];
  for (const [open, close] of pairs) {
    if (s.length >= 2 && s.startsWith(open) && s.endsWith(close)) {
      return s.slice(1, -1).trim();
    }
  }
  return s;
}

export function parseRewrittenDescription(raw: string): string {
  let s = raw.trim();
  if (s.length === 0) {
    throw new Error('voiceRewriter: empty rewrite response');
  }

  s = stripFence(s);

  // JSON forms — a bare string or a { description } envelope.
  try {
    const parsed: unknown = JSON.parse(s);
    if (typeof parsed === 'string') {
      s = parsed;
    } else if (parsed && typeof parsed === 'object') {
      const v = (parsed as Record<string, unknown>).description;
      if (typeof v === 'string') s = v;
    }
  } catch {
    // Not JSON — continue with text cleanup.
  }

  s = s.replace(/^(?:rewritten\s+)?description\s*:\s*/i, '');
  s = unwrapQuotes(s.trim());
  s = s.trim();

  if (s.length === 0) {
    throw new Error('voiceRewriter: rewrite collapsed to empty after cleanup');
  }
  return s;
}

export async function rewriteDescription(
  input: RewriteInput,
  client?: MessageCreator,
): Promise<string> {
  const c: MessageCreator =
    client ?? {
      messages: {
        create: (args) =>
          getAnthropicClient().messages.create(args as never),
      },
    };
  const { system, user } = buildRewritePrompt(input);

  const response = await c.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 220,
    temperature: 0.7,
    system,
    messages: [{ role: 'user', content: user }],
  });

  const block = response.content.find(
    (b): b is { type: string; text: string } =>
      b.type === 'text' && typeof b.text === 'string',
  );
  if (!block) {
    throw new Error('voiceRewriter: no text block in rewrite response');
  }
  return parseRewrittenDescription(block.text);
}
