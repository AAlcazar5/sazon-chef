// frontend/hooks/useRecipeFetcher.ts
// Custom hook for centralized recipe fetching with consistent response handling

import { useCallback, useRef } from 'react';
import { recipeApi } from '../lib/api';
import { HapticPatterns } from '../constants/Haptics';
import { deduplicateRecipes, initializeFeedbackState, type UserFeedback } from '../utils/recipeUtils';
import type { SuggestedRecipe } from '../types';

export interface RecipeFetchParams {
  page?: number;
  limit?: number;
  cuisines?: string[];
  dietaryRestrictions?: string[];
  maxCookTime?: number | null;
  difficulty?: string;
  mealPrepMode?: boolean;
  search?: string;
  minProtein?: number;
  maxCarbs?: number;
  maxCalories?: number;
  useTimeAwareDefaults?: boolean;
  mood?: string;
  shuffle?: boolean;
  scope?: 'all' | 'saved' | 'liked';
}

export interface RecipeFetchResult {
  recipes: SuggestedRecipe[];
  total: number;
  feedback: Record<string, UserFeedback>;
}

export interface UseRecipeFetcherOptions {
  onSuccess?: (result: RecipeFetchResult) => void;
  onError?: (error: any) => void;
}

export interface UseRecipeFetcherReturn {
  /** Fetch recipes with the given parameters */
  fetchRecipes: (params: RecipeFetchParams) => Promise<RecipeFetchResult | null>;
  /** Whether a fetch is currently in progress */
  isFetching: boolean;
  /** Abort any in-progress fetch */
  abort: () => void;
}

/**
 * Hook for centralized recipe fetching with consistent response handling.
 * Handles both paginated { recipes, pagination } and legacy array response formats.
 * Automatically deduplicates recipes and initializes feedback state.
 */
export function useRecipeFetcher(options?: UseRecipeFetcherOptions): UseRecipeFetcherReturn {
  const { onSuccess, onError } = options || {};
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchRecipes = useCallback(async (params: RecipeFetchParams): Promise<RecipeFetchResult | null> => {
    // Abort any previous fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    isFetchingRef.current = true;

    try {
      // Build API params - only include defined values
      const apiParams: Record<string, any> = {
        page: params.page ?? 0,
        limit: params.limit ?? 20,
      };

      // Only add optional params if they have values
      if (params.cuisines && params.cuisines.length > 0) {
        apiParams.cuisines = params.cuisines;
      }
      if (params.dietaryRestrictions && params.dietaryRestrictions.length > 0) {
        apiParams.dietaryRestrictions = params.dietaryRestrictions;
      }
      if (params.maxCookTime) {
        apiParams.maxCookTime = params.maxCookTime;
      }
      if (params.difficulty) {
        apiParams.difficulty = params.difficulty;
      }
      if (params.mealPrepMode !== undefined) {
        apiParams.mealPrepMode = params.mealPrepMode;
      }
      if (params.search) {
        apiParams.search = params.search;
      }
      if (params.minProtein) {
        apiParams.minProtein = params.minProtein;
      }
      if (params.maxCarbs) {
        apiParams.maxCarbs = params.maxCarbs;
      }
      if (params.maxCalories) {
        apiParams.maxCalories = params.maxCalories;
      }
      if (params.useTimeAwareDefaults !== undefined) {
        apiParams.useTimeAwareDefaults = params.useTimeAwareDefaults;
      }
      if (params.mood) {
        apiParams.mood = params.mood;
      }
      if (params.shuffle) {
        apiParams.shuffle = params.shuffle;
      }
      if (params.scope && params.scope !== 'all') {
        apiParams.scope = params.scope;
      }

      console.log('📄 Fetching recipes with params:', apiParams);

      const response = await recipeApi.getAllRecipes(apiParams);
      const responseData = response.data;

      // Parse response - handle both paginated format and legacy array format
      let recipes: SuggestedRecipe[];
      let total: number;

      if (responseData && responseData.recipes && responseData.pagination) {
        // New paginated format: { recipes: [], pagination: { total, page, limit } }
        recipes = responseData.recipes;
        total = responseData.pagination.total;
        console.log(`📄 Received ${recipes.length} recipes (paginated format), total: ${total}`);
      } else if (Array.isArray(responseData)) {
        // Legacy array format: Recipe[]
        recipes = responseData;
        total = recipes.length;
        console.log(`📄 Received ${recipes.length} recipes (array format)`);
      } else {
        console.error('❌ Unexpected API response format:', responseData);
        throw new Error('Unexpected API response format');
      }

      // Deduplicate recipes
      const deduplicated = deduplicateRecipes(recipes);

      // Initialize feedback state
      const feedback = initializeFeedbackState(deduplicated);

      const result: RecipeFetchResult = {
        recipes: deduplicated,
        total,
        feedback,
      };

      onSuccess?.(result);
      return result;
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        return null;
      }

      console.error('❌ Error fetching recipes:', error?.message || error);
      HapticPatterns.error();
      onError?.(error);
      return null;
    } finally {
      isFetchingRef.current = false;
    }
  }, [onSuccess, onError]);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    fetchRecipes,
    isFetching: isFetchingRef.current,
    abort,
  };
}

export default useRecipeFetcher;
