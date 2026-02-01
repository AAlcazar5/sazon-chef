// frontend/hooks/useTimeAwareMode.ts
// Hook for managing time-aware recipe suggestions

import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HapticPatterns } from '../constants/Haptics';

const TIME_AWARE_STORAGE_KEY = '@sazon_time_aware_mode';

export interface MealPeriod {
  label: string;
  emoji: string;
  period: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface UseTimeAwareModeReturn {
  /** Whether time-aware mode is enabled */
  timeAwareMode: boolean;
  /** Toggle time-aware mode on/off */
  setTimeAwareMode: (value: boolean) => Promise<void>;
  /** Toggle time-aware mode (convenience function) */
  toggleTimeAwareMode: () => Promise<boolean>;
  /** Current meal period based on time of day */
  currentMealPeriod: MealPeriod;
  /** Whether the preference has been loaded from storage */
  isLoaded: boolean;
}

/**
 * Get the current meal period based on time of day
 */
function getMealPeriod(): MealPeriod {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 11) {
    return { label: 'Breakfast', emoji: '🌅', period: 'breakfast' };
  }
  if (hour >= 11 && hour < 15) {
    return { label: 'Lunch', emoji: '☀️', period: 'lunch' };
  }
  if (hour >= 15 && hour < 21) {
    return { label: 'Dinner', emoji: '🌙', period: 'dinner' };
  }
  return { label: 'Late Night', emoji: '🌃', period: 'snack' };
}

/**
 * Hook for managing time-aware recipe suggestions
 * Persists selection to AsyncStorage
 */
export function useTimeAwareMode(): UseTimeAwareModeReturn {
  const [timeAwareMode, setTimeAwareModeState] = useState(true); // Default to enabled
  const [isLoaded, setIsLoaded] = useState(false);

  // Memoize current meal period
  const currentMealPeriod = useMemo(() => getMealPeriod(), []);

  // Load saved preference on mount
  useEffect(() => {
    const loadTimeAwareMode = async () => {
      try {
        const saved = await AsyncStorage.getItem(TIME_AWARE_STORAGE_KEY);
        if (saved !== null) {
          setTimeAwareModeState(saved === 'true');
        }
      } catch (error) {
        console.error('❌ Error loading time-aware mode:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTimeAwareMode();
  }, []);

  // Set time-aware mode and persist to storage
  const setTimeAwareMode = useCallback(async (value: boolean) => {
    try {
      setTimeAwareModeState(value);
      await AsyncStorage.setItem(TIME_AWARE_STORAGE_KEY, value ? 'true' : 'false');
      HapticPatterns.buttonPress();
    } catch (error) {
      console.error('❌ Error saving time-aware mode:', error);
    }
  }, []);

  // Toggle time-aware mode (convenience function)
  const toggleTimeAwareMode = useCallback(async (): Promise<boolean> => {
    const newValue = !timeAwareMode;
    await setTimeAwareMode(newValue);
    return newValue;
  }, [timeAwareMode, setTimeAwareMode]);

  return {
    timeAwareMode,
    setTimeAwareMode,
    toggleTimeAwareMode,
    currentMealPeriod,
    isLoaded,
  };
}

export default useTimeAwareMode;
