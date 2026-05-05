import { useCallback, useEffect, useState } from 'react';
import { mealPlanApi } from '../lib/api';

export interface VarietyScore {
  score: number;
  isBoringWeek: boolean;
  uniqueProteins: number;
  uniqueCuisines: number;
  consecutiveProteinRepeats: number;
  consecutiveCuisineRepeats: number;
  repeatedMealTitles: number;
}

export interface VarietyResult {
  varietyScore: VarietyScore;
  repetitiveMealIds: string[];
  nudgeMessage: string | null;
}

export function useVarietyScore(mealPlanId: string | null | undefined) {
  const [result, setResult] = useState<VarietyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!mealPlanId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await mealPlanApi.getVarietyScore(mealPlanId);
      setResult({
        varietyScore: res.data.varietyScore,
        repetitiveMealIds: res.data.repetitiveMealIds,
        nudgeMessage: res.data.nudgeMessage,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load variety score';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [mealPlanId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { result, loading, error, refresh };
}
