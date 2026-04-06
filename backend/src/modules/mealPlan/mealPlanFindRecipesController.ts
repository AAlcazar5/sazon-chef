// backend/src/modules/mealPlan/mealPlanFindRecipesController.ts
// POST /api/meal-plan/find-recipes — two-tier search (DB-first, AI fallback)

import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { getUserId } from '../../utils/authHelper';
import { aiRecipeService } from '../../services/aiRecipeService';

interface MacroRange {
  min?: number;
  max?: number;
}

interface FindRecipesRequest {
  count: number;
  cuisines?: string[];
  cuisineFamilies?: string[];
  calories?: MacroRange;
  protein?: { min?: number };
  fat?: { max?: number };
  carbs?: MacroRange;
  fiber?: { min?: number };
  mealType?: string;
  maxCookTime?: number;
  difficulty?: string;
  dietaryRestrictions?: string[];
}

interface MatchBreakdown {
  caloriesInRange: boolean;
  proteinMet: boolean;
  fatMet: boolean;
  carbsMet: boolean;
  fiberMet: boolean;
  cuisineMatch: boolean;
}

function computeMatchBreakdown(recipe: any, req: FindRecipesRequest): MatchBreakdown {
  const caloriesInRange =
    !req.calories
      ? true
      : (req.calories.min === undefined || recipe.calories >= req.calories.min) &&
        (req.calories.max === undefined || recipe.calories <= req.calories.max);

  const proteinMet =
    !req.protein?.min ? true : recipe.protein >= req.protein.min;

  const fatMet =
    !req.fat?.max ? true : recipe.fat <= req.fat.max;

  const carbsMet =
    !req.carbs
      ? true
      : (req.carbs.min === undefined || recipe.carbs >= req.carbs.min) &&
        (req.carbs.max === undefined || recipe.carbs <= req.carbs.max);

  const fiberMet =
    !req.fiber?.min
      ? true
      : (recipe.fiber ?? 0) >= req.fiber.min;

  const cuisineMatch =
    !req.cuisines || req.cuisines.length === 0
      ? true
      : req.cuisines.some(c => c.toLowerCase() === recipe.cuisine.toLowerCase());

  return { caloriesInRange, proteinMet, fatMet, carbsMet, fiberMet, cuisineMatch };
}

function recipePassesFilters(recipe: any, body: FindRecipesRequest): boolean {
  const bd = computeMatchBreakdown(recipe, body);
  if (!bd.caloriesInRange) return false;
  if (!bd.proteinMet) return false;
  if (!bd.fatMet) return false;
  if (!bd.carbsMet) return false;
  if (!bd.fiberMet) return false;

  // Cuisine filter
  if (body.cuisines && body.cuisines.length > 0) {
    if (!bd.cuisineMatch) return false;
  }

  // Meal type filter
  if (body.mealType && body.mealType !== 'any') {
    if (recipe.mealType && recipe.mealType !== body.mealType) return false;
  }

  // Cook time filter
  if (body.maxCookTime && recipe.cookTime > body.maxCookTime) return false;

  // Difficulty filter
  if (body.difficulty && body.difficulty !== 'any' && recipe.difficulty !== body.difficulty) {
    return false;
  }

  return true;
}

function computeMatchScore(bd: MatchBreakdown): number {
  const weights = {
    caloriesInRange: 25,
    proteinMet: 25,
    fatMet: 20,
    carbsMet: 15,
    fiberMet: 10,
    cuisineMatch: 5,
  };
  return Object.entries(weights).reduce((score, [key, weight]) => {
    return score + (bd[key as keyof MatchBreakdown] ? weight : 0);
  }, 0);
}

export const findRecipes = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const body: FindRecipesRequest = req.body;

    if (!body.count || typeof body.count !== 'number') {
      return res.status(400).json({ error: 'count is required' });
    }

    // Get user's dietary restrictions for AI fallback
    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { dietaryRestrictions: true } as any,
    });
    const dietaryRestrictions: string[] = body.dietaryRestrictions
      ?? (user as any)?.dietaryRestrictions
      ?? [];

    // Step 1: DB-first search — fetch candidates with loose pre-filter then apply strict filter
    const candidates = await prisma.recipe.findMany({
      where: {
        OR: [
          { userId: null },       // system recipes
          { userId: userId },     // user's own recipes
        ],
        ...(body.mealType && body.mealType !== 'any'
          ? { mealType: body.mealType }
          : {}),
        ...(body.difficulty && body.difficulty !== 'any'
          ? { difficulty: body.difficulty }
          : {}),
        ...(body.maxCookTime ? { cookTime: { lte: body.maxCookTime } } : {}),
        ...(body.cuisines && body.cuisines.length > 0
          ? { cuisine: { in: body.cuisines } }
          : {}),
      },
      take: 200, // generous pre-fetch, we filter in-memory for precision
    });

    // Apply strict macro filters in-memory
    const matched = candidates.filter(r => recipePassesFilters(r, body));
    const totalMatches = matched.length;

    // Score and sort
    const scored = matched
      .map(r => {
        const matchBreakdown = computeMatchBreakdown(r, body);
        return { recipe: r as any, matchScore: computeMatchScore(matchBreakdown), matchBreakdown };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, body.count);

    // Step 2: AI fallback if not enough results
    let generatedCount = 0;
    const results: Array<{ recipe: any; matchScore: number; matchBreakdown: MatchBreakdown }> = [...scored];

    if (results.length < body.count) {
      const needed = body.count - results.length;
      const aiPromises = Array.from({ length: needed }, async () => {
        try {
          const generated = await aiRecipeService.generateRecipe({
            userId,
            mealType: (body.mealType as any) ?? 'any',
            cuisineOverride: body.cuisines?.[0],
            macroGoals: {
              calories: body.calories?.min ?? 400,
              protein: body.protein?.min ?? 30,
              carbs: body.carbs?.min ?? 30,
              fat: body.fat?.max ?? 20,
            },
            userPreferences: {
              likedCuisines: body.cuisines ?? [],
              dietaryRestrictions,
              bannedIngredients: [],
            },
            maxCookTimeForMeal: body.maxCookTime,
          });
          return generated;
        } catch {
          return null;
        }
      });

      const aiResults = (await Promise.all(aiPromises)).filter(Boolean);
      generatedCount = aiResults.length;

      for (const aiRecipe of aiResults) {
        if (!aiRecipe) continue;
        // Return AI recipes as plain objects (not Prisma model instances)
        const matchBreakdown = computeMatchBreakdown(aiRecipe, body);
        results.push({
          recipe: { ...aiRecipe, id: `ai-${Date.now()}-${Math.random()}`, source: 'ai-generated' } as any,
          matchScore: computeMatchScore(matchBreakdown),
          matchBreakdown,
        });
      }
    }

    return res.json({ options: results, totalMatches, generatedCount });
  } catch (error) {
    console.error('[findRecipes] error:', error);
    return res.status(500).json({ error: 'Failed to find recipes' });
  }
};
