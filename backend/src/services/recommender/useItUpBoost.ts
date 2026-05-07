// ROADMAP 4.0 IG4.2 — Use-it-up recipe-ranker boost.
//
// Composes with TB1 retrieval + TB2 ranker — does NOT short-circuit them.
// Given an expiring-pantry list (from IG4.1) + a list of ranked recipe
// candidates, this function adds a positive score weight to candidates
// whose ingredient list contains ≥ 1 expiring item.
//
// The boost is bounded so a low-quality recipe with one expiring ingredient
// can't beat a high-quality recipe without — caps at MAX_BOOST_WEIGHT.
//
// This is a pure function: callers pass the candidate set + the expiring
// names; the service returns the rescored array. No DB calls inside.

const PER_MATCH_BOOST = 0.06;
const MAX_BOOST_WEIGHT = 0.18;

export interface BoostCandidate {
  recipeId: string;
  score: number;
  /** Recipe's ingredient texts; case-insensitive match against expiring names. */
  ingredientTexts: string[];
}

export interface BoostedCandidate extends BoostCandidate {
  /** Boost weight added to `score`. Always ≥ 0. */
  boost: number;
  /** Number of expiring ingredients matched. */
  matchedCount: number;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function recipeMatchesAny(
  recipe: BoostCandidate,
  expiring: string[],
): { count: number; matched: string[] } {
  const matched: string[] = [];
  const ingTexts = recipe.ingredientTexts.map(normalize);
  for (const e of expiring) {
    const needle = normalize(e);
    if (!needle) continue;
    if (ingTexts.some((t) => t.includes(needle))) matched.push(e);
  }
  return { count: matched.length, matched };
}

export interface ApplyBoostInput {
  candidates: BoostCandidate[];
  /** Names of expiring ingredients (from IG4.1 / N2.3). */
  expiringIngredients: string[];
  /** Override per-match boost. Defaults to PER_MATCH_BOOST. */
  perMatchBoost?: number;
  /** Override the cap. Defaults to MAX_BOOST_WEIGHT. */
  maxBoostWeight?: number;
}

/**
 * Returns a NEW array of candidates with `boost` + `matchedCount` populated
 * and `score` updated. Original input is not mutated.
 *
 * Sort order is preserved unless the caller re-sorts; downstream rankers
 * typically re-sort by `score` after applying the boost.
 */
export function applyUseItUpBoost(
  input: ApplyBoostInput,
): BoostedCandidate[] {
  const per = input.perMatchBoost ?? PER_MATCH_BOOST;
  const cap = input.maxBoostWeight ?? MAX_BOOST_WEIGHT;
  if (input.expiringIngredients.length === 0 || input.candidates.length === 0) {
    return input.candidates.map((c) => ({ ...c, boost: 0, matchedCount: 0 }));
  }
  return input.candidates.map((c) => {
    const { count } = recipeMatchesAny(c, input.expiringIngredients);
    const boost = Math.min(cap, per * count);
    return {
      ...c,
      score: c.score + boost,
      boost,
      matchedCount: count,
    };
  });
}

/** Re-sort candidates by score (descending). Pure helper. */
export function sortByScoreDesc<T extends { score: number }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => b.score - a.score);
}

/** Test-readable export of the magnitude constants. */
export const __BOOST_CONSTANTS = {
  PER_MATCH_BOOST,
  MAX_BOOST_WEIGHT,
};
