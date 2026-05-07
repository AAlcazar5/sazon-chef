// ROADMAP 4.0 WK3.1 — Sunday-prep block proposer.
//
// Once per Saturday, propose a single 60–90min prep block that batch-cooks
// ingredients/components shared across the upcoming week's meals. Pure
// function — caller passes the projected week + a per-ingredient prep-time
// estimate; the planner returns a single `MealPrepBatchPlan` or null when
// no opportunity exists.
//
// Honest tradeoffs:
//   - The planner is deterministic + greedy: tally ingredient frequency
//     across the week, sort frequency-desc, add to the prep block until
//     `prepToleranceMin` is exceeded. Ingredients used in only one meal
//     are skipped (no batching value).
//   - Per-ingredient prep time is caller-supplied via `prepTimeByIngredient`
//     (a Map<ingredientName, minutes>). Defaults to DEFAULT_PREP_MINUTES
//     (15) for unmapped ingredients. Caller wires this from the recipe
//     prep heuristic (rice → 25, sheet-pan veg → 35, etc.).
//   - User skill tier maps to prep tolerance:
//        beginner    → 60 min cap
//        intermediate → 75 min cap
//        advanced    → 90 min cap
//     Caller may override via `prepToleranceMin`.
//   - The block must cover ≥ MIN_MEALS_COVERED meals to be worth proposing.

const DEFAULT_PREP_MINUTES = 15;
const MIN_FREQUENCY_FOR_BATCH = 2;
const MIN_MEALS_COVERED = 3;

export const PREP_TOLERANCE_BY_SKILL: Record<SkillTier, number> = {
  beginner: 60,
  intermediate: 75,
  advanced: 90,
};

export type SkillTier = 'beginner' | 'intermediate' | 'advanced';
export type MealKind = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';

export interface PlannedMeal {
  mealId: string;
  kind: MealKind;
  /** Lower-cased ingredient names. Caller normalizes. */
  ingredients: string[];
}

export interface MealPrepBatchInput {
  meals: PlannedMeal[];
  prepTimeByIngredient: Map<string, number>;
  /** Override prep tolerance (else derived from skillTier). */
  prepToleranceMin?: number;
  skillTier?: SkillTier;
}

export interface BatchedIngredient {
  ingredient: string;
  frequency: number;
  estimatedMinutes: number;
}

export interface MealPrepBatchPlan {
  ingredientsToBatch: BatchedIngredient[];
  estimatedMinutes: number;
  coversMeals: number;
  /** "4 lunches + 2 dinners" — caller renders as the editorial card subhead. */
  breakdown: string;
}

function tallyIngredients(meals: PlannedMeal[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const meal of meals) {
    const seen = new Set<string>();
    for (const raw of meal.ingredients) {
      const ing = raw.toLowerCase().trim();
      if (!ing || seen.has(ing)) continue;
      seen.add(ing);
      counts.set(ing, (counts.get(ing) ?? 0) + 1);
    }
  }
  return counts;
}

function buildBreakdown(meals: PlannedMeal[], coveredIds: Set<string>): string {
  const counts: Partial<Record<MealKind, number>> = {};
  for (const m of meals) {
    if (!coveredIds.has(m.mealId)) continue;
    counts[m.kind] = (counts[m.kind] ?? 0) + 1;
  }
  const order: MealKind[] = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'];
  const parts: string[] = [];
  for (const k of order) {
    const n = counts[k] ?? 0;
    if (n > 0) parts.push(`${n} ${k}${n === 1 ? '' : 's'}`);
  }
  return parts.join(' + ');
}

export function proposeMealPrepBatchPlan(
  input: MealPrepBatchInput,
): MealPrepBatchPlan | null {
  if (input.meals.length === 0) return null;
  const tolerance =
    input.prepToleranceMin ??
    (input.skillTier ? PREP_TOLERANCE_BY_SKILL[input.skillTier] : PREP_TOLERANCE_BY_SKILL.intermediate);

  const counts = tallyIngredients(input.meals);
  const candidates: BatchedIngredient[] = Array.from(counts.entries())
    .filter(([, n]) => n >= MIN_FREQUENCY_FOR_BATCH)
    .map(([ingredient, frequency]) => ({
      ingredient,
      frequency,
      estimatedMinutes: input.prepTimeByIngredient.get(ingredient) ?? DEFAULT_PREP_MINUTES,
    }))
    // Most-shared ingredients first; tie-break on shorter prep time.
    .sort((a, b) => b.frequency - a.frequency || a.estimatedMinutes - b.estimatedMinutes);

  if (candidates.length === 0) return null;

  const chosen: BatchedIngredient[] = [];
  let total = 0;
  for (const c of candidates) {
    if (total + c.estimatedMinutes > tolerance) continue;
    chosen.push(c);
    total += c.estimatedMinutes;
  }
  if (chosen.length === 0) return null;

  const chosenSet = new Set(chosen.map((c) => c.ingredient));
  const coveredMealIds = new Set<string>();
  for (const m of input.meals) {
    const matches = m.ingredients.some((ing) => chosenSet.has(ing.toLowerCase().trim()));
    if (matches) coveredMealIds.add(m.mealId);
  }
  if (coveredMealIds.size < MIN_MEALS_COVERED) return null;

  return {
    ingredientsToBatch: chosen,
    estimatedMinutes: total,
    coversMeals: coveredMealIds.size,
    breakdown: buildBreakdown(input.meals, coveredMealIds),
  };
}

export const __INTERNALS = {
  DEFAULT_PREP_MINUTES,
  MIN_FREQUENCY_FOR_BATCH,
  MIN_MEALS_COVERED,
};
