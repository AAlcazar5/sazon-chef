// frontend/hooks/useVarietyScore.ts
//
// P5: migrated to React Query. Cache key includes mealPlanId so swapping
// plans gives a fresh fetch; refetch on the same plan stays cached.

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

const QUERY_KEY = ['varietyScore'] as const;

export function useVarietyScore(mealPlanId: string | null | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...QUERY_KEY, mealPlanId],
    queryFn: async (): Promise<VarietyResult> => {
      const res = await mealPlanApi.getVarietyScore(mealPlanId as string);
      return {
        varietyScore: res.data.varietyScore,
        repetitiveMealIds: res.data.repetitiveMealIds,
        nudgeMessage: res.data.nudgeMessage,
      };
    },
    enabled: !!mealPlanId,
  });

  const refresh = useCallback(async () => {
    if (!mealPlanId) return;
    await queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, mealPlanId] });
  }, [mealPlanId, queryClient]);

  return {
    result: query.data ?? null,
    loading: query.isFetching,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
    refresh,
  };
}
