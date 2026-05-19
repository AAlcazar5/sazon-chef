// frontend/lib/coach/findOrGenerateRecipe.ts
//
// Tier Y live-wiring. Given a recipe ask (e.g., "pizza margarita"), call
// the backend recipe-generation endpoint and map its response into a
// RecipeCardPayload that CookingModeRecipeCard can render. The backend
// also exposes `ingredientsStructured` ({name,amount,unit}) so the
// servings stepper can rescale exactly (rescaleStepText needs anchored
// amount+unit tokens — see Y-1).

import { recipeApi } from '../api/recipe';
import type { ScalableIngredientLite } from '../cooking/rescaleStepText';

export interface RecipeCardPayload {
  title: string;
  description: string;
  baseServings: number;
  ingredients: ScalableIngredientLite[];
  steps: string[];
  macros?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  };
  imageUrls?: string[];
  notes?: string;
}

interface GeneratedResponse {
  data?: {
    success?: boolean;
    data?: {
      recipe?: {
        title?: string;
        description?: string;
        servings?: number;
        ingredientsStructured?: Array<{ name: string; amount: number; unit: string }>;
        instructions?: string[];
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
        fiber?: number;
        tips?: string[];
        imageUrl?: string;
      };
    };
  };
}

export async function findOrGenerateRecipe(
  query: string,
): Promise<RecipeCardPayload> {
  const res = (await recipeApi.generateFromDescription(query)) as GeneratedResponse;
  const recipe = res?.data?.data?.recipe;
  if (!recipe) {
    throw new Error('Recipe generation returned no recipe');
  }

  // Drop rows without a valid amount+unit — never fabricate quantities
  // (W-A2 invariant; same rule toScalableIngredients enforces server-side).
  const ingredients: ScalableIngredientLite[] = (recipe.ingredientsStructured ?? [])
    .filter(
      (i) =>
        !!i.name &&
        Number.isFinite(i.amount) &&
        i.amount > 0 &&
        typeof i.unit === 'string' &&
        i.unit.length > 0,
    )
    .map((i) => ({ name: i.name, amount: i.amount, unit: i.unit }));

  return {
    title: recipe.title ?? 'Untitled recipe',
    description: recipe.description ?? '',
    baseServings:
      typeof recipe.servings === 'number' && recipe.servings > 0
        ? recipe.servings
        : 4,
    ingredients,
    steps: recipe.instructions ?? [],
    macros: {
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      fiber: recipe.fiber,
    },
    imageUrls: recipe.imageUrl ? [recipe.imageUrl] : undefined,
    notes: (recipe.tips ?? []).join(' '),
  };
}
