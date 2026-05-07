// ROADMAP 4.0 IG5.1 — shoppingListV2Service test.

import { prisma } from '../../src/lib/prisma';
import { composeShoppingList } from '../../src/services/shoppingListV2Service';
import * as cadence from '../../src/services/ingredientCadenceService';

jest.mock('../../src/services/ingredientCadenceService');

const recipeFindMany = jest.fn();
const pantryFindMany = jest.fn();

(prisma as any).recipe = {
  ...((prisma as any).recipe ?? {}),
  findMany: recipeFindMany,
};
(prisma as any).pantryItem = {
  ...((prisma as any).pantryItem ?? {}),
  findMany: pantryFindMany,
};

beforeEach(() => {
  recipeFindMany.mockReset();
  pantryFindMany.mockReset();
  (cadence.predictRunningLow as jest.Mock).mockReset();
  recipeFindMany.mockResolvedValue([]);
  pantryFindMany.mockResolvedValue([]);
  (cadence.predictRunningLow as jest.Mock).mockResolvedValue([]);
});

const NOW = new Date('2026-05-06T12:00:00Z');

describe('IG5.1 — composeShoppingList input guards', () => {
  it('returns empty composition for empty userId', async () => {
    const out = await composeShoppingList({
      userId: '',
      mealPlanRecipeIds: ['r1'],
      now: NOW,
    });
    expect(out.items).toEqual([]);
    expect(out.totalRawSlots).toBe(0);
    expect(recipeFindMany).not.toHaveBeenCalled();
  });

  it('handles empty mealPlanRecipeIds gracefully', async () => {
    const out = await composeShoppingList({
      userId: 'u1',
      mealPlanRecipeIds: [],
      now: NOW,
    });
    expect(out.items).toEqual([]);
    expect(out.totalRawSlots).toBe(0);
  });

  it('caps mealPlanRecipeIds at MAX_RECIPE_IDS=50', async () => {
    const ids = Array.from({ length: 100 }, (_, i) => `r${i}`);
    await composeShoppingList({
      userId: 'u1',
      mealPlanRecipeIds: ids,
      now: NOW,
    });
    const where = recipeFindMany.mock.calls[0][0].where;
    expect(where.id.in.length).toBeLessThanOrEqual(50);
  });
});

describe('IG5.1 — Layer 1: meal-plan aggregation', () => {
  it('aggregates ingredients across recipes with source: meal-plan', async () => {
    recipeFindMany.mockResolvedValue([
      {
        id: 'r1',
        ingredients: [{ text: '2 lb rice' }, { text: '1 lb chicken breast' }],
      },
      {
        id: 'r2',
        ingredients: [{ text: '1 lb rice' }, { text: '3 cilantro sprigs' }],
      },
    ]);
    const out = await composeShoppingList({
      userId: 'u1',
      mealPlanRecipeIds: ['r1', 'r2'],
      now: NOW,
    });
    const names = out.items.map((i) => i.name);
    expect(names).toContain('rice');
    expect(out.items.every((i) => i.source === 'meal-plan')).toBe(true);
  });

  it('scales by servingsByRecipe multiplier', async () => {
    recipeFindMany.mockResolvedValue([
      { id: 'r1', ingredients: [{ text: '2 lb rice' }] },
    ]);
    const out = await composeShoppingList({
      userId: 'u1',
      mealPlanRecipeIds: ['r1'],
      servingsByRecipe: { r1: 3 },
      now: NOW,
    });
    const rice = out.items.find((i) => i.name === 'rice');
    expect(rice!.quantity).toBeCloseTo(6, 5);
  });
});

describe('IG5.1 — Layer 2: pantry subtraction', () => {
  it('quantity-aware: pantry covers full slot → item dropped', async () => {
    recipeFindMany.mockResolvedValue([
      { id: 'r1', ingredients: [{ text: '2 lb rice' }] },
    ]);
    pantryFindMany.mockResolvedValue([
      { name: 'rice', quantity: 5, unit: 'lb' },
    ]);
    const out = await composeShoppingList({
      userId: 'u1',
      mealPlanRecipeIds: ['r1'],
      now: NOW,
    });
    expect(out.items.find((i) => i.name === 'rice')).toBeUndefined();
    expect(out.pantryCovered.map((p) => p.name)).toContain('rice');
  });

  it('quantity-aware: partial coverage → residual quantity remains', async () => {
    recipeFindMany.mockResolvedValue([
      { id: 'r1', ingredients: [{ text: '5 lb rice' }] },
    ]);
    pantryFindMany.mockResolvedValue([
      { name: 'rice', quantity: 2, unit: 'lb' },
    ]);
    const out = await composeShoppingList({
      userId: 'u1',
      mealPlanRecipeIds: ['r1'],
      now: NOW,
    });
    const rice = out.items.find((i) => i.name === 'rice');
    expect(rice).toBeDefined();
    expect(rice!.quantity).toBeCloseTo(3, 5);
  });

  it('binary fallback: pantry has it, no quantity → drop slot entirely', async () => {
    recipeFindMany.mockResolvedValue([
      { id: 'r1', ingredients: [{ text: '2 lb rice' }] },
    ]);
    pantryFindMany.mockResolvedValue([
      { name: 'rice', quantity: null, unit: null },
    ]);
    const out = await composeShoppingList({
      userId: 'u1',
      mealPlanRecipeIds: ['r1'],
      now: NOW,
    });
    expect(out.items.find((i) => i.name === 'rice')).toBeUndefined();
    expect(out.pantryCovered.map((p) => p.name)).toContain('rice');
  });

  it('does not subtract when names do not match (case-insensitive normalize)', async () => {
    recipeFindMany.mockResolvedValue([
      { id: 'r1', ingredients: [{ text: '2 lb rice' }] },
    ]);
    pantryFindMany.mockResolvedValue([
      { name: 'cilantro', quantity: 1, unit: 'bunch' },
    ]);
    const out = await composeShoppingList({
      userId: 'u1',
      mealPlanRecipeIds: ['r1'],
      now: NOW,
    });
    expect(out.items.find((i) => i.name === 'rice')).toBeDefined();
  });
});

describe('IG5.1 — Layer 3: cadence (running-low) suggestions', () => {
  it('appends running-low items as source: cadence', async () => {
    recipeFindMany.mockResolvedValue([]);
    (cadence.predictRunningLow as jest.Mock).mockResolvedValue([
      {
        ingredientName: 'milk',
        meanIntervalDays: 7,
        ratio: 0.95,
        confidence: 'high',
        daysSinceLastPurchase: 6.65,
        lastPurchasedAt: new Date(),
      },
    ]);
    const out = await composeShoppingList({
      userId: 'u1',
      mealPlanRecipeIds: [],
      now: NOW,
    });
    expect(out.runningLowAppended).toHaveLength(1);
    expect(out.runningLowAppended[0].name).toBe('milk');
    expect(out.runningLowAppended[0].source).toBe('cadence');
    expect(out.runningLowAppended[0].cadenceRatio).toBeCloseTo(0.95, 2);
    // Cadence rows show up in the unified `items` array too
    expect(out.items.some((i) => i.source === 'cadence')).toBe(true);
  });

  it('skips a cadence suggestion when the same name already covered by meal-plan', async () => {
    recipeFindMany.mockResolvedValue([
      { id: 'r1', ingredients: [{ text: '1 gallon milk' }] },
    ]);
    (cadence.predictRunningLow as jest.Mock).mockResolvedValue([
      {
        ingredientName: 'milk',
        meanIntervalDays: 7,
        ratio: 0.95,
        confidence: 'high',
        daysSinceLastPurchase: 6.65,
        lastPurchasedAt: new Date(),
      },
    ]);
    const out = await composeShoppingList({
      userId: 'u1',
      mealPlanRecipeIds: ['r1'],
      now: NOW,
    });
    expect(out.runningLowAppended).toHaveLength(0);
    const milkRows = out.items.filter((i) => i.name === 'milk');
    expect(milkRows).toHaveLength(1);
    expect(milkRows[0].source).toBe('meal-plan');
  });
});

describe('IG5.1 — totalRawSlots (telemetry)', () => {
  it('reports the count of distinct meal-plan slots before subtraction', async () => {
    recipeFindMany.mockResolvedValue([
      {
        id: 'r1',
        ingredients: [
          { text: '2 lb rice' },
          { text: '1 lb chicken breast' },
          { text: '3 cilantro sprigs' },
        ],
      },
    ]);
    const out = await composeShoppingList({
      userId: 'u1',
      mealPlanRecipeIds: ['r1'],
      now: NOW,
    });
    expect(out.totalRawSlots).toBeGreaterThanOrEqual(2);
  });
});

describe('IG5.1 — full 3-layer compose', () => {
  it('items contain meal-plan + cadence; pantryCovered surfaces what subtracted', async () => {
    recipeFindMany.mockResolvedValue([
      {
        id: 'r1',
        ingredients: [{ text: '2 lb rice' }, { text: '1 lb chicken breast' }],
      },
    ]);
    pantryFindMany.mockResolvedValue([
      { name: 'rice', quantity: 10, unit: 'lb' },
    ]);
    (cadence.predictRunningLow as jest.Mock).mockResolvedValue([
      {
        ingredientName: 'milk',
        meanIntervalDays: 7,
        ratio: 0.95,
        confidence: 'high',
        daysSinceLastPurchase: 6.65,
        lastPurchasedAt: new Date(),
      },
    ]);
    const out = await composeShoppingList({
      userId: 'u1',
      mealPlanRecipeIds: ['r1'],
      now: NOW,
    });
    // chicken breast — meal-plan; milk — cadence; rice — covered (excluded)
    const sources = out.items.map((i) => i.source).sort();
    expect(sources).toEqual(['cadence', 'meal-plan']);
    expect(out.pantryCovered.map((p) => p.name)).toContain('rice');
  });
});
