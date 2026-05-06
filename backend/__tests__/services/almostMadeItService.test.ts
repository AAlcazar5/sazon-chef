// ROADMAP 4.0 HX5.1 — almost-made-it service tests.

jest.mock('../../src/lib/prisma', () => ({
  prisma: { recipe: { findMany: jest.fn() } },
}));

jest.mock('../../src/services/recommender/homeFeedRetrievalAdapter', () => ({
  resolveRetrievalCandidates: jest.fn(),
}));

import { prisma } from '../../src/lib/prisma';
import { resolveRetrievalCandidates } from '../../src/services/recommender/homeFeedRetrievalAdapter';
import { getAlmostMadeItRows } from '../../src/services/almostMadeItService';

const findMany = (prisma as any).recipe.findMany as jest.Mock;
const resolveMock = resolveRetrievalCandidates as jest.Mock;

const recipe = (id: string) => ({
  id,
  title: `Recipe ${id}`,
  imageUrl: `https://x/${id}.jpg`,
  cuisine: 'Italian',
  cookTime: 25,
});

beforeEach(() => {
  findMany.mockReset();
  resolveMock.mockReset();
});

describe('getAlmostMadeItRows (HX5.1)', () => {
  it('returns the next-5 candidates past the cut, in rank order', async () => {
    const allIds = Array.from({ length: 20 }, (_, i) => `r${i}`); // r0..r19
    resolveMock.mockResolvedValue({
      recipeIds: allIds,
      scores: allIds.map((_, i) => 1 - i * 0.01),
    });
    // Slice [10, 15) = r10..r14
    findMany.mockResolvedValue(['r10', 'r11', 'r12', 'r13', 'r14'].map(recipe));

    const result = await getAlmostMadeItRows({ userId: 'u1', cutoff: 10 });
    expect(result.rows.map((r) => r.id)).toEqual(['r10', 'r11', 'r12', 'r13', 'r14']);
    expect(result.rows[0].marginVsCut).toBe(1);
    expect(result.rows[4].marginVsCut).toBe(5);
    expect(result.cutCount).toBe(10);
  });

  it('returns empty rows when the retrieval has nothing past the cut', async () => {
    const allIds = Array.from({ length: 8 }, (_, i) => `r${i}`); // < cutoff
    resolveMock.mockResolvedValue({
      recipeIds: allIds, scores: allIds.map(() => 0.5),
    });
    const result = await getAlmostMadeItRows({ userId: 'u1', cutoff: 10 });
    expect(result.rows).toEqual([]);
    expect(result.cutCount).toBe(8);
  });

  it('returns empty when retrieval is unavailable', async () => {
    resolveMock.mockResolvedValue(null);
    const result = await getAlmostMadeItRows({ userId: 'u1', cutoff: 10 });
    expect(result.rows).toEqual([]);
    expect(result.cutCount).toBe(0);
  });

  it('caps tail at MAX_TAIL', async () => {
    const allIds = Array.from({ length: 50 }, (_, i) => `r${i}`);
    resolveMock.mockResolvedValue({ recipeIds: allIds, scores: allIds.map(() => 0.5) });
    findMany.mockImplementation(({ where }) => Promise.resolve(where.id.in.map(recipe)));

    const result = await getAlmostMadeItRows({ userId: 'u1', cutoff: 10, tail: 100 });
    expect(result.rows.length).toBeLessThanOrEqual(10); // MAX_TAIL = 10
  });

  it('preserves rank order even if findMany returns rows in a different order', async () => {
    const allIds = Array.from({ length: 15 }, (_, i) => `r${i}`);
    resolveMock.mockResolvedValue({ recipeIds: allIds, scores: allIds.map(() => 0.5) });
    // Return shuffled rows from prisma.
    findMany.mockResolvedValue([recipe('r12'), recipe('r10'), recipe('r14'), recipe('r11'), recipe('r13')]);

    const result = await getAlmostMadeItRows({ userId: 'u1', cutoff: 10 });
    expect(result.rows.map((r) => r.id)).toEqual(['r10', 'r11', 'r12', 'r13', 'r14']);
  });
});
