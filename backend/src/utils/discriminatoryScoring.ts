// backend/src/utils/discriminatoryScoring.ts

export interface UserPreferences {
  likedCuisines: string[];
  bannedIngredients: string[];
  dietaryRestrictions: string[];
  cookTimePreference: number;
  spiceLevel: string;
}

export interface DiscriminatoryScore {
  total: number;
  breakdown: {
    cuisineMatch: number;
    ingredientPenalty: number;
    cookTimeMatch: number;
    dietaryMatch: number;
    spiceMatch: number;
  };
}

export function calculateDiscriminatoryScore(
  recipe: any,
  userPreferences: UserPreferences
): DiscriminatoryScore {
  const breakdown = {
    cuisineMatch: calculateCuisineMatch(recipe, userPreferences),
    ingredientPenalty: calculateIngredientPenalty(recipe, userPreferences),
    cookTimeMatch: calculateCookTimeMatch(recipe, userPreferences),
    dietaryMatch: calculateDietaryMatch(recipe, userPreferences),
    spiceMatch: calculateSpiceMatch(recipe, userPreferences)
  };

  // Calculate total score with weights
  const total = Math.round(
    breakdown.cuisineMatch * 0.3 +           // 30% weight for cuisine
    (100 - breakdown.ingredientPenalty) * 0.25 + // 25% weight for ingredient penalty (inverted)
    breakdown.cookTimeMatch * 0.2 +          // 20% weight for cook time
    breakdown.dietaryMatch * 0.15 +          // 15% weight for dietary
    breakdown.spiceMatch * 0.1               // 10% weight for spice
  );

  return {
    total: Math.max(0, Math.min(100, total)),
    breakdown
  };
}

function calculateCuisineMatch(recipe: any, userPreferences: UserPreferences): number {
  const { likedCuisines } = userPreferences;
  
  if (likedCuisines.length === 0) {
    return 50; // Neutral if no preferences
  }
  
  if (likedCuisines.includes(recipe.cuisine)) {
    return 90; // High score for preferred cuisine
  }
  
  return 20; // Low score for non-preferred cuisine
}

function calculateIngredientPenalty(recipe: any, userPreferences: UserPreferences): number {
  const { bannedIngredients } = userPreferences;
  
  if (bannedIngredients.length === 0) {
    return 0; // No penalty if no banned ingredients
  }
  
  // Check if recipe contains any banned ingredients
  const recipeIngredients = recipe.ingredients?.map((ing: any) => 
    ing.text.toLowerCase()
  ) || [];
  
  const hasBannedIngredients = recipeIngredients.some((ingredient: string) =>
    bannedIngredients.some(banned => 
      ingredient.includes(banned.toLowerCase())
    )
  );
  
  if (hasBannedIngredients) {
    return 60; // High penalty for banned ingredients
  }
  
  return 0; // No penalty
}

function calculateCookTimeMatch(recipe: any, userPreferences: UserPreferences): number {
  const { cookTimePreference } = userPreferences;
  const recipeCookTime = recipe.cookTime;
  
  if (!cookTimePreference) {
    return 50; // Neutral if no preference
  }
  
  const timeDifference = Math.abs(recipeCookTime - cookTimePreference);
  
  if (timeDifference <= 5) {
    return 95; // Excellent match (within 5 minutes)
  } else if (timeDifference <= 15) {
    return 80; // Good match (within 15 minutes)
  } else if (timeDifference <= 30) {
    return 60; // Fair match (within 30 minutes)
  } else {
    return 30; // Poor match (more than 30 minutes difference)
  }
}

function calculateDietaryMatch(recipe: any, userPreferences: UserPreferences): number {
  const { dietaryRestrictions } = userPreferences;
  
  if (dietaryRestrictions.length === 0) {
    return 50; // Neutral if no dietary restrictions
  }
  
  // This would need to be expanded based on recipe data
  // For now, return neutral score
  return 50;
}

function calculateSpiceMatch(recipe: any, userPreferences: UserPreferences): number {
  const { spiceLevel } = userPreferences;
  
  if (!spiceLevel) {
    return 50; // Neutral if no preference
  }
  
  // This would need recipe spice level data
  // For now, return neutral score
  return 50;
}

// Helper function to get user preferences from database
export async function getUserPreferencesForScoring(userId: string) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    const preferences = await prisma.userPreferences.findFirst({
      where: { userId },
      include: {
        likedCuisines: true,
        bannedIngredients: true,
        dietaryRestrictions: true
      }
    });
    
    if (!preferences) {
      return null;
    }
    
    return {
      likedCuisines: preferences.likedCuisines.map((c: any) => c.name),
      bannedIngredients: preferences.bannedIngredients.map((i: any) => i.name),
      dietaryRestrictions: preferences.dietaryRestrictions.map((d: any) => d.name),
      cookTimePreference: preferences.cookTimePreference,
      spiceLevel: preferences.spiceLevel
    };
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}
