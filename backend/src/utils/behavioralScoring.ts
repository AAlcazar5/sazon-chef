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
