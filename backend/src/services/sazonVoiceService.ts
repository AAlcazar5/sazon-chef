// ROADMAP 4.0 N3.1 + N3.2 — Central rationale + copy generator.
//
// Every rationale builder (HX0.2 hero, WK8.1 plan, IG10.1 pantry, FX3.2
// filter, RD6.1 insight) calls one service. The service enforces C11 voice
// rules at the API level: bans verdict tone, requires lifestyle anchors,
// caps prose length per surface kind. Builders pass *structured signals*;
// the service returns *enforced copy*.
//
// Cross-tier dovetail (N11.3): voice enforcement uses the canonical
// banned-vocabulary corpus. Both layers share the same rules.

import {
  assertLifestyleVoice,
  findVoiceViolation,
  type AssertLifestyleVoiceOptions,
} from './voice/bannedVocabularyCorpus';

export type SurfaceKind = 'chip' | 'ribbon' | 'sheet' | 'inline' | 'card';

/** Per-surface length caps (chars). Keep prose tight. */
const LENGTH_CAPS: Record<SurfaceKind, number> = {
  chip: 24,
  ribbon: 60,
  inline: 90,
  card: 140,
  sheet: 220,
};

const BANNED = [
  /\byou\s+should\b/i,
  /\bdeficient\b/i,
  /\blow\s+in\b/i,
  /\byou\s+need\b/i,
  /\bfailing\b/i,
  /\byou'?re\s+(under|over|behind|missing)\b/i,
  /\bexpiring\s+soon\b/i,
  /\bwaste\b/i,
  /\bthrowing\s+(out|away)\b/i,
  /\bspoil(ed|ing)?\b/i,
];

/** Strip banned tokens, collapse whitespace, hard-cap length with ellipsis. */
function clean(prose: string, surface: SurfaceKind): string {
  let out = prose;
  for (const re of BANNED) out = out.replace(re, '');
  out = out.replace(/\s+/g, ' ').trim();
  const cap = LENGTH_CAPS[surface];
  return out.length > cap ? out.slice(0, cap - 1).trim() + '…' : out;
}

export interface ComposeResult {
  /** Cleaned + length-capped prose ready to render. */
  line: string;
  /** True iff `clean()` truncated the input. */
  truncated: boolean;
  /** True iff `clean()` stripped a banned token. */
  scrubbed: boolean;
}

export interface ComposeOptions {
  /** Surface kind drives length cap + voice tightness. */
  surface: SurfaceKind;
}

/**
 * Run a candidate prose string through the voice contract. Returns the
 * cleaned line + flags noting whether it was truncated or scrubbed.
 *
 * Use this when you have *prose* and want it normalized. For *signals →
 * prose* generation, use the convenience builders below.
 */
export function compose(prose: string, options: ComposeOptions): ComposeResult {
  const before = prose;
  const cleaned = clean(prose, options.surface);
  return {
    line: cleaned,
    truncated: cleaned.endsWith('…') && before.length > LENGTH_CAPS[options.surface],
    scrubbed: cleaned.length !== before.replace(/\s+/g, ' ').trim().length,
  };
}

/**
 * Throws if `prose` violates the voice contract. Used by tests and runtime
 * validation. Delegates to N11.3's `assertLifestyleVoice` for the banned
 * token detection.
 */
export function assertVoice(
  prose: string,
  options: AssertLifestyleVoiceOptions = {},
): void {
  assertLifestyleVoice(prose, options);
}

export const __helpers = { findVoiceViolation };

// ── Convenience signal-to-prose builders ────────────────────────────────────
// Surface tiers call these instead of inlining their own template strings.

export interface ExpiringPromptInput {
  ingredientName: string;
  source: 'pantry' | 'leftover' | 'meal-prep';
}

/**
 * "Your X wants to be in something tonight." Lifestyle voice for the four
 * inventory surfaces (IG4.3, RD4.2, WK1.2, WK2.2). Never expiry-shame.
 */
export function expiringPrompt(input: ExpiringPromptInput): string {
  const name = input.ingredientName.trim();
  const variants: Record<ExpiringPromptInput['source'], string> = {
    leftover: `Your ${name} wants to be in something tonight.`,
    'meal-prep': `${name} from this week — a quick reheat?`,
    pantry: `${name}'s been quiet — fancy putting it to work?`,
  };
  return compose(variants[input.source], { surface: 'card' }).line;
}

export interface DiscoveryInsightInput {
  rule: 'first_with_ingredient' | 'micro_standout' | 'cuisine_cadence';
  ingredient?: string;
  cuisine?: string;
  micronutrient?: string;
  cadenceText?: string;
}

/**
 * RD6.1 discovery insight prose. Caller passes the structured rule + signals
 * collected from CookingLog; service formats. Returns null if signals don't
 * match the rule.
 */
export function discoveryInsight(input: DiscoveryInsightInput): string | null {
  switch (input.rule) {
    case 'first_with_ingredient':
      if (!input.ingredient) return null;
      return compose(`First time you'd cook with ${input.ingredient}.`, {
        surface: 'inline',
      }).line;
    case 'micro_standout':
      if (!input.micronutrient || !input.cuisine) return null;
      return compose(
        `High in ${input.micronutrient} compared to your usual ${input.cuisine}.`,
        { surface: 'inline' },
      ).line;
    case 'cuisine_cadence':
      if (!input.cuisine || !input.cadenceText) return null;
      return compose(`First ${input.cuisine} dish in ${input.cadenceText}.`, {
        surface: 'inline',
      }).line;
    default:
      return null;
  }
}
