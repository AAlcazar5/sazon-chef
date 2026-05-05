// backend/src/services/restaurantMacroFitService.ts
// ROADMAP 4.0 Tier C13 — Restaurant macro fit.
//
// Given a user's remaining-macro budget for the day + a list of branded /
// restaurant FoodItem candidates, score and rank by fit. Used on Today and
// in Coach tool-results: "Going out tonight? Here are 3 Chipotle orders that
// fit your remaining macros."
//
// Pure scoring functions — no DB calls. Caller passes the items in.

export interface FoodItemFitInput {
  id: string;
  name: string;
  brand?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
}

export interface RemainingMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Optional — fiber tracking is opt-in. */
  fiber?: number;
}

export interface RankedFoodItem extends FoodItemFitInput {
  fitScore: number;
  explainer: string;
}

interface RankOptions {
  limit?: number;
  /** Lower-cased substrings; any item whose name contains one is excluded. */
  dietaryRestrictions?: string[];
}

/**
 * Score how well a single item fits the user's remaining macro budget.
 *
 * Logic:
 *   - Calorie fit: minimize |calories - remaining.calories| relative to
 *     remaining.calories. Items way over budget penalize hard; items way
 *     under (<50%) also penalized softly (it's still a meal — should fill
 *     the budget).
 *   - Protein fit: when protein remaining is positive, reward proximity
 *     OR exceeding (you can always overshoot protein); when negative,
 *     reward lower protein.
 *   - Carbs/fat: penalize big overshoots only.
 *
 * Returned score is in [0, 1] where 1 = perfect fit.
 */
export function scoreItemFit(item: FoodItemFitInput, remaining: RemainingMacros): number {
  // Edge: if remaining.calories is non-positive, any meal is "over" — invert.
  const calBudget = remaining.calories <= 0 ? 0 : remaining.calories;

  let calorieScore: number;
  if (calBudget === 0) {
    // User is at or past their budget — favour smaller items.
    calorieScore = Math.max(0, 1 - item.calories / 800);
  } else {
    const overshoot = Math.max(0, item.calories - calBudget);
    const undershoot = Math.max(0, calBudget * 0.5 - item.calories);
    calorieScore = Math.max(
      0,
      1 - (overshoot / calBudget + undershoot / calBudget) * 0.5
    );
  }

  // Protein
  let proteinScore: number;
  if (remaining.protein <= 0) {
    // Already over protein target — lower-protein items rank higher.
    proteinScore = Math.max(0, 1 - item.protein / 60);
  } else {
    const proteinTarget = remaining.protein;
    const proteinOver = Math.max(0, item.protein - proteinTarget);
    const proteinUnder = Math.max(0, proteinTarget - item.protein);
    // Overshoot is much more forgiving than undershoot for protein.
    proteinScore = Math.max(
      0,
      1 - (proteinUnder / proteinTarget + proteinOver / proteinTarget * 0.3)
    );
  }

  // Carbs / fat — only penalize big overshoots.
  const carbBudget = Math.max(remaining.carbs, 1);
  const fatBudget = Math.max(remaining.fat, 1);
  const carbScore = Math.max(0, 1 - Math.max(0, item.carbs - carbBudget) / carbBudget);
  const fatScore = Math.max(0, 1 - Math.max(0, item.fat - fatBudget) / fatBudget);

  // Weighted average. Calorie and protein dominate.
  const weighted =
    calorieScore * 0.4 +
    proteinScore * 0.35 +
    carbScore * 0.125 +
    fatScore * 0.125;

  return Math.max(0, Math.min(1, weighted));
}

function buildExplainer(item: FoodItemFitInput, remaining: RemainingMacros): string {
  const calDiff = item.calories - remaining.calories;
  if (calDiff > 50) {
    return `Over by ${Math.round(calDiff)} cal — heavier than your remaining budget.`;
  }
  if (calDiff < -250 && remaining.calories > 0) {
    return `Light — uses about ${Math.round((item.calories / Math.max(remaining.calories, 1)) * 100)}% of your remaining calories.`;
  }
  if (item.protein >= remaining.protein) {
    return `Fits well — covers your protein target with ${item.protein}g.`;
  }
  return `Fits under your remaining ${Math.round(remaining.calories)} cal.`;
}

export function rankItemsForRemainingMacros(
  items: FoodItemFitInput[],
  remaining: RemainingMacros,
  opts: RankOptions = {}
): RankedFoodItem[] {
  if (!items || items.length === 0) return [];

  const restrictions = (opts.dietaryRestrictions ?? []).map((r) => r.toLowerCase());
  const filtered = items.filter((it) => {
    if (restrictions.length === 0) return true;
    const lower = it.name.toLowerCase();
    return !restrictions.some((r) => lower.includes(r));
  });

  const ranked = filtered
    .map((it) => ({
      ...it,
      fitScore: scoreItemFit(it, remaining),
      explainer: buildExplainer(it, remaining),
    }))
    .sort((a, b) => b.fitScore - a.fitScore);

  if (typeof opts.limit === 'number' && opts.limit >= 0) {
    return ranked.slice(0, opts.limit);
  }
  return ranked;
}
