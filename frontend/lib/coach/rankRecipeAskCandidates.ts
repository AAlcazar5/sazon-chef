// Tier Y live-wiring (founder 2026-05-19): N=1 ranker for ambiguous
// recipe asks. "Grilled chicken" returns 100+ catalog candidates; this
// module picks ONE using signals the app already has (pantry, last cook
// cuisine, adjacency), and surfaces the next-best as alternates for the
// "Show me another" swap chip.
//
// Pure function — no React, no API. The wedge wires it in:
// findOrGenerateRecipe(query, signals) → { primary, alternates, rationale }
//
// Determinism is the contract: same query + same signals + same
// candidates → identical ranking. The user's "Show me another" chip
// cycles through `alternates` in stable order, never randomizes.

import { dice, type RecipeCardPayload } from './findOrGenerateRecipe';

export interface RankerSignals {
  /** Lowercased ingredient names the user currently has on hand.
   *  Sourced from CoachContextResponse.pantryExpiringSoon (already
   *  cached by useCoachQuickChipContext). */
  pantryNames: string[];
  /** Cuisine of the user's most recent cook (useLastCookCuisine). */
  lastCookCuisine: string | null;
  /** Server-computed adjacency target — secondary cuisine signal. */
  topAdjacentCuisine: string | null;
  /** Cuisines the user has explicitly saved, ordered by frequency
   *  (top-saved first). Sourced from useSavedRecipeCuisines. Stronger
   *  signal than adjacency (explicit user action vs server inference).
   *  Optional + defaults to [] for backward compat with existing tests. */
  savedCollectionCuisines?: string[];
}

export interface RankedCandidate {
  recipe: RecipeCardPayload;
  diceScore: number;
  pantryOverlap: number;
  cuisineBonus: number;
  totalScore: number;
  /** One-liner shown under the title. Names the dominant signal that
   *  picked this recipe. Undefined when there's nothing to explain
   *  (cold-start: no pantry + no cuisine match). */
  rationale?: string;
}

// Weights sum to 1.0; tunable as the corpus + N=1 signals mature.
const W_DICE = 0.6;
const W_PANTRY = 0.3;
const W_CUISINE = 0.1;

function pantryOverlapScore(
  recipeIngredients: RecipeCardPayload['ingredients'],
  pantryNames: string[],
): { score: number; matched: string[] } {
  if (pantryNames.length === 0 || recipeIngredients.length === 0) {
    return { score: 0, matched: [] };
  }
  const pantryLc = pantryNames.map((p) => p.toLowerCase());
  const matched: string[] = [];
  for (const ing of recipeIngredients) {
    const nameLc = ing.name.toLowerCase();
    for (const p of pantryLc) {
      if (nameLc.includes(p) || p.includes(nameLc)) {
        matched.push(p);
        break;
      }
    }
  }
  return {
    score: matched.length / recipeIngredients.length,
    matched,
  };
}

function cuisineMatches(
  recipeCuisine: string | undefined,
  target: string | null,
): boolean {
  if (!recipeCuisine || !target) return false;
  return recipeCuisine.toLowerCase() === target.toLowerCase();
}

type CuisineSource = 'last' | 'saved-top' | 'saved' | 'adjacent';
interface CuisineHit {
  cuisine: string;
  source: CuisineSource;
  /** Weight in [0, 1]. The highest-weight matching source wins; this
   *  becomes `cuisineBonus` (scaled by W_CUISINE in totalScore). */
  weight: number;
}

/** Highest-weight cuisine match across all available signals. Lets a
 *  strong signal (explicit user save, recent cook) outrank a weaker one
 *  (server-inferred adjacency) when both fire on different candidates. */
function resolveCuisineHit(
  recipeCuisine: string | undefined,
  signals: RankerSignals,
): CuisineHit | null {
  if (!recipeCuisine) return null;
  let best: CuisineHit | null = null;
  const consider = (hit: CuisineHit) => {
    if (!best || hit.weight > best.weight) best = hit;
  };
  if (cuisineMatches(recipeCuisine, signals.lastCookCuisine)) {
    consider({ cuisine: signals.lastCookCuisine as string, source: 'last', weight: 1.0 });
  }
  const saved = signals.savedCollectionCuisines ?? [];
  if (saved.length > 0) {
    const idx = saved.findIndex(
      (c) => c.toLowerCase() === recipeCuisine.toLowerCase(),
    );
    if (idx === 0) {
      consider({ cuisine: saved[0], source: 'saved-top', weight: 0.8 });
    } else if (idx > 0) {
      consider({ cuisine: saved[idx], source: 'saved', weight: 0.6 });
    }
  }
  if (cuisineMatches(recipeCuisine, signals.topAdjacentCuisine)) {
    consider({ cuisine: signals.topAdjacentCuisine as string, source: 'adjacent', weight: 0.5 });
  }
  return best;
}

function buildRationale(
  matchedPantry: string[],
  cuisineHit: CuisineHit | null,
): string | undefined {
  if (matchedPantry.length > 0) {
    const names = matchedPantry.slice(0, 2).join(' + ');
    return `Picked because you've got ${names} on hand.`;
  }
  if (cuisineHit) {
    switch (cuisineHit.source) {
      case 'last':
        return `Picked because ${cuisineHit.cuisine} is your recent cuisine.`;
      case 'saved-top':
        return `Picked because you save a lot of ${cuisineHit.cuisine}.`;
      case 'saved':
        return `Picked because you've saved ${cuisineHit.cuisine} recipes before.`;
      case 'adjacent':
        return `Picked because ${cuisineHit.cuisine} is on your radar.`;
    }
  }
  return undefined;
}

export function rankRecipeAskCandidates(
  query: string,
  candidates: RecipeCardPayload[],
  signals: RankerSignals,
): RankedCandidate[] {
  if (candidates.length === 0) return [];

  const scored = candidates.map((recipe, idx) => {
    const diceScore = dice(recipe.title, query);
    const { score: pantryOverlap, matched: matchedPantry } = pantryOverlapScore(
      recipe.ingredients,
      signals.pantryNames,
    );

    const cuisineHit = resolveCuisineHit(recipe.cuisine, signals);
    const cuisineBonus = cuisineHit ? cuisineHit.weight : 0;

    const totalScore =
      W_DICE * diceScore + W_PANTRY * pantryOverlap + W_CUISINE * cuisineBonus;
    const rationale = buildRationale(matchedPantry, cuisineHit);

    return {
      recipe,
      diceScore,
      pantryOverlap,
      cuisineBonus,
      totalScore,
      rationale,
      _idx: idx,
    };
  });

  // Stable sort: higher totalScore first, ties broken by input order so
  // the same inputs always yield the same ranking (determinism contract).
  scored.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return a._idx - b._idx;
  });

  return scored.map(({ _idx: _, ...rest }) => rest);
}
