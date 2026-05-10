// backend/src/utils/collaborativeFiltering.ts
// Advanced collaborative filtering (Phase 6, Group 11)

import type { UserBehaviorData } from './behavioralScoring';
import type { ScoringIngredient, ScoringRecipe } from './scoringTypes';

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
  recipe: ScoringRecipe,
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
 *
 * H5: previously did N (similar users) × 3 (findFirst per interaction)
 * round-trips PER recipe. For a 200-recipe scoring pass with 20 similar
 * users that meant ~12,000 SQLite queries. Now batched into 3 findMany
 * calls regardless of N.
 */
async function calculateUserBasedScore(
  recipe: ScoringRecipe,
  currentUserId: string,
  userBehavior: UserBehaviorData,
  prisma: any
): Promise<{
  score: number;
  similarUsersCount: number;
  avgSimilarity: number;
}> {
  const similarUsers = await findSimilarUsers(currentUserId, userBehavior, prisma);

  if (similarUsers.length === 0) {
    return { score: 0, similarUsersCount: 0, avgSimilarity: 0 };
  }

  const recipeId = recipe.id;
  const candidateIds = similarUsers.map((u) => u.userId);

  // H5: 3 batched queries (was N×3 findFirsts inside a loop). Each returns
  // only the userIds that interacted with THIS recipe; we merge to a Set
  // for O(1) membership checks below.
  const [liked, saved, consumed] = await Promise.all([
    prisma.recipeFeedback.findMany({
      where: { userId: { in: candidateIds }, recipeId, liked: true },
      select: { userId: true },
    }),
    prisma.savedRecipe.findMany({
      where: { userId: { in: candidateIds }, recipeId },
      select: { userId: true },
    }),
    prisma.mealHistory.findMany({
      where: { userId: { in: candidateIds }, recipeId, consumed: true },
      select: { userId: true },
    }),
  ]);

  const interactedUserIds = new Set<string>([
    ...liked.map((r: { userId: string }) => r.userId),
    ...saved.map((r: { userId: string }) => r.userId),
    ...consumed.map((r: { userId: string }) => r.userId),
  ]);

  let weightedScore = 0;
  let totalWeight = 0;

  for (const similarUser of similarUsers) {
    if (interactedUserIds.has(similarUser.userId)) {
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

/** H5: cap candidate-user scan. Pre-fix `findMany` returned every user. */
const CANDIDATE_USER_CAP = 500;

/**
 * Find users similar to the current user.
 *
 * H5 rewrite: was O(users) full-table scan + O(users) per-user DB queries
 * inside `calculateUserSimilarity` (3 findMany + 1 findFirst per candidate).
 * Now: 1 capped findMany for candidates + 4 batched `userId: { in: [...] }`
 * queries up front, then a synchronous similarity loop.
 */
async function findSimilarUsers(
  currentUserId: string,
  userBehavior: UserBehaviorData,
  prisma: any
): Promise<UserSimilarity[]> {
  const currentUserPrefs = await prisma.userPreferences.findFirst({
    where: { userId: currentUserId },
    include: { likedCuisines: true, dietaryRestrictions: true },
  });

  if (!currentUserPrefs) {
    return [];
  }

  // H5: cap at CANDIDATE_USER_CAP. Pre-fix this scanned the entire users
  // table. Picking the most-recently-active users keeps the candidate pool
  // relevant; full clustering / cuisine pre-filter is a future TB1 task.
  const allUsers = await prisma.user.findMany({
    where: {
      id: { not: currentUserId },
      preferences: { isNot: null },
    },
    include: {
      preferences: { include: { likedCuisines: true, dietaryRestrictions: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: CANDIDATE_USER_CAP,
  });

  if (allUsers.length === 0) return [];

  const candidateIds = allUsers.map((u: { id: string }) => u.id);

  // H5: hoist all per-candidate DB calls out of the similarity loop and
  // batch them. Pre-fix, each candidate triggered 4 round-trips inside
  // calculateUserSimilarity → 500 candidates × 4 = 2,000 queries. Now: 4.
  const currentMacroGoals = await prisma.macroGoals.findFirst({
    where: { userId: currentUserId },
    select: { userId: true },
  });
  const [allLiked, allSaved, allConsumed, allMacroGoals] = await Promise.all([
    prisma.recipeFeedback.findMany({
      where: { userId: { in: candidateIds }, liked: true },
      select: { userId: true, recipeId: true },
    }),
    prisma.savedRecipe.findMany({
      where: { userId: { in: candidateIds } },
      select: { userId: true, recipeId: true },
    }),
    prisma.mealHistory.findMany({
      where: { userId: { in: candidateIds }, consumed: true },
      select: { userId: true, recipeId: true },
    }),
    prisma.macroGoals.findMany({
      where: { userId: { in: candidateIds } },
      select: { userId: true },
    }),
  ]);

  // Index per-candidate interaction sets for O(1) lookup in the sync loop.
  const likedByUser = bucketByUser(allLiked);
  const savedByUser = bucketByUser(allSaved);
  const consumedByUser = bucketByUser(allConsumed);
  const candidatesWithMacros = new Set<string>(
    allMacroGoals.map((g: { userId: string }) => g.userId),
  );

  const similarUsers: UserSimilarity[] = [];

  for (const user of allUsers) {
    if (!user.preferences) continue;

    const similarity = calculateUserSimilarityFromBatch(
      userBehavior,
      currentUserPrefs,
      user.preferences,
      likedByUser.get(user.id) ?? new Set(),
      savedByUser.get(user.id) ?? new Set(),
      consumedByUser.get(user.id) ?? new Set(),
      candidatesWithMacros.has(user.id),
      Boolean(currentMacroGoals),
    );

    if (similarity.similarity > 0.3) {
      similarUsers.push({
        userId: user.id,
        similarity: similarity.similarity,
        commonInteractions: similarity.commonInteractions,
        sharedPreferences: similarity.sharedPreferences,
      });
    }
  }

  return similarUsers
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 20);
}

function bucketByUser(
  rows: Array<{ userId: string; recipeId: string }>,
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    let set = map.get(row.userId);
    if (!set) {
      set = new Set<string>();
      map.set(row.userId, set);
    }
    set.add(row.recipeId);
  }
  return map;
}

/**
 * Calculate similarity between two users — synchronous, takes pre-batched
 * interaction sets so the caller (`findSimilarUsers`) can issue 4 batched
 * queries up front instead of 4 per-candidate.
 *
 * H5: replaces the previous async `calculateUserSimilarity` which hit the
 * DB 4× per call. The shared-preferences `macroRanges` block was dropped
 * because (a) it's never read by callers and (b) it required loading every
 * candidate's full recipe history to compute. `cuisines` is preserved.
 */
function calculateUserSimilarityFromBatch(
  currentUserBehavior: UserBehaviorData,
  currentUserPrefs: any,
  otherUserPrefs: any,
  otherLikedIds: Set<string>,
  otherSavedIds: Set<string>,
  otherConsumedIds: Set<string>,
  otherHasMacroGoals: boolean,
  currentHasMacroGoals: boolean,
): {
  similarity: number;
  commonInteractions: number;
  sharedPreferences: UserSimilarity['sharedPreferences'];
} {
  let similarity = 0;

  // 1. Cuisine preferences similarity (30%) — Jaccard
  const currentCuisines = new Set(
    (currentUserPrefs.likedCuisines || []).map((c: any) => (c.name || c).toLowerCase()),
  );
  const otherCuisines = new Set(
    (otherUserPrefs.likedCuisines || []).map((c: any) => (c.name || c).toLowerCase()),
  );
  const cuisineIntersection = Array.from(currentCuisines).filter((c) => otherCuisines.has(c)).length;
  const cuisineUnion = new Set([...Array.from(currentCuisines), ...Array.from(otherCuisines)]).size;
  const cuisineSimilarity = cuisineUnion > 0 ? cuisineIntersection / cuisineUnion : 0;
  similarity += cuisineSimilarity * 0.3;

  // 2. Dietary restrictions similarity (20%) — exact-set match
  const currentDietary = new Set(
    (currentUserPrefs.dietaryRestrictions || []).map((d: any) =>
      (typeof d === 'string' ? d : d.name || '').toLowerCase(),
    ),
  );
  const otherDietary = new Set(
    (otherUserPrefs.dietaryRestrictions || []).map((d: any) =>
      (typeof d === 'string' ? d : d.name || '').toLowerCase(),
    ),
  );
  const dietaryMatch =
    currentDietary.size === otherDietary.size &&
    [...currentDietary].every((d) => otherDietary.has(d));
  similarity += (dietaryMatch ? 1 : 0) * 0.2;

  // 3. Common recipe interactions (40%) — Jaccard over the union of
  // (liked ∪ saved ∪ consumed) ids on both sides.
  const currentLikedIds = new Set(currentUserBehavior.likedRecipes.map((r) => r.recipeId));
  const currentSavedIds = new Set(currentUserBehavior.savedRecipes.map((r) => r.recipeId));
  const currentConsumedIds = new Set(currentUserBehavior.consumedRecipes.map((r) => r.recipeId));

  const commonLiked = Array.from(currentLikedIds).filter((id) => otherLikedIds.has(id)).length;
  const commonSaved = Array.from(currentSavedIds).filter((id) => otherSavedIds.has(id)).length;
  const commonConsumed = Array.from(currentConsumedIds).filter((id) => otherConsumedIds.has(id)).length;
  const commonInteractions = commonLiked + commonSaved + commonConsumed;

  const totalInteractions =
    currentLikedIds.size + currentSavedIds.size + currentConsumedIds.size +
    otherLikedIds.size + otherSavedIds.size + otherConsumedIds.size;
  const interactionSimilarity = totalInteractions > 0 ? commonInteractions / totalInteractions : 0;
  similarity += interactionSimilarity * 0.4;

  // 4. Macro goals similarity (10%) — both users have macro goals set?
  similarity += (currentHasMacroGoals && otherHasMacroGoals ? 1 : 0) * 0.1;

  const sharedCuisines = Array.from(currentCuisines).filter((c) => otherCuisines.has(c)) as string[];

  // H5: shared `macroRanges` dropped — previously required loading every
  // candidate's full recipe history (3 more queries per candidate). Field
  // is unused outside this file. `cuisines` retained.
  const sharedPreferences: UserSimilarity['sharedPreferences'] = {
    cuisines: sharedCuisines,
    macroRanges: {
      calories: { min: 0, max: 0 },
      protein: { min: 0, max: 0 },
    },
    cookTimeRange: { min: 0, max: 0 },
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
  recipe: ScoringRecipe,
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
  targetRecipe: ScoringRecipe,
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
  recipe1: ScoringRecipe,
  recipe2: ScoringRecipe
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
    (recipe1.ingredients || []).map((i: ScoringIngredient) => (i.text || i.name || '').toLowerCase().trim())
  );
  const ingredients2 = new Set(
    (recipe2.ingredients || []).map((i: ScoringIngredient) => (i.text || i.name || '').toLowerCase().trim())
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
export function calculateMacroSimilarity(recipe1: ScoringRecipe, recipe2: ScoringRecipe): number {
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

