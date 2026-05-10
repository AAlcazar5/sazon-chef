// frontend/hooks/useReverseDiscovery.ts
// ROADMAP 4.0 I2.4 — fetch the daily reverse-discovery payload.
//
// The endpoint short-circuits to {candidate:null, copy:null} for en-US
// users so the caller can mount the card unconditionally and let it
// render-null. Backend rotates per (userId, dateKey) so refetching on
// remount is fine — the same surface is returned until tomorrow.
//
// P5: migrated to React Query.

import { useQuery } from '@tanstack/react-query';
import { todayApi, type ReverseDiscoveryResponse } from '../lib/api';

interface UseReverseDiscoveryState {
  payload: ReverseDiscoveryResponse;
  loading: boolean;
  error: Error | null;
}

const EMPTY: ReverseDiscoveryResponse = { candidate: null, copy: null };
const QUERY_KEY = ['reverseDiscovery'] as const;

export function useReverseDiscovery(): UseReverseDiscoveryState {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<ReverseDiscoveryResponse> => {
      const res = await todayApi.reverseDiscovery();
      return (res.data as ReverseDiscoveryResponse) ?? EMPTY;
    },
  });

  return {
    payload: query.data ?? EMPTY,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
  };
}
