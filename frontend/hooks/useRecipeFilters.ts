// frontend/hooks/useRecipeFilters.ts
// Hook for managing recipe filter state and persistence

import { useState, useEffect, useCallback } from 'react';
import { filterStorage, type FilterState } from '../lib/filterStorage';
import { getActiveFilterLabels } from '../utils/filterUtils';

export interface UseRecipeFiltersReturn {
  /** Current filter state */
  filters: FilterState;
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
  const [filters, setFilters] = useState<FilterState>(filterStorage.getDefaultFilters());
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

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
  }, []);

  // Open filter modal
  const openFilterModal = useCallback(() => {
    setShowFilterModal(true);
  }, []);

  // Close filter modal
  const closeFilterModal = useCallback(() => {
    setShowFilterModal(false);
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((
    type: keyof FilterState,
    value: string | number | null | string[]
  ) => {
    setFilters(prev => {
      const newFilters = { ...prev };

      if (type === 'maxCookTime') {
        newFilters.maxCookTime = value as number | null;
      } else {
        const arrayType = type as 'cuisines' | 'dietaryRestrictions' | 'difficulty';

        // If value is already an array, use it directly
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

      return newFilters;
    });
  }, []);

  // Update active filters display
  const updateActiveFilters = useCallback(() => {
    const labels = getActiveFilterLabels(filters);
    setActiveFilters(labels);
  }, [filters]);

  // Save filters to storage
  const saveFilters = useCallback(async () => {
    try {
      await filterStorage.saveFilters(filters);
      console.log('💾 Filters saved to storage');
    } catch (error) {
      console.error('❌ Error saving filters:', error);
      throw error;
    }
  }, [filters]);

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
  }, []);

  return {
    filters,
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
