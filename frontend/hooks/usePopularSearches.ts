// frontend/hooks/usePopularSearches.ts
// Fetch trending search queries from the backend

import { useState, useEffect, useCallback } from 'react';
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

export function usePopularSearches(options: UsePopularSearchesOptions = {}): UsePopularSearchesReturn {
  const { initialData } = options;
  const [popularSearches, setPopularSearches] = useState<PopularSearch[]>(initialData || []);
  const [loading, setLoading] = useState(!initialData);

  const fetchPopular = useCallback(async () => {
    try {
      setLoading(true);
      const res = await searchApi.getPopularSearches(5);
      setPopularSearches(res.data?.popularSearches || []);
    } catch {
      setPopularSearches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update state when initialData changes
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setPopularSearches(initialData);
      setLoading(false);
    }
  }, [initialData]);

  // Only fetch on mount if no initialData provided
  useEffect(() => {
    if (!initialData || initialData.length === 0) {
      fetchPopular();
    }
  }, [fetchPopular, initialData]);

  return { popularSearches, loading, refresh: fetchPopular };
}
