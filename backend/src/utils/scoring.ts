// src/utils/scoring.ts
import { detectRecipeSuperfoods, type SuperfoodCategory } from './superfoodDetection';

export interface RecipeScore {
  total: number;
  macroScore: number;
  tasteScore: number;
  matchPercentage: number;
  breakdown?: {
    macroMatch: number;
    tasteMatch: number;
    cookTimeMatch: number;
    ingredientMatch: number;
    superfoodBoost?: number;
  };
}

export interface ScoringWeights {
  macroWeight: number;
  tasteWeight: number;
  cookTimeWeight: number;
  ingredientMatchWeight: number;
  superfoodBoostWeight?: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  macroWeight: 0.7,
  tasteWeight: 0.3,
  cookTimeWeight: 0.1,
  ingredientMatchWeight: 0.1,
  superfoodBoostWeight: 0.15 // 15% boost for superfood matches
};

// Simple interface definitions that match our Prisma schema structure
interface RecipeBasic {
  id: string;
  title: string;
  description: string;
  cookTime: number;
  cuisine: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
  sugar?: number | null;
  ingredients: Array<{ text: string }>;
  instructions: Array<{ text: string }>;
}

interface UserPreferencesBasic {
  id: string;
  userId: string;
  cookTimePreference: number;
  spiceLevel?: string | null;
  bannedIngredients: Array<{ name: string }>;
  likedCuisines: Array<{ name: string }>;
  dietaryRestrictions: Array<{ name: string }>;
  preferredSuperfoods?: Array<{ category: string }>;
}

interface MacroGoalsBasic {
  id: string;
  userId: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function calculateRecipeScore(
  recipe: RecipeBasic,
  userPreferences?: UserPreferencesBasic | null,
  macroGoals?: MacroGoalsBasic | null,
  behavioralScore?: number | null,
  temporalScore?: number | null
): RecipeScore {
  if (!userPreferences || !macroGoals) {
    return {
      total: 50,
      macroScore: 50,
      tasteScore: 50,
      matchPercentage: 50
    };
  }

  const macroMatch = calculateMacroMatch(recipe, macroGoals);
  const tasteMatch = calculateTasteMatch(recipe, userPreferences);
  const cookTimeMatch = calculateCookTimeMatch(recipe, userPreferences);
  const ingredientMatch = calculateIngredientMatch(recipe, userPreferences);
  const superfoodBoost = calculateSuperfoodBoost(recipe, userPreferences);

  const macroScore = macroMatch * 100;
  const tasteScore = (
    tasteMatch * DEFAULT_WEIGHTS.tasteWeight +
    cookTimeMatch * DEFAULT_WEIGHTS.cookTimeWeight +
    ingredientMatch * DEFAULT_WEIGHTS.ingredientMatchWeight
  ) * 100;
  
  // Apply superfood boost to taste score (additive boost)
  const superfoodBoostAmount = superfoodBoost * (DEFAULT_WEIGHTS.superfoodBoostWeight || 0.15) * 100;
  const boostedTasteScore = Math.min(100, tasteScore + superfoodBoostAmount);

  // Calculate weights for different scoring components
  const behavioralWeight = 0.15; // 15% weight for behavioral learning
  const temporalWeight = 0.1; // 10% weight for temporal intelligence
  const baseWeight = 1 - behavioralWeight - temporalWeight;
  
  let total: number;
  // Use boosted taste score instead of original taste score
  const baseScore = macroScore * DEFAULT_WEIGHTS.macroWeight + boostedTasteScore * DEFAULT_WEIGHTS.tasteWeight;
  
  if (behavioralScore !== null && behavioralScore !== undefined && temporalScore !== null && temporalScore !== undefined) {
    total = Math.round(
      baseScore * baseWeight +
      behavioralScore * behavioralWeight +
      temporalScore * temporalWeight
    );
  } else if (behavioralScore !== null && behavioralScore !== undefined) {
    total = Math.round(
      baseScore * (baseWeight + temporalWeight) +
      behavioralScore * behavioralWeight
    );
  } else if (temporalScore !== null && temporalScore !== undefined) {
    total = Math.round(
      baseScore * (baseWeight + behavioralWeight) +
      temporalScore * temporalWeight
    );
  } else {
    total = Math.round(baseScore);
  }

  const matchPercentage = Math.round(total);

  return {
    total,
    macroScore: Math.round(macroScore),
    tasteScore: Math.round(boostedTasteScore),
    matchPercentage,
    breakdown: {
      macroMatch: Math.round(macroMatch * 100),
      tasteMatch: Math.round(tasteMatch * 100),
      cookTimeMatch: Math.round(cookTimeMatch * 100),
      ingredientMatch: Math.round(ingredientMatch * 100),
      superfoodBoost: Math.round(superfoodBoost * 100)
    }
  };
}

function calculateMacroMatch(recipe: RecipeBasic, macroGoals: MacroGoalsBasic): number {
  const { calories, protein, carbs, fat } = recipe;
  const goalCalories = macroGoals.calories;
  const goalProtein = macroGoals.protein;
  const goalCarbs = macroGoals.carbs;
  const goalFat = macroGoals.fat;

  const calorieDeviation = Math.abs(calories - goalCalories) / goalCalories;
  const proteinDeviation = Math.abs(protein - goalProtein) / goalProtein;
  const carbDeviation = Math.abs(carbs - goalCarbs) / goalCarbs;
  const fatDeviation = Math.abs(fat - goalFat) / goalFat;

  const avgDeviation = (calorieDeviation + proteinDeviation + carbDeviation + fatDeviation) / 4;
  return Math.max(0, 1 - avgDeviation);
}

function calculateTasteMatch(recipe: RecipeBasic, preferences: UserPreferencesBasic): number {
  let score = 0.5;

  // Check if cuisine is in liked cuisines
  const likedCuisineNames = preferences.likedCuisines.map(c => c.name);
  if (likedCuisineNames.includes(recipe.cuisine)) {
    score += 0.3;
  }

  if (preferences.spiceLevel) {
    const spiceScores: Record<string, number> = {
      'mild': 0.1,
      'medium': 0.2,
      'spicy': 0.3
    };
    score += spiceScores[preferences.spiceLevel] || 0;
  }

  return Math.min(1, Math.max(0, score));
}

function calculateCookTimeMatch(recipe: RecipeBasic, preferences: UserPreferencesBasic): number {
  const preferredTime = preferences.cookTimePreference;
  const recipeTime = recipe.cookTime;

  if (recipeTime <= preferredTime) {
    return 1.0;
  }

  const timeDifference = recipeTime - preferredTime;
  const penalty = timeDifference / preferredTime;
  return Math.max(0, 1 - penalty * 0.5);
}

function calculateIngredientMatch(recipe: RecipeBasic, preferences: UserPreferencesBasic): number {
  const bannedIngredientNames = preferences.bannedIngredients.map(bi => bi.name);
  const recipeIngredientTexts = recipe.ingredients.map(i => i.text);

  const hasBannedIngredient = recipeIngredientTexts.some(ingredient =>
    bannedIngredientNames.some(banned =>
      ingredient.toLowerCase().includes(banned.toLowerCase())
    )
  );

  if (hasBannedIngredient) {
    return 0;
  }

  const dietaryRestrictionNames = preferences.dietaryRestrictions.map(dr => dr.name);
  
  if (dietaryRestrictionNames.includes('vegetarian') && isNonVegetarian(recipe)) {
    return 0;
  }

  if (dietaryRestrictionNames.includes('vegan') && isNonVegan(recipe)) {
    return 0;
  }

  return 1.0;
}

function isNonVegetarian(recipe: RecipeBasic): boolean {
  const nonVegIngredients = ['chicken', 'beef', 'pork', 'fish', 'meat', 'seafood'];
  return recipe.ingredients.some(ingredient =>
    nonVegIngredients.some(nonVeg => ingredient.text.toLowerCase().includes(nonVeg))
  );
}

function isNonVegan(recipe: RecipeBasic): boolean {
  const nonVeganIngredients = ['milk', 'cheese', 'butter', 'eggs', 'honey', 'yogurt'];
  return recipe.ingredients.some(ingredient =>
    nonVeganIngredients.some(nonVegan => ingredient.text.toLowerCase().includes(nonVegan))
  );
}

/**
 * Calculate superfood boost score based on user's preferred superfoods
 * Returns a value between 0 and 1, where 1 means all preferred superfoods are present
 * @param recipe - The recipe to check
 * @param preferences - User preferences including preferred superfoods
 * @returns Boost score (0-1)
 */
function calculateSuperfoodBoost(
  recipe: RecipeBasic,
  preferences: UserPreferencesBasic
): number {
  // If no preferred superfoods, return 0 (no boost)
  if (!preferences.preferredSuperfoods || preferences.preferredSuperfoods.length === 0) {
    return 0;
  }

  // Detect superfoods in recipe
  const recipeSuperfoods = detectRecipeSuperfoods(recipe.ingredients);
  
  // Get user's preferred superfood categories
  const preferredCategories = new Set(
    preferences.preferredSuperfoods.map(sf => sf.category as SuperfoodCategory)
  );

  // Count how many preferred superfoods are found in the recipe
  let matchedCount = 0;
  for (const superfood of recipeSuperfoods) {
    if (preferredCategories.has(superfood)) {
      matchedCount++;
    }
  }

  // Calculate boost: more matches = higher boost
  // Linear scaling: 0 matches = 0, all matches = 1
  // Cap at 1.0 for recipes with more superfoods than preferred
  const boost = Math.min(1.0, matchedCount / preferredCategories.size);
  
  // Apply a multiplier to make the boost more significant
  // Recipes with at least one match get a minimum boost
  if (matchedCount > 0) {
    return Math.max(0.2, boost); // Minimum 20% boost if at least one superfood matches
  }

  return 0;
}

export function updateScoringWeights(
  currentWeights: ScoringWeights,
  userFeedback: { liked: boolean; recipeId: string }[]
): ScoringWeights {
  return currentWeights;
}

export function getSeasonalMultiplier(month: number = new Date().getMonth()): number {
  const seasonalMultipliers: Record<number, number> = {
    0: 1.0, 1: 1.0, 2: 1.1, 3: 1.2, 4: 1.2, 5: 1.1,
    6: 1.0, 7: 1.0, 8: 1.1, 9: 1.2, 10: 1.1, 11: 1.0
  };
  return seasonalMultipliers[month] || 1.0;
}