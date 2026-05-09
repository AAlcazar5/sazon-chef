// Tier S S5.1: pulls live N=1 chip context from /api/coach/context so the
// quick-start chips reflect real pantry / macro / adjacency state instead of
// the FALLBACK_CHIPS hardcoded list. Falls back to a static shape on error so
// the UI never blanks.

import { useEffect, useState } from 'react';
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

export function useCoachQuickChipContext(): CoachQuickChipContext {
  const [ctx, setCtx] = useState<CoachQuickChipContext>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await coachApi.getCoachContext();
        if (cancelled) return;
        setCtx({
          pantryExpiringSoon: r.pantryExpiringSoon ?? [],
          remainingMacros: r.remainingMacros ?? null,
          leftoverInventory: (r.leftoverInventory ?? []).map((l) => ({
            componentId: l.componentId,
          })),
          topAdjacentCuisine: r.topAdjacentCuisine ?? null,
        });
      } catch {
        // Static fallback — chip helper falls through to its 4 defaults.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return ctx;
}

export default useCoachQuickChipContext;
