// ROADMAP 4.0 N2.3 — expiringInventoryService test.

import { prisma } from '../../src/lib/prisma';
import {
  getExpiring,
  __testHelpers,
} from '../../src/services/expiringInventoryService';

const pantryFindMany = jest.fn();
const leftoverFindMany = jest.fn();
const mealPrepFindMany = jest.fn();

(prisma as any).pantryItem = {
  ...((prisma as any).pantryItem ?? {}),
  findMany: pantryFindMany,
};
(prisma as any).leftoverInventory = {
  ...((prisma as any).leftoverInventory ?? {}),
  findMany: leftoverFindMany,
};
(prisma as any).mealPrepPortion = {
  ...((prisma as any).mealPrepPortion ?? {}),
  findMany: mealPrepFindMany,
};

const NOW = new Date('2026-05-06T12:00:00Z');
const dayOffset = (d: number) => new Date(NOW.getTime() + d * 86400000);

beforeEach(() => {
  pantryFindMany.mockReset();
  leftoverFindMany.mockReset();
  mealPrepFindMany.mockReset();
  pantryFindMany.mockResolvedValue([]);
  leftoverFindMany.mockResolvedValue([]);
  mealPrepFindMany.mockResolvedValue([]);
});

describe('N2.3 — getExpiring', () => {
  it('returns a flat list ordered by daysUntilExpiry ASC across all 3 sources', async () => {
    pantryFindMany.mockResolvedValue([
      {
        id: 'p1',
        name: 'cilantro',
        category: 'herbs', // 5d TTL
        createdAt: dayOffset(-3), // expires in 2 days
      },
    ]);
    leftoverFindMany.mockResolvedValue([
      {
        id: 'l1',
        expiresAt: dayOffset(1), // 1 day
        portionsRemaining: 2,
        component: { name: 'rice bowl' },
      },
    ]);
    mealPrepFindMany.mockResolvedValue([
      {
        id: 'mp1',
        expiryDate: dayOffset(3), // 3 days
        freshServingsRemaining: 4,
        recipe: { title: 'chicken curry' },
      },
    ]);

    const out = await getExpiring({ userId: 'u1', withinDays: 5, now: NOW });
    expect(out.map((r) => r.ingredientName)).toEqual([
      'rice bowl',
      'cilantro',
      'chicken curry',
    ]);
    expect(out.map((r) => r.source)).toEqual([
      'leftover',
      'pantry',
      'meal-prep',
    ]);
  });

  it('per-source filtering: sources: ["pantry"] excludes leftovers + meal-prep', async () => {
    pantryFindMany.mockResolvedValue([
      {
        id: 'p1',
        name: 'spinach',
        category: 'greens', // 4d
        createdAt: dayOffset(-2),
      },
    ]);
    leftoverFindMany.mockResolvedValue([
      {
        id: 'l1',
        expiresAt: dayOffset(1),
        portionsRemaining: 2,
        component: { name: 'rice bowl' },
      },
    ]);
    const out = await getExpiring({
      userId: 'u1',
      sources: ['pantry'],
      withinDays: 5,
      now: NOW,
    });
    expect(leftoverFindMany).not.toHaveBeenCalled();
    expect(mealPrepFindMany).not.toHaveBeenCalled();
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe('pantry');
  });

  it('returns [] when there is no inventory anywhere', async () => {
    const out = await getExpiring({ userId: 'u1', now: NOW });
    expect(out).toEqual([]);
  });

  it('returns [] when userId is empty', async () => {
    const out = await getExpiring({ userId: '', now: NOW });
    expect(out).toEqual([]);
    expect(pantryFindMany).not.toHaveBeenCalled();
  });

  it('skips PantryItem rows whose category has no TTL heuristic', async () => {
    pantryFindMany.mockResolvedValue([
      {
        id: 'p1',
        name: 'mystery',
        category: 'unknown-category',
        createdAt: dayOffset(-1),
      },
      {
        id: 'p2',
        name: 'spinach',
        category: 'greens',
        createdAt: dayOffset(-2),
      },
    ]);
    const out = await getExpiring({ userId: 'u1', withinDays: 7, now: NOW });
    expect(out.map((r) => r.ingredientName)).toEqual(['spinach']);
  });

  it('includes already-expired items (negative daysUntilExpiry)', async () => {
    leftoverFindMany.mockResolvedValue([
      {
        id: 'l1',
        expiresAt: dayOffset(-1), // already expired by 1 day
        portionsRemaining: 1,
        component: { name: 'tofu scramble' },
      },
    ]);
    const out = await getExpiring({ userId: 'u1', now: NOW });
    expect(out).toHaveLength(1);
    expect(out[0].daysUntilExpiry).toBeLessThan(0);
  });

  it('exposes pantry-category TTL heuristic for cap-test inspection', () => {
    expect(__testHelpers.PANTRY_CATEGORY_TTL_DAYS.produce).toBe(7);
    expect(__testHelpers.PANTRY_CATEGORY_TTL_DAYS.dairy).toBe(14);
  });

  it('respects withinDays — items expiring further out are dropped', async () => {
    leftoverFindMany.mockResolvedValue([
      {
        id: 'l1',
        expiresAt: dayOffset(1),
        portionsRemaining: 1,
        component: { name: 'soon' },
      },
    ]);
    // The mock filtering happens at the prisma level; this test asserts the
    // service passes withinDays through correctly via the `expiresAt: { lte }`
    // filter shape.
    await getExpiring({ userId: 'u1', withinDays: 2, now: NOW });
    const call = leftoverFindMany.mock.calls[0][0];
    expect(call.where.userId).toBe('u1');
    expect(call.where.expiresAt.lte).toBeInstanceOf(Date);
    // Cutoff is now + 2 days
    expect(call.where.expiresAt.lte.getTime()).toBe(
      NOW.getTime() + 2 * 86400000,
    );
  });
});
