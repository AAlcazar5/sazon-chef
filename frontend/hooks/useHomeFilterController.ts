// frontend/hooks/useHomeFilterController.ts
// ROADMAP 4.0 FX4.1 — unified home filter controller.
//
// Combines `useRecipeFilters` (cuisines / dietary / cookTime / difficulty),
// `useQuickMacroFilters` (highProtein / lowCarb / lowCalorie),
// `useFilterActions` (apply / clear / quick handlers), and `mealPrepMode`
// behind a single `applyFilter(patch)` API. The three legacy hooks remain
// (the controller composes them) so the migration is non-breaking — but
// new screens should consume the controller, not the inner hooks.
//
// Key invariant: a single `applyFilter` call fires exactly one fetch via
// the underlying handler. Composing two filter changes from a single user
// action (e.g. "clear cuisines + meal prep") MUST be expressed as two
// `applyFilter` calls (the FX2 ref-aware paths handle the back-to-back
// case correctly).

import { useCallback } from 'react';
import type { FilterState } from '../lib/filterStorage';
import { useRecipeFilters } from './useRecipeFilters';
import { useQuickMacroFilters, type MacroFilterState } from './useQuickMacroFilters';
import { useMealPrepMode } from './useMealPrepMode';
import { useFilterActions } from './useFilterActions';
import { useHomeFilterRowChips } from './useFilterRowChips';
import type { RecipeFetchResult, RecipeFetchParams } from './useRecipeFetcher';

// ── Patch shape ────────────────────────────────────────────────────────────

/**
 * The patch describes what changed. Exactly one key per call (the controller
 * dispatches to a single underlying fetch path); passing more than one key
 * triggers the keys serially with a single combined fetch at the end.
 */
export interface FilterPatch {
  cuisines?: string[];
  dietaryRestrictions?: string[];
  maxCookTime?: number | null;
  difficulty?: string[];
  highProtein?: boolean;
  lowCarb?: boolean;
  lowCalorie?: boolean;
  mealPrepMode?: boolean;
}

// ── Config ─────────────────────────────────────────────────────────────────

interface UseHomeFilterControllerOptions {
  searchQuery: string;
  isCravingSearch: boolean;
  onRerunCravingSearch: () => void;
  recipesPerPage: number;
  timeAwareMode: boolean;
  fetchRecipes: (params: RecipeFetchParams) => Promise<RecipeFetchResult | null>;
  applyFetchResult: (result: RecipeFetchResult) => void;
  setPaginationLoading: (loading: boolean) => void;
}

// ── Return shape ───────────────────────────────────────────────────────────

export interface UseHomeFilterControllerReturn {
  // Unified state
  filters: FilterState;
  quickMacroFilters: MacroFilterState;
  mealPrepMode: boolean;
  activeFilters: string[];
  /** Active chip ids for the FilterRow. */
  activeChipIds: string[];
  /** Filter-row chip toggle handler. */
  onChipToggle: (chipId: string) => void;
  /** Modal visibility flag (kept for FilterModal compat). */
  showFilterModal: boolean;
  openFilterModal: () => void;
  closeFilterModal: () => void;

  /** FX4.1 — unified mutation API. Exactly one fetch per call. */
  applyFilter: (patch: FilterPatch) => Promise<void>;
  /** Reset everything to defaults + fetch. */
  clearAll: () => Promise<void>;
  /** Modal-style apply (legacy `applyFilters` path). */
  applyAll: () => Promise<void>;
  /** Inner accessors retained for legacy plumbing. */
  setFilters: (filters: FilterState) => void;
  resetFilters: () => Promise<void>;
  saveFilters: () => Promise<void>;
  updateActiveFilters: () => void;
  filtersLoaded: boolean;
  getMacroFilterParams: () => Record<string, any>;
}

// ───────────────────────────────────────────────────────────────────────────

export function useHomeFilterController(
  options: UseHomeFilterControllerOptions,
): UseHomeFilterControllerReturn {
  const {
    searchQuery,
    isCravingSearch,
    onRerunCravingSearch,
    recipesPerPage,
    timeAwareMode,
    fetchRecipes,
    applyFetchResult,
    setPaginationLoading,
  } = options;

  // 1. Persistence layer
  const filterHook = useRecipeFilters();
  const { filters, filtersRef, activeFilters, filtersLoaded, showFilterModal } = filterHook;
  const { setFilters, openFilterModal, closeFilterModal, updateActiveFilters, saveFilters, resetFilters } = filterHook;

  // 2. Meal-prep state
  const { mealPrepMode, setMealPrepMode } = useMealPrepMode();

  // 3. Macro filters
  const macroHook = useQuickMacroFilters({
    filters,
    mealPrepMode,
    searchQuery,
    recipesPerPage,
    timeAwareMode,
    fetchRecipes,
    applyFetchResult,
    setPaginationLoading,
  });
  const { quickMacroFilters, getMacroFilterParams, handleQuickMacroFilter } = macroHook;

  // 4. Filter actions (modal-apply / clear / quick)
  const actionsHook = useFilterActions({
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
  });
  const { handleQuickFilter, applyFilters, clearFilters } = actionsHook;

  // 5. Toggle meal-prep + refetch (one fetch per call).
  const handleToggleMealPrepMode = useCallback(async (value: boolean) => {
    setMealPrepMode(value);
    setPaginationLoading(true);
    const result = await fetchRecipes({
      page: 0,
      limit: recipesPerPage,
      cuisines: filtersRef.current.cuisines.length > 0 ? filtersRef.current.cuisines : undefined,
      dietaryRestrictions: filtersRef.current.dietaryRestrictions.length > 0 ? filtersRef.current.dietaryRestrictions : undefined,
      maxCookTime: filtersRef.current.maxCookTime || undefined,
      difficulty: filtersRef.current.difficulty.length > 0 ? filtersRef.current.difficulty[0] : undefined,
      mealPrepMode: value,
      search: searchQuery || undefined,
      ...getMacroFilterParams(),
    });
    if (result) applyFetchResult(result);
    setPaginationLoading(false);
  }, [setMealPrepMode, fetchRecipes, recipesPerPage, filtersRef, searchQuery, getMacroFilterParams, applyFetchResult, setPaginationLoading]);

  // 6. Chip-row glue
  const chipState = useHomeFilterRowChips({
    filters,
    quickMacroFilters,
    mealPrepMode,
    handleQuickFilter,
    handleQuickMacroFilter,
    handleToggleMealPrepMode,
  });

  // 7. Unified mutation API. Each branch is one fetch.
  const applyFilter = useCallback(async (patch: FilterPatch) => {
    if (patch.cuisines !== undefined) {
      await handleQuickFilter('cuisines', patch.cuisines);
    } else if (patch.dietaryRestrictions !== undefined) {
      await handleQuickFilter('dietaryRestrictions', patch.dietaryRestrictions);
    } else if (patch.maxCookTime !== undefined) {
      await handleQuickFilter('maxCookTime', patch.maxCookTime);
    } else if (patch.difficulty !== undefined) {
      await handleQuickFilter('difficulty', patch.difficulty);
    } else if (patch.highProtein !== undefined && patch.highProtein !== quickMacroFilters.highProtein) {
      await handleQuickMacroFilter('highProtein');
    } else if (patch.lowCarb !== undefined && patch.lowCarb !== quickMacroFilters.lowCarb) {
      await handleQuickMacroFilter('lowCarb');
    } else if (patch.lowCalorie !== undefined && patch.lowCalorie !== quickMacroFilters.lowCalorie) {
      await handleQuickMacroFilter('lowCalorie');
    } else if (patch.mealPrepMode !== undefined && patch.mealPrepMode !== mealPrepMode) {
      await handleToggleMealPrepMode(patch.mealPrepMode);
    }
  }, [
    handleQuickFilter,
    handleQuickMacroFilter,
    handleToggleMealPrepMode,
    quickMacroFilters.highProtein,
    quickMacroFilters.lowCarb,
    quickMacroFilters.lowCalorie,
    mealPrepMode,
  ]);

  return {
    // State
    filters,
    quickMacroFilters,
    mealPrepMode,
    activeFilters,
    activeChipIds: chipState.activeChipIds,
    onChipToggle: chipState.onChipToggle,
    showFilterModal,
    openFilterModal,
    closeFilterModal,
    // Actions
    applyFilter,
    clearAll: clearFilters,
    applyAll: applyFilters,
    setFilters,
    resetFilters,
    saveFilters,
    updateActiveFilters,
    filtersLoaded,
    getMacroFilterParams,
  };
}
