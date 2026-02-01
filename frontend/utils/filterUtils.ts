// frontend/utils/filterUtils.ts
// Utility functions for recipe filtering

import { FilterState } from '../lib/filterStorage';

/**
 * Options for building filter params
 */
export interface FilterOptions {
  mealPrepMode?: boolean;
  timeAwareMode?: boolean;
  mealPeriod?: string;
  mood?: string;
  minProtein?: number;
  maxCarbs?: number;
  maxCalories?: number;
  shuffle?: boolean;
  searchQuery?: string;
}

/**
 * API filter parameters
 */
export interface ApiFilterParams {
  cuisines?: string[];
  dietaryRestrictions?: string[];
  maxCookTime?: number;
  difficulty?: string[];
  mealPrepMode?: boolean;
  useTimeAwareDefaults?: boolean;
  mood?: string;
  minProtein?: number;
  maxCarbs?: number;
  maxCalories?: number;
  shuffle?: boolean;
  search?: string;
}

/**
 * Build filter params for API calls
 */
export function buildFilterParams(
  filters: FilterState,
  options: FilterOptions = {}
): ApiFilterParams {
  const params: ApiFilterParams = {};

  // Core filters
  if (filters.cuisines.length > 0) {
    params.cuisines = filters.cuisines;
  }
  if (filters.dietaryRestrictions.length > 0) {
    params.dietaryRestrictions = filters.dietaryRestrictions;
  }
  if (filters.maxCookTime !== null) {
    params.maxCookTime = filters.maxCookTime;
  }
  if (filters.difficulty.length > 0) {
    params.difficulty = filters.difficulty;
  }

  // Mode options
  if (options.mealPrepMode) {
    params.mealPrepMode = true;
  }
  if (options.timeAwareMode) {
    params.useTimeAwareDefaults = true;
  }
  if (options.mood) {
    params.mood = options.mood;
  }

  // Macro filters
  if (options.minProtein !== undefined) {
    params.minProtein = options.minProtein;
  }
  if (options.maxCarbs !== undefined) {
    params.maxCarbs = options.maxCarbs;
  }
  if (options.maxCalories !== undefined) {
    params.maxCalories = options.maxCalories;
  }

  // Search and shuffle
  if (options.shuffle) {
    params.shuffle = true;
  }
  if (options.searchQuery) {
    params.search = options.searchQuery;
  }

  return params;
}

/**
 * Get human-readable labels for active filters
 */
export function getActiveFilterLabels(filters: FilterState): string[] {
  const labels: string[] = [];

  // Add cuisine labels
  filters.cuisines.forEach(cuisine => {
    labels.push(cuisine);
  });

  // Add dietary labels
  filters.dietaryRestrictions.forEach(diet => {
    labels.push(diet);
  });

  // Add cook time label
  if (filters.maxCookTime !== null) {
    labels.push(`≤${filters.maxCookTime} min`);
  }

  // Add difficulty labels
  filters.difficulty.forEach(diff => {
    labels.push(diff);
  });

  return labels;
}

/**
 * Check if any filters are active
 */
export function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.cuisines.length > 0 ||
    filters.dietaryRestrictions.length > 0 ||
    filters.maxCookTime !== null ||
    filters.difficulty.length > 0
  );
}

/**
 * Count number of active filter categories
 */
export function countActiveFilters(filters: FilterState): number {
  let count = 0;
  if (filters.cuisines.length > 0) count++;
  if (filters.dietaryRestrictions.length > 0) count++;
  if (filters.maxCookTime !== null) count++;
  if (filters.difficulty.length > 0) count++;
  return count;
}

/**
 * Quick filter definitions
 */
export const QUICK_FILTER_DEFINITIONS = {
  'high-protein': { minProtein: 30 },
  'low-carb': { maxCarbs: 30 },
  'low-calorie': { maxCalories: 400 },
  'quick': { maxCookTime: 20 },
} as const;

export type QuickFilterId = keyof typeof QUICK_FILTER_DEFINITIONS;

/**
 * Get macro filter params from quick filter IDs
 */
export function getQuickFilterParams(activeFilters: string[]): {
  minProtein?: number;
  maxCarbs?: number;
  maxCalories?: number;
  maxCookTime?: number;
} {
  const params: {
    minProtein?: number;
    maxCarbs?: number;
    maxCalories?: number;
    maxCookTime?: number;
  } = {};

  activeFilters.forEach(filterId => {
    const def = QUICK_FILTER_DEFINITIONS[filterId as QuickFilterId];
    if (def) {
      Object.assign(params, def);
    }
  });

  return params;
}

/**
 * Cuisine options for filter modal
 */
export const CUISINE_OPTIONS = [
  'Mediterranean', 'Asian', 'Mexican', 'Italian', 'American',
  'Indian', 'Thai', 'French', 'Japanese', 'Chinese'
];

/**
 * Dietary restriction options for filter modal
 */
export const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free',
  'Keto', 'Paleo', 'Low-Carb', 'High-Protein'
];

/**
 * Difficulty options for filter modal
 */
export const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'];
