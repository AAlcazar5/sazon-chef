// backend/src/services/aiGenRecipeCache.ts
//
// Tier Y wedge perf (founder Telegram 2026-05-20 Track B): a recipe-ask
// like "Grilled chicken" today calls DeepSeek (~4s + cost) every time,
// even though the answer is identical for an identical query. Cache the
// generated recipe by normalized description so repeat asks within the
// TTL window return in <50ms with zero provider calls.
//
// Scope guard: ONLY recipe-ask mode is cached. The recipe-CREATION
// flow ("my grandma's diabetic recipe…") can contain PII and was never
// meant to be deduplicated across users — keep it provider-bound.

import { CacheService } from '../utils/cacheService';

// 1 hour TTL — long enough that conversational repeat asks within a
// session benefit, short enough that catalog evolution (new content,
// model updates) doesn't surface stale generations indefinitely.
const TTL_MS = 60 * 60 * 1000;

// 500 entries — covers the long-tail of common short food-name queries
// without bounding memory unreasonably (~500 KB at ~1 KB per recipe).
const MAX_SIZE = 500;

export const aiGenRecipeCache = new CacheService({
  ttl: TTL_MS,
  maxSize: MAX_SIZE,
});

/** Normalize a description into a stable cache key. Recipe-ask queries
 *  are already constrained by client-side detectRecipeAsk to short
 *  food-name strings, but case + surrounding whitespace can still vary
 *  ("Grilled chicken" vs " grilled chicken " vs "GRILLED CHICKEN").
 *  Collapsing them onto one key maximizes cache hit rate without
 *  losing semantic distinction.
 *
 *  Version suffix `:v2` (founder 2026-05-20 round 6): cache entries
 *  written before PR #65 stored a recipe with only `imageUrl` (single
 *  string). New entries include `imageUrls: string[]` for the 3-photo
 *  collage. Bump the version when the cached value shape changes so
 *  stale entries can't shortcut around the new logic. */
export function recipeAskCacheKey(description: string): string {
  return `recipe-ask:v2:${description.trim().toLowerCase().replace(/\s+/g, ' ')}`;
}
