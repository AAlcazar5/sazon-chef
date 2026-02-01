// frontend/hooks/useViewMode.ts
// Hook for managing grid/list view mode preference

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HapticPatterns } from '../constants/Haptics';

export type ViewMode = 'grid' | 'list';

const VIEW_MODE_STORAGE_KEY = '@sazon_view_mode';

export interface UseViewModeReturn {
  /** Current view mode ('grid' or 'list') */
  viewMode: ViewMode;
  /** Toggle to a specific view mode */
  setViewMode: (mode: ViewMode) => Promise<void>;
  /** Number of recipes per page based on view mode */
  recipesPerPage: number;
  /** Whether the view mode has been loaded from storage */
  isLoaded: boolean;
}

/**
 * Hook for managing grid/list view mode preference
 * Persists selection to AsyncStorage
 */
export function useViewMode(defaultMode: ViewMode = 'list'): UseViewModeReturn {
  const [viewMode, setViewModeState] = useState<ViewMode>(defaultMode);
  const [isLoaded, setIsLoaded] = useState(false);

  // Calculate recipes per page based on view mode
  // Grid: 1 featured + 20, List: 1 featured + 10
  const recipesPerPage = viewMode === 'grid' ? 21 : 11;

  // Load saved preference on mount
  useEffect(() => {
    const loadViewMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(VIEW_MODE_STORAGE_KEY);
        if (savedMode === 'grid' || savedMode === 'list') {
          setViewModeState(savedMode);
        }
      } catch (error) {
        console.error('❌ Error loading view mode:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadViewMode();
  }, []);

  // Set view mode and persist to storage
  const setViewMode = useCallback(async (mode: ViewMode) => {
    try {
      setViewModeState(mode);
      await AsyncStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
      HapticPatterns.buttonPress();
    } catch (error) {
      console.error('❌ Error saving view mode:', error);
    }
  }, []);

  return {
    viewMode,
    setViewMode,
    recipesPerPage,
    isLoaded,
  };
}

export default useViewMode;
