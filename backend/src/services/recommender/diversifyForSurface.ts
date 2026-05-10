// backend/src/services/recommender/diversifyForSurface.ts
// Tier TB6.2 — surface-aware diversifier wrapper.
//
// Picks MMR (TB6.1) when any item has a usable embedding, falls through
// to the title-signature stopgap (`utils/diversifyResults.ts`) otherwise.
// Reads per-surface config from TB6.4 (lambda / k / simThreshold).
//
// Today the catalog `Recipe.embedding` field is largely null, so most
// callers fall through to title-signature — same behavior as the v1
// stopgap. As embedding coverage rises (TB6.3 gate ≥95%), MMR takes
// over automatically.

import {
  diversifyByEmbedding,
  type DiversifyByEmbeddingItem,
} from './diversifyByEmbedding';
import { getDiversityConfig, type DiversitySurface } from './diversityConfig';

export interface DiversifyForSurfaceItem extends DiversifyByEmbeddingItem {}

/**
 * Diversify a sorted ranked list using the per-surface MMR config.
 * Length is preserved; no items are dropped.
 */
export function diversifyForSurface<T extends DiversifyForSurfaceItem>(
  ranked: readonly T[],
  surface: DiversitySurface,
): T[] {
  if (ranked.length <= 1) return [...ranked];
  const cfg = getDiversityConfig(surface);
  return diversifyByEmbedding(ranked, {
    lambda: cfg.lambda,
    k: cfg.k,
    simThreshold: cfg.simThreshold,
  });
}
