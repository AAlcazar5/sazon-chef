// backend/src/services/voiceScorer.ts
// ROADMAP 4.0 Tier D2.4 — Title + voice scorer.
//
// Combines cheap heuristics (title length, all-caps, clickbait phrases,
// banned-vocabulary lint per CLAUDE.md) with a Claude-based tone
// classifier (1-5) judging fit against Sazon's lifestyle voice.
// Tone classifier is the primary signal; heuristic penalties stack.

import type { FailureReason } from './recipeQualityScoreService';

const TITLE_MAX_CHARS = 60;
const TONE_MIN = 1;
const TONE_MAX = 5;
const HEURISTIC_FALLBACK_SCORE = 3;

export const CLICKBAIT_PATTERNS: RegExp[] = [
  /\bbest ever\b/i,
  /\beasy \d+[- ]ingredient\b/i,
  /you won['’]t believe/i,
  /\bmind[- ]?blowing\b/i,
  /\blife[- ]?changing\b/i,
  /\bgame[- ]?changer\b/i,
  /\b\d+ secrets\b/i,
  /\bbeat the\b.*\bdiet\b/i,
];

// Bodybuilder / macro-cult vocabulary banned per CLAUDE.md persona.md.
export const BANNED_VOCABULARY: string[] = [
  'cut',
  'bulk',
  'maintain',
  'crush',
  'shred',
  'shredded',
  'shredding',
  'gains',
  'macro-friendly',
  'guilt-free',
  'limited time',
];

export interface VoiceHeuristicsInput {
  title: string;
  description: string;
  toneScore: number | null;
}

export interface VoiceScoreResult {
  score: number;
  reasons: FailureReason[];
}

function isAllCaps(s: string): boolean {
  if (s.length < 8) return false;
  const letters = s.replace(/[^A-Za-z]/g, '');
  if (letters.length === 0) return false;
  return letters === letters.toUpperCase();
}

function findBannedWord(text: string): string | null {
  // Word-boundary regex for each banned phrase. Multi-word phrases match as a
  // single token; single words use \b boundaries to avoid matching substrings.
  const lower = text.toLowerCase();
  for (const phrase of BANNED_VOCABULARY) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`);
    if (re.test(lower)) return phrase;
  }
  return null;
}

export function scoreVoiceHeuristics(
  input: VoiceHeuristicsInput,
): VoiceScoreResult {
  const reasons: FailureReason[] = [];

  if (input.toneScore !== null) {
    if (input.toneScore < TONE_MIN || input.toneScore > TONE_MAX) {
      throw new Error(
        `voiceScorer: toneScore ${input.toneScore} out of range [${TONE_MIN}, ${TONE_MAX}]`,
      );
    }
  }

  if (input.title.length > TITLE_MAX_CHARS) {
    reasons.push({
      axis: 'voice',
      code: 'title_too_long',
      detail: `${input.title.length} chars`,
    });
  }

  if (isAllCaps(input.title)) {
    reasons.push({ axis: 'voice', code: 'title_all_caps' });
  }

  for (const pattern of CLICKBAIT_PATTERNS) {
    if (pattern.test(input.title)) {
      reasons.push({
        axis: 'voice',
        code: 'clickbait_title',
        detail: pattern.source,
      });
      break;
    }
  }

  const banned = findBannedWord(`${input.title} ${input.description}`);
  if (banned) {
    reasons.push({
      axis: 'voice',
      code: 'banned_vocabulary',
      detail: banned,
    });
  }

  const base = input.toneScore ?? HEURISTIC_FALLBACK_SCORE;
  const score = Math.max(0, base - reasons.length);
  return { score, reasons };
}

export interface ScoreVoiceDeps {
  classifyTone: (input: { title: string; description: string }) => Promise<number>;
}

export async function scoreVoice(
  input: { title: string; description: string },
  deps: ScoreVoiceDeps,
): Promise<VoiceScoreResult> {
  let toneScore: number | null = null;
  try {
    toneScore = await deps.classifyTone(input);
  } catch {
    // Classifier failure → heuristics-only.
  }
  return scoreVoiceHeuristics({
    title: input.title,
    description: input.description,
    toneScore,
  });
}
