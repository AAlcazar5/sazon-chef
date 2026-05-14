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
 * ROADMAP 4.0 FX4.2 — total active filter count for the FilterRow badge.
 *
 * `activeFilters: string[]` (from useRecipeFilters) only covers
 * cuisines / dietary / cookTime / difficulty. The FilterRow badge needs to
 * reflect ALL active toggles so a user with `highProtein: true` +
 * `mealPrepMode: true` doesn't see a misleading `0`.
 */
export interface AllFilterToggles {
  filters: FilterState;
  quickMacroFilters?: { highProtein: boolean; lowCarb: boolean; lowCalorie: boolean };
  mealPrepMode?: boolean;
  mood?: string | null | undefined;
}

export function countAllActiveFilters(input: AllFilterToggles): number {
  let count = countActiveFilters(input.filters);
  if (input.quickMacroFilters) {
    if (input.quickMacroFilters.highProtein) count++;
    if (input.quickMacroFilters.lowCarb) count++;
    if (input.quickMacroFilters.lowCalorie) count++;
  }
  if (input.mealPrepMode) count++;
  if (input.mood) count++;
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
 * Cuisine options for filter modal — flat list of every canonical cuisine
 * across all regions. The filter UI groups these by region via the
 * hierarchical CuisinePicker; callers that need a simple flat list (label
 * lookups, search) can iterate this array directly.
 */
import { ALL_CUISINES } from './cuisineTaxonomy';
export const CUISINE_OPTIONS: readonly string[] = ALL_CUISINES;

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
