// frontend/hooks/useCookMemoryInsight.ts
//
// X-C2 (founder roadmap Tier X — Moat Hardening): hook for the
// composed cook-memory insight surfaced in MemoryMirrorLead. Returns
// `null` on cold-start, errors, or honest-empty backend response.
// Wedge contract: the consumer renders NOTHING when null — no
// placeholder card, no skeleton beyond the boundary.

import { useQuery } from '@tanstack/react-query';
import {
  cookApi,
  type CookMemoryInsightPayload,
} from '../lib/api/cook';

const QUERY_KEY = ['cookMemoryInsight'] as const;

export interface UseCookMemoryInsightResult {
  insight: CookMemoryInsightPayload | null;
  loading: boolean;
}

export function useCookMemoryInsight(): UseCookMemoryInsightResult {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<CookMemoryInsightPayload | null> => {
      try {
        return await cookApi.getMemoryInsight();
      } catch {
        // Optional-surface fail-closed: never throw.
        return null;
      }
    },
  });
  return {
    insight: query.data ?? null,
    loading: query.isLoading,
  };
}

export default useCookMemoryInsight;
