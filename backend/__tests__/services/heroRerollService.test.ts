// ROADMAP 4.0 HX2.1 — hero re-roll service tests.

jest.mock('../../src/lib/prisma', () => ({
  prisma: { recipe: { findUnique: jest.fn() } },
}));

jest.mock('../../src/services/recommender/homeFeedRetrievalAdapter', () => ({
  resolveRetrievalCandidates: jest.fn(),
}));

import { prisma } from '../../src/lib/prisma';
import { resolveRetrievalCandidates } from '../../src/services/recommender/homeFeedRetrievalAdapter';
import { getHeroReroll, MAX_REROLLS } from '../../src/services/heroRerollService';

const findUnique = (prisma as any).recipe.findUnique as jest.Mock;
const resolveMock = resolveRetrievalCandidates as jest.Mock;

const recipe = (id: string) => ({
  id,
  title: `Recipe ${id}`,
  imageUrl: `https://x/${id}.jpg`,
  cuisine: 'Italian',
  cookTime: 25,
});

beforeEach(() => {
  findUnique.mockReset();
  resolveMock.mockReset();
});

describe('getHeroReroll (HX2.1)', () => {
  it('returns the rank-2 candidate from the retrieval', async () => {
    resolveMock.mockResolvedValue({
      recipeIds: ['r1', 'r2', 'r3', 'r4', 'r5'], scores: [0.9, 0.8, 0.7, 0.6, 0.5],
    });
    findUnique.mockResolvedValue(recipe('r2'));
    const result = await getHeroReroll({ userId: 'u1', rank: 2 });
    expect(result.rank).toBe(2);
    expect(result.recipe?.id).toBe('r2');
    expect(result.exhausted).toBe(false);
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'r2' } }));
  });

  it('marks exhausted when rank exceeds MAX_REROLLS + 1', async () => {
    const result = await getHeroReroll({ userId: 'u1', rank: MAX_REROLLS + 2 });
    expect(result.exhausted).toBe(true);
    expect(result.recipe).toBeNull();
    expect(resolveMock).not.toHaveBeenCalled();
  });

  it('returns null recipe (not exhausted) when retrieval has fewer ids than rank', async () => {
    resolveMock.mockResolvedValue({ recipeIds: ['r1'], scores: [0.9] });
    const result = await getHeroReroll({ userId: 'u1', rank: 3 });
    expect(result.exhausted).toBe(false);
    expect(result.recipe).toBeNull();
  });

  it('returns null recipe when retrieval returns null entirely', async () => {
    resolveMock.mockResolvedValue(null);
    const result = await getHeroReroll({ userId: 'u1', rank: 2 });
    expect(result.recipe).toBeNull();
  });
});
