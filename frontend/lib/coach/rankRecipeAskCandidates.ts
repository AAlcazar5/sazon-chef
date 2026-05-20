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

function buildRationale(
  matchedPantry: string[],
  cuisineHit: { cuisine: string; source: 'last' | 'adjacent' } | null,
): string | undefined {
  if (matchedPantry.length > 0) {
    const names = matchedPantry.slice(0, 2).join(' + ');
    return `Picked because you've got ${names} on hand.`;
  }
  if (cuisineHit) {
    const verb = cuisineHit.source === 'last' ? 'your recent' : 'on your radar';
    return cuisineHit.source === 'last'
      ? `Picked because ${cuisineHit.cuisine} is ${verb} cuisine.`
      : `Picked because ${cuisineHit.cuisine} is ${verb}.`;
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

    let cuisineHit: { cuisine: string; source: 'last' | 'adjacent' } | null = null;
    if (cuisineMatches(recipe.cuisine, signals.lastCookCuisine)) {
      cuisineHit = {
        cuisine: signals.lastCookCuisine as string,
        source: 'last',
      };
    } else if (cuisineMatches(recipe.cuisine, signals.topAdjacentCuisine)) {
      cuisineHit = {
        cuisine: signals.topAdjacentCuisine as string,
        source: 'adjacent',
      };
    }
    const cuisineBonus = cuisineHit ? 1 : 0;

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
