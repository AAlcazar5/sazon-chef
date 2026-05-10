// backend/src/services/recommender/diversifyByEmbedding.ts
// Tier TB6.1 — Embedding-cosine MMR diversifier.
//
// Replaces the title-signature stopgap in `utils/diversifyResults.ts`
// for catalog entries with populated `Recipe.embedding`. Greedy MMR
// over the input ranked list:
//
//   MMR(d) = λ · rel(d) − (1 − λ) · max_{dᵢ ∈ emitted-last-K} sim(d, dᵢ)
//
// Plus a hard "skip if cosine ≥ simThreshold to any of last K" guard that
// blocks the next pick from being an adjacent near-twin. When *every*
// remaining candidate violates the guard, we emit the highest-relevance
// one anyway — diversification never drops a recipe.
//
// Items with null/empty embeddings degrade gracefully: they're scored as
// non-similar (max-sim = 0) and the entire output passes through the
// existing title-signature diversifier as a last-mile guard, so this
// service never *worsens* behavior versus the v1 stopgap.

import { cosineSimilarity } from '../../utils/vectorMath';
import { DUPLICATE_SIM_THRESHOLD } from '../dedupeScorer';
import { diversifyByTitleSignature } from '../../utils/diversifyResults';

export interface DiversifyByEmbeddingItem {
  id?: string;
  title?: string | null;
  embedding?: number[] | null;
  /** Optional relevance score. When omitted, derived from rank position
   *  (1.0 for index 0, 0.0 for the last item). */
  score?: number;
}

export interface DiversifyByEmbeddingOptions {
  /** MMR tradeoff. 1.0 = pure relevance, 0.0 = pure spread. Default 0.7. */
  lambda?: number;
  /** Lookback window for the max-similarity term. Default 2. */
  k?: number;
  /** Hard-skip threshold. Default DUPLICATE_SIM_THRESHOLD (0.92). */
  simThreshold?: number;
}

const DEFAULT_LAMBDA = 0.7;
const DEFAULT_K = 2;

function hasUsableEmbedding(item: DiversifyByEmbeddingItem): boolean {
  return Array.isArray(item.embedding) && item.embedding.length > 0;
}

function safeCosine(a: number[] | null | undefined, b: number[] | null | undefined): number {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  if (a.length !== b.length) return 0; // dim mismatch — treat as unrelated
  return cosineSimilarity(a, b);
}

/**
 * Diversify a ranked list using embedding cosine + MMR.
 *
 * @param ranked  Pre-sorted list (highest-relevance first).
 * @param options lambda / k / simThreshold knobs.
 * @returns Re-ordered list with `out.length === ranked.length` always.
 */
export function diversifyByEmbedding<T extends DiversifyByEmbeddingItem>(
  ranked: readonly T[],
  options: DiversifyByEmbeddingOptions = {},
): T[] {
  if (ranked.length === 0) return [];
  if (ranked.length === 1) return [ranked[0]];

  const lambda = options.lambda ?? DEFAULT_LAMBDA;
  const k = Math.max(1, options.k ?? DEFAULT_K);
  const simThreshold = options.simThreshold ?? DUPLICATE_SIM_THRESHOLD;

  const anyEmbedding = ranked.some(hasUsableEmbedding);
  if (!anyEmbedding) {
    // No embeddings anywhere → degrade to the title-signature stopgap.
    return diversifyByTitleSignature([...ranked]);
  }

  // Derive relevance scores. Explicit `score` wins; else use rank position.
  const total = ranked.length;
  const relevance = (item: T, idx: number): number => {
    if (typeof item.score === 'number' && Number.isFinite(item.score)) {
      return item.score;
    }
    return 1 - idx / total;
  };

  type Entry = { item: T; originalIdx: number; relevance: number };
  const remaining: Entry[] = ranked.map((item, idx) => ({
    item,
    originalIdx: idx,
    relevance: relevance(item, idx),
  }));

  const emitted: Entry[] = [];

  while (remaining.length > 0) {
    const lookback = emitted.slice(-k);

    let bestIdx = -1;
    let bestMmr = -Infinity;
    let bestEligibleIdx = -1;
    let bestEligibleMmr = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      let maxSim = 0;
      let hardSkip = false;

      const candEmb = cand.item.embedding;
      if (hasUsableEmbedding(cand.item)) {
        for (const prev of lookback) {
          const sim = safeCosine(candEmb as number[], prev.item.embedding);
          if (sim > maxSim) maxSim = sim;
          if (sim >= simThreshold) {
            hardSkip = true;
            // Don't break — we still need maxSim for the fallback ordering.
          }
        }
      }

      const mmr = lambda * cand.relevance - (1 - lambda) * maxSim;

      // Track best across all (for fallback when every candidate hard-skips).
      if (
        mmr > bestMmr ||
        (mmr === bestMmr && cand.originalIdx < (remaining[bestIdx]?.originalIdx ?? Infinity))
      ) {
        bestMmr = mmr;
        bestIdx = i;
      }

      // Track best eligible (passes hard skip).
      if (!hardSkip) {
        if (
          mmr > bestEligibleMmr ||
          (mmr === bestEligibleMmr &&
            cand.originalIdx < (remaining[bestEligibleIdx]?.originalIdx ?? Infinity))
        ) {
          bestEligibleMmr = mmr;
          bestEligibleIdx = i;
        }
      }
    }

    const pickIdx = bestEligibleIdx !== -1 ? bestEligibleIdx : bestIdx;
    emitted.push(remaining[pickIdx]);
    remaining.splice(pickIdx, 1);
  }

  return emitted.map((e) => e.item);
}
