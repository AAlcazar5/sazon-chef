// backend/src/services/smartCollectionsService.ts
// Rule-driven smart collections. Each collection is a pure predicate over
// Recipe fields — no extra schema, no stored rows. Collections are computed
// on-the-fly against existing saved recipes.

export interface SmartCollectionDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface Recipe {
  title: string;
  description: string;
  cookTime: number;
  difficulty: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
  estimatedCostPerServing?: number | null;
  mealType?: string | null;
}

export type WeatherCondition = 'hot' | 'cold' | 'rainy' | 'mild';

/** Weather-aware smart collection — computed via separate endpoint, not in SMART_COLLECTION_DEFINITIONS */
export const WEATHER_COLLECTION_DEFINITION: SmartCollectionDefinition = {
  id: 'weather_today',
  name: 'Perfect for Today',
  icon: '⛅',
  description: 'Matched to your current weather',
};

/** Prisma where-clause for weather-appropriate recipes */
export function buildWeatherFilter(condition: WeatherCondition): Record<string, unknown> {
  switch (condition) {
    case 'cold':
    case 'rainy':
      return { OR: [{ mealType: 'dinner' }, { cookTime: { gte: 20 } }] };
    case 'hot':
      return { OR: [{ calories: { lte: 500 } }, { cookTime: { lte: 20 } }] };
    case 'mild':
    default:
      return {};
  }
}

/** Client-side predicate for weather-appropriate recipes */
export function recipeMatchesWeather(recipe: Recipe, condition: WeatherCondition): boolean {
  switch (condition) {
    case 'cold':
    case 'rainy':
      return recipe.mealType === 'dinner' || recipe.cookTime >= 20;
    case 'hot':
      return typeof recipe.calories !== 'number' || recipe.calories <= 500 || recipe.cookTime <= 20;
    case 'mild':
    default:
      return true;
  }
}

export const SMART_COLLECTION_DEFINITIONS: readonly SmartCollectionDefinition[] = [
  {
    id: 'quick_easy',
    name: 'Quick & Easy',
    icon: '⚡',
    description: '15 minutes or less, no stress',
  },
  {
    id: 'high_protein',
    name: 'High Protein',
    icon: '💪',
    description: '30g+ protein per serving',
  },
  {
    id: 'under_400_cal',
    name: 'Under 400 Cal',
    icon: '🔥',
    description: 'Light but satisfying',
  },
  {
    id: 'one_pot',
    name: 'One-Pot Meals',
    icon: '🍲',
    description: 'Minimal cleanup required',
  },
  {
    id: 'budget_friendly',
    name: 'Budget Friendly',
    icon: '💵',
    description: 'Under $3 per serving',
  },
  {
    id: 'high_fiber',
    name: 'High Fiber',
    icon: '🌾',
    description: '8g+ fiber per serving',
  },
  {
    id: 'right_now',
    name: 'Right Now',
    icon: '⏰',
    description: 'Perfect for this time of day',
  },
] as const;

const ONE_POT_KEYWORDS = ['one-pot', 'one pot', 'sheet pan', 'sheet-pan', 'skillet'];

export type MealPeriod = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** Maps the current hour to a meal period. */
export function getCurrentMealType(now: Date = new Date()): MealPeriod {
  const h = now.getHours();
  if (h >= 5 && h < 11) return 'breakfast';
  if (h >= 11 && h < 15) return 'lunch';
  if (h >= 17 && h < 22) return 'dinner';
  return 'snack';
}

export function getSmartCollectionById(id: string): SmartCollectionDefinition | undefined {
  return SMART_COLLECTION_DEFINITIONS.find((d) => d.id === id);
}

/**
 * Prisma where-clause fragment for a smart collection rule.
 * Returns null if the id is unknown. The result is merged into the caller's
 * where clause (typically alongside userId + savedRecipe join filters).
 *
 * For `right_now`, pass `now` so tests can inject a deterministic date.
 */
export function buildRecipeFilter(id: string, now: Date = new Date()): Record<string, unknown> | null {
  switch (id) {
    case 'quick_easy':
      return { cookTime: { lte: 15 }, difficulty: 'easy' };
    case 'high_protein':
      return { protein: { gte: 30 } };
    case 'under_400_cal':
      return { calories: { lte: 400 } };
    case 'high_fiber':
      return { fiber: { gte: 8 } };
    case 'budget_friendly':
      return { estimatedCostPerServing: { lte: 3 } };
    case 'one_pot':
      return {
        OR: ONE_POT_KEYWORDS.flatMap((kw) => [
          { title: { contains: kw } },
          { description: { contains: kw } },
        ]),
      };
    case 'right_now':
      return { mealType: getCurrentMealType(now) };
    default:
      return null;
  }
}

/**
 * Pure in-memory predicate — lets callers filter already-loaded recipes
 * without a round trip to the DB (used for counts and client-side filtering).
 *
 * For `right_now`, pass `now` so tests can inject a deterministic date.
 */
export function recipeMatchesSmartCollection(recipe: Recipe, id: string, now: Date = new Date()): boolean {
  switch (id) {
    case 'quick_easy':
      return recipe.cookTime <= 15 && recipe.difficulty === 'easy';
    case 'high_protein':
      return recipe.protein >= 30;
    case 'under_400_cal':
      return recipe.calories <= 400;
    case 'high_fiber':
      return typeof recipe.fiber === 'number' && recipe.fiber >= 8;
    case 'budget_friendly':
      return (
        typeof recipe.estimatedCostPerServing === 'number' &&
        recipe.estimatedCostPerServing <= 3
      );
    case 'one_pot': {
      const haystack = `${recipe.title} ${recipe.description}`.toLowerCase();
      return ONE_POT_KEYWORDS.some((kw) => haystack.includes(kw));
    }
    case 'right_now': {
      const mt = recipe.mealType?.toLowerCase();
      return mt === getCurrentMealType(now);
    }
    default:
      return false;
  }
}
