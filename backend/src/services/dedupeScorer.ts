// backend/src/services/dedupeScorer.ts
// ROADMAP 4.0 Tier D2.5 — Dedupe scorer.
//
// Flags a recipe whose embedding sits within DUPLICATE_SIM_THRESHOLD
// cosine of any other recipe's embedding. Until TB0 (Recommender
// Bootstrap) lands, callers will pass null/empty embeddings and every
// recipe gets a clean score 5. Once TB0 writes Recipe.embedding, this
// scorer fires for real.

import type { FailureReason } from './recipeQualityScoreService';

export const DUPLICATE_SIM_THRESHOLD = 0.92;

export interface CatalogVector {
  recipeId: string;
  embedding: number[];
}

export interface DedupeScoreInput {
  recipeId: string;
  embedding: number[] | null;
  catalog: CatalogVector[];
}

export interface DedupeScoreResult {
  score: number;
  reasons: FailureReason[];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) {
    throw new Error('cosineSimilarity: zero-length vector');
  }
  if (a.length !== b.length) {
    throw new Error(
      `cosineSimilarity: dimension mismatch (${a.length} vs ${b.length})`,
    );
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}

export function scoreDedupe(input: DedupeScoreInput): DedupeScoreResult {
  if (!input.embedding || input.embedding.length === 0) {
    // No embedding → TB0 hasn't run for this recipe yet. No-op pass.
    return { score: 5, reasons: [] };
  }

  let bestSim = -Infinity;
  let bestId: string | null = null;
  for (const candidate of input.catalog) {
    if (candidate.recipeId === input.recipeId) continue;
    if (!candidate.embedding || candidate.embedding.length === 0) continue;
    const sim = cosineSimilarity(input.embedding, candidate.embedding);
    if (sim > bestSim) {
      bestSim = sim;
      bestId = candidate.recipeId;
    }
  }

  if (bestId !== null && bestSim >= DUPLICATE_SIM_THRESHOLD) {
    return {
      score: 0,
      reasons: [
        {
          axis: 'dedupe',
          code: 'near_duplicate',
          detail: `${bestId} sim=${bestSim.toFixed(3)}`,
        },
      ],
    };
  }
  return { score: 5, reasons: [] };
}
