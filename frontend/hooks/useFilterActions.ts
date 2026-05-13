// frontend/hooks/useFilterActions.ts
// Manages the three filter-application flows: quick-toggle, modal-apply, and clear-all.
// Each builds filter params, calls fetchRecipes, and applies the result.

import { useCallback, type MutableRefObject } from 'react';
import { Alert } from 'react-native';
import { sazonAlert } from '../lib/sazonAlert';
import type { FilterState } from '../lib/filterStorage';
import { type RecipeFetchResult, type RecipeFetchParams } from './useRecipeFetcher';

interface UseFilterActionsOptions {
  filters: FilterState;
  /** ROADMAP 4.0 FX2.1 — current-snapshot ref from useRecipeFilters; required
   *  so two synchronous chip taps each see the latest state instead of a
   *  stale useCallback closure. */
  filtersRef: MutableRefObject<FilterState>;
  setFilters: (filters: FilterState) => void;
  saveFilters: () => Promise<void>;
  updateActiveFilters: () => void;
  closeFilterModal: () => void;
  resetFilters: () => Promise<void>;
  mealPrepMode: boolean;
  searchQuery: string;
  isCravingSearch: boolean;
  onRerunCravingSearch: () => void;
  recipesPerPage: number;
  getMacroFilterParams: () => Record<string, any>;
  timeAwareMode: boolean;
  fetchRecipes: (params: RecipeFetchParams) => Promise<RecipeFetchResult | null>;
  applyFetchResult: (result: RecipeFetchResult) => void;
  setPaginationLoading: (loading: boolean) => void;
}

interface UseFilterActionsReturn {
  handleQuickFilter: (type: keyof FilterState, value: string | number | null | string[]) => Promise<void>;
  applyFilters: () => Promise<void>;
  clearFilters: () => Promise<void>;
}

export function useFilterActions(options: UseFilterActionsOptions): UseFilterActionsReturn {
  const {
    filters,
    filtersRef,
    setFilters,
    saveFilters,
    updateActiveFilters,
    closeFilterModal,
    resetFilters,
    mealPrepMode,
    searchQuery,
    isCravingSearch,
    onRerunCravingSearch,
    recipesPerPage,
    getMacroFilterParams,
    timeAwareMode,
    fetchRecipes,
    applyFetchResult,
    setPaginationLoading,
  } = options;

  const handleQuickFilter = useCallback(async (type: keyof FilterState, value: string | number | null | string[]) => {
    // ROADMAP 4.0 FX2.1 — read latest snapshot via ref so two synchronous chip
    // taps both stick. Previously read `filters` from closure; the second tap
    // computed against the same stale snapshot and `setFilters` clobbered the
    // first.
    const current = filtersRef.current;
    const newFilters = { ...current };

    if (type === 'maxCookTime') {
      newFilters.maxCookTime = value as number | null;
    } else {
      const arrayType = type as 'cuisines' | 'dietaryRestrictions' | 'difficulty';
      if (Array.isArray(value)) {
        newFilters[arrayType] = value;
      } else {
        const currentArray = newFilters[arrayType];
        const valueStr = value as string;
        if (currentArray.includes(valueStr)) {
          newFilters[arrayType] = currentArray.filter(item => item !== valueStr);
        } else {
          newFilters[arrayType] = [...currentArray, valueStr];
        }
      }
    }

    setFilters(newFilters);
    await saveFilters();
    updateActiveFilters();

    // If a craving search is active, re-run it with the new filters instead of a regular fetch
    if (isCravingSearch) {
      onRerunCravingSearch();
      return;
    }

    console.log(`🔍 Applying filter with recipesPerPage: ${recipesPerPage}`);

    setPaginationLoading(true);
    const result = await fetchRecipes({
      page: 0,
      limit: recipesPerPage,
      cuisines: newFilters.cuisines.length > 0 ? newFilters.cuisines : undefined,
      dietaryRestrictions: newFilters.dietaryRestrictions.length > 0 ? newFilters.dietaryRestrictions : undefined,
      maxCookTime: newFilters.maxCookTime || undefined,
      difficulty: newFilters.difficulty.length > 0 ? newFilters.difficulty[0] : undefined,
      mealPrepMode,
      search: searchQuery || undefined,
      ...getMacroFilterParams(),
      useTimeAwareDefaults: timeAwareMode,
    });

    if (result) {
      applyFetchResult(result);
      console.log(`✅ Filter applied: Received ${result.recipes.length} recipes, total: ${result.total}`);
    }
    setPaginationLoading(false);
  }, [filtersRef, setFilters, saveFilters, updateActiveFilters, isCravingSearch, onRerunCravingSearch, mealPrepMode, searchQuery, recipesPerPage, getMacroFilterParams, timeAwareMode, fetchRecipes, applyFetchResult, setPaginationLoading]);

  const applyFilters = useCallback(async () => {
    updateActiveFilters();
    await saveFilters();
    closeFilterModal();

    // If a craving search is active, re-run it with the new filters instead of a regular fetch
    if (isCravingSearch) {
      onRerunCravingSearch();
      return;
    }

    console.log('🔍 Filters applied:', filters);
    console.log(`🔍 Applying filters with recipesPerPage: ${recipesPerPage}`);

    setPaginationLoading(true);
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
      console.log('✅ Filtered recipes loaded:', result.recipes.length, 'total:', result.total);
    } else {
      sazonAlert('alerts.apply_failed.title', 'alerts.apply_failed.body');
    }
    setPaginationLoading(false);
  }, [filters, updateActiveFilters, saveFilters, closeFilterModal, isCravingSearch, onRerunCravingSearch, mealPrepMode, searchQuery, recipesPerPage, fetchRecipes, applyFetchResult, setPaginationLoading]);

  const clearFilters = useCallback(async () => {
    await resetFilters();

    console.log(`🔍 Clearing filters with recipesPerPage: ${recipesPerPage}`);

    setPaginationLoading(true);
    const result = await fetchRecipes({
      page: 0,
      limit: recipesPerPage,
      mealPrepMode,
      search: searchQuery || undefined,
    });

    if (result) {
      applyFetchResult(result);
      console.log('✅ Filters cleared, original recipes loaded:', result.recipes.length, 'total:', result.total);
    } else {
      sazonAlert('alerts.apply_failed.title', 'alerts.apply_failed.body');
    }
    setPaginationLoading(false);
  }, [resetFilters, mealPrepMode, searchQuery, recipesPerPage, fetchRecipes, applyFetchResult, setPaginationLoading]);

  return {
    handleQuickFilter,
    applyFilters,
    clearFilters,
  };
}
