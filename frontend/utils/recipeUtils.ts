// frontend/utils/recipeUtils.ts
// Utility functions for recipe data processing

import type { SuggestedRecipe } from '../types';
import { Colors, DarkColors } from '../constants/Colors';

/**
 * User feedback state for a recipe
 */
export interface UserFeedback {
  liked: boolean;
  disliked: boolean;
}

/**
 * Parse API response to extract recipes and total count
 * Handles both paginated and array responses
 */
export function parseRecipeResponse(responseData: any): { recipes: SuggestedRecipe[]; total: number } {
  if (responseData && responseData.recipes && responseData.pagination) {
    return {
      recipes: responseData.recipes,
      total: responseData.pagination.total,
    };
  } else if (Array.isArray(responseData)) {
    return {
      recipes: responseData,
      total: responseData.length,
    };
  }
  return { recipes: [], total: 0 };
}

/**
 * Initialize feedback state for a list of recipes
 * Sets all recipes to unliked/undisliked
 */
export function initializeFeedbackState(recipes: SuggestedRecipe[]): Record<string, UserFeedback> {
  const initialFeedback: Record<string, UserFeedback> = {};
  recipes.forEach((recipe) => {
    if (recipe?.id) {
      initialFeedback[recipe.id] = { liked: false, disliked: false };
    }
  });
  return initialFeedback;
}

/**
 * Deduplicate recipes by ID
 * Logs warnings for duplicates found
 */
export function deduplicateRecipes(recipes: SuggestedRecipe[]): SuggestedRecipe[] {
  const seen = new Set<string>();
  return recipes.filter(recipe => {
    if (!recipe || !recipe.id) {
      console.warn('⚠️ Found recipe without ID:', recipe);
      return false;
    }
    if (seen.has(recipe.id)) {
      console.warn('⚠️ Duplicate recipe found:', recipe.id, recipe.title);
      return false;
    }
    seen.add(recipe.id);
    return true;
  });
}

/**
 * Get color style based on match score
 */
export function getScoreColor(score: number, isDark: boolean): { color: string } {
  if (score >= 80) return { color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen };
  if (score >= 60) return { color: isDark ? DarkColors.primary : Colors.primary };
  return { color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed };
}

/**
 * Get border color based on recipe match score
 */
export function getBorderColorFromScore(recipe: SuggestedRecipe, isDark: boolean): string {
  const matchScore = recipe.score?.matchPercentage || 0;
  const totalScore = recipe.score?.total || 0;
  const score = matchScore || totalScore;

  if (score >= 85) {
    return Colors.tertiaryGreen;
  } else if (score >= 70) {
    return Colors.primary;
  } else if (score >= 50) {
    return '#F59E0B';
  } else {
    return isDark ? DarkColors.secondaryRed : Colors.secondaryRed;
  }
}

/**
 * Get consistent shadow style for recipe cards
 */
export function getShadowStyle(isDark: boolean) {
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  };
}

/**
 * Get placeholder icon and colors based on cuisine type
 */
export function getRecipePlaceholder(cuisine: string): { icon: string; color: string; bg: string } {
  const placeholders: Record<string, { icon: string; color: string; bg: string }> = {
    'Mediterranean': { icon: 'fish-outline', color: '#3B82F6', bg: '#DBEAFE' },
    'Asian': { icon: 'restaurant-outline', color: Colors.secondaryRed, bg: '#FEE2E2' },
    'Mexican': { icon: 'flame-outline', color: '#F59E0B', bg: '#FEF3C7' },
    'Italian': { icon: 'pizza-outline', color: '#10B981', bg: '#D1FAE5' },
    'American': { icon: 'fast-food-outline', color: '#6366F1', bg: '#E0E7FF' },
    'Indian': { icon: 'restaurant-outline', color: '#F97316', bg: '#FFEDD5' },
    'Thai': { icon: 'leaf-outline', color: '#14B8A6', bg: '#CCFBF1' },
    'French': { icon: 'wine-outline', color: '#8B5CF6', bg: '#EDE9FE' },
    'Japanese': { icon: 'fish-outline', color: '#EC4899', bg: '#FCE7F3' },
    'Chinese': { icon: 'restaurant-outline', color: Colors.secondaryRed, bg: '#FEE2E2' },
  };

  return placeholders[cuisine] || { icon: 'restaurant-outline', color: '#9CA3AF', bg: '#F3F4F6' };
}

/**
 * Truncate description text to specified length
 */
export function truncateDescription(text: string, maxLength: number = 120): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Recipe section configuration
 */
export interface RecipeSection {
  title: string;
  emoji: string;
  recipes: SuggestedRecipe[];
  key: string;
  priority?: number;
}

/**
 * Options for grouping recipes into sections
 */
export interface GroupRecipesOptions {
  quickMealsRecipes: SuggestedRecipe[];
  perfectMatchRecipes: SuggestedRecipe[];
  mealPrepMode: boolean;
  searchQuery: string;
}

/**
 * Group recipes into contextual display sections
 */
export function groupRecipesIntoSections(
  suggestedRecipes: SuggestedRecipe[],
  options: GroupRecipesOptions
): RecipeSection[] {
  const { quickMealsRecipes, perfectMatchRecipes, mealPrepMode, searchQuery } = options;

  if (suggestedRecipes.length <= 1) return [];

  const remainingRecipes = suggestedRecipes.slice(1);
  const sections: RecipeSection[] = [];
  const usedHighlightIds = new Set<string>();

  const takeUnique = (
    candidates: SuggestedRecipe[],
    predicate: (r: SuggestedRecipe) => boolean,
    maxCount: number
  ): SuggestedRecipe[] => {
    const picked: SuggestedRecipe[] = [];
    for (const r of candidates) {
      if (picked.length >= maxCount) break;
      if (usedHighlightIds.has(r.id)) continue;
      if (!predicate(r)) continue;
      usedHighlightIds.add(r.id);
      picked.push(r);
    }
    return picked;
  };

  // Quick Meals section
  if (!searchQuery && quickMealsRecipes.length > 0) {
    const availableQuickMeals = quickMealsRecipes.filter(r => !usedHighlightIds.has(r.id));
    if (availableQuickMeals.length > 0) {
      const quickMeals = availableQuickMeals.slice(0, 5);
      quickMeals.forEach(r => usedHighlightIds.add(r.id));
      sections.push({
        title: 'Quick Meals',
        emoji: '⚡',
        recipes: quickMeals,
        key: 'quick-meals',
        priority: 10,
      });
    }
  }

  // Perfect Match section
  if (!searchQuery && perfectMatchRecipes.length > 0) {
    const availablePerfectMatches = perfectMatchRecipes.filter(r => !usedHighlightIds.has(r.id));
    if (availablePerfectMatches.length > 0) {
      const perfectMatches = availablePerfectMatches
        .sort((a, b) => (b.score?.matchPercentage || 0) - (a.score?.matchPercentage || 0))
        .slice(0, 5);
      perfectMatches.forEach(r => usedHighlightIds.add(r.id));
      sections.push({
        title: 'Perfect Match for You',
        emoji: '⭐',
        recipes: perfectMatches,
        key: 'perfect-match',
      });
    }
  }

  // Great for Meal Prep
  const mealPrepRecipes = takeUnique(
    remainingRecipes,
    (r) => (r as any).mealPrepSuitable || (r as any).freezable || (r as any).batchFriendly,
    10
  );
  if (mealPrepRecipes.length > 0 && !mealPrepMode) {
    sections.push({
      title: 'Great for Meal Prep',
      emoji: '🍱',
      recipes: mealPrepRecipes,
      key: 'meal-prep',
    });
  }

  // High in Superfoods
  const superfoodRecipes = takeUnique(
    remainingRecipes,
    (r) => r.healthGrade === 'A' || r.healthGrade === 'B',
    10
  );
  if (superfoodRecipes.length > 0) {
    sections.push({
      title: 'High in Superfoods',
      emoji: '🥗',
      recipes: superfoodRecipes,
      key: 'superfoods',
    });
  }

  // Recipes for You
  const recipesForYou = [
    ...remainingRecipes.filter((r) => !usedHighlightIds.has(r.id)),
    ...remainingRecipes.filter((r) => usedHighlightIds.has(r.id)),
  ];
  if (recipesForYou.length > 0) {
    sections.push({
      title: 'For You',
      emoji: '🍳',
      recipes: recipesForYou,
      key: 'quick-easy',
      priority: 5,
    });
  }

  // Sort by priority
  sections.sort((a, b) => (a.priority || 99) - (b.priority || 99));

  return sections;
}
