// backend/src/services/recipeOfTheDayService.ts
// ROADMAP 4.0 HX0.1 — Recipe of the Day flows through the T-bis ranker.
//
// Replaces the legacy `dateSeed % rotdCandidates.length` selection. When the
// home-feed retrieval adapter returns a ranked candidate set, the hero is
// the *top-ranked* recipe that's also in the filtered candidate pool (must
// have an image, must satisfy active filters). Date-seeded selection
// survives only as a cold-start fallback.

export interface RotdCandidate {
  id: string;
  // Other recipe fields are passthrough — kept loose for the controller's
  // existing pipeline.
  [key: string]: unknown;
}

export interface SelectRotdArgs {
  /** Filtered candidate pool (already image-gated + filter-respecting). */
  candidates: ReadonlyArray<RotdCandidate>;
  /** Optional ranker output — descending order of relevance. */
  rankedRecipeIds?: ReadonlyArray<string> | null;
  /** Date seed for the cold-start / fallback path. */
  dateSeed: number;
}

export type RotdSource = 'ranker' | 'fallback';

export interface SelectRotdResult {
  recipe: RotdCandidate | null;
  source: RotdSource;
  /** Index into `candidates` of the chosen recipe (debug/telemetry). */
  index: number;
}

const COLD_START_FLOOR = 3;

/**
 * Pick the Recipe of the Day. Prefers the highest-ranked candidate from the
 * adapter; falls back to date-modulo when the ranker is unavailable, returns
 * fewer than COLD_START_FLOOR ids, or none of the ranked ids intersect the
 * filtered candidate pool.
 */
export function selectRecipeOfTheDay(args: SelectRotdArgs): SelectRotdResult {
  const { candidates, rankedRecipeIds, dateSeed } = args;
  if (candidates.length === 0) {
    return { recipe: null, source: 'fallback', index: -1 };
  }

  // Ranker path: walk descending-relevance ids, pick the first that's in the
  // filtered pool. Bypass entirely if the ranker returned too few signals to
  // beat the date-modulo's cold-start guarantee.
  if (rankedRecipeIds && rankedRecipeIds.length >= COLD_START_FLOOR) {
    const candidateById = new Map<string, { recipe: RotdCandidate; index: number }>();
    candidates.forEach((c, i) => candidateById.set(c.id, { recipe: c, index: i }));
    for (const rid of rankedRecipeIds) {
      const hit = candidateById.get(rid);
      if (hit) {
        return { recipe: hit.recipe, source: 'ranker', index: hit.index };
      }
    }
  }

  // Cold-start / fallback: deterministic by date so the same user doesn't
  // see a different hero on every page reload within a day.
  const index = ((dateSeed % candidates.length) + candidates.length) % candidates.length;
  return { recipe: candidates[index], source: 'fallback', index };
}
