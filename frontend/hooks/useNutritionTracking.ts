// frontend/hooks/useNutritionTracking.ts
// Custom hook for managing nutrition and macro tracking

import { useState, Dispatch, SetStateAction } from 'react';

interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface UseNutritionTrackingReturn {
  /** Weekly nutrition data */
  weeklyNutrition: any | null;
  /** Whether weekly nutrition is loading */
  loadingWeeklyNutrition: boolean;
  /** Target macros from user profile */
  targetMacros: Macros;
  /** Set weekly nutrition */
  setWeeklyNutrition: Dispatch<SetStateAction<any | null>>;
  /** Set loading weekly nutrition */
  setLoadingWeeklyNutrition: Dispatch<SetStateAction<boolean>>;
  /** Set target macros */
  setTargetMacros: Dispatch<SetStateAction<Macros>>;
}

/**
 * Custom hook for nutrition and macro tracking
 * Manages target macros and weekly nutrition analytics
 */
export function useNutritionTracking(): UseNutritionTrackingReturn {
  const [weeklyNutrition, setWeeklyNutrition] = useState<any | null>(null);
  const [loadingWeeklyNutrition, setLoadingWeeklyNutrition] = useState(false);

  // Target macros (from user profile)
  const [targetMacros, setTargetMacros] = useState<Macros>({
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 67,
  });

  return {
    weeklyNutrition,
    loadingWeeklyNutrition,
    targetMacros,
    setWeeklyNutrition,
    setLoadingWeeklyNutrition,
    setTargetMacros,
  };
}
