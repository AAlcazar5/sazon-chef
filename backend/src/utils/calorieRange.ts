// Calorie-per-serving sanity bound for generated recipes. The default window
// (10–2500) assumes a plate. Sauces/condiments are a flavor accompaniment —
// a tablespoon of herb sauce legitimately reads 0–8 kcal/serving — so the
// lower bound is dropped for them. The upper bound + a finiteness/negativity
// guard still apply (garbage like NaN / negative / absurdly high is rejected).

const MAX_CALORIES_PER_SERVING = 2500;
const MIN_CALORIES_PER_SERVING = 10;

/**
 * Throws if caloriesPerServing is implausible. For `mealType === 'sauce'`
 * only the upper bound and a finite/non-negative check are enforced; every
 * other meal type keeps the original 10–2500 window and error message.
 */
export function assertCaloriesPerServing(
  caloriesPerServing: number,
  mealType?: string,
): void {
  const isSauce = mealType === 'sauce';
  const min = isSauce ? 0 : MIN_CALORIES_PER_SERVING;
  const valid =
    Number.isFinite(caloriesPerServing) &&
    caloriesPerServing >= min &&
    caloriesPerServing <= MAX_CALORIES_PER_SERVING;
  if (!valid) {
    throw new Error(
      `Calories per serving (${Math.round(caloriesPerServing)}) is outside reasonable range (${min}-${MAX_CALORIES_PER_SERVING})`,
    );
  }
}
