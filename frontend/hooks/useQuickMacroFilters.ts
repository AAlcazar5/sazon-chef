// frontend/hooks/useQuickMacroFilters.ts
// Manages quick macro filter state (highProtein, lowCarb, lowCalorie) and the associated fetch on toggle

import { useState, useCallback, useRef } from 'react';
import type { FilterState } from '../lib/filterStorage';
import { type RecipeFetchResult, type RecipeFetchParams } from './useRecipeFetcher';
import { HapticPatterns } from '../constants/Haptics';

export type MacroFilterState = {
  highProtein: boolean;
  lowCarb: boolean;
  lowCalorie: boolean;
};

interface UseQuickMacroFiltersOptions {
  filters: FilterState;
  mealPrepMode: boolean;
  searchQuery: string;
  recipesPerPage: number;
  timeAwareMode: boolean;
  fetchRecipes: (params: RecipeFetchParams) => Promise<RecipeFetchResult | null>;
  applyFetchResult: (result: RecipeFetchResult) => void;
  setPaginationLoading: (loading: boolean) => void;
}

interface UseQuickMacroFiltersReturn {
  quickMacroFilters: MacroFilterState;
  getMacroFilterParams: () => { minProtein?: number; maxCarbs?: number; maxCalories?: number };
  handleQuickMacroFilter: (filterType: 'highProtein' | 'lowCarb' | 'lowCalorie') => Promise<void>;
}

function buildMacroParams(state: MacroFilterState): { minProtein?: number; maxCarbs?: number; maxCalories?: number } {
  const params: { minProtein?: number; maxCarbs?: number; maxCalories?: number } = {};
  if (state.highProtein) params.minProtein = 30;
  if (state.lowCarb) params.maxCarbs = 30;
  if (state.lowCalorie) params.maxCalories = 400;
  return params;
}

export function useQuickMacroFilters(options: UseQuickMacroFiltersOptions): UseQuickMacroFiltersReturn {
  const {
    filters,
    mealPrepMode,
    searchQuery,
    recipesPerPage,
    timeAwareMode,
    fetchRecipes,
    applyFetchResult,
    setPaginationLoading,
  } = options;

  const [quickMacroFilters, setQuickMacroFiltersInternal] = useState<MacroFilterState>({
    highProtein: false,
    lowCarb: false,
    lowCalorie: false,
  });

  // ROADMAP 4.0 FX2.3 — ref mirror updated synchronously inside the setter so
  // two rapid taps on different macro chips both stick instead of the second
  // clobbering the first via stale closure read.
  const quickMacroFiltersRef = useRef<MacroFilterState>(quickMacroFilters);
  const setQuickMacroFilters = useCallback((next: MacroFilterState) => {
    quickMacroFiltersRef.current = next;
    setQuickMacroFiltersInternal(next);
  }, []);

  const getMacroFilterParams = useCallback(() => buildMacroParams(quickMacroFiltersRef.current), []);

  const handleQuickMacroFilter = useCallback(async (filterType: 'highProtein' | 'lowCarb' | 'lowCalorie') => {
    const current = quickMacroFiltersRef.current;
    const newMacroFilters = {
      ...current,
      [filterType]: !current[filterType],
    };
    setQuickMacroFilters(newMacroFilters);
    HapticPatterns.buttonPress();

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
      ...buildMacroParams(newMacroFilters),
      useTimeAwareDefaults: timeAwareMode,
    });

    if (result) {
      applyFetchResult(result);
    }
    setPaginationLoading(false);
  }, [setQuickMacroFilters, filters, mealPrepMode, searchQuery, recipesPerPage, timeAwareMode, fetchRecipes, applyFetchResult, setPaginationLoading]);

  return {
    quickMacroFilters,
    getMacroFilterParams,
    handleQuickMacroFilter,
  };
}
