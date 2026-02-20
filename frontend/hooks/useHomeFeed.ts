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
  pagination: HomeFeedPagination | null;
}

interface UseHomeFeedReturn extends HomeFeedData {
  loading: boolean;
  error: string | null;
  refetch: (params?: HomeFeedParams) => Promise<HomeFeedData | null>;
}

export function useHomeFeed(params: HomeFeedParams = {}): UseHomeFeedReturn {
  const [data, setData] = useState<HomeFeedData>({
    recipeOfTheDay: null,
    suggestedRecipes: [],
    quickMeals: [],
    perfectMatches: [],
    likedRecipes: [],
    popularSearches: [],
    pagination: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track if initial fetch has happened
  const hasFetched = useRef(false);

  const fetchHomeFeed = useCallback(async (fetchParams?: HomeFeedParams): Promise<HomeFeedData | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await recipeApi.getHomeFeed(fetchParams || params);
      const responseData = response.data;

      const feedData: HomeFeedData = {
        recipeOfTheDay: responseData.recipeOfTheDay || null,
        suggestedRecipes: responseData.suggestedRecipes || [],
        quickMeals: responseData.quickMeals || [],
        perfectMatches: responseData.perfectMatches || [],
        likedRecipes: responseData.likedRecipes || [],
        popularSearches: responseData.popularSearches || [],
        pagination: responseData.pagination || null,
      };

      setData(feedData);
      console.log('🏠 Home feed loaded:', {
        suggested: feedData.suggestedRecipes.length,
        quickMeals: feedData.quickMeals.length,
        perfectMatches: feedData.perfectMatches.length,
        liked: feedData.likedRecipes.length,
        rotd: feedData.recipeOfTheDay?.title || 'none',
      });

      return feedData;
    } catch (err: any) {
      console.error('❌ Error fetching home feed:', err);
      setError(err?.message || 'Failed to fetch home feed');
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
    refetch: fetchHomeFeed,
  };
}

export default useHomeFeed;
