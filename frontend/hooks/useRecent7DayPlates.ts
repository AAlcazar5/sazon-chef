// frontend/hooks/useRecent7DayPlates.ts
// Group 10X-Cleanup — 7-day cooked-plate + green-vegetable summary for the
// composer's "Eat the rainbow" hint banner.
//
// P5: migrated to React Query.

import { useQuery } from '@tanstack/react-query';
import { composedPlateApi } from '../lib/api';

export interface UseRecent7DayPlatesResult {
  totalPlatesThisWeek: number;
  greenVegCount: number;
  isLoading: boolean;
}

const QUERY_KEY = ['composedPlate', 'weeklySummary'] as const;

interface Summary {
  totalPlatesThisWeek: number;
  greenVegCount: number;
}

const EMPTY: Summary = { totalPlatesThisWeek: 0, greenVegCount: 0 };

export function useRecent7DayPlates(): UseRecent7DayPlatesResult {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<Summary> => {
      try {
        const res = await composedPlateApi.weeklySummary();
        return {
          totalPlatesThisWeek: res.data?.totalPlatesThisWeek ?? 0,
          greenVegCount: res.data?.greenVegCount ?? 0,
        };
      } catch {
        return EMPTY;
      }
    },
  });

  const summary = query.data ?? EMPTY;

  return {
    totalPlatesThisWeek: summary.totalPlatesThisWeek,
    greenVegCount: summary.greenVegCount,
    isLoading: query.isLoading,
  };
}
