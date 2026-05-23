// frontend/hooks/useCookLog.ts
// W-D Phase 1 / D-1 — cursor-paged Cook Log reader. Exposes entries +
// hasMore (opaque cursor), NEVER a total/count (W-D1). Memory surface.
//
// X-D1 (founder roadmap Tier X — Moat Hardening): local-first cache.
// First page reads write-through to AsyncStorage so an offline /
// network-hiccup reload returns the LAST-KNOWN entries instead of an
// empty state. Online reconcile is seamless — once the fetch succeeds
// the cache is overwritten. Gated by FEATURE_FLAGS.cookLogLocalCache
// for instant rollback (EXPO_PUBLIC_COOK_LOG_CACHE=0).
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cookApi, type CookLogEntry } from '../lib/api/cook';
import { FEATURE_FLAGS } from '../constants/featureFlags';

const CACHE_KEY = '@sazon/cookLog/firstPage/v1';
const CACHE_MAX_ENTRIES = 50;

export async function readCachedFirstPage(): Promise<CookLogEntry[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (e): e is CookLogEntry =>
        e != null &&
        typeof e === 'object' &&
        typeof (e as CookLogEntry).id === 'string',
    );
  } catch {
    return null;
  }
}

export async function writeCachedFirstPage(
  entries: CookLogEntry[],
): Promise<void> {
  try {
    const capped = entries.slice(0, CACHE_MAX_ENTRIES);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(capped));
  } catch {
    // Cache failures must never surface — degrade silently.
  }
}

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
        // X-D1: write-through cache on the first page only (reset=true).
        // Paginated continuations don't get cached — the moat for offline
        // is the LATEST cooks, not the full history.
        if (reset && FEATURE_FLAGS.cookLogLocalCache) {
          void writeCachedFirstPage(pageData.entries);
        }
      } catch (e: unknown) {
        // X-D1: offline / network-hiccup → fall back to the cache instead
        // of clearing entries. Flag off → original fail-empty behavior.
        if (reset && FEATURE_FLAGS.cookLogLocalCache) {
          const cached = await readCachedFirstPage();
          if (cached && cached.length > 0) {
            setEntries(cached);
            setError(null);
            setHasMore(false);
            return;
          }
        }
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
    // X-D1: paint cached entries IMMEDIATELY on mount so a slow
    // network doesn't show an empty Memory Mirror. The real fetch
    // overwrites on success; on failure the cache is already showing.
    if (FEATURE_FLAGS.cookLogLocalCache) {
      void (async () => {
        const cached = await readCachedFirstPage();
        if (cached && cached.length > 0) {
          setEntries((prev) => (prev.length === 0 ? cached : prev));
        }
      })();
    }
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
