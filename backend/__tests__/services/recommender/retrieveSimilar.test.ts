// ROADMAP 4.0 RD2.1 — retrieveSimilar service tests.

jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    recipe: { findUnique: jest.fn(), findMany: jest.fn() },
    cookingLog: { findMany: jest.fn() },
    savedRecipe: { findMany: jest.fn() },
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
const savedRecipeFindMany = (prisma as any).savedRecipe.findMany as jest.Mock;

const emb = (vec: number[]) => Buffer.from(JSON.stringify(vec));

beforeEach(() => {
  findUnique.mockReset();
  findMany.mockReset();
  cookingLogFindMany.mockReset();
  cookingLogFindMany.mockResolvedValue([]);
  savedRecipeFindMany.mockReset();
  savedRecipeFindMany.mockResolvedValue([]);
});

describe('retrieveSimilar (RD2.1)', () => {
  it('returns nearest neighbors first (excluding self)', async () => {
    findUnique.mockResolvedValue({ id: 'anchor', embedding: emb([1, 0, 0]) });
    findMany.mockResolvedValue([
      { id: 'anchor', title: 'A', cuisine: 'Italian', cookTime: 25, imageUrl: null, embedding: emb([1, 0, 0]), ingredients: [], tagsJson: '' },
      { id: 'r1', title: 'R1', cuisine: 'Italian', cookTime: 25, imageUrl: null, embedding: emb([0.9, 0.1, 0]), ingredients: [], tagsJson: '' },
      { id: 'r2', title: 'R2', cuisine: 'Thai', cookTime: 25, imageUrl: null, embedding: emb([0, 1, 0]), ingredients: [], tagsJson: '' },
      { id: 'r3', title: 'R3', cuisine: 'Italian', cookTime: 25, imageUrl: null, embedding: emb([0.95, 0.05, 0]), ingredients: [], tagsJson: '' },
    ]);
    const result = await retrieveSimilar({ anchorRecipeId: 'anchor' });
    // self excluded; r3 (0.95) > r1 (0.9) > r2 (~0)
    expect(result.map((r) => r.id)).toEqual(['r3', 'r1', 'r2']);
  });

  it('honors hard filter — allergen scrub', async () => {
    findUnique.mockResolvedValue({ id: 'anchor', embedding: emb([1, 0]) });
    findMany.mockResolvedValue([
      { id: 'r1', title: 'R1', cuisine: 'Italian', cookTime: 25, imageUrl: null, embedding: emb([0.9, 0.1]), ingredients: [{ text: 'peanuts' }], tagsJson: '' },
      { id: 'r2', title: 'R2', cuisine: 'Italian', cookTime: 25, imageUrl: null, embedding: emb([0.85, 0.15]), ingredients: [{ text: 'tomato' }], tagsJson: '' },
    ]);
    const result = await retrieveSimilar({
      anchorRecipeId: 'anchor',
      hardFilters: { allergens: ['peanut'] },
    });
    expect(result.map((r) => r.id)).toEqual(['r2']);
  });

  it('falls back to same-cuisine top picks when anchor has no embedding but has a cuisine', async () => {
    // Common case: user-imported / AI / forked recipes lack embeddings. Without
    // a fallback the "You might also like" carousel disappears entirely.
    findUnique.mockResolvedValue({
      id: 'anchor', embedding: null, cuisine: 'Italian', cookTime: 20,
      calories: 500, protein: 30, carbs: 50, fat: 20, fiber: 5,
    });
    findMany.mockResolvedValue([
      { id: 'r1', title: 'R1', cuisine: 'Italian', cookTime: 25, imageUrl: null, embedding: null, ingredients: [], tagsJson: '', popularityScore: 80, calories: 500, protein: 30, carbs: 50, fat: 20, fiber: 5 },
      { id: 'r2', title: 'R2', cuisine: 'Italian', cookTime: 20, imageUrl: null, embedding: null, ingredients: [], tagsJson: '', popularityScore: 95, calories: 600, protein: 35, carbs: 60, fat: 22, fiber: 6 },
      { id: 'r3', title: 'R3', cuisine: 'Italian', cookTime: 60, imageUrl: null, embedding: null, ingredients: [], tagsJson: '', popularityScore: null, calories: 200, protein: 10, carbs: 20, fat: 5, fiber: 1 },
    ]);
    // shuffleSeed=1 keeps the test deterministic. With k=3 the pool is
    // size 3*4=12 capped at survivors.length=3, then shuffled — so we
    // assert the SET of returned ids, not the order.
    const result = await retrieveSimilar({ anchorRecipeId: 'anchor', k: 3, shuffleSeed: 1 });
    expect(result.map((r) => r.id).sort()).toEqual(['r1', 'r2', 'r3']);
    // Macros propagate so cards don't render 0g/0cal.
    const r1 = result.find((r) => r.id === 'r1')!;
    expect(r1).toMatchObject({ calories: 500, protein: 30, carbs: 50, fat: 20, fiber: 5 });
    // Match % differentiation: closest macros + same cookTime get the
    // highest score; far-cookTime + far-macros gets a notably lower one.
    const r1Score = result.find((r) => r.id === 'r1')!.score;
    const r3Score = result.find((r) => r.id === 'r3')!.score;
    expect(r1Score).toBeGreaterThan(r3Score + 0.1);
    // Even the worst card stays above the baseline (cuisine match).
    expect(r3Score).toBeGreaterThanOrEqual(0.55);
  });

  it('cuisine fallback varies results across reloads (different seeds → different picks)', async () => {
    findUnique.mockResolvedValue({
      id: 'anchor', embedding: null, cuisine: 'American', cookTime: 20,
      calories: 400, protein: 20, carbs: 40, fat: 15, fiber: 4,
    });
    // 20 recipes, all with cookTime=20 + identical macros so cookTime + macro
    // proximity tie. Without shuffle the same 10 cards (by id sort) would
    // always come back.
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `r${String(i).padStart(2, '0')}`, title: `R${i}`, cuisine: 'American', cookTime: 20,
      imageUrl: null, embedding: null, ingredients: [], tagsJson: '',
      popularityScore: null, calories: 400, protein: 20, carbs: 40, fat: 15, fiber: 4,
    }));
    findMany.mockResolvedValue(many);
    const a = (await retrieveSimilar({ anchorRecipeId: 'anchor', k: 10, shuffleSeed: 1 })).map((r) => r.id);
    const b = (await retrieveSimilar({ anchorRecipeId: 'anchor', k: 10, shuffleSeed: 2 })).map((r) => r.id);
    expect(a).not.toEqual(b);
  });

  it('returns empty when anchor has no embedding and no cuisine', async () => {
    findUnique.mockResolvedValue({ id: 'anchor', embedding: null, cuisine: null });
    const result = await retrieveSimilar({ anchorRecipeId: 'anchor' });
    expect(result).toEqual([]);
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
      ingredients: [], tagsJson: '',
    }));
    findMany.mockResolvedValue(many);
    const result = await retrieveSimilar({ anchorRecipeId: 'anchor', k: 100 });
    expect(result.length).toBeLessThanOrEqual(12);
  });

  it('excludes recently-cooked recipes from the user (default 30d)', async () => {
    findUnique.mockResolvedValue({ id: 'anchor', embedding: emb([1, 0]) });
    findMany.mockResolvedValue([
      { id: 'r1', title: 'R1', cuisine: 'Italian', cookTime: 25, imageUrl: null, embedding: emb([0.9, 0.1]), ingredients: [], tagsJson: '' },
      { id: 'r2', title: 'R2', cuisine: 'Italian', cookTime: 25, imageUrl: null, embedding: emb([0.85, 0.15]), ingredients: [], tagsJson: '' },
    ]);
    cookingLogFindMany.mockResolvedValue([{ recipeId: 'r1' }]);
    const result = await retrieveSimilar({ anchorRecipeId: 'anchor', userId: 'u1' });
    expect(result.map((r) => r.id)).toEqual(['r2']);
  });

  it('excludes recipes the user has already saved (embedding path)', async () => {
    findUnique.mockResolvedValue({ id: 'anchor', embedding: emb([1, 0]), cuisine: 'Italian' });
    findMany.mockResolvedValue([
      { id: 'r1', title: 'R1', cuisine: 'Italian', cookTime: 25, imageUrl: null, embedding: emb([0.9, 0.1]), ingredients: [], tagsJson: '' },
      { id: 'r2', title: 'R2', cuisine: 'Italian', cookTime: 25, imageUrl: null, embedding: emb([0.8, 0.2]), ingredients: [], tagsJson: '' },
    ]);
    savedRecipeFindMany.mockResolvedValue([{ recipeId: 'r1' }]);
    const result = await retrieveSimilar({ anchorRecipeId: 'anchor', userId: 'u1' });
    expect(result.map((r) => r.id)).toEqual(['r2']);
  });

  it('skips dietary tag filter in the cuisine fallback (allergens still enforced)', async () => {
    // The catalog rarely tags recipes with dietary keywords (e.g.
    // "dairy-free"), so applying the same strict tag match used in the
    // embedding path would empty the fallback for any user with a
    // dietary restriction. Allergens remain hard filters for safety.
    findUnique.mockResolvedValue({ id: 'anchor', embedding: null, cuisine: 'American' });
    findMany.mockResolvedValue([
      { id: 'r1', title: 'R1', cuisine: 'American', cookTime: 25, imageUrl: null, embedding: null, ingredients: [{ text: 'tomato' }], tagsJson: '["burger"]', popularityScore: 90 },
      { id: 'r2', title: 'R2', cuisine: 'American', cookTime: 25, imageUrl: null, embedding: null, ingredients: [{ text: 'peanuts' }], tagsJson: null, popularityScore: 80 },
    ]);
    const result = await retrieveSimilar({
      anchorRecipeId: 'anchor',
      hardFilters: { dietaryTags: ['Dairy-Free'], allergens: ['peanut'] },
    });
    // dietary filter dropped → r1 survives; r2 still scrubbed by allergen filter.
    expect(result.map((r) => r.id)).toEqual(['r1']);
  });

  it('excludes user-saved recipes in the cuisine fallback path', async () => {
    findUnique.mockResolvedValue({ id: 'anchor', embedding: null, cuisine: 'Italian' });
    findMany.mockResolvedValue([
      { id: 'r1', title: 'R1', cuisine: 'Italian', cookTime: 25, imageUrl: null, embedding: null, ingredients: [], tagsJson: '', popularityScore: 90 },
      { id: 'r2', title: 'R2', cuisine: 'Italian', cookTime: 25, imageUrl: null, embedding: null, ingredients: [], tagsJson: '', popularityScore: 80 },
    ]);
    savedRecipeFindMany.mockResolvedValue([{ recipeId: 'r1' }]);
    const result = await retrieveSimilar({ anchorRecipeId: 'anchor', userId: 'u1' });
    expect(result.map((r) => r.id)).toEqual(['r2']);
  });

  it('disables recently-cooked exclusion when excludeCookedSinceDays=0', async () => {
    findUnique.mockResolvedValue({ id: 'anchor', embedding: emb([1, 0]) });
    findMany.mockResolvedValue([
      { id: 'r1', title: 'R1', cuisine: 'Italian', cookTime: 25, imageUrl: null, embedding: emb([0.9, 0.1]), ingredients: [], tagsJson: '' },
    ]);
    cookingLogFindMany.mockResolvedValue([{ recipeId: 'r1' }]);
    const result = await retrieveSimilar({
      anchorRecipeId: 'anchor', userId: 'u1', excludeCookedSinceDays: 0,
    });
    expect(result.map((r) => r.id)).toEqual(['r1']);
    expect(cookingLogFindMany).not.toHaveBeenCalled();
  });
});
