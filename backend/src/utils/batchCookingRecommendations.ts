/**
 * Utility functions for generating batch cooking recommendations based on user preferences
 */

import { prisma } from '@/lib/prisma';

export interface BatchCookingRecommendation {
  recipeId: string;
  title: string;
  reason: string;
  matchScore: number;
  batchCookingScore: number;
  estimatedPrepTime: number;
  servings: number;
  freezable: boolean;
  weeklyPrepFriendly: boolean;
}

export interface UserPreferencesForBatchCooking {
  likedCuisines: string[];
  dietaryRestrictions: string[];
  bannedIngredients: string[];
  cookTimePreference: number;
  maxRecipeCost?: number;
  maxMealCost?: number;
}

/**
 * Generate batch cooking recommendations based on user preferences
 */
export async function generateBatchCookingRecommendations(
  userId: string,
  limit: number = 10
): Promise<BatchCookingRecommendation[]> {
  try {
    // Get user preferences
    const userPreferences = await prisma.userPreferences.findUnique({
      where: { userId },
      include: {
        likedCuisines: true,
        dietaryRestrictions: true,
        bannedIngredients: true,
      },
    });

    if (!userPreferences) {
      return [];
    }

    const likedCuisines = userPreferences.likedCuisines.map(c => c.name);
    const dietaryRestrictions = userPreferences.dietaryRestrictions.map(d => d.name);
    const bannedIngredients = userPreferences.bannedIngredients.map(b => b.name.toLowerCase());

    // Build query filters
    const where: any = {
      // Must be suitable for batch cooking
      OR: [
        { batchFriendly: true },
        { freezable: true },
        { weeklyPrepFriendly: true },
        { mealPrepSuitable: true },
      ],
    };

    // Filter by liked cuisines if any
    if (likedCuisines.length > 0) {
      where.cuisine = { in: likedCuisines };
    }

    // Get recipes that match batch cooking criteria
    const recipes = await prisma.recipe.findMany({
      where,
      include: {
        ingredients: true,
      },
      take: limit * 2, // Get more than needed to filter further
    });

    // Score and rank recipes
    const recommendations: BatchCookingRecommendation[] = recipes
      .map(recipe => {
        const matchScore = calculateMatchScore(recipe, {
          likedCuisines,
          dietaryRestrictions,
          bannedIngredients,
          cookTimePreference: userPreferences.cookTimePreference,
          maxRecipeCost: userPreferences.maxRecipeCost || undefined,
          maxMealCost: userPreferences.maxMealCost || undefined,
        });

        const batchCookingScore = calculateBatchCookingScore(recipe);

        // Skip recipes that don't meet minimum criteria
        if (matchScore < 30 || batchCookingScore < 40) {
          return null;
        }

        const reason = generateRecommendationReason(recipe, {
          likedCuisines,
          dietaryRestrictions,
          cookTimePreference: userPreferences.cookTimePreference,
        });

        return {
          recipeId: recipe.id,
          title: recipe.title,
          reason,
          matchScore,
          batchCookingScore,
          estimatedPrepTime: recipe.cookTime,
          servings: recipe.servings || 1,
          freezable: recipe.freezable || false,
          weeklyPrepFriendly: recipe.weeklyPrepFriendly || false,
        };
      })
      .filter((rec): rec is BatchCookingRecommendation => rec !== null)
      .sort((a, b) => {
        // Sort by combined score (match + batch cooking)
        const scoreA = a.matchScore * 0.6 + a.batchCookingScore * 0.4;
        const scoreB = b.matchScore * 0.6 + b.batchCookingScore * 0.4;
        return scoreB - scoreA;
      })
      .slice(0, limit);

    return recommendations;
  } catch (error) {
    console.error('Error generating batch cooking recommendations:', error);
    return [];
  }
}

/**
 * Calculate how well a recipe matches user preferences
 */
function calculateMatchScore(
  recipe: any,
  preferences: UserPreferencesForBatchCooking
): number {
  let score = 50; // Base score

  // Cuisine match (40 points)
  if (preferences.likedCuisines.length > 0) {
    if (preferences.likedCuisines.includes(recipe.cuisine)) {
      score += 40;
    } else {
      score -= 20; // Penalty for non-preferred cuisine
    }
  }

  // Cook time match (20 points)
  const timeDiff = Math.abs(recipe.cookTime - preferences.cookTimePreference);
  if (timeDiff <= 10) {
    score += 20;
  } else if (timeDiff <= 20) {
    score += 10;
  } else if (timeDiff <= 30) {
    score += 5;
  } else {
    score -= 10; // Penalty for very different cook times
  }

  // Dietary restrictions (30 points)
  const recipeIngredients = recipe.ingredients.map((ing: any) => ing.text.toLowerCase());
  const hasRestrictedIngredient = preferences.dietaryRestrictions.some(restriction => {
    const restrictionLower = restriction.toLowerCase();
    return recipeIngredients.some((ing: string) => ing.includes(restrictionLower));
  });
  if (hasRestrictedIngredient) {
    score -= 30; // Major penalty for violating dietary restrictions
  }

  // Banned ingredients (40 points penalty)
  const hasBannedIngredient = preferences.bannedIngredients.some(banned => {
    return recipeIngredients.some((ing: string) => ing.includes(banned));
  });
  if (hasBannedIngredient) {
    score -= 40; // Major penalty for banned ingredients
  }

  // Cost considerations (10 points)
  if (preferences.maxRecipeCost && recipe.estimatedCost) {
    if (recipe.estimatedCost <= preferences.maxRecipeCost) {
      score += 10;
    } else {
      score -= 15; // Penalty for exceeding budget
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate how suitable a recipe is for batch cooking
 */
function calculateBatchCookingScore(recipe: any): number {
  let score = 0;

  // Batch-friendly flag (30 points)
  if (recipe.batchFriendly) {
    score += 30;
  }

  // Freezable (25 points)
  if (recipe.freezable) {
    score += 25;
  }

  // Weekly prep friendly (20 points)
  if (recipe.weeklyPrepFriendly) {
    score += 20;
  }

  // Meal prep suitable (15 points)
  if (recipe.mealPrepSuitable) {
    score += 15;
  }

  // Meal prep score (10 points)
  if (recipe.mealPrepScore) {
    score += Math.min(10, recipe.mealPrepScore / 10);
  }

  // Servings (10 points) - more servings = better for batch cooking
  const servings = recipe.servings || 1;
  if (servings >= 6) {
    score += 10;
  } else if (servings >= 4) {
    score += 5;
  }

  return Math.min(100, score);
}

/**
 * Generate a human-readable reason for the recommendation
 */
function generateRecommendationReason(
  recipe: any,
  preferences: {
    likedCuisines: string[];
    dietaryRestrictions: string[];
    cookTimePreference: number;
  }
): string {
  const reasons: string[] = [];

  // Cuisine match
  if (preferences.likedCuisines.includes(recipe.cuisine)) {
    reasons.push(`matches your ${recipe.cuisine} preference`);
  }

  // Batch cooking features
  if (recipe.batchFriendly) {
    reasons.push('perfect for batch cooking');
  }
  if (recipe.freezable) {
    reasons.push('freezable for long-term storage');
  }
  if (recipe.weeklyPrepFriendly) {
    reasons.push('great for weekly meal prep');
  }

  // Cook time
  const timeDiff = Math.abs(recipe.cookTime - preferences.cookTimePreference);
  if (timeDiff <= 10) {
    reasons.push('matches your preferred cook time');
  }

  // Servings
  const servings = recipe.servings || 1;
  if (servings >= 6) {
    reasons.push(`makes ${servings} servings`);
  }

  if (reasons.length === 0) {
    return 'suitable for batch cooking';
  }

  return reasons.slice(0, 3).join(', ');
}

