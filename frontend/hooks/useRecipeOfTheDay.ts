// frontend/hooks/useRecipeOfTheDay.ts
// Custom hook for fetching and managing the Recipe of the Day

import { useState, useEffect, useCallback } from 'react';
import { recipeApi } from '../lib/api';
import type { SuggestedRecipe } from '../types';

interface UseRecipeOfTheDayReturn {
  recipe: SuggestedRecipe | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseRecipeOfTheDayOptions {
  /** Pre-fetched data from consolidated home feed — skips API call if provided */
  initialData?: SuggestedRecipe | null;
}

export function useRecipeOfTheDay(options: UseRecipeOfTheDayOptions = {}): UseRecipeOfTheDayReturn {
  const { initialData } = options;
  const [recipe, setRecipe] = useState<SuggestedRecipe | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const fetchRecipeOfTheDay = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await recipeApi.getRecipeOfTheDay();
      if (response.data?.recipe) {
        setRecipe(response.data.recipe);
        console.log('🌟 Recipe of the Day loaded:', response.data.recipe.title);
      }
    } catch (err: any) {
      console.error('❌ Error fetching Recipe of the Day:', err);
      setError(err?.message || 'Failed to fetch Recipe of the Day');
    } finally {
      setLoading(false);
    }
  }, []);

  // Update state when initialData changes (from home feed)
  useEffect(() => {
    if (initialData !== undefined) {
      setRecipe(initialData);
      setLoading(false);
    }
  }, [initialData]);

  // Only fetch on mount if no initialData provided
  useEffect(() => {
    if (initialData === undefined) {
      fetchRecipeOfTheDay();
    }
  }, [fetchRecipeOfTheDay, initialData]);

  return {
    recipe,
    loading,
    error,
    refetch: fetchRecipeOfTheDay,
  };
}

export default useRecipeOfTheDay;
