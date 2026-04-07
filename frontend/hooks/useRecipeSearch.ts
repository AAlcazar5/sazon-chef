// frontend/hooks/useRecipeSearch.ts
// Custom hook for managing recipe search state and URL param search (regular + craving)

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalSearchParams } from 'expo-router';
import type { FilterState } from '../lib/filterStorage';
import { type RecipeFetchResult, type RecipeFetchParams } from './useRecipeFetcher';
import type { ToastType } from '../components/ui/Toast';
import { searchApi } from '../lib/api';
import { deduplicateRecipes, initializeFeedbackState } from '../utils/recipeUtils';

interface UseRecipeSearchOptions {
  filtersLoaded: boolean;
  filters: FilterState;
  mealPrepMode: boolean;
  recipesPerPage: number;
  fetchRecipes: (params: RecipeFetchParams) => Promise<RecipeFetchResult | null>;
  applyFetchResult: (result: RecipeFetchResult) => void;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  setLoadingFromFilters: (loading: boolean) => void;
  resetPage: () => void;
}

interface UseRecipeSearchReturn {
  searchQuery: string;
  cravingQuery: string;
  isCravingSearch: boolean;
  handleSearchChange: (text: string) => void;
  clearSearch: () => void;
  rerunCravingSearch: () => void;
}

export function useRecipeSearch(options: UseRecipeSearchOptions): UseRecipeSearchReturn {
  const {
    filtersLoaded,
    filters,
    mealPrepMode,
    recipesPerPage,
    fetchRecipes,
    applyFetchResult,
    showToast,
    setLoadingFromFilters,
    resetPage,
  } = options;

  const { search: searchParam, craving: cravingParam } = useLocalSearchParams<{
    search?: string;
    craving?: string;
  }>();
  const [searchQuery, setSearchQuery] = useState<string>('');
  // cravingQuery is kept separate so it doesn't bleed into useInitialRecipeLoad
  const [cravingQuery, setCravingQuery] = useState<string>('');
  const [isCravingSearch, setIsCravingSearch] = useState(false);
  // Track last processed params to prevent effect re-fire loops
  const lastProcessedSearch = useRef<string | undefined>();
  const lastProcessedCraving = useRef<string | undefined>();

  // Handle regular search triggered via URL params
  useEffect(() => {
    if (!filtersLoaded) return;
    if (searchParam && typeof searchParam === 'string' && searchParam.trim().length > 0) {
      const query = searchParam.trim();
      if (lastProcessedSearch.current === query) return;
      lastProcessedSearch.current = query;

      setSearchQuery(query);
      setIsCravingSearch(false);

      const runSearch = async () => {
        setLoadingFromFilters(true);
        const result = await fetchRecipes({
          page: 0,
          limit: recipesPerPage,
          search: query,
          cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
          dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
          maxCookTime: filters.maxCookTime || undefined,
          difficulty: filters.difficulty.length > 0 ? filters.difficulty[0] : undefined,
          mealPrepMode: mealPrepMode,
        });

        if (result) {
          applyFetchResult(result);
          showToast(
            result.recipes.length > 0
              ? `🔍 Found ${result.recipes.length} recipes matching "${query}"`
              : `😔 No recipes found for "${query}"`,
            result.recipes.length > 0 ? 'success' : 'error',
            2000
          );
        } else {
          showToast('❌ Failed to search recipes', 'error');
        }
        setLoadingFromFilters(false);
      };
      runSearch();
    } else if (searchQuery && !searchParam && !cravingParam) {
      lastProcessedSearch.current = undefined;
      setSearchQuery('');
      setIsCravingSearch(false);
    }
  }, [searchParam, filtersLoaded, recipesPerPage, filters, mealPrepMode, fetchRecipes, applyFetchResult, showToast, setLoadingFromFilters]);

  // Handle craving search triggered via URL params
  useEffect(() => {
    if (!filtersLoaded) return;
    if (!cravingParam || typeof cravingParam !== 'string' || !cravingParam.trim()) return;

    const query = cravingParam.trim();
    // Include filters in the dedup key so changing filters re-runs the craving search
    const cravingKey = JSON.stringify({ query, cuisines: filters.cuisines, dietary: filters.dietaryRestrictions, maxCookTime: filters.maxCookTime, difficulty: filters.difficulty, mealPrepMode });
    if (lastProcessedCraving.current === cravingKey) return;
    lastProcessedCraving.current = cravingKey;

    setCravingQuery(query);
    setIsCravingSearch(true);

    const runCravingSearch = async () => {
      setLoadingFromFilters(true);
      try {
        const response = await searchApi.cravingSearch(query, {
          cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
          dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
          maxCookTime: filters.maxCookTime || undefined,
          difficulty: filters.difficulty.length > 0 ? filters.difficulty[0] : undefined,
          mealPrepMode,
        });
        const data = response.data as {
          recipes: any[];
          query: string;
          searchTerms: string[];
          totalMatches: number;
        };

        const deduplicated = deduplicateRecipes(data.recipes || []);
        const result: RecipeFetchResult = {
          recipes: deduplicated,
          total: data.totalMatches || 0,
          feedback: initializeFeedbackState(deduplicated),
        };

        applyFetchResult(result);
      } catch {
        showToast('❌ Craving search failed', 'error');
      }
      setLoadingFromFilters(false);
    };
    runCravingSearch();
  }, [cravingParam, filtersLoaded, filters, mealPrepMode, applyFetchResult, showToast, setLoadingFromFilters]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    resetPage();
  }, [resetPage]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setCravingQuery('');
    setIsCravingSearch(false);
    lastProcessedSearch.current = undefined;
    lastProcessedCraving.current = undefined;
    resetPage();
  }, [resetPage]);

  // Reset the craving dedup key so the effect re-fires with updated filters
  const rerunCravingSearch = useCallback(() => {
    lastProcessedCraving.current = undefined;
  }, []);

  return {
    searchQuery,
    cravingQuery,
    isCravingSearch,
    handleSearchChange,
    clearSearch,
    rerunCravingSearch,
  };
}
