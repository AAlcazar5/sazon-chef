// frontend/hooks/useReverseDiscovery.ts
// ROADMAP 4.0 I2.4 — fetch the daily reverse-discovery payload.
//
// The endpoint short-circuits to {candidate:null, copy:null} for en-US
// users so the caller can mount the card unconditionally and let it
// render-null. Backend rotates per (userId, dateKey) so refetching on
// remount is fine — the same surface is returned until tomorrow.
import { useEffect, useState } from 'react';
import { todayApi, type ReverseDiscoveryResponse } from '../lib/api';

interface UseReverseDiscoveryState {
  payload: ReverseDiscoveryResponse;
  loading: boolean;
  error: Error | null;
}

const EMPTY: ReverseDiscoveryResponse = { candidate: null, copy: null };

export function useReverseDiscovery(): UseReverseDiscoveryState {
  const [payload, setPayload] = useState<ReverseDiscoveryResponse>(EMPTY);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await todayApi.reverseDiscovery();
        if (cancelled) return;
        setPayload((res.data as ReverseDiscoveryResponse) ?? EMPTY);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setPayload(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { payload, loading, error };
}
