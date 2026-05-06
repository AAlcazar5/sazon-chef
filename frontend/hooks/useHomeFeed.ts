// frontend/hooks/useHomeFeed.ts
// Consolidated hook that fetches all home page data in a single API call

import { useState, useEffect, useCallback, useRef } from 'react';
import { recipeApi } from '../lib/api';
import type { SuggestedRecipe } from '../types';

interface HomeFeedParams {
  page?: number;
  limit?: number;
  cuisines?: string[];
  dietaryRestrictions?: string[];
  maxCookTime?: number;
  difficulty?: string;
  mealPrepMode?: boolean;
  search?: string;
  shuffle?: boolean;
  useTimeAwareDefaults?: boolean;
  mood?: string;
  minProtein?: number;
  maxCarbs?: number;
  maxCalories?: number;
  lat?: number;
  lon?: number;
}

interface PopularSearch {
  query: string;
  count: number;
}

interface HomeFeedPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface HomeFeedData {
  recipeOfTheDay: SuggestedRecipe | null;
  suggestedRecipes: SuggestedRecipe[];
  quickMeals: SuggestedRecipe[];
  perfectMatches: SuggestedRecipe[];
  likedRecipes: SuggestedRecipe[];
  popularSearches: PopularSearch[];
  searchSuggestions: string[];
  pagination: HomeFeedPagination | null;
}

type FailureClass = 'offline' | 'timeout' | 'server_unreachable' | 'canceled' | 'unknown_transport';

interface UseHomeFeedReturn extends HomeFeedData {
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  /** Structured network-failure class from lib/api.ts (when applicable). */
  failureClass: FailureClass | null;
  refetch: (params?: HomeFeedParams) => Promise<HomeFeedData | null>;
}

const RETRYABLE_FAILURE_CLASSES: ReadonlySet<FailureClass> = new Set([
  'timeout', 'server_unreachable', 'unknown_transport',
]);
const RETRY_ATTEMPTS = 2;
const RETRY_BASE_DELAY_MS = 600;

export function useHomeFeed(params: HomeFeedParams = {}): UseHomeFeedReturn {
  const [data, setData] = useState<HomeFeedData>({
    recipeOfTheDay: null,
    suggestedRecipes: [],
    quickMeals: [],
    perfectMatches: [],
    likedRecipes: [],
    popularSearches: [],
    searchSuggestions: [],
    pagination: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [failureClass, setFailureClass] = useState<FailureClass | null>(null);

  // Track if initial fetch has happened
  const hasFetched = useRef(false);

  const fetchHomeFeed = useCallback(async (fetchParams?: HomeFeedParams): Promise<HomeFeedData | null> => {
    try {
      setLoading(true);
      setError(null);
      setErrorCode(null);
      setFailureClass(null);

      // Retry transient transport failures (timeout / server_unreachable)
      // with exponential backoff. 'offline' and 'canceled' fall through.
      let response;
      let lastErr: any = null;
      for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt += 1) {
        try {
          response = await recipeApi.getHomeFeed(fetchParams || params);
          lastErr = null;
          break;
        } catch (err: any) {
          lastErr = err;
          const cls = err?.failureClass as FailureClass | undefined;
          const retryable = !!cls && RETRYABLE_FAILURE_CLASSES.has(cls);
          if (!retryable || attempt === RETRY_ATTEMPTS) throw err;
          const ms = RETRY_BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200;
          console.warn(
            `⏳ Home feed fetch failed (${cls}/${err.axiosCode}) on attempt ${attempt + 1}/${RETRY_ATTEMPTS + 1}, retrying in ${Math.round(ms)}ms`,
          );
          await new Promise(resolve => setTimeout(resolve, ms));
        }
      }
      if (!response) throw lastErr;
      const responseData = response.data;

      const feedData: HomeFeedData = {
        recipeOfTheDay: responseData.recipeOfTheDay || null,
        suggestedRecipes: responseData.suggestedRecipes || [],
        quickMeals: responseData.quickMeals || [],
        perfectMatches: responseData.perfectMatches || [],
        likedRecipes: responseData.likedRecipes || [],
        popularSearches: responseData.popularSearches || [],
        searchSuggestions: responseData.searchSuggestions || [],
        pagination: responseData.pagination || null,
      };

      setData(feedData);
      console.log('🏠 Home feed loaded:', {
        suggested: feedData.suggestedRecipes.length,
        quickMeals: feedData.quickMeals.length,
        perfectMatches: feedData.perfectMatches.length,
        liked: feedData.likedRecipes.length,
        rotd: feedData.recipeOfTheDay?.title || 'none',
        rotdMatchPct: feedData.recipeOfTheDay?.score?.matchPercentage,
        rotdScore: feedData.recipeOfTheDay?.score,
      });

      return feedData;
    } catch (err: any) {
      // Cancellations are expected — never log, never set error state.
      if (err?.failureClass === 'canceled' || err?.code === 'CANCELED') {
        return null;
      }
      const cls: FailureClass | null = err?.failureClass ?? null;
      const diag = [
        cls && `class=${cls}`,
        err?.axiosCode && `axios=${err.axiosCode}`,
        err?.code && `code=${err.code}`,
        err?.method && err?.url && `${err.method} ${err.url}`,
      ].filter(Boolean).join(' ');
      if (cls === 'offline') {
        console.log(`📡 Home feed unavailable — offline${diag ? ` [${diag}]` : ''}`);
      } else {
        console.error(`❌ Home feed fetch failed${diag ? ` [${diag}]` : ''}: ${err?.message ?? err}`);
      }
      setError(err?.message || 'Failed to fetch home feed');
      setErrorCode(err?.code || null);
      setFailureClass(cls);
      return null;
    } finally {
      setLoading(false);
    }
  }, [params.page, params.limit, params.cuisines?.join(','), params.dietaryRestrictions?.join(','),
      params.maxCookTime, params.difficulty, params.mealPrepMode, params.search,
      params.shuffle, params.useTimeAwareDefaults, params.mood,
      params.minProtein, params.maxCarbs, params.maxCalories]);

  // Fetch on mount
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchHomeFeed();
    }
  }, []);

  return {
    ...data,
    loading,
    error,
    errorCode,
    failureClass,
    refetch: fetchHomeFeed,
  };
}

export default useHomeFeed;
