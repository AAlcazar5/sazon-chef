// frontend/hooks/useTonightsPlate.ts
// Group 10X Phase 2 — fetches and caches the plate-from-pantry suggestion.
//
// P5 (persister): migrated from a hand-rolled in-mem + AsyncStorage cache
// to React Query. The cache persister (lib/queryPersister.ts) handles
// disk hydration on cold start; `staleTime: 30min` preserves the original
// "cached for 30 minutes before refetch" contract.

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mealComponentApi, type PermutationCandidate } from '../lib/api';

const QUERY_KEY = ['tonightsPlate'] as const;
const STALE_TIME_MS = 30 * 60 * 1000;

interface UseTonightsPlateResult {
  plate: PermutationCandidate | null;
  loading: boolean;
  error: boolean;
  refetch: () => void;
}

export function useTonightsPlate(): UseTonightsPlateResult {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<PermutationCandidate | null> => {
      const res = await mealComponentApi.plateFromPantry();
      return res.data?.plate ?? null;
    },
    staleTime: STALE_TIME_MS,
  });

  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  return {
    plate: query.data ?? null,
    loading: query.isLoading,
    error: query.isError,
    refetch,
  };
}
