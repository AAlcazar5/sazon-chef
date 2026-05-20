// frontend/hooks/useRecentCookRecipeIds.ts
//
// Tier Y N=1 ranker depth (founder Telegram 2026-05-20 PR-3): variety
// signal — the wedge should not keep surfacing the same recipe the user
// just cooked. If you made "Grilled Chicken Italian" yesterday and ask
// "Grilled chicken" today, the same recipe shouldn't be primary again.
// Adaptive iteration: every cook reshapes tomorrow's recommendations.
//
// Uses the existing /cooking-logs/most-recent endpoint (which already
// returns recipe.id alongside the cuisine). When backend grows a
// "recent cooks (limit N)" variant, swap the queryFn for that and the
// returned shape stays the same.

import { useQuery } from '@tanstack/react-query';
import { cookingHistoryStatsApi } from '../lib/api';

interface MostRecentResponseShape {
  // Axios response after the core interceptor unwraps the API envelope.
  data?: { mostRecent?: { recipe?: { id?: string } | null } | null };
}

/** Pure extractor — exported so callers can re-shape the same response
 *  cached under a different query key if they need to. */
export function extractRecentCookRecipeIds(res: unknown): string[] {
  const id = (res as MostRecentResponseShape | undefined)?.data?.mostRecent?.recipe?.id;
  return typeof id === 'string' && id.length > 0 ? [id] : [];
}

const QUERY_KEY = ['recentCookRecipeIds'] as const;

export interface UseRecentCookRecipeIdsResult {
  /** Most-recent cooked recipe IDs (highest = most recent). Currently
   *  length 0 or 1 — backend only exposes most-recent. Once a "list
   *  recent cooks" endpoint lands, the hook upgrades transparently and
   *  the ranker damper applies to a wider window. */
  ids: string[];
  loading: boolean;
}

export function useRecentCookRecipeIds(): UseRecentCookRecipeIdsResult {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<string[]> => {
      try {
        const res = await cookingHistoryStatsApi.mostRecent();
        return extractRecentCookRecipeIds(res);
      } catch {
        // Wedge ranker must never throw on missing signals.
        return [];
      }
    },
  });
  return {
    ids: query.data ?? [],
    loading: query.isLoading,
  };
}

export default useRecentCookRecipeIds;
