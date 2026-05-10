// frontend/hooks/usePlateOfTheWeek.ts
// Group 10X Phase 8 — fetches the most-saved community plate from rolling 7d window.
// Gracefully returns null on 404 / network error so home screen can skip render.
//
// P5: migrated to React Query so the plate is cached across home screen
// remounts (e.g. swipe-to-refresh, tab navigation).

import { useQuery } from '@tanstack/react-query';
import { composedPlateApi, type PlateOfTheWeek } from '../lib/api';

export interface UsePlateOfTheWeekResult {
  plate: PlateOfTheWeek | null;
  isLoading: boolean;
}

const QUERY_KEY = ['plateOfTheWeek'] as const;

export function usePlateOfTheWeek(): UsePlateOfTheWeekResult {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<PlateOfTheWeek | null> => {
      try {
        const res = await composedPlateApi.fetchOfTheWeek();
        return res.data?.plate ?? null;
      } catch {
        return null;
      }
    },
  });

  return {
    plate: query.data ?? null,
    isLoading: query.isLoading,
  };
}
