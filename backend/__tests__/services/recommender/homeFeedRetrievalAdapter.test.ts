// ROADMAP 4.0 TB1.3 — Home-feed retrieval adapter test.

import { prisma } from '../../../src/lib/prisma';
import { resolveRetrievalCandidates } from '../../../src/services/recommender/homeFeedRetrievalAdapter';
import {
  EMBEDDING_DIM,
  encodeEmbedding,
} from '../../../src/services/recommender/embeddingStore';

type Mock = jest.Mock;

const cookingLogFindMany = jest.fn();
(prisma as any).cookingLog = {
  ...((prisma as any).cookingLog ?? {}),
  findMany: cookingLogFindMany,
};
(prisma as any).leftoverInventory = {
  ...((prisma as any).leftoverInventory ?? {}),
  findMany: jest.fn().mockResolvedValue([]),
};

function vec(...values: number[]): number[] {
  const out = new Array(EMBEDDING_DIM).fill(0);
  for (let i = 0; i < values.length && i < EMBEDDING_DIM; i++) {
    out[i] = values[i];
  }
  return out;
}

describe('resolveRetrievalCandidates (TB1.3)', () => {
  beforeEach(() => {
    cookingLogFindMany.mockReset();
    (prisma.recipe.findMany as Mock).mockReset();
  });

  it('returns null (skip retrieval) when feature flag is off', async () => {
    const result = await resolveRetrievalCandidates({
      userId: 'u1',
      enabled: false,
    });
    expect(result).toBeNull();
  });

  it('returns null when user has no cook history (cold start)', async () => {
    cookingLogFindMany.mockResolvedValue([]);
    (prisma.recipe.findMany as Mock).mockResolvedValue([]);
    const result = await resolveRetrievalCandidates({
      userId: 'u1',
      enabled: true,
    });
    expect(result).toBeNull();
  });

  it('returns top-K recipe ids when user has signal', async () => {
    cookingLogFindMany.mockResolvedValue([
      { recipeId: 'c1', cookedAt: new Date('2026-05-04') },
    ]);
    (prisma.recipe.findMany as Mock).mockImplementation(async (args: any) => {
      const ids = args?.where?.id?.in;
      if (ids && ids.includes('c1')) {
        return [{ id: 'c1', embedding: encodeEmbedding(vec(1, 0, 0)) }];
      }
      // catalog scan
      return [
        {
          id: 'r1',
          cuisine: 'italian',
          canonicalCuisine: 'italian',
          cookTime: 30,
          embedding: encodeEmbedding(vec(0.9, 0.1, 0)),
          ingredients: [{ text: 'pasta' }],
        },
        {
          id: 'r2',
          cuisine: 'italian',
          canonicalCuisine: 'italian',
          cookTime: 30,
          embedding: encodeEmbedding(vec(0.1, 0.9, 0)),
          ingredients: [{ text: 'pasta' }],
        },
      ];
    });
    const result = await resolveRetrievalCandidates({
      userId: 'u1',
      enabled: true,
      k: 2,
      hardFilters: {
        allergens: [],
        dietaryTags: [],
        maxCookTime: null,
        pantryItems: [],
        minPantryCoverage: 0,
      },
    });
    expect(result).not.toBeNull();
    expect(result!.recipeIds[0]).toBe('r1');
    expect(result!.recipeIds).toHaveLength(2);
  });

  it('returns null on internal error (caller falls back to rule-based)', async () => {
    cookingLogFindMany.mockRejectedValue(new Error('db down'));
    const result = await resolveRetrievalCandidates({
      userId: 'u1',
      enabled: true,
    });
    expect(result).toBeNull();
  });
});
