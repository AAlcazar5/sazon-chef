// frontend/hooks/usePaginationActions.ts
// Owns fetchRecipesForPage (fetches a specific page and applies the result without resetting page)
// and the prev/next page navigation guards.

import { useCallback } from 'react';
import { Alert } from 'react-native';
import type { FilterState } from '../lib/filterStorage';
import { type RecipeFetchResult, type RecipeFetchParams } from './useRecipeFetcher';
import type { PaginationInfo } from './useRecipePagination';
import type { SuggestedRecipe } from '../types';
import type { UserFeedback } from '../utils/recipeUtils';
import { HapticPatterns } from '../constants/Haptics';

interface UsePaginationActionsOptions {
  filters: FilterState;
  mealPrepMode: boolean;
  searchQuery: string;
  recipesPerPage: number;
  fetchRecipes: (params: RecipeFetchParams) => Promise<RecipeFetchResult | null>;
  setPaginationLoading: (loading: boolean) => void;
  setTotalRecipes: (total: number) => void;
  setSuggestedRecipes: (recipes: SuggestedRecipe[]) => void;
  setCurrentPage: (page: number) => void;
  setAnimatedRecipeIds: (ids: Set<string>) => void;
  userFeedback: Record<string, UserFeedback>;
  setUserFeedback: (feedback: Record<string, UserFeedback>) => void;
  currentPage: number;
  paginationInfo: PaginationInfo;
  paginationLoading: boolean;
}

interface UsePaginationActionsReturn {
  handlePrevPage: () => void;
  handleNextPage: () => void;
}

export function usePaginationActions(options: UsePaginationActionsOptions): UsePaginationActionsReturn {
  const {
    filters,
    mealPrepMode,
    searchQuery,
    recipesPerPage,
    fetchRecipes,
    setPaginationLoading,
    setTotalRecipes,
    setSuggestedRecipes,
    setCurrentPage,
    setAnimatedRecipeIds,
    userFeedback,
    setUserFeedback,
    currentPage,
    paginationInfo,
    paginationLoading,
  } = options;

  const fetchRecipesForPage = useCallback(async (page: number) => {
    console.log(`📄 Fetching page ${page + 1} with ${recipesPerPage} recipes per page`);

    setPaginationLoading(true);
    const result = await fetchRecipes({
      page,
      limit: recipesPerPage,
      cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
      dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
      maxCookTime: filters.maxCookTime || undefined,
      difficulty: filters.difficulty.length > 0 ? filters.difficulty[0] : undefined,
      mealPrepMode,
      search: searchQuery || undefined,
    });

    if (result) {
      setTotalRecipes(result.total);
      setSuggestedRecipes(result.recipes);
      setCurrentPage(page);
      setAnimatedRecipeIds(new Set());
      setUserFeedback({ ...userFeedback, ...result.feedback });
      HapticPatterns.buttonPress();
      console.log(`📄 Received ${result.recipes.length} recipes, total: ${result.total}`);
    } else {
      Alert.alert('Error', 'Failed to load recipes. Please try again.');
    }
    setPaginationLoading(false);
  }, [recipesPerPage, searchQuery, filters, mealPrepMode, fetchRecipes, setPaginationLoading, setTotalRecipes, setSuggestedRecipes, setCurrentPage, setAnimatedRecipeIds, userFeedback, setUserFeedback]);

  const handlePrevPage = useCallback(() => {
    console.log('🔙 Previous button pressed', { ...paginationInfo, currentPage });
    if (!paginationInfo.isFirstPage && !paginationLoading) {
      const newPage = currentPage - 1;
      console.log(`📄 Changing page from ${currentPage + 1} to ${newPage + 1}`);
      fetchRecipesForPage(newPage);
    }
  }, [paginationInfo, currentPage, paginationLoading, fetchRecipesForPage]);

  const handleNextPage = useCallback(() => {
    console.log('➡️ Next button pressed', { ...paginationInfo, currentPage });
    if (!paginationInfo.isLastPage && !paginationLoading) {
      const newPage = currentPage + 1;
      console.log(`📄 Changing page from ${currentPage + 1} to ${newPage + 1}`);
      fetchRecipesForPage(newPage);
    }
  }, [paginationInfo, currentPage, paginationLoading, fetchRecipesForPage]);

  return {
    handlePrevPage,
    handleNextPage,
  };
}
