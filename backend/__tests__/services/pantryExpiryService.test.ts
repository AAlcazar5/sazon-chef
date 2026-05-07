// ROADMAP 4.0 IG4.1 — pantryExpiryService test.

import { prisma } from '../../src/lib/prisma';
import {
  getExpiringPantryItems,
  getExpiringIngredientNames,
  DEFAULT_EXPIRING_THRESHOLD_DAYS,
} from '../../src/services/pantryExpiryService';

const findMany = jest.fn();
(prisma as any).pantryItem = {
  ...((prisma as any).pantryItem ?? {}),
  findMany,
};

beforeEach(() => {
  findMany.mockReset();
  findMany.mockResolvedValue([]);
});

const NOW = new Date('2026-05-06T12:00:00Z');
const dayOffset = (d: number) => new Date(NOW.getTime() + d * 86400000);

const row = (over: Partial<any> = {}) => ({
  id: 'p-default',
  name: 'cilantro',
  category: 'herbs',
  quantity: null,
  unit: null,
  expiryHint: null,
  createdAt: dayOffset(-3),
  updatedAt: dayOffset(-3),
  ...over,
});

describe('IG4.1 — getExpiringPantryItems', () => {
  it('returns [] for empty userId without DB hit', async () => {
    expect(await getExpiringPantryItems({ userId: '' })).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('publishes the canonical 3-day threshold', () => {
    expect(DEFAULT_EXPIRING_THRESHOLD_DAYS).toBe(3);
  });

  it('flags only the items expiring within the window', async () => {
    findMany.mockResolvedValue([
      // expiryHint=5d, added 4d ago → expires in 1d (flag)
      row({ id: '1', name: 'cilantro', expiryHint: 5, createdAt: dayOffset(-4) }),
      // expiryHint=14d, added 1d ago → expires in 13d (skip)
      row({ id: '2', name: 'milk', expiryHint: 14, createdAt: dayOffset(-1) }),
      // expiryHint=2d, added 0d ago → expires in 2d (flag)
      row({ id: '3', name: 'arugula', expiryHint: 2, createdAt: dayOffset(0) }),
      // expiryHint=null, no fallback → skip (no false positive)
      row({ id: '4', name: 'sazon spice blend', expiryHint: null }),
    ]);
    const out = await getExpiringPantryItems({ userId: 'u1', now: NOW });
    expect(out.map((i) => i.id)).toEqual(['1', '3']);
    expect(out[0].daysUntilExpiry).toBe(1);
    expect(out[1].daysUntilExpiry).toBe(2);
  });

  it('orders most-urgent first (lowest daysUntilExpiry first)', async () => {
    findMany.mockResolvedValue([
      row({ id: 'a', name: 'milk', expiryHint: 7, createdAt: dayOffset(-5) }), // 2d
      row({ id: 'b', name: 'cilantro', expiryHint: 5, createdAt: dayOffset(-4) }), // 1d
      row({ id: 'c', name: 'arugula', expiryHint: 4, createdAt: dayOffset(-4) }), // 0d
    ]);
    const out = await getExpiringPantryItems({ userId: 'u1', now: NOW });
    expect(out.map((i) => i.id)).toEqual(['c', 'b', 'a']);
  });

  it('includes already-expired items with negative daysUntilExpiry', async () => {
    findMany.mockResolvedValue([
      row({ id: '1', name: 'cilantro', expiryHint: 5, createdAt: dayOffset(-7) }),
    ]);
    const out = await getExpiringPantryItems({ userId: 'u1', now: NOW });
    expect(out).toHaveLength(1);
    expect(out[0].daysUntilExpiry).toBeLessThan(0);
  });

  it('items with `expiryHint: null` are excluded when no name fallback', async () => {
    findMany.mockResolvedValue([
      row({ id: '1', name: 'sazon spice blend', expiryHint: null }),
    ]);
    const out = await getExpiringPantryItems({ userId: 'u1', now: NOW });
    expect(out).toEqual([]);
  });

  it('falls back to lookupExpiryHint(name) when expiryHint is null', async () => {
    // 'cilantro' is in INGREDIENT_LIFESPAN_DEFAULTS (5d)
    findMany.mockResolvedValue([
      row({ id: '1', name: 'cilantro', expiryHint: null, createdAt: dayOffset(-4) }),
    ]);
    const out = await getExpiringPantryItems({ userId: 'u1', now: NOW });
    expect(out).toHaveLength(1);
    expect(out[0].expirySource).toBe('fallback');
    expect(out[0].daysUntilExpiry).toBe(1);
  });

  it('column expiryHint takes precedence over fallback', async () => {
    findMany.mockResolvedValue([
      // cilantro fallback would give 5d; column says 2
      row({ id: '1', name: 'cilantro', expiryHint: 2, createdAt: dayOffset(0) }),
    ]);
    const out = await getExpiringPantryItems({ userId: 'u1', now: NOW });
    expect(out[0].expirySource).toBe('column');
    expect(out[0].daysUntilExpiry).toBe(2);
  });

  it('respects withinDays override', async () => {
    findMany.mockResolvedValue([
      row({ id: '1', name: 'milk', expiryHint: 14, createdAt: dayOffset(-7) }), // 7d
    ]);
    expect(
      await getExpiringPantryItems({ userId: 'u1', withinDays: 3, now: NOW }),
    ).toEqual([]);
    expect(
      (
        await getExpiringPantryItems({ userId: 'u1', withinDays: 10, now: NOW })
      ).length,
    ).toBe(1);
  });

  it('rejects non-positive expiryHint as if null (safety)', async () => {
    findMany.mockResolvedValue([
      row({ id: '1', name: 'mystery', expiryHint: 0 }),
      row({ id: '2', name: 'mystery2', expiryHint: -3 }),
    ]);
    expect(await getExpiringPantryItems({ userId: 'u1', now: NOW })).toEqual([]);
  });
});

describe('IG4.1 — getExpiringIngredientNames', () => {
  it('returns just the names, urgency-ordered', async () => {
    findMany.mockResolvedValue([
      row({ id: '1', name: 'milk', expiryHint: 7, createdAt: dayOffset(-5) }), // 2d
      row({ id: '2', name: 'cilantro', expiryHint: 5, createdAt: dayOffset(-4) }), // 1d
    ]);
    const names = await getExpiringIngredientNames({ userId: 'u1', now: NOW });
    expect(names).toEqual(['cilantro', 'milk']);
  });
});
