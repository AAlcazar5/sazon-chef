// ROADMAP 4.0 FX3.2 — per-filter yield deltas.

jest.mock('../../src/lib/prisma', () => ({
  prisma: { recipe: { count: jest.fn() } },
}));

import { prisma } from '../../src/lib/prisma';
import { computeFilterYields } from '../../src/services/filterYieldService';

const recipeCount = (prisma as any).recipe.count as jest.Mock;

describe('computeFilterYields (FX3.2)', () => {
  beforeEach(() => recipeCount.mockReset());

  it('returns baseline 0 + empty yields when no filters are active', async () => {
    recipeCount.mockResolvedValueOnce(120); // baseline only
    const result = await computeFilterYields({});
    expect(result.baselineCount).toBe(120);
    expect(result.yields).toEqual([]);
    expect(recipeCount).toHaveBeenCalledTimes(1);
  });

  it('returns one yield row per active filter, sorted descending by remainingIfRemoved', async () => {
    // Sequence:
    //  1) baseline (heavily filtered): 4
    //  2) drop cuisines: 12
    //  3) drop quick (cookTime): 47
    recipeCount
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(47);

    const result = await computeFilterYields({
      cuisines: ['Italian'],
      maxCookTime: 30,
    });
    expect(result.baselineCount).toBe(4);
    expect(result.yields.map((y) => y.filterId)).toEqual(['quick', 'cuisines']);
    expect(result.yields[0].remainingIfRemoved).toBe(47);
    expect(result.yields[1].remainingIfRemoved).toBe(12);
  });

  it('skips inactive filters', async () => {
    recipeCount
      .mockResolvedValueOnce(20) // baseline
      .mockResolvedValueOnce(80); // drop highProtein

    const result = await computeFilterYields({
      highProtein: true,
      lowCarb: false,
      mealPrepMode: false,
    });
    expect(result.yields.length).toBe(1);
    expect(result.yields[0].filterId).toBe('highProtein');
  });
});
