// backend/src/services/recipeNutrientAggregationService.ts
// ROADMAP 4.0 D13 — recipe + daily nutrient aggregation.
//
// `aggregateRecipe(recipeId)` walks the recipe's ingredients, resolves each
// to an FDC profile (D12), converts the recipe quantity to grams, and sums
// the per-100g nutrients × scale to produce a per-serving roll-up. Cached
// in `RecipeNutrientAggregate`; invalidated on recipe edit.
//
// `recomputeDailySnapshot(userId, date)` sums RecipeNutrientAggregate
// across that day's CookingLog rows. Called on cook-log write or by a
// daily cron.
//
// Conversion approximation: weight units convert exactly; volume and
// count units use water-equivalent / piece-defaults. Coverage is reported
// per-aggregate so the UI can disclose "approximate" when low.

import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { parseIngredientQuantity } from '../utils/ingredientQuantityParser';
import { extractIngredientName } from '../utils/ingredientNameExtractor';
import {
  getOrFetchByName,
  type IngredientNutrientProfile,
  type ColumnedNutrient,
} from './ingredientNutrientService';

const COLUMNED: ColumnedNutrient[] = [
  'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'addedSugar',
  'saturatedFat', 'monoFat', 'polyFat', 'transFat', 'cholesterol',
  'sodium', 'potassium', 'calcium', 'iron', 'magnesium', 'zinc',
  'phosphorus', 'selenium',
  'vitA', 'vitC', 'vitD', 'vitE', 'vitK',
  'thiamin', 'riboflavin', 'niacin', 'b6', 'b12', 'folate',
  'omega3', 'omega6',
];

/**
 * Convert a parsed quantity to grams. Approximate — water-equivalent for
 * volumes, piece-defaults for counts. Returns null when the unit isn't
 * resolvable (caller skips that ingredient and notes coverage).
 */
export function gramsFromQuantity(amount: number, unit: string): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const u = unit.trim().toLowerCase();

  // Direct weight
  const weight: Record<string, number> = {
    g: 1, gram: 1, grams: 1,
    kg: 1000, kilogram: 1000, kilograms: 1000,
    mg: 0.001, milligram: 0.001,
    oz: 28.3495, ounce: 28.3495, ounces: 28.3495,
    lb: 453.592, lbs: 453.592, pound: 453.592, pounds: 453.592,
  };
  if (weight[u]) return amount * weight[u];

  // Volume → grams via water equivalent (1 ml = 1 g)
  const volumeMl: Record<string, number> = {
    ml: 1, milliliter: 1, milliliters: 1,
    l: 1000, liter: 1000, liters: 1000,
    tsp: 4.929, teaspoon: 4.929, teaspoons: 4.929,
    tbsp: 14.787, tbs: 14.787, tablespoon: 14.787, tablespoons: 14.787,
    'fl oz': 29.574, 'fluid ounce': 29.574, 'fluid ounces': 29.574, floz: 29.574,
    cup: 236.588, cups: 236.588, c: 236.588,
    pint: 473.176, pints: 473.176, pt: 473.176,
    quart: 946.353, quarts: 946.353, qt: 946.353,
    gallon: 3785.41, gallons: 3785.41, gal: 3785.41,
  };
  if (volumeMl[u]) return amount * volumeMl[u];

  // Count → piece-defaults. The list is intentionally small; FDC has
  // foodPortions data we can pull later for better accuracy.
  const piece: Record<string, number> = {
    piece: 100, pieces: 100, item: 100, items: 100,
    egg: 50, eggs: 50,
    clove: 5, cloves: 5,
    leaf: 1, leaves: 1,
    sprig: 2, sprigs: 2,
    slice: 25, slices: 25,
    can: 425, cans: 425,
    bunch: 200, bunches: 200,
  };
  if (piece[u]) return amount * piece[u];

  return null;
}

interface SumAccumulator {
  totals: Partial<Record<ColumnedNutrient, number>>;
  resolved: number;
  ingredientsConsidered: number;
}

function applyProfileToTotals(
  acc: SumAccumulator,
  profile: IngredientNutrientProfile,
  scaleFromHundredG: number,
): void {
  for (const key of COLUMNED) {
    const per100g = profile[key];
    if (typeof per100g !== 'number') continue;
    acc.totals[key] = (acc.totals[key] ?? 0) + per100g * scaleFromHundredG;
  }
}

interface AggregationInput {
  recipeId: string;
  ingredients: Array<{ text: string }>;
  servings: number;
}

export async function aggregateRecipe(
  input: AggregationInput,
): Promise<{ aggregate: Partial<Record<ColumnedNutrient, number>>; coverage: number }> {
  const acc: SumAccumulator = { totals: {}, resolved: 0, ingredientsConsidered: 0 };

  for (const ing of input.ingredients) {
    acc.ingredientsConsidered += 1;
    const parsed = parseIngredientQuantity(ing.text);
    if (!parsed) continue;
    const grams = gramsFromQuantity(parsed.amount, parsed.unit);
    if (grams === null) continue;

    const name = extractIngredientName(ing.text, parsed.unit);
    const profile = await getOrFetchByName(name);
    if (!profile) continue;

    const scaleFromHundredG = grams / 100;
    applyProfileToTotals(acc, profile, scaleFromHundredG);
    acc.resolved += 1;
  }

  // Per-serving = (recipe total) / servings.
  const servings = Math.max(1, input.servings);
  const perServing: Partial<Record<ColumnedNutrient, number>> = {};
  for (const key of COLUMNED) {
    if (acc.totals[key] != null) perServing[key] = (acc.totals[key] as number) / servings;
  }

  const coverage = acc.ingredientsConsidered > 0 ? acc.resolved / acc.ingredientsConsidered : 0;
  return { aggregate: perServing, coverage };
}

/**
 * Read the cached aggregate for a recipe; recompute on miss or invalidation.
 */
export async function getRecipeAggregate(recipeId: string) {
  const existing = await prisma.recipeNutrientAggregate.findUnique({ where: { recipeId } });
  if (existing && !existing.invalidated) {
    return existing;
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: { ingredients: { select: { text: true } } },
  });
  if (!recipe) return null;

  const { aggregate, coverage } = await aggregateRecipe({
    recipeId,
    ingredients: recipe.ingredients,
    servings: recipe.servings ?? 1,
  });

  const data: Record<string, unknown> = {
    recipeId,
    servings: recipe.servings ?? 1,
    ingredientCoverage: coverage,
    invalidated: false,
    computedAt: new Date(),
  };
  for (const key of COLUMNED) {
    data[key] = aggregate[key] ?? null;
  }

  return prisma.recipeNutrientAggregate.upsert({
    where: { recipeId },
    create: data as never,
    update: data as never,
  });
}

/** Mark an aggregate stale (called from recipe-edit handlers). */
export async function invalidateRecipeAggregate(recipeId: string): Promise<void> {
  try {
    await prisma.recipeNutrientAggregate.update({
      where: { recipeId },
      data: { invalidated: true },
    });
  } catch {
    // Aggregate may not exist yet — that's fine.
  }
}

interface DailySumInput {
  userId: string;
  date: string; // YYYY-MM-DD
}

/**
 * Sum the day's RecipeNutrientAggregates across the user's CookingLog.
 * Cached as DailyNutrientSnapshot; safe to recall.
 */
export async function recomputeDailySnapshot({ userId, date }: DailySumInput) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);

  const logs = await prisma.cookingLog.findMany({
    where: {
      userId,
      cookedAt: { gte: start, lte: end },
    },
    select: { recipeId: true },
  });

  const totals: Partial<Record<ColumnedNutrient, number>> = {};
  let mealCount = 0;

  for (const log of logs) {
    const agg = await getRecipeAggregate(log.recipeId);
    if (!agg) continue;
    mealCount += 1;
    for (const key of COLUMNED) {
      const v = (agg as Record<string, unknown>)[key];
      if (typeof v === 'number') {
        totals[key] = (totals[key] ?? 0) + v;
      }
    }
  }

  const data: Record<string, unknown> = {
    userId,
    date,
    mealCount,
    computedAt: new Date(),
  };
  for (const key of COLUMNED) {
    data[key] = totals[key] ?? null;
  }

  return prisma.dailyNutrientSnapshot.upsert({
    where: { userId_date: { userId, date } },
    create: data as never,
    update: data as never,
  });
}

export const __forTest = {
  COLUMNED,
  applyProfileToTotals,
};
