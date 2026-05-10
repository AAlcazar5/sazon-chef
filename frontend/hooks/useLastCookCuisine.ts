// frontend/hooks/useLastCookCuisine.ts
// ROADMAP 4.0 J11 — most-recent-cook cuisine for the home first-of-day greeting.
//
// P5: extracted from `app/(tabs)/index.tsx` and migrated to React Query so
// the cuisine string is cached across home-tab remounts.

import { useQuery } from '@tanstack/react-query';
import { cookingHistoryStatsApi } from '../lib/api';

const QUERY_KEY = ['lastCookCuisine'] as const;

interface UseLastCookCuisineResult {
  cuisine: string;
  loading: boolean;
}

export function useLastCookCuisine(): UseLastCookCuisineResult {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<string> => {
      try {
        const res = await cookingHistoryStatsApi.mostRecent();
        const payload = (res?.data ?? res) as
          | { mostRecent?: { recipe?: { cuisine?: string | null } | null } | null }
          | undefined;
        return payload?.mostRecent?.recipe?.cuisine ?? '';
      } catch {
        return '';
      }
    },
  });

  return {
    cuisine: query.data ?? '',
    loading: query.isLoading,
  };
}
