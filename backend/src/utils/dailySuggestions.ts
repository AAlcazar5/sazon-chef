// backend/src/utils/dailySuggestions.ts

export interface DailyMealPlan {
  date: string;
  breakfast: RecipeSuggestion | null;
  lunch: RecipeSuggestion | null;
  dinner: RecipeSuggestion | null;
  snack: RecipeSuggestion | null;
  totalMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  macroGoals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  macroProgress: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface RecipeSuggestion {
  recipe: any;
  score: number;
  reasoning: string[];
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface DailySuggestionContext {
  userPreferences: any;
  macroGoals: any;
  userBehavior: any;
  temporalContext: any;
  userTemporalPatterns: any;
  recentMeals: any[];
  plannedMeals: any[];
  availableIngredients: string[];
  timeConstraints: {
    breakfastTime: number;
    lunchTime: number;
    dinnerTime: number;
  };
}

export function generateDailySuggestions(
  context: DailySuggestionContext
): DailyMealPlan {
  const { userPreferences, macroGoals, userBehavior, temporalContext, userTemporalPatterns } = context;
  
  // Calculate macro distribution for the day
  const macroDistribution = calculateMacroDistribution(macroGoals);
  
  // Generate suggestions for each meal
  const breakfast = generateMealSuggestion('breakfast', context, macroDistribution.breakfast);
  const lunch = generateMealSuggestion('lunch', context, macroDistribution.lunch);
  const dinner = generateMealSuggestion('dinner', context, macroDistribution.dinner);
  const snack = generateMealSuggestion('snack', context, macroDistribution.snack);
  
  // Calculate total macros
  const totalMacros = calculateTotalMacros([breakfast, lunch, dinner, snack]);
  
  // Calculate macro progress
  const macroProgress = calculateMacroProgress(totalMacros, macroGoals);
  
  return {
    date: new Date().toISOString().split('T')[0],
    breakfast,
    lunch,
    dinner,
    snack,
    totalMacros,
    macroGoals,
    macroProgress
  };
}

function calculateMacroDistribution(macroGoals: any): {
  breakfast: MacroTarget;
  lunch: MacroTarget;
  dinner: MacroTarget;
  snack: MacroTarget;
} {
  const totalCalories = macroGoals.calories;
  const totalProtein = macroGoals.protein;
  const totalCarbs = macroGoals.carbs;
  const totalFat = macroGoals.fat;
  
  return {
    breakfast: {
      calories: Math.round(totalCalories * 0.25), // 25% of daily calories
      protein: Math.round(totalProtein * 0.25),
      carbs: Math.round(totalCarbs * 0.25),
      fat: Math.round(totalFat * 0.25)
    },
    lunch: {
      calories: Math.round(totalCalories * 0.35), // 35% of daily calories
      protein: Math.round(totalProtein * 0.35),
      carbs: Math.round(totalCarbs * 0.35),
      fat: Math.round(totalFat * 0.35)
    },
    dinner: {
      calories: Math.round(totalCalories * 0.30), // 30% of daily calories
      protein: Math.round(totalProtein * 0.30),
      carbs: Math.round(totalCarbs * 0.30),
      fat: Math.round(totalFat * 0.30)
    },
    snack: {
      calories: Math.round(totalCalories * 0.10), // 10% of daily calories
      protein: Math.round(totalProtein * 0.10),
      carbs: Math.round(totalCarbs * 0.10),
      fat: Math.round(totalFat * 0.10)
    }
  };
}

interface MacroTarget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

function generateMealSuggestion(
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  context: DailySuggestionContext,
  macroTarget: MacroTarget
): RecipeSuggestion | null {
  const { userPreferences, userBehavior, temporalContext, userTemporalPatterns, recentMeals } = context;
  
  // Get meal-specific temporal context
  const mealTemporalContext = getMealTemporalContext(mealType, temporalContext);
  
  // Filter recipes based on meal type and constraints
  const candidateRecipes = getCandidateRecipes(mealType, context);
  
  if (candidateRecipes.length === 0) {
    return null;
  }
  
  // Score each candidate recipe
  const scoredRecipes = candidateRecipes.map(recipe => {
    const score = calculateMealSpecificScore(recipe, mealType, context, macroTarget);
    return { recipe, score };
  });
  
  // Sort by score and pick the best one
  scoredRecipes.sort((a, b) => b.score.total - a.score.total);
  const bestRecipe = scoredRecipes[0];
  
  if (!bestRecipe) {
    return null;
  }
  
  // Generate reasoning for the suggestion
  const reasoning = generateSuggestionReasoning(bestRecipe.recipe, mealType, bestRecipe.score, context);
  
  return {
    recipe: bestRecipe.recipe,
    score: bestRecipe.score.total,
    reasoning,
    mealType,
    estimatedTime: formatCookTime(bestRecipe.recipe.cookTime),
    difficulty: assessDifficulty(bestRecipe.recipe)
  };
}

function getMealTemporalContext(
  mealType: string,
  temporalContext: any
): any {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Adjust temporal context for specific meal types
  let adjustedHour = currentHour;
  
  switch (mealType) {
    case 'breakfast':
      adjustedHour = Math.max(6, Math.min(10, currentHour));
      break;
    case 'lunch':
      adjustedHour = Math.max(11, Math.min(14, currentHour));
      break;
    case 'dinner':
      adjustedHour = Math.max(17, Math.min(20, currentHour));
      break;
    case 'snack':
      adjustedHour = Math.max(15, Math.min(22, currentHour));
      break;
  }
  
  return {
    ...temporalContext,
    currentHour: adjustedHour,
    mealPeriod: mealType
  };
}

function getCandidateRecipes(mealType: string, context: DailySuggestionContext): any[] {
  // This would typically query the database for recipes
  // For now, we'll return an empty array and let the calling function handle it
  return [];
}

function calculateMealSpecificScore(
  recipe: any,
  mealType: string,
  context: DailySuggestionContext,
  macroTarget: MacroTarget
): any {
  const { userPreferences, userBehavior, temporalContext, userTemporalPatterns } = context;
  
  // Import scoring functions
  const { calculateRecipeScore } = require('./scoring');
  const { calculateBehavioralScore } = require('./behavioralScoring');
  const { calculateTemporalScore } = require('./temporalScoring');
  
  // Calculate base scores
  const behavioralScore = calculateBehavioralScore(recipe, userBehavior);
  const temporalScore = calculateTemporalScore(recipe, temporalContext, userTemporalPatterns);
  const baseScore = calculateRecipeScore(recipe, userPreferences, context.macroGoals, behavioralScore.total, temporalScore.total);
  
  // Add meal-specific scoring
  const mealSpecificScore = calculateMealTypeScore(recipe, mealType, macroTarget);
  
  // Combine scores
  const total = Math.round(
    baseScore.total * 0.7 + // 70% from base scoring
    mealSpecificScore * 0.3   // 30% from meal-specific scoring
  );
  
  return {
    total,
    baseScore,
    behavioralScore,
    temporalScore,
    mealSpecificScore
  };
}

function calculateMealTypeScore(recipe: any, mealType: string, macroTarget: MacroTarget): number {
  let score = 50; // Base score
  
  // Macro matching for meal type
  const calorieDiff = Math.abs(recipe.calories - macroTarget.calories) / macroTarget.calories;
  const proteinDiff = Math.abs(recipe.protein - macroTarget.protein) / macroTarget.protein;
  const carbDiff = Math.abs(recipe.carbs - macroTarget.carbs) / macroTarget.carbs;
  const fatDiff = Math.abs(recipe.fat - macroTarget.fat) / macroTarget.fat;
  
  const avgMacroDiff = (calorieDiff + proteinDiff + carbDiff + fatDiff) / 4;
  const macroScore = Math.max(0, 100 - avgMacroDiff * 100);
  
  // Meal type specific adjustments
  switch (mealType) {
    case 'breakfast':
      if (recipe.cookTime <= 15) score += 20;
      if (recipe.calories <= 400) score += 15;
      if (recipe.cuisine === 'American' || recipe.cuisine === 'French') score += 10;
      break;
      
    case 'lunch':
      if (recipe.cookTime <= 30) score += 15;
      if (recipe.calories >= 300 && recipe.calories <= 600) score += 15;
      if (recipe.cuisine === 'Mediterranean' || recipe.cuisine === 'Asian') score += 10;
      break;
      
    case 'dinner':
      if (recipe.cookTime >= 20) score += 10;
      if (recipe.calories >= 400) score += 15;
      if (recipe.cuisine === 'Italian' || recipe.cuisine === 'Indian' || recipe.cuisine === 'Mexican') score += 10;
      break;
      
    case 'snack':
      if (recipe.cookTime <= 10) score += 30;
      if (recipe.calories <= 200) score += 25;
      if (recipe.cuisine === 'American' || recipe.cuisine === 'Asian') score += 10;
      break;
  }
  
  // Combine macro score with meal type score
  return Math.round((macroScore * 0.6 + score * 0.4));
}

function generateSuggestionReasoning(
  recipe: any,
  mealType: string,
  score: any,
  context: DailySuggestionContext
): string[] {
  const reasoning: string[] = [];
  
  // High-level reasoning
  if (score.total >= 80) {
    reasoning.push(`Perfect match for ${mealType} (${score.total}% compatibility)`);
  } else if (score.total >= 60) {
    reasoning.push(`Good choice for ${mealType} (${score.total}% compatibility)`);
  } else {
    reasoning.push(`Suitable for ${mealType} (${score.total}% compatibility)`);
  }
  
  // Macro reasoning
  if (score.baseScore?.macroScore >= 70) {
    reasoning.push('Excellent macro balance for your goals');
  } else if (score.baseScore?.macroScore >= 50) {
    reasoning.push('Good macro balance');
  }
  
  // Temporal reasoning
  if (score.temporalScore?.total >= 80) {
    reasoning.push('Perfect timing for this meal period');
  } else if (score.temporalScore?.total >= 60) {
    reasoning.push('Good timing for this meal');
  }
  
  // Behavioral reasoning
  if (score.behavioralScore?.total >= 70) {
    reasoning.push('Matches your taste preferences');
  }
  
  // Meal-specific reasoning
  switch (mealType) {
    case 'breakfast':
      if (recipe.cookTime <= 15) {
        reasoning.push('Quick to prepare for busy mornings');
      }
      break;
    case 'lunch':
      if (recipe.cookTime <= 30) {
        reasoning.push('Perfect for lunch break');
      }
      break;
    case 'dinner':
      if (recipe.cookTime >= 30) {
        reasoning.push('Worth the extra time for a satisfying dinner');
      }
      break;
    case 'snack':
      if (recipe.calories <= 200) {
        reasoning.push('Light and healthy snack option');
      }
      break;
  }
  
  return reasoning;
}

function calculateTotalMacros(meals: (RecipeSuggestion | null)[]): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} {
  return meals.reduce((totals, meal) => {
    if (meal && meal.recipe) {
      totals.calories += meal.recipe.calories || 0;
      totals.protein += meal.recipe.protein || 0;
      totals.carbs += meal.recipe.carbs || 0;
      totals.fat += meal.recipe.fat || 0;
    }
    return totals;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

function calculateMacroProgress(totalMacros: any, macroGoals: any): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} {
  return {
    calories: Math.round((totalMacros.calories / macroGoals.calories) * 100),
    protein: Math.round((totalMacros.protein / macroGoals.protein) * 100),
    carbs: Math.round((totalMacros.carbs / macroGoals.carbs) * 100),
    fat: Math.round((totalMacros.fat / macroGoals.fat) * 100)
  };
}

function formatCookTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${hours}h ${remainingMinutes}m`;
    }
  }
}

function assessDifficulty(recipe: any): 'easy' | 'medium' | 'hard' {
  const cookTime = recipe.cookTime;
  const ingredientCount = recipe.ingredients?.length || 0;
  const instructionCount = recipe.instructions?.length || 0;
  
  let difficultyScore = 0;
  
  // Cook time factor
  if (cookTime <= 15) difficultyScore += 1;
  else if (cookTime <= 30) difficultyScore += 2;
  else if (cookTime <= 60) difficultyScore += 3;
  else difficultyScore += 4;
  
  // Ingredient count factor
  if (ingredientCount <= 5) difficultyScore += 1;
  else if (ingredientCount <= 10) difficultyScore += 2;
  else difficultyScore += 3;
  
  // Instruction count factor
  if (instructionCount <= 3) difficultyScore += 1;
  else if (instructionCount <= 6) difficultyScore += 2;
  else difficultyScore += 3;
  
  if (difficultyScore <= 3) return 'easy';
  else if (difficultyScore <= 6) return 'medium';
  else return 'hard';
}

export function getDailySuggestionInsights(dailyPlan: DailyMealPlan): {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  macroBalance: 'excellent' | 'good' | 'needs_improvement';
} {
  const { totalMacros, macroGoals, macroProgress } = dailyPlan;
  
  // Calculate overall score
  const macroScores = Object.values(macroProgress);
  const avgMacroScore = macroScores.reduce((sum, score) => sum + score, 0) / macroScores.length;
  const overallScore = Math.round(avgMacroScore);
  
  // Determine macro balance
  let macroBalance: 'excellent' | 'good' | 'needs_improvement';
  if (overallScore >= 90) macroBalance = 'excellent';
  else if (overallScore >= 75) macroBalance = 'good';
  else macroBalance = 'needs_improvement';
  
  // Generate insights
  const strengths: string[] = [];
  const improvements: string[] = [];
  
  if (macroProgress.calories >= 90 && macroProgress.calories <= 110) {
    strengths.push('Perfect calorie balance');
  } else if (macroProgress.calories < 80) {
    improvements.push('Consider adding more calories');
  } else if (macroProgress.calories > 120) {
    improvements.push('Consider reducing calories');
  }
  
  if (macroProgress.protein >= 90) {
    strengths.push('Excellent protein intake');
  } else if (macroProgress.protein < 70) {
    improvements.push('Add more protein-rich foods');
  }
  
  if (macroProgress.carbs >= 80 && macroProgress.carbs <= 120) {
    strengths.push('Good carbohydrate balance');
  } else if (macroProgress.carbs < 70) {
    improvements.push('Consider adding healthy carbs');
  }
  
  if (macroProgress.fat >= 80 && macroProgress.fat <= 120) {
    strengths.push('Healthy fat intake');
  } else if (macroProgress.fat < 70) {
    improvements.push('Add healthy fats');
  }
  
  return {
    overallScore,
    strengths,
    improvements,
    macroBalance
  };
}
