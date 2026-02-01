// frontend/hooks/useMealPrepMode.ts
// Hook for managing meal prep mode preference

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HapticPatterns } from '../constants/Haptics';

const MEAL_PREP_STORAGE_KEY = '@sazon_meal_prep_mode';

export interface UseMealPrepModeReturn {
  /** Whether meal prep mode is enabled */
  mealPrepMode: boolean;
  /** Toggle meal prep mode on/off */
  setMealPrepMode: (value: boolean) => Promise<void>;
  /** Toggle meal prep mode (convenience function) */
  toggleMealPrepMode: () => Promise<boolean>;
  /** Whether the preference has been loaded from storage */
  isLoaded: boolean;
}

/**
 * Hook for managing meal prep mode preference
 * Persists selection to AsyncStorage
 */
export function useMealPrepMode(): UseMealPrepModeReturn {
  const [mealPrepMode, setMealPrepModeState] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved preference on mount
  useEffect(() => {
    const loadMealPrepMode = async () => {
      try {
        const saved = await AsyncStorage.getItem(MEAL_PREP_STORAGE_KEY);
        if (saved !== null) {
          setMealPrepModeState(saved === 'true');
        }
      } catch (error) {
        console.error('❌ Error loading meal prep mode:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadMealPrepMode();
  }, []);

  // Set meal prep mode and persist to storage
  const setMealPrepMode = useCallback(async (value: boolean) => {
    try {
      setMealPrepModeState(value);
      await AsyncStorage.setItem(MEAL_PREP_STORAGE_KEY, value.toString());
      HapticPatterns.buttonPress();
    } catch (error) {
      console.error('❌ Error saving meal prep mode:', error);
      HapticPatterns.error();
    }
  }, []);

  // Toggle meal prep mode (convenience function)
  const toggleMealPrepMode = useCallback(async (): Promise<boolean> => {
    const newValue = !mealPrepMode;
    await setMealPrepMode(newValue);
    return newValue;
  }, [mealPrepMode, setMealPrepMode]);

  return {
    mealPrepMode,
    setMealPrepMode,
    toggleMealPrepMode,
    isLoaded,
  };
}

export default useMealPrepMode;
