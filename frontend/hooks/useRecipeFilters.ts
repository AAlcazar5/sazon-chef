// frontend/hooks/useRecipeFilters.ts
// Hook for managing recipe filter state and persistence

import { useState, useEffect, useCallback, useRef, type MutableRefObject } from 'react';
import { filterStorage, type FilterState } from '../lib/filterStorage';
import { getActiveFilterLabels } from '../utils/filterUtils';

export interface UseRecipeFiltersReturn {
  /** Current filter state */
  filters: FilterState;
  /** ROADMAP 4.0 FX2.1 — always-current ref for ref-aware consumers (race-safe). */
  filtersRef: MutableRefObject<FilterState>;
  /** Active filter labels for display */
  activeFilters: string[];
  /** Whether filters have been loaded from storage */
  filtersLoaded: boolean;
  /** Whether the filter modal is visible */
  showFilterModal: boolean;
  /** Show the filter modal */
  openFilterModal: () => void;
  /** Hide the filter modal */
  closeFilterModal: () => void;
  /** Update a filter value */
  handleFilterChange: (type: keyof FilterState, value: string | number | null | string[]) => void;
  /** Update active filters display */
  updateActiveFilters: () => void;
  /** Save filters to storage */
  saveFilters: () => Promise<void>;
  /** Clear all filters */
  resetFilters: () => Promise<void>;
  /** Set filters directly */
  setFilters: (filters: FilterState) => void;
}

/**
 * Hook for managing recipe filter state and persistence
 * Handles filter state, modal visibility, and AsyncStorage persistence
 */
export function useRecipeFilters(): UseRecipeFiltersReturn {
  const [filters, setFiltersInternal] = useState<FilterState>(filterStorage.getDefaultFilters());
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  // ROADMAP 4.0 FX2.1 — keep a ref mirror of `filters` updated synchronously on
  // every state write, so race-prone consumers (handleQuickFilter, chip
  // toggles, saveFilters) read the latest snapshot even when fired twice in
  // the same tick. A useEffect mirror would lag a render and re-introduce the
  // race; the imperative update inside `setFilters` keeps it current.
  const filtersRef = useRef<FilterState>(filters);

  const setFilters = useCallback((next: FilterState) => {
    filtersRef.current = next;
    setFiltersInternal(next);
  }, []);

  // Load saved filters on mount
  useEffect(() => {
    const loadSavedFilters = async () => {
      try {
        const savedFilters = await filterStorage.loadFilters();
        if (savedFilters) {
          setFilters(savedFilters);
          const labels = getActiveFilterLabels(savedFilters);
          setActiveFilters(labels);
        }
      } catch (error) {
        console.error('❌ Error loading saved filters:', error);
      } finally {
        setFiltersLoaded(true);
      }
    };
    loadSavedFilters();
  }, [setFilters]);

  // Open filter modal
  const openFilterModal = useCallback(() => {
    setShowFilterModal(true);
  }, []);

  // Close filter modal
  const closeFilterModal = useCallback(() => {
    setShowFilterModal(false);
  }, []);

  // Handle filter changes
  // ROADMAP 4.0 FX2.1 — read from ref so synchronous repeats stack instead of
  // racing against a stale closure.
  const handleFilterChange = useCallback((
    type: keyof FilterState,
    value: string | number | null | string[]
  ) => {
    const prev = filtersRef.current;
    const newFilters = { ...prev };

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
  }, [setFilters]);

  // Update active filters display
  // ROADMAP 4.0 FX2.1 — derive labels from the current ref so two synchronous
  // chip taps both contribute to the displayed badge instead of racing.
  const updateActiveFilters = useCallback(() => {
    const labels = getActiveFilterLabels(filtersRef.current);
    setActiveFilters(labels);
  }, []);

  // Save filters to storage
  // ROADMAP 4.0 FX2.1 — read via ref so two synchronous chip taps both persist
  // (instead of the second clobbering the first via stale closure).
  const saveFilters = useCallback(async () => {
    try {
      await filterStorage.saveFilters(filtersRef.current);
      console.log('💾 Filters saved to storage');
    } catch (error) {
      console.error('❌ Error saving filters:', error);
      throw error;
    }
  }, []);

  // Clear all filters
  const resetFilters = useCallback(async () => {
    const defaultFilters = filterStorage.getDefaultFilters();
    setFilters(defaultFilters);
    setActiveFilters([]);

    try {
      await filterStorage.clearFilters();
      console.log('🗑️ Filters cleared from storage');
    } catch (error) {
      console.error('❌ Error clearing filters from storage:', error);
      throw error;
    }
  }, [setFilters]);

  return {
    filters,
    filtersRef,
    activeFilters,
    filtersLoaded,
    showFilterModal,
    openFilterModal,
    closeFilterModal,
    handleFilterChange,
    updateActiveFilters,
    saveFilters,
    resetFilters,
    setFilters,
  };
}

export default useRecipeFilters;
