// ROADMAP 4.0 TB0 — Embedding store helper.
//
// Encodes/decodes Float32 vectors as raw Bytes for the Recipe.embedding
// column. Float32 (4B) × 64 = 256B per recipe.

import {
  EMBEDDING_DIM,
  encodeEmbedding,
  decodeEmbedding,
  isValidEmbedding,
  cosineSimilarity,
} from '../../../src/services/recommender/embeddingStore';

describe('embeddingStore', () => {
  describe('encodeEmbedding', () => {
    it('produces a 256-byte buffer for a 64-dim vector', () => {
      const vec = Array.from({ length: EMBEDDING_DIM }, (_, i) => i / 100);
      const buf = encodeEmbedding(vec);
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.byteLength).toBe(EMBEDDING_DIM * 4);
    });

    it('throws on wrong dimension', () => {
      expect(() => encodeEmbedding([1, 2, 3])).toThrow(/dim/i);
    });

    it('throws on non-finite entry', () => {
      const vec = Array.from({ length: EMBEDDING_DIM }, () => 0);
      vec[5] = NaN;
      expect(() => encodeEmbedding(vec)).toThrow(/finite/i);
    });
  });

  describe('decodeEmbedding', () => {
    it('round-trips through encode without precision loss beyond float32', () => {
      const vec = Array.from({ length: EMBEDDING_DIM }, (_, i) =>
        Math.sin(i),
      );
      const decoded = decodeEmbedding(encodeEmbedding(vec));
      expect(decoded).not.toBeNull();
      expect(decoded as number[]).toHaveLength(EMBEDDING_DIM);
      for (let i = 0; i < EMBEDDING_DIM; i++) {
        expect((decoded as number[])[i]).toBeCloseTo(vec[i], 5);
      }
    });

    it('returns null for null input', () => {
      expect(decodeEmbedding(null)).toBeNull();
      expect(decodeEmbedding(undefined)).toBeNull();
    });

    it('throws on wrong byte length', () => {
      expect(() => decodeEmbedding(Buffer.from([1, 2, 3, 4]))).toThrow(/dim/i);
    });
  });

  describe('isValidEmbedding', () => {
    it('returns true for a 64-dim finite array', () => {
      const vec = Array.from({ length: EMBEDDING_DIM }, () => 0.1);
      expect(isValidEmbedding(vec)).toBe(true);
    });

    it('returns false for wrong length / non-finite / null', () => {
      expect(isValidEmbedding([1, 2])).toBe(false);
      expect(isValidEmbedding(null)).toBe(false);
      const vec = Array.from({ length: EMBEDDING_DIM }, () => 0);
      vec[0] = Infinity;
      expect(isValidEmbedding(vec)).toBe(false);
    });
  });

  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      const v = Array.from({ length: EMBEDDING_DIM }, (_, i) => i + 1);
      expect(cosineSimilarity(v, v)).toBeCloseTo(1, 6);
    });

    it('returns 0 for zero vector', () => {
      const a = Array.from({ length: EMBEDDING_DIM }, () => 0);
      const b = Array.from({ length: EMBEDDING_DIM }, (_, i) => i + 1);
      expect(cosineSimilarity(a, b)).toBe(0);
    });
  });
});
