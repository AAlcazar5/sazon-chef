// frontend/hooks/usePopularSearches.ts
// Fetch trending search queries from the backend.
//
// P5: migrated to React Query so multiple search surfaces share one cache
// entry. `initialData` from the consolidated home feed populates the cache
// without a network round-trip.

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { searchApi } from '../lib/api';

export interface PopularSearch {
  query: string;
  count: number;
}

interface UsePopularSearchesOptions {
  /** Pre-fetched data from consolidated home feed — skips API call if provided */
  initialData?: PopularSearch[];
}

interface UsePopularSearchesReturn {
  popularSearches: PopularSearch[];
  loading: boolean;
  refresh: () => void;
}

const QUERY_KEY = ['popularSearches'] as const;
const EMPTY: PopularSearch[] = [];

export function usePopularSearches(
  options: UsePopularSearchesOptions = {},
): UsePopularSearchesReturn {
  const { initialData } = options;
  const queryClient = useQueryClient();
  const hasInitial = initialData != null && initialData.length > 0;

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<PopularSearch[]> => {
      try {
        const res = await searchApi.getPopularSearches(5);
        return res.data?.popularSearches ?? EMPTY;
      } catch {
        return EMPTY;
      }
    },
    initialData: hasInitial ? initialData : undefined,
    // When the home feed already gave us data, treat it as fresh so the
    // hook doesn't auto-refetch. refresh() invalidates explicitly.
    staleTime: hasInitial ? Infinity : 30_000,
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  return {
    popularSearches: query.data ?? EMPTY,
    loading: query.isLoading,
    refresh,
  };
}
