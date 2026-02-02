// frontend/hooks/useRecipeDataManager.ts
// Hook for managing recipe data state with centralized fetching

import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { HapticPatterns } from '../constants/Haptics';
import { useRecipeFetcher, type RecipeFetchParams, type RecipeFetchResult } from './useRecipeFetcher';
import { initializeFeedbackState, type UserFeedback } from '../utils/recipeUtils';
import type { SuggestedRecipe } from '../types';
import type { FilterState } from '../lib/filterStorage';

export interface QuickMacroFilters {
  highProtein: boolean;
  lowCarb: boolean;
  lowCalorie: boolean;
}

export interface UseRecipeDataManagerOptions {
  recipesPerPage: number;
  filters: FilterState;
  mealPrepMode: boolean;
  timeAwareMode: boolean;
  searchQuery: string;
  quickMacroFilters: QuickMacroFilters;
}

export interface UseRecipeDataManagerReturn {
  /** Current page of recipes */
  recipes: SuggestedRecipe[];
  /** All recipes (for backward compatibility) */
  allRecipes: SuggestedRecipe[];
  /** Total recipe count from server */
  totalRecipes: number;
  /** Current page number (0-indexed) */
  currentPage: number;
  /** User feedback state for recipes */
  userFeedback: Record<string, UserFeedback>;
  /** Animated recipe IDs */
  animatedRecipeIds: Set<string>;
  /** Whether data is loading */
  loading: boolean;
  /** Whether initial recipes have been loaded */
  initialRecipesLoaded: boolean;
  /** Set recipes directly */
  setRecipes: React.Dispatch<React.SetStateAction<SuggestedRecipe[]>>;
  /** Set user feedback */
  setUserFeedback: React.Dispatch<React.SetStateAction<Record<string, UserFeedback>>>;
  /** Set animated IDs */
  setAnimatedRecipeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  /** Fetch recipes with current filters */
  fetchWithFilters: (overrides?: Partial<RecipeFetchParams>) => Promise<RecipeFetchResult | null>;
  /** Fetch a specific page */
  fetchPage: (page: number) => Promise<RecipeFetchResult | null>;
  /** Update recipe data from a fetch result */
  applyFetchResult: (result: RecipeFetchResult, resetPage?: boolean) => void;
  /** Reset to initial state */
  reset: () => void;
  /** Get macro filter params for API calls */
  getMacroFilterParams: () => { minProtein?: number; maxCarbs?: number; maxCalories?: number };
}

/**
 * Hook for managing recipe data state with centralized fetching.
 * Consolidates the common pattern of fetching recipes and updating multiple state values.
 */
export function useRecipeDataManager(options: UseRecipeDataManagerOptions): UseRecipeDataManagerReturn {
  const { recipesPerPage, filters, mealPrepMode, timeAwareMode, searchQuery, quickMacroFilters } = options;

  // Recipe data state
  const [recipes, setRecipes] = useState<SuggestedRecipe[]>([]);
  const [allRecipes, setAllRecipes] = useState<SuggestedRecipe[]>([]);
  const [totalRecipes, setTotalRecipes] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [userFeedback, setUserFeedback] = useState<Record<string, UserFeedback>>({});
  const [animatedRecipeIds, setAnimatedRecipeIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [initialRecipesLoaded, setInitialRecipesLoaded] = useState(false);

  // Use the centralized fetcher
  const { fetchRecipes } = useRecipeFetcher();

  // Build macro filter params
  const getMacroFilterParams = useCallback(() => {
    const params: { minProtein?: number; maxCarbs?: number; maxCalories?: number } = {};
    if (quickMacroFilters.highProtein) params.minProtein = 30;
    if (quickMacroFilters.lowCarb) params.maxCarbs = 30;
    if (quickMacroFilters.lowCalorie) params.maxCalories = 400;
    return params;
  }, [quickMacroFilters]);

  // Build base fetch params from current filters
  const baseFetchParams = useMemo((): RecipeFetchParams => ({
    limit: recipesPerPage,
    cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
    dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
    maxCookTime: filters.maxCookTime || undefined,
    difficulty: filters.difficulty.length > 0 ? filters.difficulty[0] : undefined,
    mealPrepMode,
    search: searchQuery || undefined,
    useTimeAwareDefaults: timeAwareMode,
    ...getMacroFilterParams(),
  }), [recipesPerPage, filters, mealPrepMode, searchQuery, timeAwareMode, getMacroFilterParams]);

  // Apply fetch result to state
  const applyFetchResult = useCallback((result: RecipeFetchResult, resetPage = true) => {
    setTotalRecipes(result.total);
    setRecipes(result.recipes);
    setAllRecipes(result.recipes);
    if (resetPage) {
      setCurrentPage(0);
    }
    setUserFeedback(prev => ({ ...prev, ...result.feedback }));
    setAnimatedRecipeIds(new Set());
    setInitialRecipesLoaded(true);
  }, []);

  // Fetch with current filters and optional overrides
  const fetchWithFilters = useCallback(async (overrides?: Partial<RecipeFetchParams>): Promise<RecipeFetchResult | null> => {
    setLoading(true);
    try {
      const params: RecipeFetchParams = {
        ...baseFetchParams,
        page: 0,
        ...overrides,
      };

      const result = await fetchRecipes(params);
      if (result) {
        applyFetchResult(result, !overrides?.page);
      }
      return result;
    } catch (error: any) {
      console.error('❌ Error fetching recipes:', error);
      Alert.alert('Error', 'Failed to load recipes. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [baseFetchParams, fetchRecipes, applyFetchResult]);

  // Fetch a specific page
  const fetchPage = useCallback(async (page: number): Promise<RecipeFetchResult | null> => {
    setLoading(true);
    try {
      console.log(`📄 Fetching page ${page + 1} with ${recipesPerPage} recipes per page`);

      const result = await fetchRecipes({
        ...baseFetchParams,
        page,
      });

      if (result) {
        setTotalRecipes(result.total);
        setRecipes(result.recipes);
        setCurrentPage(page);
        setAnimatedRecipeIds(new Set());
        setUserFeedback(prev => ({ ...prev, ...result.feedback }));
        HapticPatterns.buttonPress();
      }
      return result;
    } catch (error: any) {
      console.error('❌ Error fetching page:', error);
      Alert.alert('Error', 'Failed to load recipes. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [baseFetchParams, recipesPerPage, fetchRecipes]);

  // Reset state
  const reset = useCallback(() => {
    setRecipes([]);
    setAllRecipes([]);
    setTotalRecipes(0);
    setCurrentPage(0);
    setUserFeedback({});
    setAnimatedRecipeIds(new Set());
    setInitialRecipesLoaded(false);
  }, []);

  return {
    recipes,
    allRecipes,
    totalRecipes,
    currentPage,
    userFeedback,
    animatedRecipeIds,
    loading,
    initialRecipesLoaded,
    setRecipes,
    setUserFeedback,
    setAnimatedRecipeIds,
    fetchWithFilters,
    fetchPage,
    applyFetchResult,
    reset,
    getMacroFilterParams,
  };
}

export default useRecipeDataManager;
