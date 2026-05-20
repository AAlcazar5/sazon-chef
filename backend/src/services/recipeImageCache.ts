// backend/src/services/recipeImageCache.ts
//
// Tier Y wedge photos (founder 2026-05-20): cache Spoonacular image
// lookups by normalized query. Spoonacular's free tier is points-bounded
// (150/day), and image URLs are extremely stable, so a long-TTL cache
// dramatically extends our daily budget. 24h TTL, 1000 entries.
//
// Separate from `aiGenRecipeCache` because the lifecycles differ:
// recipe generations refresh on model updates (1h is right), but
// representative photos for "Grilled chicken" don't change day-to-day.

import { CacheService } from '../utils/cacheService';

const TTL_MS = 24 * 60 * 60 * 1000; // 24h
const MAX_SIZE = 1000;

export const recipeImageCache = new CacheService({
  ttl: TTL_MS,
  maxSize: MAX_SIZE,
});

/** Same normalization as recipeAskCacheKey — lowercase, trimmed,
 *  whitespace-collapsed. Different prefix so the two caches stay
 *  cleanly separated.
 *
 *  Version suffix `:v2` (founder 2026-05-20 round 6): cache entries
 *  written before PR #65 stored a single image URL. Entries written
 *  after store `string[]` (3-photo collage). Reusing the same key
 *  prefix would deserialize old entries into the new shape and the
 *  carousel would silently fall back to single-image rendering. Bump
 *  the version whenever the cached value shape changes. */
export function recipeImageCacheKey(query: string): string {
  return `recipe-image:v2:${query.trim().toLowerCase().replace(/\s+/g, ' ')}`;
}
