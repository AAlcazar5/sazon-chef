// backend/__tests__/services/dedupeScorer.test.ts
// ROADMAP 4.0 Tier D2.5 — Dedupe scorer.
//
// Embeddings come from TB0 (Recommender Bootstrap, Tier T-bis). Until TB0
// ships, callers will pass empty/missing embeddings and every recipe gets
// score 5 (no near-duplicate detected). The structure ships now so the D2
// orchestrator has a real axis to call.

import {
  scoreDedupe,
  cosineSimilarity,
  DUPLICATE_SIM_THRESHOLD,
} from '../../src/services/dedupeScorer';

describe('cosineSimilarity (pure)', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0, 6);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [-1, -2, -3])).toBeCloseTo(-1, 6);
  });

  it('returns 0 for zero-length vector (cold-start safe)', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('throws on dimension mismatch', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow();
  });
});

describe('scoreDedupe', () => {
  const baseEmbedding = [1, 0, 0, 0];

  it('returns 5 + no reasons when no other recipe is similar', () => {
    const r = scoreDedupe({
      recipeId: 'r1',
      embedding: baseEmbedding,
      catalog: [
        { recipeId: 'r2', embedding: [0, 1, 0, 0] },
        { recipeId: 'r3', embedding: [0, 0, 1, 0] },
      ],
    });
    expect(r.score).toBe(5);
    expect(r.reasons).toEqual([]);
  });

  it('returns 5 when called with no candidates (TB0 not yet shipped)', () => {
    const r = scoreDedupe({
      recipeId: 'r1',
      embedding: null,
      catalog: [],
    });
    expect(r.score).toBe(5);
  });

  it('flags a recipe as duplicate when sim ≥ threshold to another', () => {
    expect(DUPLICATE_SIM_THRESHOLD).toBeGreaterThan(0.9);
    const r = scoreDedupe({
      recipeId: 'r1',
      embedding: baseEmbedding,
      catalog: [
        { recipeId: 'r99', embedding: [0.999, 0.01, 0.01, 0.01] },
      ],
    });
    expect(r.score).toBe(0);
    expect(r.reasons.some((x) => x.code === 'near_duplicate')).toBe(true);
    expect(
      r.reasons.find((x) => x.code === 'near_duplicate')?.detail,
    ).toContain('r99');
  });

  it('skips self-comparison even when same id appears in catalog', () => {
    const r = scoreDedupe({
      recipeId: 'r1',
      embedding: baseEmbedding,
      catalog: [{ recipeId: 'r1', embedding: baseEmbedding }],
    });
    expect(r.score).toBe(5);
  });

  it('returns 5 + no reason when this recipe has no embedding (TB0 missing)', () => {
    const r = scoreDedupe({
      recipeId: 'r1',
      embedding: null,
      catalog: [{ recipeId: 'r2', embedding: baseEmbedding }],
    });
    expect(r.score).toBe(5);
  });

  it('reports the highest-similarity duplicate when multiple cross threshold', () => {
    const r = scoreDedupe({
      recipeId: 'r1',
      embedding: [1, 0, 0, 0],
      catalog: [
        { recipeId: 'r2', embedding: [0.95, 0.05, 0, 0] },
        { recipeId: 'r3', embedding: [0.999, 0.001, 0, 0] }, // closer
      ],
    });
    expect(r.score).toBe(0);
    expect(
      r.reasons.find((x) => x.code === 'near_duplicate')?.detail,
    ).toContain('r3');
  });
});
