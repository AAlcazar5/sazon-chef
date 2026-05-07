// ROADMAP 4.0 RD5.1 — recommender/cookedNext test.
//
// Thin wrapper over cohortInsightsService.getCookedNext (N7.3). Resolves
// the cohort recipe-id list to full Recipe rows, excludes recipes the
// caller already cooked, and applies the banned-vocab guard.

import {
  cookedNext,
  __INTERNALS,
} from '../../../src/services/recommender/cookedNext';
import { prisma } from '../../../src/lib/prisma';
import * as cohortService from '../../../src/services/cohortInsightsService';

jest.mock('../../../src/services/cohortInsightsService', () => ({
  getCookedNext: jest.fn(),
}));

const cohortMock = cohortService.getCookedNext as jest.Mock;
const recipeFindMany = jest.fn();
const cookingLogFindMany = jest.fn();

(prisma as any).recipe = { findMany: recipeFindMany };
(prisma as any).cookingLog = {
  ...((prisma as any).cookingLog ?? {}),
  findMany: cookingLogFindMany,
};

beforeEach(() => {
  cohortMock.mockReset();
  recipeFindMany.mockReset();
  cookingLogFindMany.mockReset();
  cookingLogFindMany.mockResolvedValue([]);
});

const recipe = (id: string, title: string, over: Record<string, unknown> = {}) => ({
  id,
  title,
  imageUrl: null,
  cuisine: null,
  cookTime: null,
  ...over,
});

describe('RD5.1 — cookedNext', () => {
  it('rejects empty recipeId', async () => {
    await expect(cookedNext({ recipeId: '', userId: 'u1' })).rejects.toThrow(
      /recipeId/,
    );
  });

  it('returns empty when below k-anonymity floor', async () => {
    cohortMock.mockResolvedValue({
      recipes: [],
      privacyOptOut: false,
      belowKAnonFloor: true,
    });
    const out = await cookedNext({ recipeId: 'r1', userId: 'u1' });
    expect(out.recipes).toEqual([]);
    expect(out.belowKAnonFloor).toBe(true);
    expect(recipeFindMany).not.toHaveBeenCalled();
  });

  it('returns empty when caller has privacy opt-out', async () => {
    cohortMock.mockResolvedValue({
      recipes: [],
      privacyOptOut: true,
      belowKAnonFloor: false,
    });
    const out = await cookedNext({ recipeId: 'r1', userId: 'u1' });
    expect(out.recipes).toEqual([]);
    expect(out.privacyOptOut).toBe(true);
  });

  it('top-K reflects cohort frequency ordering', async () => {
    cohortMock.mockResolvedValue({
      recipes: [
        { recipeId: 'a', cookCount: 18 },
        { recipeId: 'b', cookCount: 12 },
        { recipeId: 'c', cookCount: 5 },
      ],
      privacyOptOut: false,
      belowKAnonFloor: false,
    });
    recipeFindMany.mockResolvedValue([
      recipe('a', 'Sumac Chicken'),
      recipe('b', 'Persian Rice'),
      recipe('c', 'Fesenjan'),
    ]);
    const out = await cookedNext({ recipeId: 'anchor', userId: 'u1' });
    expect(out.recipes.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(out.recipes[0].cookCount).toBe(18);
  });

  it("excludes recipes the requesting user already cooked", async () => {
    cohortMock.mockResolvedValue({
      recipes: [
        { recipeId: 'a', cookCount: 18 },
        { recipeId: 'b', cookCount: 12 },
      ],
      privacyOptOut: false,
      belowKAnonFloor: false,
    });
    cookingLogFindMany.mockResolvedValue([{ recipeId: 'a' }]);
    recipeFindMany.mockResolvedValue([recipe('b', 'Persian Rice')]);
    const out = await cookedNext({ recipeId: 'anchor', userId: 'u1' });
    expect(out.recipes.map((r) => r.id)).toEqual(['b']);
    expect(cookingLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'u1' }),
      }),
    );
  });

  it('default k=5 passed through to cohort service', async () => {
    cohortMock.mockResolvedValue({
      recipes: [],
      privacyOptOut: false,
      belowKAnonFloor: false,
    });
    recipeFindMany.mockResolvedValue([]);
    await cookedNext({ recipeId: 'anchor', userId: 'u1' });
    expect(cohortMock).toHaveBeenCalledWith(
      expect.objectContaining({ k: 5, excludeUserId: 'u1' }),
    );
  });

  it('caller k cap is honored (max 10)', async () => {
    cohortMock.mockResolvedValue({
      recipes: [],
      privacyOptOut: false,
      belowKAnonFloor: false,
    });
    recipeFindMany.mockResolvedValue([]);
    await cookedNext({ recipeId: 'anchor', userId: 'u1', k: 999 });
    expect(cohortMock).toHaveBeenCalledWith(
      expect.objectContaining({ k: 10 }),
    );
  });

  it('drops recipes whose titles fail the banned-vocab guard', async () => {
    cohortMock.mockResolvedValue({
      recipes: [
        { recipeId: 'a', cookCount: 10 },
        { recipeId: 'b', cookCount: 8 },
      ],
      privacyOptOut: false,
      belowKAnonFloor: false,
    });
    recipeFindMany.mockResolvedValue([
      recipe('a', 'Macro-Friendly Bowl'), // banned trainer-token
      recipe('b', 'Sumac Chicken'),
    ]);
    const out = await cookedNext({ recipeId: 'anchor', userId: 'u1' });
    expect(out.recipes.map((r) => r.id)).toEqual(['b']);
  });

  it('preserves recipe metadata (imageUrl null included, cookTime/cuisine surfaced)', async () => {
    cohortMock.mockResolvedValue({
      recipes: [{ recipeId: 'a', cookCount: 10 }],
      privacyOptOut: false,
      belowKAnonFloor: false,
    });
    recipeFindMany.mockResolvedValue([
      recipe('a', 'Sumac Chicken', {
        imageUrl: null,
        cuisine: 'persian',
        cookTime: 35,
      }),
    ]);
    const out = await cookedNext({ recipeId: 'anchor', userId: 'u1' });
    expect(out.recipes[0]).toMatchObject({
      id: 'a',
      title: 'Sumac Chicken',
      imageUrl: null,
      cuisine: 'persian',
      cookTime: 35,
      cookCount: 10,
    });
  });

  it('omits recipes that no longer exist (cohort references stale recipe ids)', async () => {
    cohortMock.mockResolvedValue({
      recipes: [
        { recipeId: 'a', cookCount: 10 },
        { recipeId: 'ghost', cookCount: 8 },
      ],
      privacyOptOut: false,
      belowKAnonFloor: false,
    });
    recipeFindMany.mockResolvedValue([recipe('a', 'Sumac Chicken')]);
    const out = await cookedNext({ recipeId: 'anchor', userId: 'u1' });
    expect(out.recipes.map((r) => r.id)).toEqual(['a']);
  });

  it('publishes constants', () => {
    expect(__INTERNALS.MAX_K).toBe(10);
    expect(__INTERNALS.DEFAULT_K).toBe(5);
  });
});
