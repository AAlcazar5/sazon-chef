// backend/src/utils/behavioralScoring.ts

export interface UserBehaviorData {
  likedRecipes: Array<{
    recipeId: string;
    cuisine: string;
    cookTime: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    ingredients: Array<{ text: string }>;
    createdAt: Date;
  }>;
  dislikedRecipes: Array<{
    recipeId: string;
    cuisine: string;
    cookTime: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    ingredients: Array<{ text: string }>;
    createdAt: Date;
  }>;
  savedRecipes: Array<{
    recipeId: string;
    cuisine: string;
    cookTime: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    ingredients: Array<{ text: string }>;
    savedDate: Date;
  }>;
  consumedRecipes: Array<{
    recipeId: string;
    cuisine: string;
    cookTime: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    ingredients: Array<{ text: string }>;
    date: Date;
  }>;
}

export interface BehavioralScore {
  cuisinePreference: number;
  cookTimePreference: number;
  macroPreference: number;
  ingredientPreference: number;
  recencyBonus: number;
  total: number;
}

/**
 * Pre-computed user taste profile.
 * Build once before the recipe scoring loop, then pass to calculateBehavioralScoreFromProfile
 * to avoid O(n_interactions) work per recipe.
 */
export interface UserTasteProfile {
  // Cuisine counts: positive (liked/saved/consumed) and negative (disliked)
  positiveCuisineCounts: Record<string, number>;
  negativeCuisineCounts: Record<string, number>;
  // Average cook time for positive interactions
  avgPositiveCookTime: number;
  avgNegativeCookTime: number;
  // Average macros from liked recipes
  avgLikedMacros: { calories: number; protein: number; carbs: number; fat: number } | null;
  // Ingredient preference counts
  likedIngredientCounts: Record<string, number>;
  dislikedIngredientCounts: Record<string, number>;
  // Recency bonus (same for all recipes, computed once)
  recencyBonus: number;
  hasData: boolean;
}

/** Build a UserTasteProfile from UserBehaviorData. Call once per request before the recipe loop. */
export function buildUserTasteProfile(userBehavior: UserBehaviorData): UserTasteProfile {
  const { likedRecipes, dislikedRecipes, savedRecipes, consumedRecipes } = userBehavior;
  const hasData = likedRecipes.length + dislikedRecipes.length + savedRecipes.length + consumedRecipes.length > 0;

  if (!hasData) {
    return {
      positiveCuisineCounts: {}, negativeCuisineCounts: {},
      avgPositiveCookTime: 0, avgNegativeCookTime: 0,
      avgLikedMacros: null,
      likedIngredientCounts: {}, dislikedIngredientCounts: {},
      recencyBonus: 50,
      hasData: false,
    };
  }

  // Cuisine counts
  const positiveCuisineCounts: Record<string, number> = {};
  const negativeCuisineCounts: Record<string, number> = {};
  for (const r of likedRecipes) positiveCuisineCounts[r.cuisine] = (positiveCuisineCounts[r.cuisine] || 0) + 1;
  for (const r of savedRecipes) positiveCuisineCounts[r.cuisine] = (positiveCuisineCounts[r.cuisine] || 0) + 1;
  for (const r of consumedRecipes) positiveCuisineCounts[r.cuisine] = (positiveCuisineCounts[r.cuisine] || 0) + 1;
  for (const r of dislikedRecipes) negativeCuisineCounts[r.cuisine] = (negativeCuisineCounts[r.cuisine] || 0) + 1;

  // Cook time averages
  const positiveCookTimes = [...likedRecipes, ...savedRecipes, ...consumedRecipes].map(r => r.cookTime);
  const negativeCookTimes = dislikedRecipes.map(r => r.cookTime);
  const avgPositiveCookTime = positiveCookTimes.length > 0
    ? positiveCookTimes.reduce((s, v) => s + v, 0) / positiveCookTimes.length : 0;
  const avgNegativeCookTime = negativeCookTimes.length > 0
    ? negativeCookTimes.reduce((s, v) => s + v, 0) / negativeCookTimes.length : 0;

  // Macro averages from liked recipes
  let avgLikedMacros: UserTasteProfile['avgLikedMacros'] = null;
  if (likedRecipes.length > 0) {
    avgLikedMacros = {
      calories: likedRecipes.reduce((s, r) => s + r.calories, 0) / likedRecipes.length,
      protein: likedRecipes.reduce((s, r) => s + r.protein, 0) / likedRecipes.length,
      carbs: likedRecipes.reduce((s, r) => s + r.carbs, 0) / likedRecipes.length,
      fat: likedRecipes.reduce((s, r) => s + r.fat, 0) / likedRecipes.length,
    };
  }

  // Ingredient counts
  const likedIngredientCounts: Record<string, number> = {};
  const dislikedIngredientCounts: Record<string, number> = {};
  for (const r of likedRecipes) for (const i of r.ingredients) {
    const t = i.text.toLowerCase();
    likedIngredientCounts[t] = (likedIngredientCounts[t] || 0) + 1;
  }
  for (const r of dislikedRecipes) for (const i of r.ingredients) {
    const t = i.text.toLowerCase();
    dislikedIngredientCounts[t] = (dislikedIngredientCounts[t] || 0) + 1;
  }

  // Recency bonus (computed once — same value for all recipes in a request)
  const now = Date.now();
  const recentThreshold = 7 * 24 * 60 * 60 * 1000;
  const recentActivity =
    likedRecipes.filter(r => now - new Date(r.createdAt).getTime() < recentThreshold).length +
    savedRecipes.filter(r => now - new Date(r.savedDate).getTime() < recentThreshold).length +
    consumedRecipes.filter(r => now - new Date(r.date).getTime() < recentThreshold).length;
  const recencyBonus = recentActivity >= 5 ? 100 : recentActivity >= 3 ? 80 : recentActivity >= 1 ? 60 : 50;

  return {
    positiveCuisineCounts, negativeCuisineCounts,
    avgPositiveCookTime, avgNegativeCookTime,
    avgLikedMacros,
    likedIngredientCounts, dislikedIngredientCounts,
    recencyBonus,
    hasData: true,
  };
}

/** Fast per-recipe behavioral scoring using a pre-computed UserTasteProfile. */
export function calculateBehavioralScoreFromProfile(recipe: any, profile: UserTasteProfile): BehavioralScore {
  if (!profile.hasData) {
    return { cuisinePreference: 50, cookTimePreference: 50, macroPreference: 50, ingredientPreference: 50, recencyBonus: 50, total: 50 };
  }

  // Cuisine preference (O(1) lookup)
  let cuisinePreference = 50;
  const pos = profile.positiveCuisineCounts[recipe.cuisine] || 0;
  const neg = profile.negativeCuisineCounts[recipe.cuisine] || 0;
  if (pos + neg > 0) cuisinePreference = Math.round((pos / (pos + neg)) * 100);

  // Cook time preference (O(1) math)
  let cookTimePreference = 50;
  if (profile.avgPositiveCookTime > 0) {
    const diff = Math.abs(recipe.cookTime - profile.avgPositiveCookTime);
    const max = Math.max(profile.avgPositiveCookTime, recipe.cookTime);
    cookTimePreference = max > 0 ? Math.max(0, Math.round(100 - (diff / max) * 100)) : 50;
  }

  // Macro preference (O(1) math)
  let macroPreference = 50;
  if (profile.avgLikedMacros) {
    const m = profile.avgLikedMacros;
    const calDiff = m.calories > 0 ? Math.abs(recipe.calories - m.calories) / m.calories : 0;
    const protDiff = m.protein > 0 ? Math.abs(recipe.protein - m.protein) / m.protein : 0;
    const carbDiff = m.carbs > 0 ? Math.abs(recipe.carbs - m.carbs) / m.carbs : 0;
    const fatDiff = m.fat > 0 ? Math.abs(recipe.fat - m.fat) / m.fat : 0;
    macroPreference = Math.max(0, Math.round(100 - ((calDiff + protDiff + carbDiff + fatDiff) / 4) * 100));
  }

  // Ingredient preference (O(n_recipe_ingredients) — much smaller than O(n_user_interactions))
  let ingredientPreference = 50;
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    let totalScore = 0;
    for (const ing of recipe.ingredients) {
      const key = (ing.text || '').toLowerCase();
      const l = profile.likedIngredientCounts[key] || 0;
      const d = profile.dislikedIngredientCounts[key] || 0;
      totalScore += l + d > 0 ? (l / (l + d)) * 100 : 50;
    }
    ingredientPreference = Math.round(totalScore / recipe.ingredients.length);
  }

  const total = Math.round(
    cuisinePreference * 0.3 +
    cookTimePreference * 0.2 +
    macroPreference * 0.3 +
    ingredientPreference * 0.15 +
    profile.recencyBonus * 0.05
  );

  return { cuisinePreference, cookTimePreference, macroPreference, ingredientPreference, recencyBonus: profile.recencyBonus, total };
}

export function calculateBehavioralScore(
  recipe: any,
  userBehavior: UserBehaviorData
): BehavioralScore {
  const scores = {
    cuisinePreference: calculateCuisinePreference(recipe, userBehavior),
    cookTimePreference: calculateCookTimePreference(recipe, userBehavior),
    macroPreference: calculateMacroPreference(recipe, userBehavior),
    ingredientPreference: calculateIngredientPreference(recipe, userBehavior),
    recencyBonus: calculateRecencyBonus(userBehavior)
  };

  const total = Math.round(
    scores.cuisinePreference * 0.3 +
    scores.cookTimePreference * 0.2 +
    scores.macroPreference * 0.3 +
    scores.ingredientPreference * 0.15 +
    scores.recencyBonus * 0.05
  );

  return {
    ...scores,
    total
  };
}

function calculateCuisinePreference(recipe: any, userBehavior: UserBehaviorData): number {
  const { likedRecipes, dislikedRecipes, savedRecipes, consumedRecipes } = userBehavior;
  
  if (likedRecipes.length === 0 && dislikedRecipes.length === 0 && savedRecipes.length === 0 && consumedRecipes.length === 0) {
    return 50; // Neutral score if no data
  }

  const likedCuisines = likedRecipes.map(r => r.cuisine);
  const dislikedCuisines = dislikedRecipes.map(r => r.cuisine);
  const savedCuisines = savedRecipes.map(r => r.cuisine);
  const consumedCuisines = consumedRecipes.map(r => r.cuisine);
  
  // Count occurrences
  const likedCuisineCount = likedCuisines.filter(c => c === recipe.cuisine).length;
  const dislikedCuisineCount = dislikedCuisines.filter(c => c === recipe.cuisine).length;
  const savedCuisineCount = savedCuisines.filter(c => c === recipe.cuisine).length;
  const consumedCuisineCount = consumedCuisines.filter(c => c === recipe.cuisine).length;
  
  const totalCuisineInteractions = likedCuisineCount + dislikedCuisineCount + savedCuisineCount + consumedCuisineCount;
  
  if (totalCuisineInteractions === 0) {
    return 50; // Neutral if no interactions with this cuisine
  }
  
  // Weight different types of interactions
  const positiveInteractions = likedCuisineCount + savedCuisineCount + consumedCuisineCount;
  const negativeInteractions = dislikedCuisineCount;
  
  if (positiveInteractions === 0 && negativeInteractions === 0) {
    return 50; // Neutral if no interactions with this cuisine
  }
  
  const preferenceRatio = positiveInteractions / (positiveInteractions + negativeInteractions);
  return Math.round(preferenceRatio * 100);
}

function calculateCookTimePreference(recipe: any, userBehavior: UserBehaviorData): number {
  const { likedRecipes, dislikedRecipes, savedRecipes, consumedRecipes } = userBehavior;
  
  if (likedRecipes.length === 0 && dislikedRecipes.length === 0 && savedRecipes.length === 0 && consumedRecipes.length === 0) {
    return 50; // Neutral score if no data
  }

  const likedCookTimes = likedRecipes.map(r => r.cookTime);
  const dislikedCookTimes = dislikedRecipes.map(r => r.cookTime);
  const savedCookTimes = savedRecipes.map(r => r.cookTime);
  const consumedCookTimes = consumedRecipes.map(r => r.cookTime);
  
  // Calculate average preferred cook time (include all positive interactions)
  const allPositiveCookTimes = [...likedCookTimes, ...savedCookTimes, ...consumedCookTimes];
  const allNegativeCookTimes = dislikedCookTimes;
  
  const avgPositiveTime = allPositiveCookTimes.length > 0 ? 
    allPositiveCookTimes.reduce((sum, time) => sum + time, 0) / allPositiveCookTimes.length : 0;
  
  const avgNegativeTime = allNegativeCookTimes.length > 0 ? 
    allNegativeCookTimes.reduce((sum, time) => sum + time, 0) / allNegativeCookTimes.length : 0;
  
  if (avgPositiveTime === 0 && avgNegativeTime === 0) {
    return 50; // Neutral if no data
  }
  
  // Score based on how close recipe cook time is to preferred times
  const recipeTime = recipe.cookTime;
  const timeDifference = Math.abs(recipeTime - avgPositiveTime);
  const maxDifference = Math.max(avgPositiveTime, recipeTime);
  
  if (maxDifference === 0) return 50;
  
  const timeScore = Math.max(0, 100 - (timeDifference / maxDifference) * 100);
  return Math.round(timeScore);
}

function calculateMacroPreference(recipe: any, userBehavior: UserBehaviorData): number {
  const { likedRecipes, dislikedRecipes } = userBehavior;
  
  if (likedRecipes.length === 0 && dislikedRecipes.length === 0) {
    return 50; // Neutral score if no data
  }

  // Calculate average macro preferences from liked recipes
  const likedMacros = likedRecipes.map(r => ({
    calories: r.calories,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat
  }));
  
  if (likedMacros.length === 0) {
    return 50; // Neutral if no liked recipes
  }
  
  const avgLikedMacros = {
    calories: likedMacros.reduce((sum, m) => sum + m.calories, 0) / likedMacros.length,
    protein: likedMacros.reduce((sum, m) => sum + m.protein, 0) / likedMacros.length,
    carbs: likedMacros.reduce((sum, m) => sum + m.carbs, 0) / likedMacros.length,
    fat: likedMacros.reduce((sum, m) => sum + m.fat, 0) / likedMacros.length
  };
  
  // Calculate macro similarity score
  const calorieDiff = Math.abs(recipe.calories - avgLikedMacros.calories) / avgLikedMacros.calories;
  const proteinDiff = Math.abs(recipe.protein - avgLikedMacros.protein) / avgLikedMacros.protein;
  const carbDiff = Math.abs(recipe.carbs - avgLikedMacros.carbs) / avgLikedMacros.carbs;
  const fatDiff = Math.abs(recipe.fat - avgLikedMacros.fat) / avgLikedMacros.fat;
  
  const avgDiff = (calorieDiff + proteinDiff + carbDiff + fatDiff) / 4;
  const macroScore = Math.max(0, 100 - avgDiff * 100);
  
  return Math.round(macroScore);
}

function calculateIngredientPreference(recipe: any, userBehavior: UserBehaviorData): number {
  const { likedRecipes, dislikedRecipes } = userBehavior;
  
  if (likedRecipes.length === 0 && dislikedRecipes.length === 0) {
    return 50; // Neutral score if no data
  }

  // Extract all ingredients from liked and disliked recipes
  const likedIngredients = likedRecipes.flatMap(r => r.ingredients.map(i => i.text.toLowerCase()));
  const dislikedIngredients = dislikedRecipes.flatMap(r => r.ingredients.map(i => i.text.toLowerCase()));
  
  // Count ingredient occurrences
  const likedIngredientCounts = likedIngredients.reduce((counts, ingredient) => {
    counts[ingredient] = (counts[ingredient] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
  
  const dislikedIngredientCounts = dislikedIngredients.reduce((counts, ingredient) => {
    counts[ingredient] = (counts[ingredient] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
  
  // Score recipe ingredients based on user preferences
  const recipeIngredients = recipe.ingredients.map((i: any) => i.text.toLowerCase());
  let totalScore = 0;
  let ingredientCount = 0;
  
  for (const ingredient of recipeIngredients) {
    const likedCount = likedIngredientCounts[ingredient] || 0;
    const dislikedCount = dislikedIngredientCounts[ingredient] || 0;
    const totalCount = likedCount + dislikedCount;
    
    if (totalCount > 0) {
      const preferenceRatio = likedCount / totalCount;
      totalScore += preferenceRatio * 100;
    } else {
      totalScore += 50; // Neutral for unknown ingredients
    }
    ingredientCount++;
  }
  
  if (ingredientCount === 0) return 50;
  
  return Math.round(totalScore / ingredientCount);
}

function calculateRecencyBonus(userBehavior: UserBehaviorData): number {
  const { likedRecipes, savedRecipes, consumedRecipes } = userBehavior;
  
  const now = new Date();
  const recentThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  
  // Check if user has been active recently
  const recentLikes = likedRecipes.filter(r => 
    (now.getTime() - r.createdAt.getTime()) < recentThreshold
  ).length;
  
  const recentSaves = savedRecipes.filter(r => 
    (now.getTime() - r.savedDate.getTime()) < recentThreshold
  ).length;
  
  const recentConsumptions = consumedRecipes.filter(r => 
    (now.getTime() - r.date.getTime()) < recentThreshold
  ).length;
  
  const totalRecentActivity = recentLikes + recentSaves + recentConsumptions;
  
  // Bonus score based on recent activity (encourages continued engagement)
  if (totalRecentActivity >= 5) return 100;
  if (totalRecentActivity >= 3) return 80;
  if (totalRecentActivity >= 1) return 60;
  return 50;
}

export function analyzeUserBehaviorPatterns(userBehavior: UserBehaviorData): {
  preferredCuisines: string[];
  preferredCookTimes: number[];
  preferredMacros: { calories: number; protein: number; carbs: number; fat: number };
  preferredIngredients: string[];
  activityLevel: 'high' | 'medium' | 'low';
} {
  const { likedRecipes, savedRecipes, consumedRecipes } = userBehavior;
  
  // Analyze cuisine preferences
  const cuisineCounts = [...likedRecipes, ...savedRecipes, ...consumedRecipes]
    .map(r => r.cuisine)
    .reduce((counts, cuisine) => {
      counts[cuisine] = (counts[cuisine] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  
  const preferredCuisines = Object.entries(cuisineCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([cuisine]) => cuisine);
  
  // Analyze cook time preferences
  const allCookTimes = [...likedRecipes, ...savedRecipes, ...consumedRecipes]
    .map(r => r.cookTime);
  const avgCookTime = allCookTimes.length > 0 ? 
    allCookTimes.reduce((sum, time) => sum + time, 0) / allCookTimes.length : 30;
  
  // Analyze macro preferences
  const allMacros = [...likedRecipes, ...savedRecipes, ...consumedRecipes];
  const preferredMacros = {
    calories: allMacros.length > 0 ? 
      allMacros.reduce((sum, r) => sum + r.calories, 0) / allMacros.length : 500,
    protein: allMacros.length > 0 ? 
      allMacros.reduce((sum, r) => sum + r.protein, 0) / allMacros.length : 25,
    carbs: allMacros.length > 0 ? 
      allMacros.reduce((sum, r) => sum + r.carbs, 0) / allMacros.length : 50,
    fat: allMacros.length > 0 ? 
      allMacros.reduce((sum, r) => sum + r.fat, 0) / allMacros.length : 20
  };
  
  // Analyze ingredient preferences
  const allIngredients = [...likedRecipes, ...savedRecipes, ...consumedRecipes]
    .flatMap(r => r.ingredients.map(i => i.text.toLowerCase()));
  
  const ingredientCounts = allIngredients.reduce((counts, ingredient) => {
    counts[ingredient] = (counts[ingredient] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
  
  const preferredIngredients = Object.entries(ingredientCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([ingredient]) => ingredient);
  
  // Determine activity level
  const totalInteractions = likedRecipes.length + savedRecipes.length + consumedRecipes.length;
  const activityLevel = totalInteractions >= 20 ? 'high' : 
                       totalInteractions >= 10 ? 'medium' : 'low';
  
  return {
    preferredCuisines,
    preferredCookTimes: [Math.round(avgCookTime)],
    preferredMacros,
    preferredIngredients,
    activityLevel
  };
}
