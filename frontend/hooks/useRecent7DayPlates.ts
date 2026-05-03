// frontend/hooks/useRecent7DayPlates.ts
// Group 10X-Cleanup — 7-day cooked-plate + green-vegetable summary for the
// composer's "Eat the rainbow" hint banner.

import { useEffect, useState } from 'react';
import { composedPlateApi } from '../lib/api';

export interface UseRecent7DayPlatesResult {
  totalPlatesThisWeek: number;
  greenVegCount: number;
  isLoading: boolean;
}

export function useRecent7DayPlates(): UseRecent7DayPlatesResult {
  const [totalPlatesThisWeek, setTotal] = useState(0);
  const [greenVegCount, setGreenVegCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await composedPlateApi.weeklySummary();
        if (cancelled) return;
        setTotal(res.data?.totalPlatesThisWeek ?? 0);
        setGreenVegCount(res.data?.greenVegCount ?? 0);
      } catch {
        if (cancelled) return;
        setTotal(0);
        setGreenVegCount(0);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { totalPlatesThisWeek, greenVegCount, isLoading };
}
