// frontend/hooks/usePersonalizedRecipes.ts
// Recently-viewed recipe id list backed by AsyncStorage.
//
// P5 (cleanup): the original hook also fetched liked recipes from the API,
// but the home screen never consumed that field — it ignored
// `likedRecipes`, `loading`, and `refetch` from the destructure. Dropped
// the API path; this hook is now strictly the recently-viewed list. If
// liked-recipes need to surface again, prefer a separate `useQuery` so
// the cache is shared with other surfaces.

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENTLY_VIEWED_KEY = '@sazon_recently_viewed';
const MAX_ITEMS = 5;

interface UsePersonalizedRecipesOptions {
  // Kept for shape compatibility with the prior call site; unused.
  userId?: string;
  initialLikedRecipes?: unknown;
}

interface UsePersonalizedRecipesReturn {
  recentlyViewedIds: string[];
  loading: boolean;
  addRecentlyViewed: (recipeId: string) => Promise<void>;
}

export function usePersonalizedRecipes(
  _options: UsePersonalizedRecipesOptions = {},
): UsePersonalizedRecipesReturn {
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Hydrate from AsyncStorage on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENTLY_VIEWED_KEY);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as string[];
          setRecentlyViewedIds(parsed.slice(0, MAX_ITEMS));
        }
      } catch {
        // Treat read failure as empty list — non-fatal for UX.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addRecentlyViewed = useCallback(async (recipeId: string) => {
    try {
      const existing = await AsyncStorage.getItem(RECENTLY_VIEWED_KEY);
      let recentIds: string[] = existing ? JSON.parse(existing) : [];
      // Move-to-front semantics: drop existing entry, prepend, cap.
      recentIds = recentIds.filter((id) => id !== recipeId);
      recentIds.unshift(recipeId);
      recentIds = recentIds.slice(0, MAX_ITEMS);
      await AsyncStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(recentIds));
      setRecentlyViewedIds(recentIds);
    } catch {
      // Persist failure is non-fatal; the in-memory list updates on next read.
    }
  }, []);

  return { recentlyViewedIds, loading, addRecentlyViewed };
}

export default usePersonalizedRecipes;
