// ROADMAP 4.0 Tier S — keyword-only intent classifier (no LLM call) so the
// coach can route premium turns between Sonnet 4.6 (chat) and Opus 4.7
// (deep_plan) without spending tokens on classification.
//
// Tier $$ — $$3.1 — added 'lookup' for pure data-fetch queries that don't
// need extended thinking. Pro tier disables the thinking budget on lookup,
// saving ~75% per call.
//
// Conservative by design: ambiguous inputs default to 'chat'. deep_plan
// wins over lookup when both match (planning queries get full reasoning).

import type { CoachIntent } from './coachService';

const DEEP_PLAN_PATTERNS: ReadonlyArray<RegExp> = [
  /\bplan\s+my\s+(week|month|day|meals?)\b/i,
  /\b(weekly|monthly)\s+(menu|plan)\b/i,
  /\b(meal[\s-]?plan|menu[\s-]?plan)\b/i,
  /\b(rebuild|overhaul|redo|reset)\s+my\s+(pantry|kitchen|fridge|diet|macros?)\b/i,
  /\baudit\s+my\s+(macros?|micros?|nutrition|pantry|diet|week)\b/i,
  /\bbuild\s+(me\s+)?(a|an)\s+(meal[\s-]?plan|menu|grocery[\s-]?list|shopping[\s-]?list)\b/i,
  /\bplan\s+(me\s+)?(a|the)\s+(week|menu|grocery)\b/i,
];

const LOOKUP_PATTERNS: ReadonlyArray<RegExp> = [
  /^what(?:'s|\s+is)?\s+on\s+my\s+(plan|list|shopping|menu|schedule)\b/i,
  /^what(?:'s|\s+is)?\s+in\s+my\s+(pantry|fridge|kitchen)\b/i,
  /^what\s+(do|did)\s+i\s+(have|need|cook|cooked)\b/i,
  /\bdo\s+i\s+have\s+(any\s+)?[\w\s]+(left|still|remaining)?\??$/i,
  /^do\s+i\s+need\s+\w+/i,
  /^show\s+(me\s+)?(my|the)\s+(pantry|shopping|list|plan|profile|allergens|diet)/i,
  /^what\s+am\s+i\s+allergic\s+to\b/i,
  /^what(?:'s|\s+is|\s+are)?\s+my\s+(pantry|shopping|diet|allergens?|skill|profile|goals?|macros?)/i,
  /^when\s+(did|do)\s+i\s+(last\s+)?(cook|make|eat)\b/i,
];

export function classifyCoachIntent(message: string): CoachIntent {
  const text = (message ?? '').trim();
  if (text.length === 0) return 'chat';
  // deep_plan wins over lookup when both might match (planning needs reasoning)
  for (const pat of DEEP_PLAN_PATTERNS) {
    if (pat.test(text)) return 'deep_plan';
  }
  for (const pat of LOOKUP_PATTERNS) {
    if (pat.test(text)) return 'lookup';
  }
  return 'chat';
}
