// frontend/utils/cookCompleteDerivations.ts
// ROADMAP 4.0 Tier J15 caller-wiring helpers — derive the inputs that
// `<DailyPlateShareCard />` needs from a single recipe payload. v1 sources from
// the current recipe only; aggregating across "today's plate" (multi-recipe
// roll-up) is a follow-up that lands when the daily-plate aggregation
// endpoint exists.

interface MineralBlock {
  [key: string]: number;
}

interface RecipeForDerivations {
  ingredients?: unknown[] | null;
  nutritionalAnalysis?: {
    micronutrients?: {
      minerals?: MineralBlock;
    };
  } | null;
}

const MINERAL_DISPLAY: Record<string, string> = {
  calcium: 'calcium',
  iron: 'iron',
  magnesium: 'magnesium',
  phosphorus: 'phosphorus',
  potassium: 'potassium',
  zinc: 'zinc',
  copper: 'copper',
  manganese: 'manganese',
  selenium: 'selenium',
};

/**
 * Number of distinct ingredients on the recipe. Returns 0 when the array is
 * absent or non-array (so the share card hides itself, per its empty-state
 * contract).
 */
export function deriveIngredientCount(recipe: RecipeForDerivations | null | undefined): number {
  if (!recipe) return 0;
  const list = recipe.ingredients;
  if (!Array.isArray(list)) return 0;
  return list.length;
}

/**
 * Top minerals by value, descending. Returns at most `limit` names. Missing
 * micronutrients block produces an empty list.
 */
export function deriveTopMinerals(
  recipe: RecipeForDerivations | null | undefined,
  limit: number = 3,
): string[] {
  const minerals = recipe?.nutritionalAnalysis?.micronutrients?.minerals;
  if (!minerals || typeof minerals !== 'object') return [];
  const entries: Array<[string, number]> = [];
  for (const [key, value] of Object.entries(minerals)) {
    if (typeof value === 'number' && value > 0) {
      entries.push([key, value]);
    }
  }
  entries.sort((a, b) => b[1] - a[1]);
  return entries.slice(0, limit).map(([key]) => MINERAL_DISPLAY[key] ?? key);
}
