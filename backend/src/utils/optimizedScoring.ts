// backend/src/utils/optimizedScoring.ts
// Optimized recipe scoring for scalability (10,000+ recipes)
// Uses tiered approach: Quick filter → Quick score → Full score (cached)

export interface UserScoringPreferences {
  userId: string;
  likedCuisines: string[];
  bannedIngredients: string[];
  dietaryRestrictions: string[];
  cookTimePreference: number;
  spiceLevel?: string;
  macroGoals?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  fitnessGoal?: string;
}

export interface QuickRecipeScore {
  recipeId: string;
  score: number;
  breakdown: {
    cuisineMatch: number;
    hasBannedIngredients: boolean;
    cookTimeMatch: number;
    macroAlignment?: number;
  };
}

export interface FullRecipeScore extends QuickRecipeScore {
  behavioralScore: number;
  temporalScore: number;
  healthGoalScore: number;
  finalScore: number;
}

/**
 * TIER 1: Quick Discriminatory Score
 * Only uses preferences and basic recipe data (no behavioral/temporal)
 * This runs FAST - suitable for scoring 1000+ recipes
 */
export function calculateQuickScore(
  recipe: {
    id: string;
    cuisine: string;
    cookTime: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    ingredients?: Array<{ text: string }>;
  },
  prefs: UserScoringPreferences
): QuickRecipeScore {
  let score = 50; // Neutral baseline
  const breakdown: QuickRecipeScore['breakdown'] = {
    cuisineMatch: 50,
    hasBannedIngredients: false,
    cookTimeMatch: 50,
    macroAlignment: undefined,
  };

  // 1. Cuisine Match (40% impact) - FASTEST
  if (prefs.likedCuisines.length > 0) {
    const cuisineMatch = prefs.likedCuisines
      .map(c => c.toLowerCase())
      .includes(recipe.cuisine.toLowerCase());

    if (cuisineMatch) {
      breakdown.cuisineMatch = 100;
      score += 40; // Huge boost for liked cuisine
    } else {
      breakdown.cuisineMatch = 20;
      score -= 30; // Penalty for non-preferred
    }
  }

  // 2. Banned Ingredients (VETO) - CRITICAL
  if (prefs.bannedIngredients.length > 0 && recipe.ingredients) {
    const ingredientTexts = recipe.ingredients
      .map(ing => ing.text.toLowerCase())
      .join(' ');

    const hasBanned = prefs.bannedIngredients.some(banned =>
      ingredientTexts.includes(banned.toLowerCase())
    );

    if (hasBanned) {
      breakdown.hasBannedIngredients = true;
      return {
        recipeId: recipe.id,
        score: 0, // VETO - don't show this recipe
        breakdown,
      };
    }
  }

  // 3. Cook Time Match (20% impact)
  const cookTimeDiff = Math.abs(recipe.cookTime - prefs.cookTimePreference);
  if (cookTimeDiff <= 10) {
    breakdown.cookTimeMatch = 100;
    score += 20; // Perfect match
  } else if (cookTimeDiff <= 20) {
    breakdown.cookTimeMatch = 70;
    score += 10; // Close match
  } else if (cookTimeDiff <= 30) {
    breakdown.cookTimeMatch = 40;
    score += 0; // Neutral
  } else {
    breakdown.cookTimeMatch = 10;
    score -= 10; // Too far from preference
  }

  // 4. Macro Alignment (15% impact) - Optional if macro goals set
  if (prefs.macroGoals) {
    const { calories, protein, carbs, fat } = prefs.macroGoals;

    // Calculate how close recipe is to daily macro goals (assuming 3 meals/day)
    const targetCaloriesPerMeal = calories / 3;
    const targetProteinPerMeal = protein / 3;

    const calorieDiff = Math.abs(recipe.calories - targetCaloriesPerMeal) / targetCaloriesPerMeal;
    const proteinDiff = Math.abs(recipe.protein - targetProteinPerMeal) / targetProteinPerMeal;

    // Score based on how close macros are (lower diff = higher score)
    const macroScore = Math.max(0, 100 - (calorieDiff + proteinDiff) * 50);

    breakdown.macroAlignment = Math.round(macroScore);

    if (macroScore >= 80) {
      score += 15; // Excellent macro match
    } else if (macroScore >= 60) {
      score += 10; // Good macro match
    } else if (macroScore >= 40) {
      score += 5; // Acceptable
    }
    // else: no bonus
  }

  return {
    recipeId: recipe.id,
    score: Math.max(0, Math.min(100, Math.round(score))),
    breakdown,
  };
}

/**
 * TIER 2: Full Score Calculation
 * Includes behavioral, temporal, and health goal scoring
 * This is more expensive - only run on top candidates
 */
export function calculateFullScore(
  recipe: any,
  prefs: UserScoringPreferences,
  behavioralData?: {
    likedRecipeIds: string[];
    dislikedRecipeIds: string[];
    recentCuisines: string[];
  },
  temporalContext?: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    isWeekend: boolean;
  }
): FullRecipeScore {
  // Start with quick score
  const quickScore = calculateQuickScore(recipe, prefs);

  // If vetoed by quick score, return immediately
  if (quickScore.score === 0) {
    return {
      ...quickScore,
      behavioralScore: 0,
      temporalScore: 0,
      healthGoalScore: 0,
      finalScore: 0,
    };
  }

  let finalScore = quickScore.score;

  // 5. Behavioral Score (10% impact)
  let behavioralScore = 50; // Neutral default
  if (behavioralData) {
    if (behavioralData.likedRecipeIds.includes(recipe.id)) {
      behavioralScore = 100; // User explicitly liked this before
      finalScore += 10;
    } else if (behavioralData.dislikedRecipeIds.includes(recipe.id)) {
      behavioralScore = 0; // User explicitly disliked
      finalScore -= 20;
    } else if (behavioralData.recentCuisines.includes(recipe.cuisine)) {
      behavioralScore = 30; // Recently consumed this cuisine - lower priority
      finalScore -= 5;
    }
  }

  // 6. Temporal Score (5% impact)
  let temporalScore = 50; // Neutral default
  if (temporalContext) {
    // Light meals in evening, heavier in afternoon
    const isLightMeal = recipe.calories < 400;
    const isHeavyMeal = recipe.calories > 700;

    if (temporalContext.timeOfDay === 'morning') {
      if (recipe.mealType === 'breakfast') {
        temporalScore = 90;
        finalScore += 5;
      }
    } else if (temporalContext.timeOfDay === 'afternoon') {
      if (isHeavyMeal) {
        temporalScore = 80;
        finalScore += 3;
      }
    } else if (temporalContext.timeOfDay === 'evening') {
      if (isLightMeal) {
        temporalScore = 70;
        finalScore += 3;
      }
    }
  }

  // 7. Health Goal Score (10% impact)
  let healthGoalScore = 50; // Neutral default
  if (prefs.fitnessGoal) {
    const highProtein = recipe.protein >= 40;
    const lowCarb = recipe.carbs <= 30;
    const lowCalorie = recipe.calories <= 500;

    switch (prefs.fitnessGoal) {
      case 'lose_weight':
        if (lowCalorie && highProtein) {
          healthGoalScore = 100;
          finalScore += 10;
        } else if (lowCalorie) {
          healthGoalScore = 70;
          finalScore += 5;
        }
        break;

      case 'gain_muscle':
        if (highProtein) {
          healthGoalScore = 100;
          finalScore += 10;
        }
        break;

      case 'maintain':
        healthGoalScore = 60;
        finalScore += 2;
        break;
    }
  }

  return {
    ...quickScore,
    behavioralScore: Math.round(behavioralScore),
    temporalScore: Math.round(temporalScore),
    healthGoalScore: Math.round(healthGoalScore),
    finalScore: Math.max(0, Math.min(100, Math.round(finalScore))),
  };
}

/**
 * Helper: Build WHERE clause for database pre-filtering
 * This reduces the dataset BEFORE scoring
 */
export function buildOptimizedWhereClause(prefs: UserScoringPreferences): any {
  const where: any = {
    isUserCreated: false, // Only shared recipes
  };

  // Filter by cuisine if user has strong preferences (>= 3 liked cuisines)
  if (prefs.likedCuisines.length >= 3) {
    where.cuisine = {
      in: prefs.likedCuisines,
    };
  }

  // Filter by cook time (allow some flexibility: +50% of preference)
  if (prefs.cookTimePreference) {
    where.cookTime = {
      lte: Math.round(prefs.cookTimePreference * 1.5),
    };
  }

  return where;
}

/**
 * Helper: Sort recipes by score efficiently
 */
export function sortByScore<T extends { score: number }>(
  recipes: T[],
  descending: boolean = true
): T[] {
  return recipes.sort((a, b) => {
    return descending ? b.score - a.score : a.score - b.score;
  });
}

/**
 * Helper: Filter out low-scoring recipes
 * Only keep recipes above minimum threshold
 */
export function filterByMinimumScore<T extends { score: number }>(
  recipes: T[],
  minScore: number = 30
): T[] {
  return recipes.filter(r => r.score >= minScore);
}
