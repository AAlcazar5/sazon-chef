// frontend/hooks/useMoodSelector.ts
// Manages mood-based recipe filtering: selection state, modal visibility, and the fetch-on-select flow.

import { useState, useCallback } from 'react';
import type { Mood } from '../components/ui/MoodSelector';
import type { FilterState } from '../lib/filterStorage';
import { type RecipeFetchResult, type RecipeFetchParams } from './useRecipeFetcher';

interface UseMoodSelectorOptions {
  filters: FilterState;
  mealPrepMode: boolean;
  searchQuery: string;
  recipesPerPage: number;
  getMacroFilterParams: () => Record<string, any>;
  timeAwareMode: boolean;
  fetchRecipes: (params: RecipeFetchParams) => Promise<RecipeFetchResult | null>;
  applyFetchResult: (result: RecipeFetchResult) => void;
  setPaginationLoading: (loading: boolean) => void;
}

interface UseMoodSelectorReturn {
  selectedMood: Mood | null;
  showMoodSelector: boolean;
  handleMoodSelect: (mood: Mood | null) => Promise<void>;
  openMoodSelector: () => void;
  closeMoodSelector: () => void;
}

export function useMoodSelector(options: UseMoodSelectorOptions): UseMoodSelectorReturn {
  const {
    filters,
    mealPrepMode,
    searchQuery,
    recipesPerPage,
    getMacroFilterParams,
    timeAwareMode,
    fetchRecipes,
    applyFetchResult,
    setPaginationLoading,
  } = options;

  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [showMoodSelector, setShowMoodSelector] = useState(false);

  const handleMoodSelect = useCallback(async (mood: Mood | null) => {
    setSelectedMood(mood);
    setShowMoodSelector(false);

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
      ...getMacroFilterParams(),
      useTimeAwareDefaults: timeAwareMode,
      mood: mood?.id,
    });

    if (result) {
      applyFetchResult(result);
      if (mood) {
        console.log(`🎭 Mood filter applied: ${mood.label}, got ${result.recipes.length} recipes`);
      } else {
        console.log('🎭 Mood filter cleared');
      }
    }
    setPaginationLoading(false);
  }, [filters, mealPrepMode, searchQuery, recipesPerPage, getMacroFilterParams, timeAwareMode, fetchRecipes, applyFetchResult, setPaginationLoading]);

  const openMoodSelector = useCallback(() => setShowMoodSelector(true), []);
  const closeMoodSelector = useCallback(() => setShowMoodSelector(false), []);

  return {
    selectedMood,
    showMoodSelector,
    handleMoodSelect,
    openMoodSelector,
    closeMoodSelector,
  };
}
