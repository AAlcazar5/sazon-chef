// ROADMAP 4.0 WK1.1 + WK1.2 — Pantry-aware boost + use-it-up slot pinning.
//
// Composes on top of WK0.1's weekPlanRetrievalAdapter:
//
//   WK1.1 — pantry coverage boost:
//     For each candidate, count pantry items the recipe uses → boost score.
//     Soft signal (max boost cap). Never blocks a great recipe just
//     because pantry coverage is low.
//
//   WK1.2 — use-it-up slot pinning:
//     When IG4.1 flags pantry items expiring within 3 days, find the
//     candidate that uses the expiring item + pin the slot to it. Returns
//     a `useItUpHint` annotation the UI surfaces as a small badge.
//
// Pure functions: callers pass candidate sets + signal sets, get boosted/
// pinned results. No DB calls inside.

const PER_PANTRY_MATCH_BOOST = 0.04;
const MAX_PANTRY_BOOST = 0.16;

const PER_EXPIRING_MATCH_BOOST = 0.10;
const MAX_EXPIRING_BOOST = 0.30;

export interface BoostCandidate {
  recipeId: string;
  score: number;
  /** Recipe's ingredient texts; case-insensitive substring match against
   *  pantry / expiring names. */
  ingredientTexts: string[];
}

export interface BoostedCandidate extends BoostCandidate {
  /** Total boost added to score (pantry + expiring). */
  boost: number;
  /** Number of pantry items the recipe matched. */
  pantryMatched: number;
  /** Number of expiring items the recipe matched. */
  expiringMatched: number;
  /** When non-empty, the slot that received this candidate should render a
   *  use-it-up hint badge for these expiring items. */
  useItUpHint: string[];
}

export interface ApplyBoostInput {
  candidates: BoostCandidate[];
  /** Names in the user's pantry (canonical, lowercased). */
  pantryNames: string[];
  /** Subset of pantryNames flagged for soon-to-expire by IG4.1. */
  expiringNames: string[];
  /** Override per-pantry-match boost. Defaults to PER_PANTRY_MATCH_BOOST. */
  perPantryBoost?: number;
  /** Override pantry cap. Defaults to MAX_PANTRY_BOOST. */
  maxPantryBoost?: number;
  /** Override per-expiring-match boost. Defaults to PER_EXPIRING_MATCH_BOOST. */
  perExpiringBoost?: number;
  /** Override expiring cap. Defaults to MAX_EXPIRING_BOOST. */
  maxExpiringBoost?: number;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function countMatches(
  ingredientTexts: string[],
  needles: string[],
): { count: number; matched: string[] } {
  if (needles.length === 0) return { count: 0, matched: [] };
  const ingTexts = ingredientTexts.map(normalize);
  const matched: string[] = [];
  for (const n of needles) {
    const needle = normalize(n);
    if (!needle) continue;
    if (ingTexts.some((t) => t.includes(needle))) matched.push(n);
  }
  return { count: matched.length, matched };
}

/**
 * Apply pantry + expiring boost to a candidate set. Returns a NEW array;
 * input is not mutated.
 */
export function applyWeekPlanBoosts(
  input: ApplyBoostInput,
): BoostedCandidate[] {
  const perPantry = input.perPantryBoost ?? PER_PANTRY_MATCH_BOOST;
  const capPantry = input.maxPantryBoost ?? MAX_PANTRY_BOOST;
  const perExpiring = input.perExpiringBoost ?? PER_EXPIRING_MATCH_BOOST;
  const capExpiring = input.maxExpiringBoost ?? MAX_EXPIRING_BOOST;

  return input.candidates.map((c) => {
    const pantry = countMatches(c.ingredientTexts, input.pantryNames);
    const expiring = countMatches(c.ingredientTexts, input.expiringNames);
    const pantryBoost = Math.min(capPantry, perPantry * pantry.count);
    const expiringBoost = Math.min(capExpiring, perExpiring * expiring.count);
    const totalBoost = pantryBoost + expiringBoost;
    return {
      ...c,
      score: c.score + totalBoost,
      boost: totalBoost,
      pantryMatched: pantry.count,
      expiringMatched: expiring.count,
      useItUpHint: expiring.matched,
    };
  });
}

/**
 * WK1.2 — pick the top candidate to PIN to a slot when there's an expiring
 * ingredient that needs to be used. Caller pins the result to the slot
 * + renders the useItUpHint badge.
 *
 * Returns null when no candidate matches the expiring set (caller falls
 * through to the normal ranker).
 */
export function pickUseItUpCandidate(
  input: ApplyBoostInput,
): BoostedCandidate | null {
  if (input.expiringNames.length === 0) return null;
  const boosted = applyWeekPlanBoosts(input);
  // Filter to candidates that matched ≥ 1 expiring item — these are the
  // legit pin candidates. Sort by total score desc.
  const eligible = boosted.filter((c) => c.expiringMatched > 0);
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => b.score - a.score);
  return eligible[0];
}

/** Pure helper: re-sort candidates by score desc. */
export function sortByScoreDesc<T extends { score: number }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => b.score - a.score);
}

export const __INTERNALS = {
  PER_PANTRY_MATCH_BOOST,
  MAX_PANTRY_BOOST,
  PER_EXPIRING_MATCH_BOOST,
  MAX_EXPIRING_BOOST,
};
