// backend/__tests__/services/recipeNutrientAggregationService.test.ts
// ROADMAP 4.0 D13 — recipe + daily nutrient aggregation.

const mockRecipeFindUnique = jest.fn();
const mockAggregateFindUnique = jest.fn();
const mockAggregateUpsert = jest.fn();
const mockAggregateUpdate = jest.fn();
const mockCookingLogFindMany = jest.fn();
const mockSnapshotUpsert = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    recipe: { findUnique: (...a: unknown[]) => mockRecipeFindUnique(...a) },
    recipeNutrientAggregate: {
      findUnique: (...a: unknown[]) => mockAggregateFindUnique(...a),
      upsert: (...a: unknown[]) => mockAggregateUpsert(...a),
      update: (...a: unknown[]) => mockAggregateUpdate(...a),
    },
    cookingLog: { findMany: (...a: unknown[]) => mockCookingLogFindMany(...a) },
    dailyNutrientSnapshot: {
      upsert: (...a: unknown[]) => mockSnapshotUpsert(...a),
    },
  },
}));

const mockGetOrFetchByName = jest.fn();
jest.mock('../../src/services/ingredientNutrientService', () => {
  const actual = jest.requireActual('../../src/services/ingredientNutrientService');
  return {
    ...actual,
    getOrFetchByName: (...a: unknown[]) => mockGetOrFetchByName(...a),
  };
});

import {
  aggregateRecipe,
  gramsFromQuantity,
  getRecipeAggregate,
  invalidateRecipeAggregate,
  recomputeDailySnapshot,
} from '../../src/services/recipeNutrientAggregationService';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('gramsFromQuantity', () => {
  it('converts weight units exactly', () => {
    expect(gramsFromQuantity(1, 'kg')).toBe(1000);
    expect(gramsFromQuantity(1, 'lb')).toBeCloseTo(453.592, 2);
    expect(gramsFromQuantity(1, 'oz')).toBeCloseTo(28.35, 1);
    expect(gramsFromQuantity(100, 'g')).toBe(100);
  });

  it('converts volume units via water-equivalent', () => {
    expect(gramsFromQuantity(1, 'cup')).toBeCloseTo(236.59, 1);
    expect(gramsFromQuantity(1, 'tbsp')).toBeCloseTo(14.79, 1);
    expect(gramsFromQuantity(1, 'tsp')).toBeCloseTo(4.93, 1);
    expect(gramsFromQuantity(500, 'ml')).toBe(500);
  });

  it('handles count-style units with piece defaults', () => {
    expect(gramsFromQuantity(2, 'eggs')).toBe(100);
    expect(gramsFromQuantity(3, 'cloves')).toBe(15);
    expect(gramsFromQuantity(1, 'piece')).toBe(100);
  });

  it('returns null for unknown units or non-positive amounts', () => {
    expect(gramsFromQuantity(1, 'sprinkle')).toBeNull();
    expect(gramsFromQuantity(0, 'g')).toBeNull();
    expect(gramsFromQuantity(-1, 'g')).toBeNull();
    expect(gramsFromQuantity(NaN, 'g')).toBeNull();
  });
});

describe('aggregateRecipe', () => {
  it('sums per-100g nutrients × scale across ingredients, then divides by servings', async () => {
    // 1 cup spinach (~236g) + 2 eggs (~100g) + 1 tbsp olive oil (~14.79g)
    mockGetOrFetchByName.mockImplementation((rawName: string) => {
      const n = rawName.toLowerCase();
      if (n.includes('spinach')) {
        return Promise.resolve({
          fdcId: 168462,
          description: 'Spinach, raw',
          category: null,
          servingSize: 100,
          servingUnit: 'g',
          calories: 23,
          iron: 2.71,
          magnesium: 79,
        });
      }
      if (n.includes('egg')) {
        return Promise.resolve({
          fdcId: 173424,
          description: 'Egg, whole',
          category: null,
          servingSize: 100,
          servingUnit: 'g',
          calories: 143,
          protein: 12.6,
          fat: 9.5,
        });
      }
      if (n.includes('olive')) {
        return Promise.resolve({
          fdcId: 171413,
          description: 'Olive oil',
          category: null,
          servingSize: 100,
          servingUnit: 'g',
          calories: 884,
          fat: 100,
        });
      }
      return Promise.resolve(null);
    });

    const result = await aggregateRecipe({
      recipeId: 'r1',
      servings: 2,
      ingredients: [
        { text: '1 cup spinach' },
        { text: '100 g eggs' },
        { text: '1 tbsp olive oil' },
      ],
    });

    // Spinach 1 cup ≈ 236.59g → 23 * 2.366 = 54.4 cal
    // Eggs 100g → 143 cal
    // Olive oil 1 tbsp ≈ 14.79g → 884 * 0.148 = 130.8 cal
    // Total ≈ 328.2 / 2 servings = 164.1 cal
    expect(result.aggregate.calories).toBeGreaterThan(150);
    expect(result.aggregate.calories).toBeLessThan(180);
    expect(result.aggregate.iron).toBeGreaterThan(0);
    expect(result.coverage).toBe(1); // 3/3 resolved
  });

  it('reports partial coverage when some ingredients fail to resolve', async () => {
    mockGetOrFetchByName.mockImplementation((name: string) => {
      if (name.includes('xyz')) return Promise.resolve(null);
      return Promise.resolve({
        fdcId: 1,
        description: 'X',
        category: null,
        servingSize: 100,
        servingUnit: 'g',
        calories: 100,
      });
    });

    const result = await aggregateRecipe({
      recipeId: 'r2',
      servings: 1,
      ingredients: [
        { text: '1 cup flour' },
        { text: '1 unit xyz' },
      ],
    });

    expect(result.coverage).toBeCloseTo(0.5, 2);
  });

});

describe('getRecipeAggregate', () => {
  it('cache hit returns existing aggregate without recomputing', async () => {
    const cached = { recipeId: 'r1', invalidated: false, calories: 200 };
    mockAggregateFindUnique.mockResolvedValueOnce(cached);
    const got = await getRecipeAggregate('r1');
    expect(got).toBe(cached);
    expect(mockRecipeFindUnique).not.toHaveBeenCalled();
    expect(mockAggregateUpsert).not.toHaveBeenCalled();
  });

  it('cache miss recomputes and upserts', async () => {
    mockAggregateFindUnique.mockResolvedValueOnce(null);
    mockRecipeFindUnique.mockResolvedValueOnce({
      id: 'r1',
      servings: 2,
      ingredients: [{ text: '1 cup spinach' }],
    });
    mockGetOrFetchByName.mockResolvedValueOnce({
      fdcId: 168462,
      description: 'Spinach',
      category: null,
      servingSize: 100,
      servingUnit: 'g',
      calories: 23,
    });
    mockAggregateUpsert.mockResolvedValueOnce({ recipeId: 'r1', calories: 27.2 });

    await getRecipeAggregate('r1');
    expect(mockAggregateUpsert).toHaveBeenCalledTimes(1);
    const upsertCall = mockAggregateUpsert.mock.calls[0][0];
    expect(upsertCall.where).toEqual({ recipeId: 'r1' });
    expect(upsertCall.create.recipeId).toBe('r1');
    expect(upsertCall.create.invalidated).toBe(false);
  });

  it('invalidated cache triggers recompute', async () => {
    mockAggregateFindUnique.mockResolvedValueOnce({
      recipeId: 'r1',
      invalidated: true,
      calories: 100,
    });
    mockRecipeFindUnique.mockResolvedValueOnce({
      id: 'r1',
      servings: 1,
      ingredients: [{ text: '1 cup spinach' }],
    });
    mockGetOrFetchByName.mockResolvedValueOnce({
      fdcId: 168462, description: 'Spinach', category: null,
      servingSize: 100, servingUnit: 'g', calories: 23,
    });
    mockAggregateUpsert.mockResolvedValueOnce({});

    await getRecipeAggregate('r1');
    expect(mockAggregateUpsert).toHaveBeenCalled();
  });

  it('returns null when recipe not found', async () => {
    mockAggregateFindUnique.mockResolvedValueOnce(null);
    mockRecipeFindUnique.mockResolvedValueOnce(null);
    expect(await getRecipeAggregate('missing')).toBeNull();
  });
});

describe('invalidateRecipeAggregate', () => {
  it('marks the aggregate stale', async () => {
    mockAggregateUpdate.mockResolvedValueOnce({});
    await invalidateRecipeAggregate('r1');
    expect(mockAggregateUpdate).toHaveBeenCalledWith({
      where: { recipeId: 'r1' },
      data: { invalidated: true },
    });
  });

  it('swallows when no aggregate exists yet', async () => {
    mockAggregateUpdate.mockRejectedValueOnce(new Error('record not found'));
    await expect(invalidateRecipeAggregate('r1')).resolves.toBeUndefined();
  });
});

describe('recomputeDailySnapshot', () => {
  it('sums multiple aggregates across the day and upserts the snapshot', async () => {
    mockCookingLogFindMany.mockResolvedValueOnce([
      { recipeId: 'r1' },
      { recipeId: 'r2' },
    ]);
    mockAggregateFindUnique
      .mockResolvedValueOnce({ recipeId: 'r1', invalidated: false, calories: 400, protein: 30, iron: 5 })
      .mockResolvedValueOnce({ recipeId: 'r2', invalidated: false, calories: 600, protein: 20, iron: 3 });
    mockSnapshotUpsert.mockResolvedValueOnce({});

    await recomputeDailySnapshot({ userId: 'u1', date: '2026-05-05' });
    const call = mockSnapshotUpsert.mock.calls[0][0];
    expect(call.create.calories).toBe(1000);
    expect(call.create.protein).toBe(50);
    expect(call.create.iron).toBe(8);
    expect(call.create.mealCount).toBe(2);
    expect(call.where).toEqual({ userId_date: { userId: 'u1', date: '2026-05-05' } });
  });

  it('skips logs whose aggregate cannot be computed', async () => {
    mockCookingLogFindMany.mockResolvedValueOnce([{ recipeId: 'r1' }]);
    mockAggregateFindUnique.mockResolvedValueOnce(null);
    mockRecipeFindUnique.mockResolvedValueOnce(null);
    mockSnapshotUpsert.mockResolvedValueOnce({});

    await recomputeDailySnapshot({ userId: 'u1', date: '2026-05-05' });
    const call = mockSnapshotUpsert.mock.calls[0][0];
    expect(call.create.mealCount).toBe(0);
    expect(call.create.calories).toBeNull();
  });
});
