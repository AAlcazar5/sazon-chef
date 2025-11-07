// backend/src/utils/collaborativeFiltering.ts
// Advanced collaborative filtering (Phase 6, Group 11)

import type { UserBehaviorData } from './behavioralScoring';

export interface CollaborativeScore {
  total: number; // 0-100
  breakdown: {
    userBasedScore: number; // 0-50: Recommendations from similar users
    itemBasedScore: number; // 0-50: Recommendations from similar recipes
  };
  details: {
    similarUsersCount: number;
    similarRecipesCount: number;
    userSimilarityStrength: number;
    itemSimilarityStrength: number;
  };
}

/**
 * User-based collaborative filtering
 * Finds users similar to the current user and recommends recipes they liked
 */
export interface UserSimilarity {
  userId: string;
  similarity: number; // 0-1
  commonInteractions: number;
  sharedPreferences: {
    cuisines: string[];
    macroRanges: {
      calories: { min: number; max: number };
      protein: { min: number; max: number };
    };
    cookTimeRange: { min: number; max: number };
  };
}

/**
 * Item-based collaborative filtering
 * Finds recipes similar to recipes the user has liked
 */
export interface RecipeSimilarity {
  recipeId: string;
  similarity: number; // 0-1
  sharedAttributes: {
    cuisine: boolean;
    ingredients: string[];
    macroSimilarity: number;
    cookTimeSimilarity: number;
  };
}

/**
 * Calculate collaborative filtering score
 */
export async function calculateCollaborativeScore(
  recipe: any,
  currentUserId: string,
  userBehavior: UserBehaviorData
): Promise<CollaborativeScore> {
  // Import Prisma
  const { prisma } = await import('@/lib/prisma');
  
  // User-based collaborative filtering
  const userBasedScore = await calculateUserBasedScore(
    recipe,
    currentUserId,
    userBehavior,
    prisma
  );
  
  // Item-based collaborative filtering
  const itemBasedScore = await calculateItemBasedScore(
    recipe,
    userBehavior,
    prisma
  );
  
  const total = Math.round(userBasedScore.score + itemBasedScore.score);
  
  return {
    total: Math.max(0, Math.min(100, total)),
    breakdown: {
      userBasedScore: Math.min(50, userBasedScore.score),
      itemBasedScore: Math.min(50, itemBasedScore.score),
    },
    details: {
      similarUsersCount: userBasedScore.similarUsersCount,
      similarRecipesCount: itemBasedScore.similarRecipesCount,
      userSimilarityStrength: userBasedScore.avgSimilarity,
      itemSimilarityStrength: itemBasedScore.avgSimilarity,
    },
  };
}

/**
 * User-based collaborative filtering
 */
async function calculateUserBasedScore(
  recipe: any,
  currentUserId: string,
  userBehavior: UserBehaviorData,
  prisma: any
): Promise<{
  score: number;
  similarUsersCount: number;
  avgSimilarity: number;
}> {
  // Get all users with similar preferences
  const similarUsers = await findSimilarUsers(currentUserId, userBehavior, prisma);
  
  if (similarUsers.length === 0) {
    return { score: 0, similarUsersCount: 0, avgSimilarity: 0 };
  }
  
  // Check how many similar users liked/saved this recipe
  const recipeId = recipe.id;
  let weightedScore = 0;
  let totalWeight = 0;
  
  for (const similarUser of similarUsers) {
    // Check if this user has interacted with this recipe
    const hasLiked = await prisma.recipeFeedback.findFirst({
      where: {
        userId: similarUser.userId,
        recipeId: recipeId,
        liked: true,
      },
    });
    
    const hasSaved = await prisma.savedRecipe.findFirst({
      where: {
        userId: similarUser.userId,
        recipeId: recipeId,
      },
    });
    
    const hasConsumed = await prisma.mealHistory.findFirst({
      where: {
        userId: similarUser.userId,
        recipeId: recipeId,
        consumed: true,
      },
    });
    
    if (hasLiked || hasSaved || hasConsumed) {
      // Weight by similarity and common interactions
      const weight = similarUser.similarity * (1 + similarUser.commonInteractions * 0.1);
      weightedScore += weight * 50; // Max 50 points per similar user
      totalWeight += weight;
    }
  }
  
  const score = totalWeight > 0 ? weightedScore / Math.max(totalWeight, 1) : 0;
  const avgSimilarity = similarUsers.reduce((sum, u) => sum + u.similarity, 0) / similarUsers.length;
  
  return {
    score: Math.min(50, Math.round(score)),
    similarUsersCount: similarUsers.length,
    avgSimilarity,
  };
}

/**
 * Find users similar to the current user
 */
async function findSimilarUsers(
  currentUserId: string,
  userBehavior: UserBehaviorData,
  prisma: any
): Promise<UserSimilarity[]> {
  // Get current user's preferences
  const currentUserPrefs = await prisma.userPreferences.findFirst({
    where: { userId: currentUserId },
  });
  
  if (!currentUserPrefs) {
    return [];
  }
  
  // Get all other users
  const allUsers = await prisma.user.findMany({
    where: {
      id: { not: currentUserId },
    },
    include: {
      preferences: true,
    },
  });
  
  const similarUsers: UserSimilarity[] = [];
  
  for (const user of allUsers) {
    if (!user.preferences) continue;
    
    // Calculate similarity based on preferences and behavior
    const similarity = await calculateUserSimilarity(
      userBehavior,
      currentUserPrefs,
      user.preferences,
      user.id,
      prisma
    );
    
    if (similarity.similarity > 0.3) { // Threshold for similar users
      similarUsers.push({
        userId: user.id,
        similarity: similarity.similarity,
        commonInteractions: similarity.commonInteractions,
        sharedPreferences: similarity.sharedPreferences,
      });
    }
  }
  
  // Sort by similarity and return top 20
  return similarUsers
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 20);
}

/**
 * Calculate similarity between two users
 */
async function calculateUserSimilarity(
  currentUserBehavior: UserBehaviorData,
  currentUserPrefs: any,
  otherUserPrefs: any,
  otherUserId: string,
  prisma: any
): Promise<{
  similarity: number;
  commonInteractions: number;
  sharedPreferences: UserSimilarity['sharedPreferences'];
}> {
  let similarity = 0;
  let factors = 0;
  
  // 1. Cuisine preferences similarity (30%)
  const currentCuisines = new Set(
    (currentUserPrefs.likedCuisines || []).map((c: any) => (c.name || c).toLowerCase())
  );
  const otherCuisines = new Set(
    (otherUserPrefs.likedCuisines || []).map((c: any) => (c.name || c).toLowerCase())
  );
  
  const cuisineIntersection = Array.from(currentCuisines).filter(c => otherCuisines.has(c)).length;
  const cuisineUnion = new Set([...Array.from(currentCuisines), ...Array.from(otherCuisines)]).size;
  const cuisineSimilarity = cuisineUnion > 0 ? cuisineIntersection / cuisineUnion : 0;
  similarity += cuisineSimilarity * 0.3;
  factors++;
  
  // 2. Dietary restrictions similarity (20%)
  const currentDietary = new Set((currentUserPrefs.dietaryRestrictions || []).map((d: string) => d.toLowerCase()));
  const otherDietary = new Set((otherUserPrefs.dietaryRestrictions || []).map((d: string) => d.toLowerCase()));
  const dietaryMatch = currentDietary.size === otherDietary.size && 
    [...currentDietary].every(d => otherDietary.has(d));
  similarity += (dietaryMatch ? 1 : 0) * 0.2;
  factors++;
  
  // 3. Common recipe interactions (40%)
  const currentLikedIds = new Set(currentUserBehavior.likedRecipes.map(r => r.recipeId));
  const currentSavedIds = new Set(currentUserBehavior.savedRecipes.map(r => r.recipeId));
  const currentConsumedIds = new Set(currentUserBehavior.consumedRecipes.map(r => r.recipeId));
  
  const otherLiked = await prisma.recipeFeedback.findMany({
    where: { userId: otherUserId, liked: true },
    select: { recipeId: true },
  });
  const otherSaved = await prisma.savedRecipe.findMany({
    where: { userId: otherUserId },
    select: { recipeId: true },
  });
  const otherConsumed = await prisma.mealHistory.findMany({
    where: { userId: otherUserId, consumed: true },
    select: { recipeId: true },
  });
  
  const otherLikedIds = new Set(otherLiked.map((r: any) => r.recipeId));
  const otherSavedIds = new Set(otherSaved.map((r: any) => r.recipeId));
  const otherConsumedIds = new Set(otherConsumed.map((r: any) => r.recipeId));
  
  const commonLiked = Array.from(currentLikedIds).filter(id => otherLikedIds.has(id)).length;
  const commonSaved = Array.from(currentSavedIds).filter(id => otherSavedIds.has(id)).length;
  const commonConsumed = Array.from(currentConsumedIds).filter(id => otherConsumedIds.has(id)).length;
  const commonInteractions = commonLiked + commonSaved + commonConsumed;
  
  const totalInteractions = currentLikedIds.size + currentSavedIds.size + currentConsumedIds.size +
    otherLikedIds.size + otherSavedIds.size + otherConsumedIds.size;
  const interactionSimilarity = totalInteractions > 0 ? commonInteractions / totalInteractions : 0;
  similarity += interactionSimilarity * 0.4;
  factors++;
  
  // 4. Macro goals similarity (10%)
  // Simplified: just check if both users have macro goals set
  const currentMacroGoals = await prisma.macroGoals.findFirst({
    where: { userId: currentUserPrefs.userId },
  });
  const otherMacroGoals = await prisma.macroGoals.findFirst({
    where: { userId: otherUserPrefs.userId },
  });
  const macroSimilarity = (currentMacroGoals && otherMacroGoals) ? 1 : 0;
  similarity += macroSimilarity * 0.1;
  factors++;
  
  // Calculate shared preferences
  const sharedCuisines = Array.from(currentCuisines).filter(c => otherCuisines.has(c)) as string[];
  const currentMacroRanges = calculateMacroRanges(currentUserBehavior);
  const otherUserBehavior = await getUserBehaviorForSimilarity(otherUserId, prisma);
  const otherMacroRanges = calculateMacroRanges(otherUserBehavior);
  
  const sharedPreferences = {
    cuisines: sharedCuisines,
    macroRanges: {
      calories: {
        min: Math.max(currentMacroRanges.calories.min, otherMacroRanges.calories.min),
        max: Math.min(currentMacroRanges.calories.max, otherMacroRanges.calories.max),
      },
      protein: {
        min: Math.max(currentMacroRanges.protein.min, otherMacroRanges.protein.min),
        max: Math.min(currentMacroRanges.protein.max, otherMacroRanges.protein.max),
      },
    },
    cookTimeRange: {
      min: Math.max(currentMacroRanges.cookTime.min, otherMacroRanges.cookTime.min),
      max: Math.min(currentMacroRanges.cookTime.max, otherMacroRanges.cookTime.max),
    },
  };
  
  return {
    similarity: Math.min(1, similarity),
    commonInteractions,
    sharedPreferences,
  };
}

/**
 * Item-based collaborative filtering
 */
async function calculateItemBasedScore(
  recipe: any,
  userBehavior: UserBehaviorData,
  prisma: any
): Promise<{
  score: number;
  similarRecipesCount: number;
  avgSimilarity: number;
}> {
  // Get recipes the user has liked/saved
  const likedRecipeIds = userBehavior.likedRecipes.map(r => r.recipeId);
  const savedRecipeIds = userBehavior.savedRecipes.map(r => r.recipeId);
  const positiveRecipeIds = [...likedRecipeIds, ...savedRecipeIds];
  
  if (positiveRecipeIds.length === 0) {
    return { score: 0, similarRecipesCount: 0, avgSimilarity: 0 };
  }
  
  // Find similar recipes
  const similarRecipes = await findSimilarRecipes(
    recipe,
    positiveRecipeIds,
    prisma
  );
  
  if (similarRecipes.length === 0) {
    return { score: 0, similarRecipesCount: 0, avgSimilarity: 0 };
  }
  
  // Weight by similarity
  const weightedScore = similarRecipes.reduce((sum, similar) => sum + similar.similarity, 0);
  const avgSimilarity = weightedScore / similarRecipes.length;
  const score = Math.min(50, Math.round(avgSimilarity * 50));
  
  return {
    score,
    similarRecipesCount: similarRecipes.length,
    avgSimilarity,
  };
}

/**
 * Find recipes similar to recipes the user has liked
 */
async function findSimilarRecipes(
  targetRecipe: any,
  positiveRecipeIds: string[],
  prisma: any
): Promise<RecipeSimilarity[]> {
  // Get positive recipes
  const positiveRecipes = await prisma.recipe.findMany({
    where: { id: { in: positiveRecipeIds } },
    include: {
      ingredients: { orderBy: { order: 'asc' } },
    },
  });
  
  const similarRecipes: RecipeSimilarity[] = [];
  
  for (const positiveRecipe of positiveRecipes) {
    const similarity = calculateRecipeSimilarity(targetRecipe, positiveRecipe);
    
    if (similarity.similarity > 0.4) { // Threshold for similar recipes
      similarRecipes.push({
        recipeId: positiveRecipe.id,
        similarity: similarity.similarity,
        sharedAttributes: similarity.sharedAttributes,
      });
    }
  }
  
  // Sort by similarity and return top 10
  return similarRecipes
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10);
}

/**
 * Calculate similarity between two recipes
 */
export function calculateRecipeSimilarity(
  recipe1: any,
  recipe2: any
): {
  similarity: number;
  sharedAttributes: RecipeSimilarity['sharedAttributes'];
} {
  let similarity = 0;
  let factors = 0;
  
  // 1. Cuisine match (20%)
  const cuisineMatch = (recipe1.cuisine || '').toLowerCase() === (recipe2.cuisine || '').toLowerCase();
  similarity += (cuisineMatch ? 1 : 0) * 0.2;
  factors++;
  
  // 2. Ingredient overlap (40%)
  const ingredients1 = new Set(
    (recipe1.ingredients || []).map((i: any) => (i.text || i.name || '').toLowerCase().trim())
  );
  const ingredients2 = new Set(
    (recipe2.ingredients || []).map((i: any) => (i.text || i.name || '').toLowerCase().trim())
  );
  
  const ingredientIntersection = Array.from(ingredients1).filter(i => ingredients2.has(i)).length;
  const ingredientUnion = new Set([...Array.from(ingredients1), ...Array.from(ingredients2)]).size;
  const ingredientSimilarity = ingredientUnion > 0 ? ingredientIntersection / ingredientUnion : 0;
  similarity += ingredientSimilarity * 0.4;
  factors++;
  
  // 3. Macro similarity (25%)
  const macroSimilarity = calculateMacroSimilarity(recipe1, recipe2);
  similarity += macroSimilarity * 0.25;
  factors++;
  
  // 4. Cook time similarity (15%)
  const cookTimeDiff = Math.abs((recipe1.cookTime || 0) - (recipe2.cookTime || 0));
  const maxCookTime = Math.max(recipe1.cookTime || 0, recipe2.cookTime || 0, 60);
  const cookTimeSimilarity = Math.max(0, 1 - cookTimeDiff / maxCookTime);
  similarity += cookTimeSimilarity * 0.15;
  factors++;
  
  const sharedIngredients = Array.from(ingredients1).filter(i => ingredients2.has(i)) as string[];
  
  return {
    similarity: Math.min(1, similarity),
    sharedAttributes: {
      cuisine: cuisineMatch,
      ingredients: sharedIngredients,
      macroSimilarity,
      cookTimeSimilarity,
    },
  };
}

/**
 * Calculate macro similarity between two recipes
 */
export function calculateMacroSimilarity(recipe1: any, recipe2: any): number {
  const macros1 = [recipe1.calories || 0, recipe1.protein || 0, recipe1.carbs || 0, recipe1.fat || 0];
  const macros2 = [recipe2.calories || 0, recipe2.protein || 0, recipe2.carbs || 0, recipe2.fat || 0];
  
  const total1 = macros1.reduce((sum, val) => sum + val, 0);
  const total2 = macros2.reduce((sum, val) => sum + val, 0);
  
  if (total1 === 0 || total2 === 0) return 0;
  
  // Calculate normalized macro vectors
  const normalized1 = macros1.map(val => val / total1);
  const normalized2 = macros2.map(val => val / total2);
  
  // Calculate cosine similarity
  const dotProduct = normalized1.reduce((sum, val, i) => sum + val * normalized2[i], 0);
  const magnitude1 = Math.sqrt(normalized1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(normalized2.reduce((sum, val) => sum + val * val, 0));
  
  return magnitude1 > 0 && magnitude2 > 0 ? dotProduct / (magnitude1 * magnitude2) : 0;
}

/**
 * Helper: Get user behavior for similarity calculation
 */
async function getUserBehaviorForSimilarity(userId: string, prisma: any): Promise<UserBehaviorData> {
  const likedRecipes = await prisma.recipeFeedback.findMany({
    where: { userId, liked: true },
    include: { recipe: true },
  });
  
  const savedRecipes = await prisma.savedRecipe.findMany({
    where: { userId },
    include: { recipe: true },
  });
  
  const consumedRecipes = await prisma.mealHistory.findMany({
    where: { userId, consumed: true },
    include: { recipe: true },
  });
  
  return {
    likedRecipes: likedRecipes.map((r: any) => ({
      recipeId: r.recipeId,
      cuisine: r.recipe.cuisine,
      cookTime: r.recipe.cookTime,
      calories: r.recipe.calories,
      protein: r.recipe.protein,
      carbs: r.recipe.carbs,
      fat: r.recipe.fat,
      ingredients: r.recipe.ingredients || [],
      createdAt: r.createdAt,
    })),
    dislikedRecipes: [],
    savedRecipes: savedRecipes.map((r: any) => ({
      recipeId: r.recipeId,
      cuisine: r.recipe.cuisine,
      cookTime: r.recipe.cookTime,
      calories: r.recipe.calories,
      protein: r.recipe.protein,
      carbs: r.recipe.carbs,
      fat: r.recipe.fat,
      ingredients: r.recipe.ingredients || [],
      savedDate: r.savedDate,
    })),
    consumedRecipes: consumedRecipes.map((r: any) => ({
      recipeId: r.recipeId,
      cuisine: r.recipe.cuisine,
      cookTime: r.recipe.cookTime,
      calories: r.recipe.calories,
      protein: r.recipe.protein,
      carbs: r.recipe.carbs,
      fat: r.recipe.fat,
      ingredients: r.recipe.ingredients || [],
      date: r.date,
    })),
  };
}

/**
 * Helper: Calculate macro ranges from user behavior
 */
export function calculateMacroRanges(userBehavior: UserBehaviorData): {
  calories: { min: number; max: number };
  protein: { min: number; max: number };
  cookTime: { min: number; max: number };
} {
  const allRecipes = [
    ...userBehavior.likedRecipes,
    ...userBehavior.savedRecipes,
    ...userBehavior.consumedRecipes,
  ];
  
  if (allRecipes.length === 0) {
    return {
      calories: { min: 0, max: 0 },
      protein: { min: 0, max: 0 },
      cookTime: { min: 0, max: 0 },
    };
  }
  
  const calories = allRecipes.map(r => r.calories);
  const protein = allRecipes.map(r => r.protein);
  const cookTime = allRecipes.map(r => r.cookTime);
  
  return {
    calories: {
      min: Math.min(...calories),
      max: Math.max(...calories),
    },
    protein: {
      min: Math.min(...protein),
      max: Math.max(...protein),
    },
    cookTime: {
      min: Math.min(...cookTime),
      max: Math.max(...cookTime),
    },
  };
}

