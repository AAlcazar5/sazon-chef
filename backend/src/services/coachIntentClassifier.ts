// ROADMAP 4.0 Tier S — keyword-only intent classifier (no LLM call) so the
// coach can route premium turns between Sonnet 4.6 (chat) and Opus 4.7
// (deep_plan) without spending tokens on classification.
//
// Conservative by design: ambiguous inputs default to 'chat'. Only matches
// clear deep-plan asks like "plan my week", "rebuild my pantry", "audit my
// macros", "weekly menu", "build a meal plan".

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

export function classifyCoachIntent(message: string): CoachIntent {
  const text = (message ?? '').trim();
  if (text.length === 0) return 'chat';
  for (const pat of DEEP_PLAN_PATTERNS) {
    if (pat.test(text)) return 'deep_plan';
  }
  return 'chat';
}
