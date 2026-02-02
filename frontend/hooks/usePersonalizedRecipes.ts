// frontend/hooks/usePersonalizedRecipes.ts
// Custom hook for fetching personalized recipe data (liked recipes, recently viewed)

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { recipeApi } from '../lib/api';
import type { SuggestedRecipe } from '../types';

const RECENTLY_VIEWED_KEY = '@sazon_recently_viewed';
const MAX_ITEMS = 5;

interface UsePersonalizedRecipesOptions {
  userId?: string;
}

interface UsePersonalizedRecipesReturn {
  likedRecipes: SuggestedRecipe[];
  recentlyViewedIds: string[];
  loading: boolean;
  refetch: () => Promise<void>;
  addRecentlyViewed: (recipeId: string) => Promise<void>;
}

export function usePersonalizedRecipes(options: UsePersonalizedRecipesOptions = {}): UsePersonalizedRecipesReturn {
  const { userId } = options;

  const [likedRecipes, setLikedRecipes] = useState<SuggestedRecipe[]>([]);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPersonalizedData = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Load liked recipes from API
      const likedResponse = await recipeApi.getLikedRecipes();
      if (likedResponse.data && likedResponse.data.length > 0) {
        setLikedRecipes(likedResponse.data.slice(0, MAX_ITEMS));
      }

      // Load recently viewed recipe IDs from storage
      const recentViewed = await AsyncStorage.getItem(RECENTLY_VIEWED_KEY);
      if (recentViewed) {
        const recentIds = JSON.parse(recentViewed) as string[];
        setRecentlyViewedIds(recentIds.slice(0, MAX_ITEMS));
      }
    } catch (error) {
      console.error('❌ Error loading personalized data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Add a recipe to recently viewed
  const addRecentlyViewed = useCallback(async (recipeId: string) => {
    try {
      const existing = await AsyncStorage.getItem(RECENTLY_VIEWED_KEY);
      let recentIds: string[] = existing ? JSON.parse(existing) : [];

      // Remove if already exists (to move to front)
      recentIds = recentIds.filter(id => id !== recipeId);

      // Add to front
      recentIds.unshift(recipeId);

      // Keep only MAX_ITEMS
      recentIds = recentIds.slice(0, MAX_ITEMS);

      await AsyncStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(recentIds));
      setRecentlyViewedIds(recentIds);
    } catch (error) {
      console.error('❌ Error saving recently viewed:', error);
    }
  }, []);

  // Load on mount and when userId changes
  useEffect(() => {
    loadPersonalizedData();
  }, [loadPersonalizedData]);

  return {
    likedRecipes,
    recentlyViewedIds,
    loading,
    refetch: loadPersonalizedData,
    addRecentlyViewed,
  };
}

export default usePersonalizedRecipes;
