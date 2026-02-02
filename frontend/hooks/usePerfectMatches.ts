// frontend/hooks/usePerfectMatches.ts
// Custom hook for managing perfect match recipes (≥85% match score)

import { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollView } from 'react-native';
import { recipeApi } from '../lib/api';
import type { SuggestedRecipe } from '../types';

interface PerfectMatchFilters {
  cuisines: string[];
  dietaryRestrictions: string[];
  maxCookTime: number | null;
  mealPrepMode: boolean;
}

interface UsePerfectMatchesOptions {
  filters: PerfectMatchFilters;
  enabled?: boolean;
}

interface UsePerfectMatchesReturn {
  // State
  recipes: SuggestedRecipe[];
  currentIndex: number;
  refreshing: boolean;
  // Refs
  scrollViewRef: React.RefObject<ScrollView | null>;
  // Actions
  fetch: (refresh?: boolean) => Promise<void>;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
}

export function usePerfectMatches(options: UsePerfectMatchesOptions): UsePerfectMatchesReturn {
  const { filters, enabled = true } = options;

  // State
  const [recipes, setRecipes] = useState<SuggestedRecipe[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Refs for tracking current recipes and scroll position
  const recipesRef = useRef<SuggestedRecipe[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  // Keep ref in sync with state
  useEffect(() => {
    recipesRef.current = recipes;
  }, [recipes]);

  // Fetch perfect match recipes (≥85% match score)
  const fetch = useCallback(async (refresh: boolean = false) => {
    if (!enabled) return;

    try {
      if (refresh) {
        setRefreshing(true);
      }

      console.log(`⭐ Fetching perfect match recipes (≥85% match)... ${refresh ? 'refreshing' : 'initial'}`);

      // Use suggested recipes endpoint which includes scoring
      const response = await recipeApi.getSuggestedRecipes({
        cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
        dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
        maxCookTime: filters.maxCookTime || undefined,
        mealPrepMode: filters.mealPrepMode,
        offset: refresh ? Math.floor(Math.random() * 50) : 0, // Random offset when refreshing for variety
      });

      const fetchedRecipes: SuggestedRecipe[] = Array.isArray(response.data) ? response.data : [];

      // Filter for recipes with matchPercentage >= 85
      const perfectMatches = fetchedRecipes.filter(r =>
        r.score?.matchPercentage && r.score.matchPercentage >= 85
      );

      // Sort by match percentage and take top 5
      const sortedMatches = perfectMatches
        .sort((a, b) => (b.score?.matchPercentage || 0) - (a.score?.matchPercentage || 0))
        .slice(0, 5);

      // Avoid duplicates with existing recipes
      if (refresh && recipesRef.current.length > 0) {
        const existingIds = new Set(recipesRef.current.map(r => r.id));
        const uniqueMatches = sortedMatches.filter(r => !existingIds.has(r.id));
        setRecipes(uniqueMatches.length > 0 ? uniqueMatches : sortedMatches);
      } else {
        setRecipes(sortedMatches);
      }

      // Reset scroll position
      setCurrentIndex(0);
      // Scroll to first card after a brief delay to ensure state is updated
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: 0, animated: true });
      }, 100);
      console.log(`⭐ Found ${sortedMatches.length} perfect match recipes`);
    } catch (error) {
      console.error('❌ Error fetching perfect match recipes:', error);
      if (!refresh) {
        setRecipes([]);
      }
    } finally {
      if (refresh) {
        setRefreshing(false);
      }
    }
  }, [filters.cuisines, filters.dietaryRestrictions, filters.maxCookTime, filters.mealPrepMode, enabled]);

  return {
    // State
    recipes,
    currentIndex,
    refreshing,
    // Refs
    scrollViewRef,
    // Actions
    fetch,
    setCurrentIndex,
  };
}

export default usePerfectMatches;
