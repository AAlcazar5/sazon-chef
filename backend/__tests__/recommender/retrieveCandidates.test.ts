// ROADMAP 4.0 TB1.2 — Top-K retrieval test.

import { prisma } from '../../src/lib/prisma';
import {
  retrieveCandidates,
  RetrievalContext,
} from '../../src/services/recommender/retrieveCandidates';
import {
  EMBEDDING_DIM,
  encodeEmbedding,
} from '../../src/services/recommender/embeddingStore';

type Mock = jest.Mock;

function vec(...values: number[]): number[] {
  const out = new Array(EMBEDDING_DIM).fill(0);
  for (let i = 0; i < values.length && i < EMBEDDING_DIM; i++) {
    out[i] = values[i];
  }
  return out;
}

function mkRecipe(
  id: string,
  embedding: number[],
  extras: Partial<{
    cuisine: string;
    cookTime: number;
    ingredientNames: string[];
    dietaryTags: string[];
  }> = {},
) {
  return {
    id,
    cuisine: extras.cuisine ?? 'italian',
    canonicalCuisine: extras.cuisine ?? 'italian',
    cookTime: extras.cookTime ?? 30,
    embedding: encodeEmbedding(embedding),
    deletedAt: null,
    ingredients: (extras.ingredientNames ?? ['pasta']).map((text) => ({
      text,
    })),
  };
}

const findMany = prisma.recipe.findMany as Mock;

describe('retrieveCandidates (TB1.2)', () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it('returns top-K by cosine similarity to context vector', async () => {
    const target = vec(1, 0, 0, 0);
    const close = vec(0.9, 0.1, 0, 0);
    const far = vec(0, 1, 0, 0);
    findMany.mockResolvedValue([
      mkRecipe('r-target', target),
      mkRecipe('r-close', close),
      mkRecipe('r-far', far),
    ]);

    const ctx: RetrievalContext = {
      userId: 'u1',
      contextVector: target,
      hardFilters: {
        allergens: [],
        dietaryTags: [],
        maxCookTime: null,
        pantryItems: [],
        minPantryCoverage: 0,
      },
    };
    const result = await retrieveCandidates({ ...ctx, k: 2 });
    expect(result.recipeIds).toEqual(['r-target', 'r-close']);
    expect(result.scores[0]).toBeGreaterThan(result.scores[1]);
  });

  it('hard filter eliminates allergen-containing recipes', async () => {
    findMany.mockResolvedValue([
      mkRecipe('r1', vec(1, 0), { ingredientNames: ['peanut butter', 'flour'] }),
      mkRecipe('r2', vec(1, 0), { ingredientNames: ['flour', 'sugar'] }),
    ]);
    const result = await retrieveCandidates({
      userId: 'u1',
      contextVector: vec(1, 0),
      hardFilters: {
        allergens: ['peanut'],
        dietaryTags: [],
        maxCookTime: null,
        pantryItems: [],
        minPantryCoverage: 0,
      },
      k: 10,
    });
    expect(result.recipeIds).toEqual(['r2']);
  });

  it('hard filter eliminates recipes over max cook time', async () => {
    findMany.mockResolvedValue([
      mkRecipe('quick', vec(1, 0), { cookTime: 15 }),
      mkRecipe('slow', vec(1, 0), { cookTime: 90 }),
    ]);
    const result = await retrieveCandidates({
      userId: 'u1',
      contextVector: vec(1, 0),
      hardFilters: {
        allergens: [],
        dietaryTags: [],
        maxCookTime: 30,
        pantryItems: [],
        minPantryCoverage: 0,
      },
      k: 10,
    });
    expect(result.recipeIds).toEqual(['quick']);
  });

  it('returns fewer than K when filters leave fewer survivors', async () => {
    findMany.mockResolvedValue([
      mkRecipe('r1', vec(1, 0), { cookTime: 15 }),
    ]);
    const result = await retrieveCandidates({
      userId: 'u1',
      contextVector: vec(1, 0),
      hardFilters: {
        allergens: [],
        dietaryTags: [],
        maxCookTime: 60,
        pantryItems: [],
        minPantryCoverage: 0,
      },
      k: 50,
    });
    expect(result.recipeIds).toHaveLength(1);
  });

  it('is deterministic given fixed user state (same call → same order)', async () => {
    const recipes = Array.from({ length: 10 }, (_, i) =>
      mkRecipe(`r${i}`, vec(Math.cos(i * 0.7), Math.sin(i * 0.7))),
    );
    findMany.mockResolvedValue(recipes);
    const ctx: RetrievalContext = {
      userId: 'u1',
      contextVector: vec(1, 0),
      hardFilters: {
        allergens: [],
        dietaryTags: [],
        maxCookTime: null,
        pantryItems: [],
        minPantryCoverage: 0,
      },
    };
    const a = await retrieveCandidates({ ...ctx, k: 5 });
    const b = await retrieveCandidates({ ...ctx, k: 5 });
    expect(a.recipeIds).toEqual(b.recipeIds);
  });

  it('completes under 100ms on a 1500-recipe synthetic catalog', async () => {
    const corpus = Array.from({ length: 1500 }, (_, i) => {
      const v = vec(Math.cos(i * 0.01), Math.sin(i * 0.01));
      return mkRecipe(`r${i}`, v);
    });
    findMany.mockResolvedValue(corpus);
    const start = Date.now();
    await retrieveCandidates({
      userId: 'u1',
      contextVector: vec(1, 0),
      hardFilters: {
        allergens: [],
        dietaryTags: [],
        maxCookTime: null,
        pantryItems: [],
        minPantryCoverage: 0,
      },
      k: 50,
    });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it('skips recipes without an embedding', async () => {
    findMany.mockResolvedValue([
      mkRecipe('with', vec(1, 0)),
      { ...mkRecipe('without', vec(1, 0)), embedding: null },
    ]);
    const result = await retrieveCandidates({
      userId: 'u1',
      contextVector: vec(1, 0),
      hardFilters: {
        allergens: [],
        dietaryTags: [],
        maxCookTime: null,
        pantryItems: [],
        minPantryCoverage: 0,
      },
      k: 10,
    });
    expect(result.recipeIds).toEqual(['with']);
  });
});
