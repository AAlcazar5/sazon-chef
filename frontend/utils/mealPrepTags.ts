/**
 * Utility functions for meal prep recipe tagging and categorization
 */

import type { Recipe } from '../types';

export interface MealPrepTag {
  id: string;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  priority: number; // Higher priority = shown first
}

export type MealPrepCategory = 
  | 'freezable'
  | 'batch-friendly'
  | 'weekly-prep'
  | 'meal-prep-ready'
  | 'great-for-meal-prep'
  | 'good-for-meal-prep';

/**
 * Get meal prep tags for a recipe based on its properties
 */
export function getMealPrepTags(recipe: Recipe): MealPrepTag[] {
  const tags: MealPrepTag[] = [];

  // Freezable tag
  if (recipe.freezable || recipe.freezerStorageMonths) {
    tags.push({
      id: 'freezable',
      label: 'Freezable',
      emoji: '❄️',
      color: '#3B82F6',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      borderColor: 'border-blue-200 dark:border-blue-800',
      textColor: 'text-blue-800 dark:text-blue-300',
      priority: 4,
    });
  }

  // Batch-friendly tag
  if (recipe.batchFriendly) {
    tags.push({
      id: 'batch-friendly',
      label: 'Batch Friendly',
      emoji: '🍱',
      color: '#F97316',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      borderColor: 'border-orange-200 dark:border-orange-800',
      textColor: 'text-orange-800 dark:text-orange-300',
      priority: 3,
    });
  }

  // Weekly prep tag
  if (recipe.weeklyPrepFriendly || recipe.fridgeStorageDays) {
    tags.push({
      id: 'weekly-prep',
      label: 'Weekly Prep',
      emoji: '📅',
      color: '#10B981',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      borderColor: 'border-green-200 dark:border-green-800',
      textColor: 'text-green-800 dark:text-green-300',
      priority: 2,
    });
  }

  // Meal prep ready tag (general suitability)
  if (recipe.mealPrepSuitable) {
    tags.push({
      id: 'meal-prep-ready',
      label: 'Meal Prep Ready',
      emoji: '✅',
      color: '#6366F1',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
      borderColor: 'border-indigo-200 dark:border-indigo-800',
      textColor: 'text-indigo-800 dark:text-indigo-300',
      priority: 1,
    });
  }

  // Great for meal prep (high score)
  if (recipe.mealPrepScore && recipe.mealPrepScore >= 80) {
    tags.push({
      id: 'great-for-meal-prep',
      label: 'Great for Meal Prep',
      emoji: '⭐',
      color: '#F59E0B',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      textColor: 'text-yellow-800 dark:text-yellow-300',
      priority: 5,
    });
  } else if (recipe.mealPrepScore && recipe.mealPrepScore >= 60) {
    // Good for meal prep (medium score)
    tags.push({
      id: 'good-for-meal-prep',
      label: 'Good for Meal Prep',
      emoji: '👍',
      color: '#10B981',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      borderColor: 'border-green-200 dark:border-green-800',
      textColor: 'text-green-800 dark:text-green-300',
      priority: 0,
    });
  }

  // Sort by priority (highest first)
  return tags.sort((a, b) => b.priority - a.priority);
}

/**
 * Get the primary meal prep category for a recipe
 */
export function getPrimaryMealPrepCategory(recipe: Recipe): MealPrepCategory | null {
  const tags = getMealPrepTags(recipe);
  if (tags.length === 0) return null;

  // Return the highest priority tag's category
  const categoryMap: Record<string, MealPrepCategory> = {
    'freezable': 'freezable',
    'batch-friendly': 'batch-friendly',
    'weekly-prep': 'weekly-prep',
    'meal-prep-ready': 'meal-prep-ready',
    'great-for-meal-prep': 'great-for-meal-prep',
    'good-for-meal-prep': 'good-for-meal-prep',
  };

  return categoryMap[tags[0].id] || null;
}

/**
 * Get meal prep suitability badge text
 */
export function getMealPrepSuitabilityBadge(recipe: Recipe): string | null {
  if (recipe.mealPrepScore !== undefined) {
    if (recipe.mealPrepScore >= 80) {
      return 'Great for Meal Prep';
    } else if (recipe.mealPrepScore >= 60) {
      return 'Good for Meal Prep';
    } else if (recipe.mealPrepScore >= 40) {
      return 'Okay for Meal Prep';
    } else {
      return 'Not Recommended for Meal Prep';
    }
  }

  // Fallback to boolean flags
  if (recipe.mealPrepSuitable || recipe.batchFriendly || recipe.freezable || recipe.weeklyPrepFriendly) {
    return 'Meal Prep Suitable';
  }

  return null;
}

