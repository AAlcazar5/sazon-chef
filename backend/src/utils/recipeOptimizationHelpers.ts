// backend/src/utils/recipeOptimizationHelpers.ts
// Helper functions for optimized recipe fetching and scoring

import { prisma } from '@/lib/prisma';
import {
  UserScoringPreferences,
  calculateQuickScore,
  calculateFullScore,
  buildOptimizedWhereClause,
  sortByScore,
  filterByMinimumScore,
} from './optimizedScoring';

/**
 * Get user preferences formatted for scoring
 * Optimized version - only fetches what's needed
 */
export async function getUserPreferencesOptimized(
  userId: string
): Promise<UserScoringPreferences | null> {
  try {
    const [userPreferences, macroGoals, physicalProfile] = await Promise.all([
      prisma.userPreferences.findFirst({
        where: { userId },
        select: {
          cookTimePreference: true,
          spiceLevel: true,
          likedCuisines: {
            select: { name: true },
          },
          bannedIngredients: {
            select: { name: true },
          },
          dietaryRestrictions: {
            select: { name: true },
          },
        },
      }),
      prisma.macroGoals.findFirst({
        where: { userId },
        select: {
          calories: true,
          protein: true,
          carbs: true,
          fat: true,
        },
      }),
      prisma.userPhysicalProfile.findFirst({
        where: { userId },
        select: {
          fitnessGoal: true,
        },
      }),
    ]);

    if (!userPreferences) {
      return null;
    }

    return {
      userId,
      likedCuisines: userPreferences.likedCuisines.map(c => c.name),
      bannedIngredients: userPreferences.bannedIngredients.map(i => i.name),
      dietaryRestrictions: userPreferences.dietaryRestrictions.map(d => d.name),
      cookTimePreference: userPreferences.cookTimePreference || 30,
      spiceLevel: userPreferences.spiceLevel || 'medium',
      macroGoals: macroGoals || undefined,
      fitnessGoal: physicalProfile?.fitnessGoal || undefined,
    };
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return null;
  }
}

/**
 * Get behavioral data for scoring (recent activity)
 */
export async function getBehavioralDataOptimized(userId: string) {
  try {
    const [likedRecipes, dislikedRecipes, recentMeals] = await Promise.all([
      // Get liked recipe IDs
      prisma.recipeFeedback.findMany({
        where: { userId, liked: true },
        select: { recipeId: true },
        take: 50,
        orderBy: { createdAt: 'desc' },
      }),

      // Get disliked recipe IDs
      prisma.recipeFeedback.findMany({
        where: { userId, disliked: true },
        select: { recipeId: true },
        take: 50,
        orderBy: { createdAt: 'desc' },
      }),

      // Get recent meal history for cuisine repetition avoidance
      prisma.mealHistory.findMany({
        where: {
          userId,
          date: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        select: {
          recipe: {
            select: {
              cuisine: true,
            },
          },
        },
        take: 20,
        orderBy: { date: 'desc' },
      }),
    ]);

    return {
      likedRecipeIds: likedRecipes.map(r => r.recipeId),
      dislikedRecipeIds: dislikedRecipes.map(r => r.recipeId),
      recentCuisines: recentMeals
        .map(m => m.recipe?.cuisine)
        .filter(Boolean) as string[],
    };
  } catch (error) {
    console.error('Error fetching behavioral data:', error);
    return {
      likedRecipeIds: [],
      dislikedRecipeIds: [],
      recentCuisines: [],
    };
  }
}

/**
 * Fetch recipes with TIERED approach
 * Tier 1: Database filtering
 * Tier 2: Quick scoring
 * Tier 3: Full details for top results
 */
export async function fetchRecipesOptimized(
  prefs: UserScoringPreferences,
  options: {
    limit: number;
    page: number;
    filters?: {
      mealType?: string;
      maxCookTime?: number;
      search?: string;
    };
  }
) {
  const { limit, page, filters } = options;

  // TIER 1: Build optimized WHERE clause
  const where = buildOptimizedWhereClause(prefs);

  // Add optional filters
  if (filters?.mealType) {
    where.mealType = filters.mealType;
  }

  if (filters?.maxCookTime) {
    where.cookTime = {
      ...where.cookTime,
      lte: Math.min(where.cookTime?.lte || 999, filters.maxCookTime),
    };
  }

  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  // Get total count for pagination
  const total = await prisma.recipe.count({ where });

  // TIER 2: Fetch recipes for quick scoring
  // Fetch MORE than needed (3x) so we can score and filter
  const fetchLimit = Math.min(limit * 3, 300); // Cap at 300 for performance

  const recipes = await prisma.recipe.findMany({
    where,
    take: fetchLimit,
    skip: page * limit,
    select: {
      id: true,
      title: true,
      description: true,
      cuisine: true,
      mealType: true,
      cookTime: true,
      difficulty: true,
      servings: true,
      imageUrl: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
      fiber: true,
      sugar: true,
      // Fetch ingredients ONLY text for quick scoring
      ingredients: {
        select: { text: true },
        orderBy: { order: 'asc' },
      },
      // Don't fetch instructions yet - save memory
    },
    orderBy: { createdAt: 'desc' },
  });

  // TIER 3: Quick score all fetched recipes
  const scoredRecipes = recipes.map(recipe => {
    const scoreData = calculateQuickScore(recipe, prefs);
    return {
      ...recipe,
      score: scoreData.score, // Use 'score' for compatibility with filter/sort helpers
      scoreBreakdown: scoreData.breakdown,
    };
  });

  // Filter out low scores and sort
  const filtered = filterByMinimumScore(scoredRecipes, 30);
  const sorted = sortByScore(filtered);

  // Take only the top results we need
  const topResults = sorted.slice(0, limit);

  // TIER 4: Fetch full details (instructions) ONLY for top results
  const fullRecipes = await Promise.all(
    topResults.map(async r => {
      const instructions = await prisma.recipeInstruction.findMany({
        where: { recipeId: r.id },
        orderBy: { step: 'asc' },
      });

      return {
        ...r,
        instructions,
      };
    })
  );

  return {
    recipes: fullRecipes,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get temporal context for scoring
 */
export function getCurrentTemporalContext(): {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  isWeekend: boolean;
  mealPeriod: string;
} {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();

  let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  let mealPeriod: string;

  if (hour >= 5 && hour < 11) {
    timeOfDay = 'morning';
    mealPeriod = 'breakfast';
  } else if (hour >= 11 && hour < 15) {
    timeOfDay = 'afternoon';
    mealPeriod = 'lunch';
  } else if (hour >= 15 && hour < 20) {
    timeOfDay = 'evening';
    mealPeriod = 'dinner';
  } else {
    timeOfDay = 'night';
    mealPeriod = 'snack';
  }

  return {
    timeOfDay,
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    mealPeriod,
  };
}
