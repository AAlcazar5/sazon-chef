// frontend/hooks/useInitialRecipeLoad.ts
// Consolidates initial recipe loading: saved filters, meal prep, initial page, and view-mode refetch

import { useState, useEffect } from 'react';
import type { FilterState } from '../lib/filterStorage';
import { type RecipeFetchResult, type RecipeFetchParams } from './useRecipeFetcher';

interface UseInitialRecipeLoadOptions {
  filtersLoaded: boolean;
  filters: FilterState;
  activeFilters: string[];
  mealPrepMode: boolean;
  searchQuery: string;
  viewMode: string;
  recipesPerPage: number;
  totalRecipes: number;
  timeAwareMode: boolean;
  getMacroFilterParams: () => Record<string, any>;
  fetchRecipes: (params: RecipeFetchParams) => Promise<RecipeFetchResult | null>;
  applyFetchResult: (result: RecipeFetchResult) => void;
  recipesData: any;

  // Shared state owned by index.tsx (set both inside and outside this hook)
  loadingFromFilters: boolean;
  setLoadingFromFilters: (loading: boolean) => void;
  initialRecipesLoaded: boolean;

  // Extra setters needed by view-mode refetch
  setAnimatedRecipeIds: (ids: Set<string>) => void;
  setPaginationLoading: (loading: boolean) => void;
}

interface UseInitialRecipeLoadReturn {
  initialLoading: boolean;
}

export function useInitialRecipeLoad(options: UseInitialRecipeLoadOptions): UseInitialRecipeLoadReturn {
  const {
    filtersLoaded,
    filters,
    activeFilters,
    mealPrepMode,
    searchQuery,
    viewMode,
    recipesPerPage,
    totalRecipes,
    timeAwareMode,
    getMacroFilterParams,
    fetchRecipes,
    applyFetchResult,
    recipesData,
    loadingFromFilters,
    setLoadingFromFilters,
    initialRecipesLoaded,
    setAnimatedRecipeIds,
    setPaginationLoading,
  } = options;

  const [initialLoading, setInitialLoading] = useState(true);

  // Apply saved filters on initial load when active filters exist
  useEffect(() => {
    const applySavedFilters = async () => {
      if (filtersLoaded && activeFilters.length > 0 && !initialRecipesLoaded && !loadingFromFilters) {
        setLoadingFromFilters(true);
        const result = await fetchRecipes({
          page: 0,
          limit: recipesPerPage,
          cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
          dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
          maxCookTime: filters.maxCookTime || undefined,
          difficulty: filters.difficulty.length > 0 ? filters.difficulty[0] : undefined,
          mealPrepMode,
          search: searchQuery || undefined,
        });

        if (result) {
          applyFetchResult(result);
          console.log(`📱 Loaded filtered recipes: ${result.recipes.length}, total: ${result.total}`);
        }
        setLoadingFromFilters(false);
        setInitialLoading(false);
      }
    };

    applySavedFilters();
  }, [filtersLoaded, activeFilters.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load meal-prep recipes on initial load when meal prep mode is active and no other filters
  useEffect(() => {
    const loadMealPrepRecipes = async () => {
      if (mealPrepMode && filtersLoaded && activeFilters.length === 0 && !initialRecipesLoaded && !loadingFromFilters && !recipesData) {
        setLoadingFromFilters(true);
        const result = await fetchRecipes({
          page: 0,
          limit: recipesPerPage,
          mealPrepMode: true,
          cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
          dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
          maxCookTime: filters.maxCookTime || undefined,
          difficulty: filters.difficulty.length > 0 ? filters.difficulty[0] : undefined,
          search: searchQuery || undefined,
        });

        if (result) {
          applyFetchResult(result);
        }
        setLoadingFromFilters(false);
      }
    };
    loadMealPrepRecipes();
  }, [mealPrepMode, filtersLoaded, activeFilters.length, initialRecipesLoaded, loadingFromFilters, recipesData, recipesPerPage, filters, searchQuery, fetchRecipes, applyFetchResult, setLoadingFromFilters]);

  // Fetch initial page of recipes when no filters or meal prep are active
  useEffect(() => {
    const fetchInitialRecipes = async () => {
      if (!filtersLoaded) return;

      if (activeFilters.length === 0 && !mealPrepMode && !loadingFromFilters) {
        setInitialLoading(true);
        console.log('📄 Fetching initial page of all recipes');

        const result = await fetchRecipes({
          page: 0,
          limit: recipesPerPage,
          search: searchQuery || undefined,
          ...getMacroFilterParams(),
          useTimeAwareDefaults: timeAwareMode,
        });

        if (result) {
          applyFetchResult(result);
          console.log(`📄 Initial load: ${result.recipes.length} recipes, total: ${result.total}`);
        }
        setInitialLoading(false);
      } else {
        setInitialLoading(false);
      }
    };

    fetchInitialRecipes();
  }, [filtersLoaded, activeFilters, mealPrepMode, loadingFromFilters, searchQuery, fetchRecipes, applyFetchResult, recipesPerPage, getMacroFilterParams, timeAwareMode]);

  // Refetch when view mode changes (grid ↔ list) to adjust page size
  useEffect(() => {
    if (initialRecipesLoaded && totalRecipes > 0) {
      const newLimit = viewMode === 'grid' ? 21 : 11;
      console.log(`📄 View mode changed to ${viewMode}, refetching with limit ${newLimit}`);

      const refetchWithNewLimit = async () => {
        setPaginationLoading(true);
        const result = await fetchRecipes({
          page: 0,
          limit: newLimit,
          cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
          dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
          maxCookTime: filters.maxCookTime || undefined,
          difficulty: filters.difficulty.length > 0 ? filters.difficulty[0] : undefined,
          mealPrepMode,
          search: searchQuery || undefined,
        });

        if (result) {
          applyFetchResult(result);
          setAnimatedRecipeIds(new Set());
          console.log(`📄 View mode refetch: ${result.recipes.length} recipes, total: ${result.total}`);
        }
        setPaginationLoading(false);
      };

      refetchWithNewLimit();
    }
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    initialLoading,
  };
}
