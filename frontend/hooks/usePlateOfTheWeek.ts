// frontend/hooks/usePlateOfTheWeek.ts
// Group 10X Phase 8 — fetches the most-saved community plate from rolling 7d window.
// Gracefully returns null on 404 / network error so home screen can skip render.

import { useEffect, useState } from 'react';
import { composedPlateApi, type PlateOfTheWeek } from '../lib/api';

export interface UsePlateOfTheWeekResult {
  plate: PlateOfTheWeek | null;
  isLoading: boolean;
}

export function usePlateOfTheWeek(): UsePlateOfTheWeekResult {
  const [plate, setPlate] = useState<PlateOfTheWeek | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await composedPlateApi.fetchOfTheWeek();
        if (!cancelled) {
          setPlate(res.data?.plate ?? null);
        }
      } catch {
        if (!cancelled) {
          setPlate(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { plate, isLoading };
}
