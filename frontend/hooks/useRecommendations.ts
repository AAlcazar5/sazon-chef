import { useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { recipeApi } from '../lib/api';

const FILTERS_STORAGE_KEY = 'recipe_filters';

export function useRecommendations() {
  const [suggestedRecipes, setSuggestedRecipes] = useState<any[]>([]);
  const [randomRecipe, setRandomRecipe] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFilters, setSavedFilters] = useState<Record<string, any>>({});

  // Simple cache: tracks last filters key → data
  const cacheRef = useRef<{ filtersKey: string; data: any[] } | null>(null);

  const fetchSuggestedRecipes = async (filters?: any) => {
    const filtersKey = JSON.stringify(filters);

    // Return cached result if filters haven't changed
    if (cacheRef.current && cacheRef.current.filtersKey === filtersKey) {
      setSuggestedRecipes(cacheRef.current.data);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await recipeApi.getSuggestedRecipes(filters);
      const data = response.data;
      setSuggestedRecipes(data);
      cacheRef.current = { filtersKey, data };
    } catch (err: any) {
      setError(err.message);
      setSuggestedRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRandomRecipe = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await recipeApi.getRandomRecipe();
      setRandomRecipe(response.data);
    } catch (err: any) {
      setError(err.message);
      setRandomRecipe(null);
    } finally {
      setLoading(false);
    }
  };

  const searchRecipes = async (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await recipeApi.getRecipes({ query } as any);
      setSearchResults(response.data);
    } catch (err: any) {
      setError(err.message);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const setSearchQuery = (query: string) => {
    if (!query) {
      setSearchResults([]);
    }
  };

  const loadSavedFilters = async () => {
    try {
      const filtersStr = await AsyncStorage.getItem(FILTERS_STORAGE_KEY);
      if (filtersStr) {
        setSavedFilters(JSON.parse(filtersStr));
      }
    } catch {
      // silently fail
    }
  };

  const saveFilters = async (filters: any) => {
    try {
      await AsyncStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // silently fail
    }
  };

  const clearSavedFilters = async () => {
    try {
      await AsyncStorage.removeItem(FILTERS_STORAGE_KEY);
      setSavedFilters({});
    } catch {
      // silently fail
    }
  };

  return {
    suggestedRecipes,
    randomRecipe,
    searchResults,
    loading,
    error,
    savedFilters,
    fetchSuggestedRecipes,
    fetchRandomRecipe,
    searchRecipes,
    setSearchQuery,
    loadSavedFilters,
    saveFilters,
    clearSavedFilters,
  };
}
