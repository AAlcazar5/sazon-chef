// backend/src/services/recipeContentAudit.ts
//
// Tier U item-1 audit (founder roadmap 2026-05-23): retrospective
// content-quality audit on the recipe catalog. `aiRecipeService.
// performSafetyChecks` (private) does the same checks at GENERATION
// time, gated by a `params` shape that doesn't exist for already-
// persisted catalog rows. This module restates the content-side rules
// as pure functions over a catalog Recipe shape so an audit script
// can run them after the fact.
//
// What's checked (all CONTENT-side — user-allergen checks belong to
// the recommendation layer, not the catalog):
//
//   - At least one ingredient
//   - At least one instruction
//   - No empty / whitespace-only ingredient names
//   - No duplicate ingredient names (within a single recipe)
//   - Calorie count is in a reasonable range (50–2000)
//   - Cook time is positive (when set)
//
// Returns one `RecipeAuditResult` per recipe. The script that consumes
// this rolls them up into a pass-rate per-cuisine table.

export interface AuditedRecipeShape {
  id: string;
  title: string;
  cuisine: string | null;
  calories: number | null;
  cookTime: number | null;
  ingredients: Array<{ name: string; amount?: number; unit?: string } | string>;
  instructions: Array<{ text: string; step?: number } | string>;
}

export type AuditFailureCode =
  | 'no_ingredients'
  | 'no_instructions'
  | 'empty_ingredient_name'
  | 'duplicate_ingredients'
  | 'calorie_outlier_low'
  | 'calorie_outlier_high'
  | 'invalid_cook_time';

export interface RecipeAuditResult {
  recipeId: string;
  title: string;
  cuisine: string | null;
  /** True iff ZERO failures fired. Warnings (none today) don't fail. */
  passed: boolean;
  failures: AuditFailureCode[];
  /** Human-readable details for the dashboard, one per failure. */
  detail: string[];
}

const CALORIE_MIN = 50;
const CALORIE_MAX = 2000;

function ingredientName(
  ing: AuditedRecipeShape['ingredients'][number],
): string {
  if (typeof ing === 'string') return ing.trim();
  return (ing?.name ?? '').trim();
}

function instructionText(
  step: AuditedRecipeShape['instructions'][number],
): string {
  if (typeof step === 'string') return step.trim();
  return (step?.text ?? '').trim();
}

export function auditRecipe(recipe: AuditedRecipeShape): RecipeAuditResult {
  const failures: AuditFailureCode[] = [];
  const detail: string[] = [];

  const names = recipe.ingredients.map(ingredientName);
  const cleanNames = names.filter((n) => n.length > 0);
  if (cleanNames.length === 0) {
    failures.push('no_ingredients');
    detail.push('Recipe has no ingredients.');
  } else if (cleanNames.length < names.length) {
    failures.push('empty_ingredient_name');
    detail.push(
      `${names.length - cleanNames.length} ingredient row(s) have empty / whitespace-only names.`,
    );
  }

  // Duplicate detection — case-insensitive, only among non-empty names.
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const n of cleanNames) {
    const key = n.toLowerCase();
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  }
  if (duplicates.size > 0) {
    failures.push('duplicate_ingredients');
    detail.push(
      `Duplicate ingredient(s): ${Array.from(duplicates).slice(0, 3).join(', ')}`,
    );
  }

  const steps = recipe.instructions.map(instructionText).filter((s) => s.length > 0);
  if (steps.length === 0) {
    failures.push('no_instructions');
    detail.push('Recipe has no instructions.');
  }

  if (typeof recipe.calories === 'number') {
    if (recipe.calories < CALORIE_MIN) {
      failures.push('calorie_outlier_low');
      detail.push(`Calories ${recipe.calories} < ${CALORIE_MIN} (likely missing data).`);
    } else if (recipe.calories > CALORIE_MAX) {
      failures.push('calorie_outlier_high');
      detail.push(`Calories ${recipe.calories} > ${CALORIE_MAX} (likely per-batch, not per-serving).`);
    }
  }

  if (typeof recipe.cookTime === 'number' && recipe.cookTime <= 0) {
    failures.push('invalid_cook_time');
    detail.push(`Cook time ${recipe.cookTime} is not positive.`);
  }

  return {
    recipeId: recipe.id,
    title: recipe.title,
    cuisine: recipe.cuisine,
    passed: failures.length === 0,
    failures,
    detail,
  };
}

export interface AuditRollup {
  totalRecipes: number;
  passed: number;
  failed: number;
  passRate: number;
  /** Per-cuisine pass-rate breakdown. Sorted by passRate ascending so
   *  the WORST cuisines surface at the top of the audit report. */
  perCuisine: Array<{
    cuisine: string;
    total: number;
    passed: number;
    passRate: number;
  }>;
  /** Per-failure-code count across the full catalog. Quickly tells you
   *  what's broken in the generation prompt (e.g., 12% of recipes
   *  missing instructions → prompt is dropping the instructions block). */
  failureCodeCounts: Record<AuditFailureCode, number>;
}

export function rollupAuditResults(
  results: ReadonlyArray<RecipeAuditResult>,
): AuditRollup {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  const perCuisine = new Map<string, { total: number; passed: number }>();
  const failureCodeCounts: Record<string, number> = {};

  for (const r of results) {
    const key = r.cuisine ?? '(unknown)';
    const slot = perCuisine.get(key) ?? { total: 0, passed: 0 };
    slot.total += 1;
    if (r.passed) slot.passed += 1;
    perCuisine.set(key, slot);
    for (const code of r.failures) {
      failureCodeCounts[code] = (failureCodeCounts[code] ?? 0) + 1;
    }
  }

  const perCuisineList = Array.from(perCuisine.entries())
    .map(([cuisine, { total: t, passed: p }]) => ({
      cuisine,
      total: t,
      passed: p,
      passRate: t > 0 ? p / t : 1,
    }))
    .sort((a, b) => {
      if (a.passRate !== b.passRate) return a.passRate - b.passRate;
      return a.cuisine.localeCompare(b.cuisine);
    });

  return {
    totalRecipes: total,
    passed,
    failed,
    passRate: total > 0 ? passed / total : 1,
    perCuisine: perCuisineList,
    failureCodeCounts: failureCodeCounts as Record<AuditFailureCode, number>,
  };
}
