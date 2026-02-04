// frontend/hooks/useRecipeSearch.ts
// Custom hook for managing recipe search state and URL param search

import { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import type { FilterState } from '../lib/filterStorage';
import { type RecipeFetchResult, type RecipeFetchParams } from './useRecipeFetcher';
import type { ToastType } from '../components/ui/Toast';

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
  handleSearchChange: (text: string) => void;
  clearSearch: () => void;
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

  const { search: searchParam } = useLocalSearchParams<{ search?: string }>();
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Handle search triggered via URL params (e.g. deep links or tab navigation)
  useEffect(() => {
    const handleSearch = async () => {
      if (searchParam && typeof searchParam === 'string' && searchParam.trim().length > 0) {
        const query = searchParam.trim();
        setSearchQuery(query);
        console.log('🔍 Searching for:', query);

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
          console.log('📱 HomeScreen: Search results', result.recipes.length);
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
      } else if (searchQuery && !searchParam) {
        // Clear search if param was removed
        setSearchQuery('');
      }
    };

    if (filtersLoaded) {
      handleSearch();
    }
  }, [searchParam, filtersLoaded, recipesPerPage, filters, mealPrepMode, fetchRecipes, applyFetchResult, showToast, setLoadingFromFilters]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    resetPage();
  }, [resetPage]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    resetPage();
  }, [resetPage]);

  return {
    searchQuery,
    handleSearchChange,
    clearSearch,
  };
}
