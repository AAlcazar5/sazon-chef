// frontend/hooks/useSavedRecipeCuisines.ts
//
// Tier Y N=1 ranker depth (founder Telegram 2026-05-20): explicit saves
// are the strongest "this user cooks X-style" signal we have — stronger
// than last-cook recency (one-off) or server-inferred adjacency. This
// hook aggregates the user's saved recipes by cuisine, ranks by
// frequency, and exposes the canonical list to the wedge ranker via
// `rankerSignals.savedCollectionCuisines`.
//
// Cached through React Query so we don't refetch on every wedge ask.

import { useQuery } from '@tanstack/react-query';
import { recipeApi } from '../lib/api';

interface SavedEntry {
  cuisine?: unknown;
  recipe?: { cuisine?: unknown } | null;
}

/** Pure aggregator — exported so the ranker can reuse the same case-
 *  folding rules if it ever consumes the raw saved-recipe list directly. */
export function aggregateCuisinesFromSaved(rows: SavedEntry[]): string[] {
  // key = lowercase, value = { canonical: original-case label, count: int }
  const tally = new Map<string, { canonical: string; count: number }>();
  for (const row of rows) {
    const raw = row?.recipe?.cuisine ?? row?.cuisine;
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    const key = trimmed.toLowerCase();
    const existing = tally.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      tally.set(key, { canonical: trimmed, count: 1 });
    }
  }
  return [...tally.values()]
    .sort((a, b) => b.count - a.count)
    .map((e) => e.canonical);
}

interface SavedRecipesResponse {
  data?: SavedEntry[] | { recipes?: SavedEntry[] };
}

function extractRows(res: unknown): SavedEntry[] {
  const data = (res as SavedRecipesResponse | undefined)?.data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as any).recipes)) {
    return (data as { recipes: SavedEntry[] }).recipes;
  }
  return [];
}

const QUERY_KEY = ['savedRecipeCuisines'] as const;

export interface UseSavedRecipeCuisinesResult {
  /** Cuisines the user has saved, ordered by frequency (highest first).
   *  Empty during initial load OR on API error — the ranker treats this
   *  as a "cold start" signal and falls back to other inputs. */
  cuisines: string[];
  /** True while React Query is fetching for the first time. Consumers
   *  generally ignore this — the ranker treats absence-of-data as
   *  "no signal" without distinguishing loading vs empty. */
  loading: boolean;
}

export function useSavedRecipeCuisines(): UseSavedRecipeCuisinesResult {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<string[]> => {
      try {
        const res = await recipeApi.getSavedRecipes({ limit: 100 });
        return aggregateCuisinesFromSaved(extractRows(res));
      } catch {
        // Wedge ranker must never throw — degrade silently to cold-start.
        return [];
      }
    },
    // No `initialData` here: React Query treats initialData as already-
    // fetched, which would make `isLoading` always false. Without it,
    // `isLoading` is true on first fetch and `data` is undefined until
    // the query settles — exactly what tests expect for the loading case.
  });
  return {
    cuisines: query.data ?? [],
    loading: query.isLoading,
  };
}

export default useSavedRecipeCuisines;
