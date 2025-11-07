// backend/src/utils/ingredientAvailability.ts
// Ingredient availability tracking and local consideration

import { prisma } from '../lib/prisma';

export interface IngredientAvailability {
  ingredientName: string;
  isAvailable: boolean;
  stores: Array<{
    store: string;
    location?: string;
    isAvailable: boolean;
    lastChecked?: Date;
  }>;
  availabilityScore: number; // 0-100, higher = more available
}

export interface RecipeAvailabilityAnalysis {
  recipeId: string;
  recipeName: string;
  overallAvailability: number; // 0-100
  availableIngredients: number;
  totalIngredients: number;
  unavailableIngredients: string[];
  recommendations: string[];
}

/**
 * Check ingredient availability by location
 */
export async function checkIngredientAvailability(
  ingredientName: string,
  userId: string,
  location?: string
): Promise<IngredientAvailability> {
  // Get user's ingredient costs (which include store/location info)
  const ingredientCosts = await prisma.ingredientCost.findMany({
    where: {
      userId,
      ingredientName: ingredientName.toLowerCase().trim(),
    },
  });

  // If we have cost data, assume ingredient is available at those stores
  const stores = ingredientCosts.map(cost => ({
    store: cost.store || 'Unknown Store',
    location: cost.location || undefined,
    isAvailable: true, // If we have cost data, assume available
    lastChecked: cost.lastUpdated,
  }));

  // Calculate availability score
  // Higher score if we have cost data (means it's been purchased before)
  const availabilityScore = stores.length > 0 ? 80 : 50; // Default to 50 if no data

  return {
    ingredientName,
    isAvailable: stores.length > 0,
    stores,
    availabilityScore,
  };
}

/**
 * Analyze recipe ingredient availability
 */
export async function analyzeRecipeAvailability(
  recipeId: string,
  userId: string,
  location?: string
): Promise<RecipeAvailabilityAnalysis | null> {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: true,
    },
  });

  if (!recipe) {
    return null;
  }

  const ingredientNames: string[] = [];
  const ingredientTexts = recipe.ingredients.map(ing => ing.text.toLowerCase());

  // Extract ingredient names from ingredient texts
  for (const text of ingredientTexts) {
    // Simple extraction - remove quantities and units
    const cleaned = text
      .replace(/^[\d\s\/\.]+\s+(cup|cups|lb|lbs|oz|tbsp|tsp|piece|pieces|clove|cloves|bunch|bunches|fl\s*oz|pint|pints|quart|quarts|gallon|gallons|ml|l|liter|liters|g|gram|grams|kg|kilogram|kilograms)\s+/i, '')
      .replace(/[,\\.]+$/, '')
      .trim();
    
    if (cleaned) {
      ingredientNames.push(cleaned);
    }
  }

  // Check availability for each ingredient
  const availabilityChecks = await Promise.all(
    ingredientNames.map(name => checkIngredientAvailability(name, userId, location))
  );

  const availableCount = availabilityChecks.filter(check => check.isAvailable).length;
  const unavailableIngredients = availabilityChecks
    .filter(check => !check.isAvailable)
    .map(check => check.ingredientName);

  // Calculate overall availability score
  const overallAvailability = ingredientNames.length > 0
    ? Math.round((availableCount / ingredientNames.length) * 100)
    : 100;

  // Generate recommendations
  const recommendations: string[] = [];
  if (unavailableIngredients.length > 0) {
    recommendations.push(
      `${unavailableIngredients.length} ingredient(s) may not be available: ${unavailableIngredients.slice(0, 3).join(', ')}`
    );
  }
  if (overallAvailability < 50) {
    recommendations.push('Many ingredients may be unavailable. Consider alternative recipes.');
  } else if (overallAvailability >= 80) {
    recommendations.push('All ingredients should be readily available!');
  }

  return {
    recipeId,
    recipeName: recipe.title,
    overallAvailability,
    availableIngredients: availableCount,
    totalIngredients: ingredientNames.length,
    unavailableIngredients,
    recommendations,
  };
}

/**
 * Filter recipes by ingredient availability
 */
export async function filterRecipesByAvailability(
  recipeIds: string[],
  userId: string,
  minAvailabilityScore: number = 70
): Promise<string[]> {
  const availabilityChecks = await Promise.all(
    recipeIds.map(id => analyzeRecipeAvailability(id, userId))
  );

  return availabilityChecks
    .filter((analysis): analysis is RecipeAvailabilityAnalysis => 
      analysis !== null && analysis.overallAvailability >= minAvailabilityScore
    )
    .map(analysis => analysis.recipeId);
}

