// frontend/hooks/useWeeklyRecap.ts
// ROADMAP 4.0 J4 — Sunday Polaroid drop. Fetches the C9 weekly recap so the
// home Sunday card can map onto the SundayRecap shape. The card itself
// gates on local Sunday + dismissed-this-week, so we always fetch.
//
// P5: extracted from `app/(tabs)/index.tsx` and migrated to React Query.

import { useQuery } from '@tanstack/react-query';
import { weeklyRecapApi, type WeeklyRecapPayload } from '../lib/api';

const QUERY_KEY = ['weeklyRecap'] as const;

interface UseWeeklyRecapResult {
  recap: WeeklyRecapPayload | null;
  loading: boolean;
}

export function useWeeklyRecap(): UseWeeklyRecapResult {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<WeeklyRecapPayload | null> => {
      try {
        const res = await weeklyRecapApi.fetchThisWeek();
        return (res?.data ?? null) as WeeklyRecapPayload | null;
      } catch {
        return null;
      }
    },
  });

  return {
    recap: query.data ?? null,
    loading: query.isLoading,
  };
}
