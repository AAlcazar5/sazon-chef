// frontend/hooks/useSearchHistory.ts
// Custom hook for managing search history with AsyncStorage persistence

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_HISTORY_KEY = 'recipe_search_history';
const MAX_HISTORY_ITEMS = 10;

interface UseSearchHistoryReturn {
  searchHistory: string[];
  addToHistory: (query: string) => Promise<void>;
  removeFromHistory: (query: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export function useSearchHistory(): UseSearchHistoryReturn {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        setSearchHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const addToHistory = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setSearchHistory(prev => {
      const updated = [trimmed, ...prev.filter(q => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_HISTORY_ITEMS);
      AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  }, []);

  const removeFromHistory = useCallback(async (query: string) => {
    setSearchHistory(prev => {
      const updated = prev.filter(q => q !== query);
      AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(async () => {
    setSearchHistory([]);
    await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
  }, []);

  return {
    searchHistory,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}
