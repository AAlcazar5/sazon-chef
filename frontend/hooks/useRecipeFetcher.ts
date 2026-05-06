// frontend/hooks/useRecipeFetcher.ts
// Custom hook for centralized recipe fetching with consistent response handling.
//
// Network-failure resilience: transient transport errors (timeout,
// server_unreachable) are retried with exponential backoff before bubbling
// up. 'offline' and 'canceled' classes are NOT retried — those need user
// action / are expected.

import { useCallback, useRef } from 'react';
import { recipeApi } from '../lib/api';
import { HapticPatterns } from '../constants/Haptics';
import { deduplicateRecipes, initializeFeedbackState, type UserFeedback } from '../utils/recipeUtils';
import type { SuggestedRecipe } from '../types';

const RETRY_ATTEMPTS = 2;
const RETRY_BASE_DELAY_MS = 600;
const RETRYABLE_FAILURE_CLASSES = new Set(['timeout', 'server_unreachable', 'unknown_transport']);

function shouldRetry(error: { failureClass?: string }): boolean {
  return !!error?.failureClass && RETRYABLE_FAILURE_CLASSES.has(error.failureClass);
}

function delayMs(attempt: number): number {
  return RETRY_BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200;
}

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
  /** ROADMAP 4.0 FX3.1 — true when the backend returned the unfiltered top-K
   *  because the post-filter set was sparse. UI should render the
   *  "showing closest matches" pill above the grid. */
  softFilterMode?: boolean;
  /** ROADMAP 4.0 FX3.1 — names of the filter categories that narrowed the
   *  results. Used in the pill copy. */
  narrowedBy?: string[];
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

      // Retry transient transport failures with exponential backoff.
      // 'offline' and 'canceled' fall through immediately — those need
      // user action or are expected.
      let response;
      let lastError: any = null;
      for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt += 1) {
        try {
          response = await recipeApi.getAllRecipes(apiParams);
          lastError = null;
          break;
        } catch (err: any) {
          lastError = err;
          if (!shouldRetry(err) || attempt === RETRY_ATTEMPTS) throw err;
          const ms = delayMs(attempt);
          console.warn(
            `⏳ Recipe fetch failed (${err.failureClass}/${err.axiosCode}) on attempt ${attempt + 1}/${RETRY_ATTEMPTS + 1}, retrying in ${Math.round(ms)}ms`,
          );
          await new Promise(resolve => setTimeout(resolve, ms));
        }
      }
      if (!response) throw lastError;
      const responseData = response.data;

      // Parse response - handle both paginated format and legacy array format
      let recipes: SuggestedRecipe[];
      let total: number;
      let softFilterMode: boolean | undefined;
      let narrowedBy: string[] | undefined;

      if (responseData && responseData.recipes && responseData.pagination) {
        // New paginated format: { recipes: [], pagination: { total, page, limit }, softFilterMode?, narrowedBy? }
        recipes = responseData.recipes;
        total = responseData.pagination.total;
        softFilterMode = responseData.softFilterMode;
        narrowedBy = responseData.narrowedBy;
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
        softFilterMode,
        narrowedBy,
      };

      onSuccess?.(result);
      return result;
    } catch (error: any) {
      // Ignore abort errors (component unmount, AbortController.abort()).
      if (error.name === 'AbortError' || error?.failureClass === 'canceled' || error?.code === 'CANCELED') {
        return null;
      }

      // Structured log so we can pinpoint failures in Sentry / dev console.
      // Includes failure class + axios code + URL + method when available.
      const diag = [
        error?.failureClass && `class=${error.failureClass}`,
        error?.axiosCode && `axios=${error.axiosCode}`,
        error?.code && `code=${error.code}`,
        error?.method && error?.url && `${error.method} ${error.url}`,
      ].filter(Boolean).join(' ');
      console.error(`❌ Recipe fetch failed${diag ? ` [${diag}]` : ''}: ${error?.message ?? error}`);

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
