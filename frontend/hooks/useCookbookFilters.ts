// frontend/hooks/useCookbookFilters.ts
// Custom hook for managing cookbook filters with persistence

import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CookbookFilters, ViewMode, SortOption } from '../components/cookbook/CookbookFilterModal';
import type { SavedRecipe } from '../types';

const COOKBOOK_FILTERS_STORAGE_KEY = '@sazon_cookbook_filters';
const DISPLAY_MODE_STORAGE_KEY = '@sazon_cookbook_view_mode';
const SORT_PREFERENCE_KEY = '@sazon_cookbook_sort_preference';

const DEFAULT_FILTERS: CookbookFilters = {
  maxCookTime: null,
  difficulty: [],
  mealPrepOnly: false,
  highProtein: false,
  lowCal: false,
  budget: false,
  onePot: false,
};

interface UseCookbookFiltersReturn {
  // Filter state
  filters: CookbookFilters;
  setFilters: (filters: CookbookFilters) => void;
  resetFilters: () => void;

  // Display mode
  displayMode: 'grid' | 'list';
  setDisplayMode: (mode: 'grid' | 'list') => void;

  // Sort
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  getSortLabel: () => string;

  // View mode (saved/liked/disliked)
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Active filter count
  activeFilterCount: number;

  // Apply filters to recipes
  filterRecipes: (recipes: SavedRecipe[]) => SavedRecipe[];
  sortRecipes: (recipes: SavedRecipe[]) => SavedRecipe[];
}

/**
 * Custom hook for managing cookbook filters with AsyncStorage persistence
 */
export function useCookbookFilters(): UseCookbookFiltersReturn {
  const [filters, setFiltersState] = useState<CookbookFilters>(DEFAULT_FILTERS);
  const [displayMode, setDisplayModeState] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortByState] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('saved');
  const [searchQuery, setSearchQuery] = useState('');

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [savedFilters, savedDisplayMode, savedSort] = await Promise.all([
          AsyncStorage.getItem(COOKBOOK_FILTERS_STORAGE_KEY),
          AsyncStorage.getItem(DISPLAY_MODE_STORAGE_KEY),
          AsyncStorage.getItem(SORT_PREFERENCE_KEY),
        ]);

        if (savedFilters) {
          const parsed = JSON.parse(savedFilters) as Partial<CookbookFilters>;
          setFiltersState(prev => ({
            ...prev,
            ...parsed,
            difficulty: Array.isArray(parsed.difficulty) ? parsed.difficulty : prev.difficulty,
          }));
        }

        if (savedDisplayMode === 'grid' || savedDisplayMode === 'list') {
          setDisplayModeState(savedDisplayMode);
        }

        if (savedSort && ['recent', 'alphabetical', 'cuisine', 'matchScore', 'cookTime', 'rating', 'mostCooked'].includes(savedSort)) {
          setSortByState(savedSort as SortOption);
        }
      } catch (error) {
        console.error('❌ Error loading cookbook preferences:', error);
      }
    };
    loadPreferences();
  }, []);

  // Persist filters
  const setFilters = useCallback(async (newFilters: CookbookFilters) => {
    setFiltersState(newFilters);
    try {
      await AsyncStorage.setItem(COOKBOOK_FILTERS_STORAGE_KEY, JSON.stringify(newFilters));
    } catch (error) {
      console.error('❌ Error saving cookbook filters:', error);
    }
  }, []);

  // Reset filters
  const resetFilters = useCallback(async () => {
    setFiltersState(DEFAULT_FILTERS);
    try {
      await AsyncStorage.removeItem(COOKBOOK_FILTERS_STORAGE_KEY);
    } catch (error) {
      console.error('❌ Error resetting cookbook filters:', error);
    }
  }, []);

  // Persist display mode
  const setDisplayMode = useCallback(async (mode: 'grid' | 'list') => {
    setDisplayModeState(mode);
    try {
      await AsyncStorage.setItem(DISPLAY_MODE_STORAGE_KEY, mode);
    } catch (error) {
      console.error('❌ Error saving display mode:', error);
    }
  }, []);

  // Persist sort preference
  const setSortBy = useCallback(async (sort: SortOption) => {
    setSortByState(sort);
    try {
      await AsyncStorage.setItem(SORT_PREFERENCE_KEY, sort);
    } catch (error) {
      console.error('❌ Error saving sort preference:', error);
    }
  }, []);

  // Get sort label
  const getSortLabel = useCallback(() => {
    switch (sortBy) {
      case 'recent': return 'Recently Added';
      case 'alphabetical': return 'Alphabetical';
      case 'cuisine': return 'By Cuisine';
      case 'matchScore': return 'Match Score';
      case 'cookTime': return 'Cook Time';
      case 'rating': return 'My Rating';
      case 'mostCooked': return 'Most Cooked';
      default: return 'Recently Added';
    }
  }, [sortBy]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.maxCookTime !== null) count++;
    if (filters.difficulty.length > 0) count += filters.difficulty.length;
    if (filters.mealPrepOnly) count++;
    if (filters.highProtein) count++;
    if (filters.lowCal) count++;
    if (filters.budget) count++;
    if (filters.onePot) count++;
    return count;
  }, [filters]);

  // Filter recipes based on current filters
  const filterRecipes = useCallback((recipes: SavedRecipe[]): SavedRecipe[] => {
    return recipes.filter(recipe => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          recipe.title?.toLowerCase().includes(query) ||
          recipe.cuisineType?.toLowerCase().includes(query) ||
          recipe.description?.toLowerCase().includes(query) ||
          recipe.notes?.toLowerCase().includes(query) ||
          recipe.ingredients?.some(ing =>
            (typeof ing === 'string' ? ing : ing.name)?.toLowerCase().includes(query)
          );
        if (!matchesSearch) return false;
      }

      // Cook time filter
      if (filters.maxCookTime !== null) {
        const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
        if (totalTime > filters.maxCookTime) return false;
      }

      // Difficulty filter
      if (filters.difficulty.length > 0) {
        if (!recipe.difficulty || !filters.difficulty.includes(recipe.difficulty as 'Easy' | 'Medium' | 'Hard')) {
          return false;
        }
      }

      // Meal prep filter
      if (filters.mealPrepOnly) {
        if (!recipe.mealPrepFriendly) return false;
      }

      // High protein filter (>30g per serving)
      if (filters.highProtein) {
        const protein = recipe.macros?.protein || 0;
        if (protein < 30) return false;
      }

      // Low calorie filter (<500 cal per serving)
      if (filters.lowCal) {
        const calories = recipe.macros?.calories || recipe.calories || 0;
        if (calories >= 500) return false;
      }

      // Budget filter
      if (filters.budget) {
        if (!recipe.budgetFriendly) return false;
      }

      // One pot filter
      if (filters.onePot) {
        if (!recipe.onePot) return false;
      }

      return true;
    });
  }, [filters, searchQuery]);

  // Sort recipes based on current sort option
  const sortRecipes = useCallback((recipes: SavedRecipe[]): SavedRecipe[] => {
    const sorted = [...recipes];

    switch (sortBy) {
      case 'alphabetical':
        sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'cuisine':
        sorted.sort((a, b) => (a.cuisineType || '').localeCompare(b.cuisineType || ''));
        break;
      case 'matchScore':
        sorted.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
        break;
      case 'cookTime':
        sorted.sort((a, b) => {
          const aTime = (a.prepTime || 0) + (a.cookTime || 0);
          const bTime = (b.prepTime || 0) + (b.cookTime || 0);
          return aTime - bTime;
        });
        break;
      case 'rating':
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'mostCooked':
        sorted.sort((a, b) => (b.cookCount || 0) - (a.cookCount || 0));
        break;
      case 'recent':
      default:
        sorted.sort((a, b) => {
          const aDate = new Date(a.savedAt || a.createdAt || 0).getTime();
          const bDate = new Date(b.savedAt || b.createdAt || 0).getTime();
          return bDate - aDate;
        });
        break;
    }

    return sorted;
  }, [sortBy]);

  return {
    filters,
    setFilters,
    resetFilters,
    displayMode,
    setDisplayMode,
    sortBy,
    setSortBy,
    getSortLabel,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    activeFilterCount,
    filterRecipes,
    sortRecipes,
  };
}
