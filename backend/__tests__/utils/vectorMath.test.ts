import { cosineSimilarity } from '../../src/utils/vectorMath';

describe('cosineSimilarity', () => {
  it('returns 1 for identical unit vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('returns -1 for anti-parallel vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it('handles non-unit vectors by normalizing', () => {
    expect(cosineSimilarity([2, 0], [3, 0])).toBeCloseTo(1);
  });

  it('returns 0 when either vector is empty', () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([], [1, 2])).toBe(0);
    expect(cosineSimilarity([1, 2], [])).toBe(0);
  });

  it('returns 0 when either vector has zero magnitude', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([1, 2, 3], [0, 0, 0])).toBe(0);
  });

  it('throws on dimension mismatch', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(/dimension mismatch/);
  });

  it('handles realistic embedding vectors', () => {
    const a = [0.1, 0.2, 0.3, 0.4];
    const b = [0.2, 0.4, 0.6, 0.8];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1);
  });
});
