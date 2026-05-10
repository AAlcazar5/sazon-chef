// frontend/hooks/useDailyNutrition.ts
// ROADMAP 4.0 D14 — daily nutrient snapshot for the home discovery strip.
//
// P5: extracted from `app/(tabs)/index.tsx` and migrated to React Query so
// the snapshot is cached across home-tab remounts and shared with any
// other surface that wants to read today's nutrient totals.

import { useQuery } from '@tanstack/react-query';
import { nutritionApi, type DailyNutritionSnapshot } from '../lib/api';

const QUERY_KEY = ['dailyNutrition'] as const;

interface UseDailyNutritionResult {
  snapshot: DailyNutritionSnapshot | null;
  loading: boolean;
}

export function useDailyNutrition(): UseDailyNutritionResult {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<DailyNutritionSnapshot | null> => {
      try {
        const res = await nutritionApi.fetchDaily();
        return res?.data?.snapshot ?? null;
      } catch {
        return null;
      }
    },
  });

  return {
    snapshot: query.data ?? null,
    loading: query.isLoading,
  };
}
