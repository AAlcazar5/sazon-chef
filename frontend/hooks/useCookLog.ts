// frontend/hooks/useCookLog.ts
// W-D Phase 1 / D-1 — cursor-paged Cook Log reader. Exposes entries +
// hasMore (opaque cursor), NEVER a total/count (W-D1). Memory surface.
import { useState, useEffect, useCallback, useRef } from 'react';
import { cookApi, type CookLogEntry } from '../lib/api/cook';

export interface UseCookLogReturn {
  entries: CookLogEntry[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCookLog(limit = 20): UseCookLogReturn {
  const [entries, setEntries] = useState<CookLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const inFlight = useRef(false);

  const fetchPage = useCallback(
    async (reset: boolean): Promise<void> => {
      if (inFlight.current) return;
      inFlight.current = true;
      if (reset) setLoading(true);
      try {
        const cursor = reset ? undefined : cursorRef.current ?? undefined;
        const params: { limit: number; cursor?: string } = { limit };
        if (cursor) params.cursor = cursor;

        const pageData = await cookApi.getCookLog(params);
        cursorRef.current = pageData.nextCursor;
        const more = pageData.nextCursor != null;
        hasMoreRef.current = more;
        setHasMore(more);
        setEntries((prev) =>
          reset ? pageData.entries : [...prev, ...pageData.entries],
        );
        setError(null);
      } catch (e: unknown) {
        setError(
          e instanceof Error ? e.message : 'Failed to load your cook log',
        );
        if (reset) setEntries([]);
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    [limit],
  );

  useEffect(() => {
    fetchPage(true);
  }, [fetchPage]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (!hasMoreRef.current) return;
    await fetchPage(false);
  }, [fetchPage]);

  const refresh = useCallback(async (): Promise<void> => {
    cursorRef.current = null;
    hasMoreRef.current = true;
    await fetchPage(true);
  }, [fetchPage]);

  return { entries, loading, error, hasMore, loadMore, refresh };
}
