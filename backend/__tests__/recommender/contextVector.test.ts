// ROADMAP 4.0 TB1.1 — User context vector test.

import { prisma } from '../../src/lib/prisma';
import { buildContextVector } from '../../src/services/recommender/contextVector';
import {
  EMBEDDING_DIM,
  encodeEmbedding,
  cosineSimilarity,
} from '../../src/services/recommender/embeddingStore';

type Mock = jest.Mock;

const cookingLogFindMany = jest.fn();
const recipeFindMany = jest.fn();
const leftoverFindMany = jest.fn();

(prisma as any).cookingLog = {
  ...((prisma as any).cookingLog ?? {}),
  findMany: cookingLogFindMany,
};
(prisma as any).leftoverInventory = {
  ...((prisma as any).leftoverInventory ?? {}),
  findMany: leftoverFindMany,
};
(prisma.recipe.findMany as Mock).mockReset();
recipeFindMany.mockReset();
prisma.recipe.findMany = recipeFindMany as any;

function vec(...values: number[]): number[] {
  const out = new Array(EMBEDDING_DIM).fill(0);
  for (let i = 0; i < values.length && i < EMBEDDING_DIM; i++) {
    out[i] = values[i];
  }
  return out;
}

describe('buildContextVector (TB1.1)', () => {
  beforeEach(() => {
    cookingLogFindMany.mockReset();
    recipeFindMany.mockReset();
    leftoverFindMany.mockReset();
    leftoverFindMany.mockResolvedValue([]);
  });

  it('returns null vector when user has no cooks and no leftovers', async () => {
    cookingLogFindMany.mockResolvedValue([]);
    recipeFindMany.mockResolvedValue([]);
    const result = await buildContextVector({
      userId: 'u1',
      asOf: new Date('2026-05-05'),
    });
    expect(result.vector).toBeNull();
    expect(result.cookCount).toBe(0);
  });

  it('produces a vector closer to recent cooks than to random recipes', async () => {
    const italian = vec(1, 0, 0, 0);
    const random = vec(0, 0, 0, 1);

    cookingLogFindMany.mockResolvedValue([
      { recipeId: 'r1', cookedAt: new Date('2026-05-04') },
      { recipeId: 'r2', cookedAt: new Date('2026-05-03') },
    ]);
    recipeFindMany.mockResolvedValue([
      { id: 'r1', embedding: encodeEmbedding(italian) },
      { id: 'r2', embedding: encodeEmbedding(italian) },
    ]);

    const result = await buildContextVector({
      userId: 'u1',
      asOf: new Date('2026-05-05'),
    });
    expect(result.vector).not.toBeNull();
    const v = result.vector as number[];
    const simItalian = cosineSimilarity(v, italian);
    const simRandom = cosineSimilarity(v, random);
    expect(simItalian).toBeGreaterThan(simRandom);
  });

  it('weights recent cooks more than older ones', async () => {
    const a = vec(1, 0, 0, 0);
    const b = vec(0, 1, 0, 0);

    cookingLogFindMany.mockResolvedValue([
      { recipeId: 'recent', cookedAt: new Date('2026-05-04') },
      // 60 days ago — far past 21d half-life
      { recipeId: 'old', cookedAt: new Date('2026-03-05') },
    ]);
    recipeFindMany.mockResolvedValue([
      { id: 'recent', embedding: encodeEmbedding(a) },
      { id: 'old', embedding: encodeEmbedding(b) },
    ]);

    const result = await buildContextVector({
      userId: 'u1',
      asOf: new Date('2026-05-05'),
    });
    const v = result.vector as number[];
    const simA = cosineSimilarity(v, a);
    const simB = cosineSimilarity(v, b);
    expect(simA).toBeGreaterThan(simB);
  });

  it('applies pantry-expiring bias when leftovers exist', async () => {
    const cookA = vec(1, 0, 0, 0);
    cookingLogFindMany.mockResolvedValue([
      { recipeId: 'r1', cookedAt: new Date('2026-05-04') },
    ]);
    recipeFindMany.mockImplementation(async (args: any) => {
      const ids = args?.where?.id?.in as string[] | undefined;
      if (ids && ids.includes('r1')) {
        return [{ id: 'r1', embedding: encodeEmbedding(cookA) }];
      }
      // Pantry-side findMany: returns recipes by ingredient overlap.
      return [{ id: 'rPantry', embedding: encodeEmbedding(vec(0, 0, 1, 0)) }];
    });
    leftoverFindMany.mockResolvedValue([
      {
        component: { name: 'rice' },
        expiresAt: new Date('2026-05-07'),
      },
    ]);

    const noBias = await buildContextVector({
      userId: 'u1',
      asOf: new Date('2026-05-05'),
      pantryBiasWeight: 0,
    });
    const withBias = await buildContextVector({
      userId: 'u1',
      asOf: new Date('2026-05-05'),
      pantryBiasWeight: 0.5,
    });

    expect(noBias.vector).not.toBeNull();
    expect(withBias.vector).not.toBeNull();
    // The pantry bias should shift the vector — at minimum it should differ.
    const diff = cosineSimilarity(
      noBias.vector as number[],
      withBias.vector as number[],
    );
    expect(diff).toBeLessThan(0.999);
  });

  it('caps recipes scanned to maxCookHistory', async () => {
    cookingLogFindMany.mockResolvedValue(
      Array.from({ length: 50 }, (_, i) => ({
        recipeId: `r${i}`,
        cookedAt: new Date('2026-05-04'),
      })),
    );
    recipeFindMany.mockResolvedValue([]);
    await buildContextVector({
      userId: 'u1',
      asOf: new Date('2026-05-05'),
      maxCookHistory: 10,
    });
    const callArgs = cookingLogFindMany.mock.calls[0][0];
    expect(callArgs.take).toBe(10);
  });
});
