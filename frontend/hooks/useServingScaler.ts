// frontend/hooks/useServingScaler.ts
// 10K: Serving scaler with live macro recalculation.
// Pure frontend calculation — no backend calls needed.

import { useState, useMemo, useCallback } from 'react';

interface ScalerRecipeInput {
  servings?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  estimatedCost?: number;
  cookTime?: number;
}

interface ScaledMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface HitMyMacrosTarget {
  targetCalories?: number;
  targetProtein?: number;
}

interface UseServingScalerResult {
  scaleFactor: number;
  scaledServings: number;
  scaledMacros: ScaledMacros;
  scaledCost: number | null;
  cookTimeHint: string | null;
  setScaleFactor: (factor: number) => void;
  setCustomServings: (servings: number) => void;
  hitMyMacros: (target: HitMyMacrosTarget) => void;
  reset: () => void;
}

export function useServingScaler(recipe: ScalerRecipeInput): UseServingScalerResult {
  const baseServings = recipe.servings || 1;
  const [scaleFactor, setScaleFactorState] = useState(1);

  const scaledServings = useMemo(
    () => Math.round(baseServings * scaleFactor * 100) / 100,
    [baseServings, scaleFactor],
  );

  const scaledMacros = useMemo((): ScaledMacros => ({
    calories: Math.round(recipe.calories * scaleFactor),
    protein: Math.round(recipe.protein * scaleFactor),
    carbs: Math.round(recipe.carbs * scaleFactor),
    fat: Math.round(recipe.fat * scaleFactor),
    fiber: Math.round((recipe.fiber || 0) * scaleFactor),
  }), [recipe.calories, recipe.protein, recipe.carbs, recipe.fat, recipe.fiber, scaleFactor]);

  const scaledCost = useMemo(
    () => recipe.estimatedCost != null
      ? Math.round(recipe.estimatedCost * scaleFactor * 100) / 100
      : null,
    [recipe.estimatedCost, scaleFactor],
  );

  const cookTimeHint = useMemo(() => {
    if (scaleFactor < 2 || !recipe.cookTime) return null;
    const extraMinutes = Math.round(recipe.cookTime * (scaleFactor - 1) * 0.3);
    return `May need ${extraMinutes} extra minutes for larger batch`;
  }, [scaleFactor, recipe.cookTime]);

  const setScaleFactor = useCallback((factor: number) => {
    setScaleFactorState(Math.max(0.25, factor));
  }, []);

  const setCustomServings = useCallback((servings: number) => {
    const factor = baseServings > 0 ? servings / baseServings : 1;
    setScaleFactorState(Math.max(0.25, factor));
  }, [baseServings]);

  const hitMyMacros = useCallback((target: HitMyMacrosTarget) => {
    let factor: number;
    if (target.targetCalories && recipe.calories > 0) {
      factor = target.targetCalories / recipe.calories;
    } else if (target.targetProtein && recipe.protein > 0) {
      factor = target.targetProtein / recipe.protein;
    } else {
      return;
    }
    setScaleFactorState(Math.max(0.25, factor));
  }, [recipe.calories, recipe.protein]);

  const reset = useCallback(() => {
    setScaleFactorState(1);
  }, []);

  return {
    scaleFactor,
    scaledServings,
    scaledMacros,
    scaledCost,
    cookTimeHint,
    setScaleFactor,
    setCustomServings,
    hitMyMacros,
    reset,
  };
}
