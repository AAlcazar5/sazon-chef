// frontend/hooks/useCookbook.ts
// Centralized data-fetching hook for the cookbook screen.
// Composes useCookbookCache (API + offline sync) with useCookbookFilters
// (filter/sort/display state) and exposes a single `displayedRecipes`
// array that has already been filtered and sorted.

import { useMemo } from 'react';
import { useCookbookCache } from './useCookbookCache';
import { useCookbookFilters } from './useCookbookFilters';

export type { CookbookFilters, ViewMode, SortOption } from '../components/cookbook/CookbookFilterModal';

export function useCookbook() {
  const cache = useCookbookCache();
  const filters = useCookbookFilters();

  // Apply client-side filter + sort to the raw recipes from cache
  const displayedRecipes = useMemo(
    () => filters.sortRecipes(filters.filterRecipes(cache.recipes)),
    [cache.recipes, filters.filterRecipes, filters.sortRecipes],
  );

  return {
    // ── Data & loading state (from useCookbookCache) ──────────────────
    recipes: cache.recipes,
    displayedRecipes,
    loading: cache.loading,
    loadingMore: cache.loadingMore,
    cacheAge: cache.cacheAge,
    isOffline: cache.isOffline,
    hasPendingSync: cache.hasPendingSync,
    totalRecipes: cache.totalRecipes,
    hasMore: cache.hasMore,
    // ── Data actions ──────────────────────────────────────────────────
    loadRecipes: cache.loadRecipes,
    loadMore: cache.loadMore,
    updateNotes: cache.updateNotes,
    updateRating: cache.updateRating,
    recordCook: cache.recordCook,
    unsaveRecipe: cache.unsaveRecipe,
    flushSyncQueue: cache.flushSyncQueue,
    // ── Filter / display state (from useCookbookFilters) ─────────────
    filters: filters.filters,
    setFilters: filters.setFilters,
    resetFilters: filters.resetFilters,
    displayMode: filters.displayMode,
    setDisplayMode: filters.setDisplayMode,
    sortBy: filters.sortBy,
    setSortBy: filters.setSortBy,
    getSortLabel: filters.getSortLabel,
    viewMode: filters.viewMode,
    setViewMode: filters.setViewMode,
    searchQuery: filters.searchQuery,
    setSearchQuery: filters.setSearchQuery,
    activeFilterCount: filters.activeFilterCount,
  };
}
