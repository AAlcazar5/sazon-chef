// frontend/hooks/useLikedRecipeIds.ts
//
// Y-Rank-5 (founder roadmap Telegram 2026-05-20): liked-recipes signal
// for the N=1 wedge ranker. Explicit like is a distinct N=1 signal
// from save (like = "I'd cook this again", save = "I want to come back
// to this"). The ranker uses both, weighted separately.
//
// Pattern mirrors `useRecentCookRecipeIds`: pure extractor + React-Query-
// cached hook. Wedge ranker never throws on missing signals — empty
// list on any error.

import { useQuery } from '@tanstack/react-query';
import { recipeApi } from '../lib/api/recipe';

interface LikedRecipesResponseShape {
  // Backend returns either { recipes: [...] } or a paginated wrap.
  // Both shapes show up depending on caller — handle both defensively.
  data?:
    | { recipes?: Array<{ id?: string } | { recipe?: { id?: string } }> }
    | Array<{ id?: string } | { recipe?: { id?: string } }>;
}

/** Pure extractor — exported so callers can re-shape the same response
 *  cached under a different query key if they need to. */
export function extractLikedRecipeIds(res: unknown): string[] {
  const data = (res as LikedRecipesResponseShape | undefined)?.data;
  const list = Array.isArray(data) ? data : data?.recipes ?? [];
  const ids = new Set<string>();
  for (const item of list) {
    if (!item) continue;
    // Two shapes: either { id } directly, or { recipe: { id } } for
    // join-table-flavored endpoints.
    const idFromRow = (item as { id?: string }).id;
    if (typeof idFromRow === 'string' && idFromRow.length > 0) {
      ids.add(idFromRow);
      continue;
    }
    const nested = (item as { recipe?: { id?: string } }).recipe;
    if (
      nested &&
      typeof nested.id === 'string' &&
      nested.id.length > 0
    ) {
      ids.add(nested.id);
    }
  }
  return Array.from(ids);
}

const QUERY_KEY = ['likedRecipeIds'] as const;
// Reasonable upper bound — the ranker only cares about presence,
// not the full library. Page 1 with 100 entries covers typical use.
const FETCH_LIMIT = 100;

export interface UseLikedRecipeIdsResult {
  /** Recipe IDs the user has explicitly liked. Order is the backend's
   *  natural order (typically most-recently-liked first). */
  ids: string[];
  loading: boolean;
}

export function useLikedRecipeIds(): UseLikedRecipeIdsResult {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<string[]> => {
      try {
        const res = await recipeApi.getLikedRecipes({ limit: FETCH_LIMIT });
        return extractLikedRecipeIds(res);
      } catch {
        return [];
      }
    },
  });
  return {
    ids: query.data ?? [],
    loading: query.isLoading,
  };
}

export default useLikedRecipeIds;
