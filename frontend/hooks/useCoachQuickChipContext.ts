// Tier S S5.1: pulls live N=1 chip context from /api/coach/context so the
// quick-start chips reflect real pantry / macro / adjacency state instead of
// the FALLBACK_CHIPS hardcoded list. Falls back to a static shape on error so
// the UI never blanks.
//
// P5: migrated to React Query so multiple chip surfaces (coach FAB, coach
// home card, coach quick-start sheet) share one cache entry.

import { useQuery } from '@tanstack/react-query';
import { coachApi } from '../lib/api';

export interface CoachQuickChipContext {
  pantryExpiringSoon: string[];
  remainingMacros: { calories: number; protein: number; carbs: number; fat: number } | null;
  leftoverInventory: Array<{ componentId: string }>;
  topAdjacentCuisine: string | null;
}

const EMPTY: CoachQuickChipContext = {
  pantryExpiringSoon: [],
  remainingMacros: null,
  leftoverInventory: [],
  topAdjacentCuisine: null,
};

const QUERY_KEY = ['coachContext'] as const;

export function useCoachQuickChipContext(): CoachQuickChipContext {
  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<CoachQuickChipContext> => {
      try {
        const r = await coachApi.getCoachContext();
        return {
          pantryExpiringSoon: r.pantryExpiringSoon ?? [],
          remainingMacros: r.remainingMacros ?? null,
          leftoverInventory: (r.leftoverInventory ?? []).map((l) => ({
            componentId: l.componentId,
          })),
          topAdjacentCuisine: r.topAdjacentCuisine ?? null,
        };
      } catch {
        // Static fallback — chip helper falls through to its 4 defaults.
        return EMPTY;
      }
    },
    initialData: EMPTY,
  });

  return data ?? EMPTY;
}

export default useCoachQuickChipContext;
