// ROADMAP 4.0 RD2.1 — retrieveSimilar service tests.

jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    recipe: { findUnique: jest.fn(), findMany: jest.fn() },
    cookingLog: { findMany: jest.fn() },
  },
}));

jest.mock('../../../src/services/recommender/embeddingStore', () => ({
  decodeEmbedding: jest.fn((buf: Buffer) => {
    const arr = JSON.parse(buf.toString());
    return arr;
  }),
  isValidEmbedding: jest.fn((v: number[] | null) => Array.isArray(v) && v.length > 0),
  cosineSimilarity: jest.fn((a: number[], b: number[]) => {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }),
}));

import { prisma } from '../../../src/lib/prisma';
import { retrieveSimilar } from '../../../src/services/recommender/retrieveSimilar';

const findUnique = (prisma as any).recipe.findUnique as jest.Mock;
const findMany = (prisma as any).recipe.findMany as jest.Mock;
const cookingLogFindMany = (prisma as any).cookingLog.findMany as jest.Mock;

const emb = (vec: number[]) => Buffer.from(JSON.stringify(vec));

beforeEach(() => {
  findUnique.mockReset();
  findMany.mockReset();
  cookingLogFindMany.mockReset();
  cookingLogFindMany.mockResolvedValue([]);
});

describe('retrieveSimilar (RD2.1)', () => {
  it('returns nearest neighbors first (excluding self)', async () => {
    findUnique.mockResolvedValue({ id: 'anchor', embedding: emb([1, 0, 0]) });
    findMany.mockResolvedValue([
      { id: 'anchor', title: 'A', cuisine: 'Italian', cookTime: 25, imageUrl: null, embedding: emb([1, 0, 0]), ingredients: [], tagsString: '' },
      { id: 'r1', title: 'R1', cuisine: 'Italian', cookTime: 25, imageUrl: null, embedding: emb([0.9, 0.1, 0]), ingredients: [], tagsString: '' },
      { id: 'r2', title: 'R2', cuisine: 'Thai', cookTime: 25, imageUrl: null, embedding: emb([0, 1, 0]), ingredients: [], tagsString: '' },
      { id: 'r3', title: 'R3', cuisine: 'Italian', cookTime: 25, imageUrl: null, embedding: emb([0.95, 0.05, 0]), ingredients: [], tagsString: '' },
    ]);
    const result = await retrieveSimilar({ anchorRecipeId: 'anchor' });
    // self excluded; r3 (0.95) > r1 (0.9) > r2 (~0)
    expect(result.map((r) => r.id)).toEqual(['r3', 'r1', 'r2']);
  });

  it('honors hard filter — allergen scrub', async () => {
    findUnique.mockResolvedValue({ id: 'anchor', embedding: emb([1, 0]) });
    findMany.mockResolvedValue([
      { id: 'r1', title: 'R1', cuisine: 'Italian', cookTime: 25, imageUrl: null, embedding: emb([0.9, 0.1]), ingredients: [{ text: 'peanuts' }], tagsString: '' },
      { id: 'r2', title: 'R2', cuisine: 'Italian', cookTime: 25, imageUrl: null, embedding: emb([0.85, 0.15]), ingredients: [{ text: 'tomato' }], tagsString: '' },
    ]);
    const result = await retrieveSimilar({
      anchorRecipeId: 'anchor',
      hardFilters: { allergens: ['peanut'] },
    });
    expect(result.map((r) => r.id)).toEqual(['r2']);
  });

  it('returns empty when anchor has no embedding (graceful)', async () => {
    findUnique.mockResolvedValue({ id: 'anchor', embedding: null });
    const result = await retrieveSimilar({ anchorRecipeId: 'anchor' });
    expect(result).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('returns empty when anchor not found', async () => {
    findUnique.mockResolvedValue(null);
    const result = await retrieveSimilar({ anchorRecipeId: 'missing' });
    expect(result).toEqual([]);
  });

  it('caps results at MAX_K', async () => {
    findUnique.mockResolvedValue({ id: 'anchor', embedding: emb([1, 0]) });
    const many = Array.from({ length: 30 }, (_, i) => ({
      id: `r${i}`, title: `R${i}`, cuisine: 'Italian', cookTime: 25,
      imageUrl: null, embedding: emb([0.9 - i * 0.01, 0.1]),
      ingredients: [], tagsString: '',
    }));
    findMany.mockResolvedValue(many);
    const result = await retrieveSimilar({ anchorRecipeId: 'anchor', k: 100 });
    expect(result.length).toBeLessThanOrEqual(12);
  });

  it('excludes recently-cooked recipes from the user (default 30d)', async () => {
    findUnique.mockResolvedValue({ id: 'anchor', embedding: emb([1, 0]) });
    findMany.mockResolvedValue([
      { id: 'r1', title: 'R1', cuisine: 'Italian', cookTime: 25, imageUrl: null, embedding: emb([0.9, 0.1]), ingredients: [], tagsString: '' },
      { id: 'r2', title: 'R2', cuisine: 'Italian', cookTime: 25, imageUrl: null, embedding: emb([0.85, 0.15]), ingredients: [], tagsString: '' },
    ]);
    cookingLogFindMany.mockResolvedValue([{ recipeId: 'r1' }]);
    const result = await retrieveSimilar({ anchorRecipeId: 'anchor', userId: 'u1' });
    expect(result.map((r) => r.id)).toEqual(['r2']);
  });

  it('disables recently-cooked exclusion when excludeCookedSinceDays=0', async () => {
    findUnique.mockResolvedValue({ id: 'anchor', embedding: emb([1, 0]) });
    findMany.mockResolvedValue([
      { id: 'r1', title: 'R1', cuisine: 'Italian', cookTime: 25, imageUrl: null, embedding: emb([0.9, 0.1]), ingredients: [], tagsString: '' },
    ]);
    cookingLogFindMany.mockResolvedValue([{ recipeId: 'r1' }]);
    const result = await retrieveSimilar({
      anchorRecipeId: 'anchor', userId: 'u1', excludeCookedSinceDays: 0,
    });
    expect(result.map((r) => r.id)).toEqual(['r1']);
    expect(cookingLogFindMany).not.toHaveBeenCalled();
  });
});
