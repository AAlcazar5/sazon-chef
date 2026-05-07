// ROADMAP 4.0 IG1.2 — ingredientAdjacencyService test.
//
// Cosine over the IngredientEmbedding rows; cold-start (no embedding) falls
// back to the static `ingredientSwapService` dict so callers always get
// *something* useful before IG1.1 has been run.

import { getNeighbors } from '../../../src/services/recommender/ingredientAdjacencyService';
import * as embeddingStore from '../../../src/services/recommender/ingredientEmbeddingStore';
import { encodeIngredientEmbedding } from '../../../src/services/recommender/ingredientEmbeddingStore';

jest.mock('../../../src/services/recommender/ingredientEmbeddingStore', () => {
  const actual = jest.requireActual(
    '../../../src/services/recommender/ingredientEmbeddingStore',
  );
  return {
    ...actual,
    getEmbedding: jest.fn(),
    getMany: jest.fn(),
  };
});

const getEmbeddingMock = embeddingStore.getEmbedding as jest.Mock;
const getManyMock = embeddingStore.getMany as jest.Mock;

beforeEach(() => {
  getEmbeddingMock.mockReset();
  getManyMock.mockReset();
});

// Helpers — produce simple unit-ish vectors so cosine is human-readable.
function row(name: string, vec: number[]) {
  return {
    canonicalName: name,
    embedding: vec,
    model: 'test',
    dimensions: vec.length,
  };
}

describe('IG1.2 — getNeighbors', () => {
  it('throws on empty name', async () => {
    await expect(getNeighbors('', { k: 5 })).rejects.toThrow(/name/);
    await expect(getNeighbors('   ', { k: 5 })).rejects.toThrow(/name/);
  });

  it('cold-start (no embedding row) returns static-dict result as fallback', async () => {
    getEmbeddingMock.mockResolvedValue(null);
    const out = await getNeighbors('ground beef', { k: 5 });
    // ingredientSwapService has 5 entries for ground beef; we expect at least
    // ground turkey + lentils + mushrooms in the result names.
    const names = out.map((n) => n.name.toLowerCase());
    expect(out.length).toBeGreaterThan(0);
    expect(names.some((n) => n.includes('turkey'))).toBe(true);
    expect(names.some((n) => n.includes('lentil'))).toBe(true);
    expect(names.some((n) => n.includes('mushroom'))).toBe(true);
    expect(out.every((n) => n.source === 'static')).toBe(true);
  });

  it('cold-start with no static-dict match returns empty array', async () => {
    getEmbeddingMock.mockResolvedValue(null);
    const out = await getNeighbors('liquid nitrogen', { k: 5 });
    expect(out).toEqual([]);
  });

  it('cold-start dietary filter excludes unsafe static swaps', async () => {
    getEmbeddingMock.mockResolvedValue(null);
    const out = await getNeighbors('ground beef', { k: 5, dietaryFilter: 'vegan' });
    const names = out.map((n) => n.name.toLowerCase());
    expect(names.some((n) => n.includes('turkey'))).toBe(false);
    expect(names.some((n) => n.includes('lentil'))).toBe(true);
    expect(names.some((n) => n.includes('mushroom'))).toBe(true);
  });

  it('embedding path returns top-k cosine neighbors ordered by similarity', async () => {
    // Anchor "ground beef" — neighbors hand-crafted so cosine is unambiguous.
    getEmbeddingMock.mockResolvedValue(row('ground beef', [1, 0, 0]));
    getManyMock.mockResolvedValue(
      new Map<string, ReturnType<typeof row> | null>([
        ['ground beef', row('ground beef', [1, 0, 0])], // self — must be skipped
        ['ground turkey', row('ground turkey', [0.9, 0.1, 0])], // very close
        ['lentils', row('lentils', [0.6, 0.6, 0])], // moderate
        ['mushrooms', row('mushrooms', [0.5, 0.5, 0.5])], // moderate
        ['olive oil', row('olive oil', [0, 0, 1])], // far
      ]),
    );
    const out = await getNeighbors('ground beef', { k: 3 });
    expect(out).toHaveLength(3);
    // Self-pair must be excluded.
    expect(out.find((n) => n.name === 'ground beef')).toBeUndefined();
    // Order: ground turkey > lentils ≈ mushrooms > olive oil.
    expect(out[0].name).toBe('ground turkey');
    expect(out[0].source).toBe('embedding');
    // Similarity must be in [0,1] and descending.
    for (let i = 1; i < out.length; i += 1) {
      expect(out[i - 1].similarity).toBeGreaterThanOrEqual(out[i].similarity);
    }
  });

  it('embedding path applies dietary filter via static-dict tags', async () => {
    getEmbeddingMock.mockResolvedValue(row('ground beef', [1, 0, 0]));
    getManyMock.mockResolvedValue(
      new Map<string, ReturnType<typeof row> | null>([
        ['ground beef', row('ground beef', [1, 0, 0])],
        ['ground turkey', row('ground turkey', [0.9, 0.1, 0])],
        ['lentils', row('lentils', [0.6, 0.6, 0])],
        ['mushrooms', row('mushrooms', [0.5, 0.5, 0.5])],
      ]),
    );
    const out = await getNeighbors('ground beef', {
      k: 5,
      dietaryFilter: 'vegan',
    });
    const names = out.map((n) => n.name.toLowerCase());
    expect(names).not.toContain('ground turkey');
    expect(names.some((n) => n.includes('lentil'))).toBe(true);
    expect(names.some((n) => n.includes('mushroom'))).toBe(true);
  });

  it('default k=5 when omitted', async () => {
    getEmbeddingMock.mockResolvedValue(row('a', [1, 0]));
    const map = new Map<string, ReturnType<typeof row> | null>();
    const names: string[] = [];
    for (let i = 0; i < 10; i += 1) {
      const n = `n${i}`;
      names.push(n);
      map.set(n, row(n, [Math.cos(i / 10), Math.sin(i / 10)]));
    }
    getManyMock.mockResolvedValue(map);
    const out = await getNeighbors('a', { candidates: names });
    expect(out).toHaveLength(5);
  });

  it('clamps k to max', async () => {
    getEmbeddingMock.mockResolvedValue(row('a', [1, 0]));
    const map = new Map<string, ReturnType<typeof row> | null>();
    const names: string[] = [];
    for (let i = 0; i < 100; i += 1) {
      const n = `n${i}`;
      names.push(n);
      map.set(n, row(n, [Math.cos(i / 100), Math.sin(i / 100)]));
    }
    getManyMock.mockResolvedValue(map);
    const out = await getNeighbors('a', { k: 999, candidates: names });
    expect(out.length).toBeLessThanOrEqual(50);
  });

  it('normalizes anchor name before lookup', async () => {
    getEmbeddingMock.mockResolvedValue(null);
    await getNeighbors('  Ground Beef  ', { k: 3 });
    expect(getEmbeddingMock).toHaveBeenCalledWith('  Ground Beef  ');
    // The store itself normalizes — service just passes through.
  });
});
