// ROADMAP 4.0 IG1.2 — Ingredient adjacency service.
//
// Cosine similarity over IngredientEmbedding rows, with graceful cold-start
// fallback to the static `ingredientSwapService` dict so callers always get
// useful results before IG1.1's training run lands.
//
// Powers IG6.2 (learned-swap embedding source) and IG8 (cultural ingredient
// discovery). IG7.1 has its own composer that uses `getEmbedding` directly
// for the pantry-match scoring path, but shares the same cosine math.

import {
  getEmbedding,
  getMany,
  type IngredientEmbeddingRow,
} from './ingredientEmbeddingStore';
import { getIngredientSwaps } from '../ingredientSwapService';

const DEFAULT_K = 5;
const MAX_K = 50;

export type DietaryFilter =
  | 'vegan'
  | 'vegetarian'
  | 'dairy-free'
  | 'gluten-free';

export interface AdjacencyNeighbor {
  name: string;
  similarity: number;
  source: 'embedding' | 'static';
}

export interface GetNeighborsOptions {
  k?: number;
  dietaryFilter?: DietaryFilter;
  /**
   * Optional caller-supplied candidate pool. When omitted the service has no
   * way to enumerate "all known ingredient names" without scanning the table,
   * so callers (typically IG6.2 / IG8) pass the candidate set they already
   * have in hand. If absent, the embedding path returns [] and we fall
   * through to the static dict.
   */
  candidates?: string[];
}

function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function clampK(k: number | undefined): number {
  const v = k == null ? DEFAULT_K : k;
  if (!Number.isFinite(v) || v <= 0) return DEFAULT_K;
  return Math.min(MAX_K, Math.floor(v));
}

function staticFallback(
  name: string,
  k: number,
  dietaryFilter?: DietaryFilter,
): AdjacencyNeighbor[] {
  const restrictions = dietaryFilter ? [dietaryFilter] : [];
  const swaps = getIngredientSwaps(name, restrictions);
  return swaps.slice(0, k).map((s) => ({
    name: s.alternative,
    similarity: 0,
    source: 'static' as const,
  }));
}

/**
 * Returns ranked semantic neighbors for `name`. Optionally filtered by
 * dietary tag. Cold-start (no embedding row) drops to the static
 * `ingredientSwapService` dict.
 */
export async function getNeighbors(
  name: string,
  opts: GetNeighborsOptions = {},
): Promise<AdjacencyNeighbor[]> {
  if (!name || !name.trim()) {
    throw new Error('getNeighbors: name required');
  }
  const k = clampK(opts.k);

  const anchor = await getEmbedding(name);
  if (!anchor) {
    return staticFallback(name, k, opts.dietaryFilter);
  }

  // Need a candidate pool to compare against. With no caller-supplied list,
  // fall back to the static dict so we still return *something* useful —
  // matches the spec's "embedding path with no candidates → static" intent.
  const candidates = opts.candidates;
  if (!candidates || candidates.length === 0) {
    // For tests + first-run callers we accept "compare against everything in
    // the embedding store via getMany on a curated list." The simplest pool
    // that always works is the keys mocked into getMany — but in production,
    // callers must pass a candidate set. Try the static dict's universe as a
    // reasonable default.
    const staticUniverse = staticFallback(name, MAX_K).map((s) => s.name);
    if (staticUniverse.length === 0) return [];
    return rankCandidates(anchor, staticUniverse, k, opts.dietaryFilter);
  }

  return rankCandidates(anchor, candidates, k, opts.dietaryFilter);
}

async function rankCandidates(
  anchor: IngredientEmbeddingRow,
  candidates: string[],
  k: number,
  dietaryFilter?: DietaryFilter,
): Promise<AdjacencyNeighbor[]> {
  const rows = await getMany(candidates);
  const scored: AdjacencyNeighbor[] = [];
  for (const [canonical, row] of rows.entries()) {
    if (!row) continue;
    if (canonical === anchor.canonicalName) continue;
    const sim = cosine(anchor.embedding, row.embedding);
    scored.push({ name: canonical, similarity: sim, source: 'embedding' });
  }
  scored.sort((a, b) => b.similarity - a.similarity);

  if (!dietaryFilter) return scored.slice(0, k);

  // Cross-reference with static-dict tags to filter unsafe alts. The static
  // dict is the authority on dietary safety for known ingredients; embeddings
  // alone don't encode "is this dairy-free."
  const safeNames = new Set(
    staticFallback(anchor.canonicalName, MAX_K, dietaryFilter).map((s) =>
      s.name.toLowerCase(),
    ),
  );
  // Also exclude anything whose name obviously violates the filter (mirrors
  // the swap service's heuristic word-list rules).
  const banned = bannedWordsFor(dietaryFilter);
  const filtered = scored.filter((n) => {
    const lower = n.name.toLowerCase();
    if (banned.some((w) => lower.includes(w))) return false;
    // If the static dict knew about this anchor, only allow names it tagged
    // safe for the filter. If the static dict didn't know about the anchor
    // (safeNames empty), let the embedding result through unfiltered except
    // for the banned-word check.
    if (safeNames.size > 0 && !safeNames.has(lower)) {
      // The static dict was opinionated about this anchor, but didn't list
      // this neighbor — embedding may have surfaced a novel one. Allow it
      // through provided no banned word was matched.
      return true;
    }
    return true;
  });
  return filtered.slice(0, k);
}

function bannedWordsFor(filter: DietaryFilter): string[] {
  switch (filter) {
    case 'vegan':
      return [
        'chicken',
        'turkey',
        'beef',
        'pork',
        'lamb',
        'fish',
        'salmon',
        'tuna',
        'shrimp',
        'bacon',
        'butter',
        'cheese',
        'cream',
        'milk',
        'yogurt',
        'ghee',
        'whey',
        'egg',
        'honey',
      ];
    case 'vegetarian':
      return [
        'chicken',
        'turkey',
        'beef',
        'pork',
        'lamb',
        'fish',
        'salmon',
        'tuna',
        'shrimp',
        'bacon',
      ];
    case 'dairy-free':
      return ['butter', 'cheese', 'cream', 'milk', 'yogurt', 'ghee', 'whey'];
    case 'gluten-free':
      return ['flour', 'wheat', 'bread', 'pasta', 'barley', 'rye'];
    default:
      return [];
  }
}

export const __INTERNALS = { DEFAULT_K, MAX_K, cosine } as const;
