// ROADMAP 4.0 IG2.1 — IngredientCoOccurrence rebuild + decay test.

import { prisma } from '../../src/lib/prisma';
import {
  rebuildForUser,
  applyDecay,
  getPairs,
  DEFAULT_BASKET_WINDOW_DAYS,
} from '../../src/services/ingredientCoOccurrenceService';

const eventFindMany = jest.fn();
const coDeleteMany = jest.fn();
const coCreate = jest.fn();
const coFindMany = jest.fn();
const coDelete = jest.fn();
const coUpdate = jest.fn();
const transaction = jest.fn();

(prisma as any).ingredientEvent = {
  ...((prisma as any).ingredientEvent ?? {}),
  findMany: eventFindMany,
};
(prisma as any).ingredientCoOccurrence = {
  ...((prisma as any).ingredientCoOccurrence ?? {}),
  deleteMany: coDeleteMany,
  create: coCreate,
  findMany: coFindMany,
  delete: coDelete,
  update: coUpdate,
};
(prisma as any).$transaction = transaction;

beforeEach(() => {
  eventFindMany.mockReset();
  coDeleteMany.mockReset();
  coCreate.mockReset();
  coFindMany.mockReset();
  coDelete.mockReset();
  coUpdate.mockReset();
  transaction.mockReset();
  // $transaction(opsArray) → resolve operations in order
  transaction.mockImplementation((ops: any[]) => Promise.all(ops));
  coDeleteMany.mockResolvedValue({ count: 0 });
  coCreate.mockImplementation((args: any) =>
    Promise.resolve({ id: `co-${Math.random()}`, ...args.data }),
  );
  coDelete.mockResolvedValue({});
  coUpdate.mockResolvedValue({});
});

const NOW = new Date('2026-05-06T12:00:00Z');
const dayOffset = (d: number) => new Date(NOW.getTime() + d * 86400000);

const evt = (
  ingredientName: string,
  daysFromNow: number,
  eventType: 'purchased' | 'consumed' | 'expired' = 'purchased',
) => ({
  userId: 'u1',
  ingredientName,
  eventType,
  occurredAt: dayOffset(daysFromNow),
});

describe('IG2.1 — rebuildForUser', () => {
  it('rejects empty userId', async () => {
    await expect(rebuildForUser({ userId: '' })).rejects.toThrow(/userId/);
  });

  it('clears prior rows + returns 0 when no events', async () => {
    eventFindMany.mockResolvedValue([]);
    const n = await rebuildForUser({ userId: 'u1' });
    expect(n).toBe(0);
    expect(coDeleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    });
    expect(coCreate).not.toHaveBeenCalled();
  });

  it('windows events into 7-day baskets and counts pairs once per basket', async () => {
    // Two events on day 0 + day 1 (same basket): cilantro + lime → 1 pair
    eventFindMany.mockResolvedValue([
      evt('cilantro', -10),
      evt('lime', -9),
      // Different basket (8+ days later): cilantro + lime → +1 pair
      evt('cilantro', -1),
      evt('lime', 0),
    ]);
    const n = await rebuildForUser({ userId: 'u1', anchorAt: dayOffset(-10) });
    expect(n).toBe(1); // unique pair
    // The single pair should have coCount = 2 (two baskets)
    const createArgs = coCreate.mock.calls[0][0];
    expect(createArgs.data.ingredientA).toBe('cilantro');
    expect(createArgs.data.ingredientB).toBe('lime');
    expect(createArgs.data.coCount).toBe(2);
  });

  it('uses canonical pair ordering (A < B lexicographically)', async () => {
    eventFindMany.mockResolvedValue([
      evt('lime', -7),
      evt('avocado', -7),
    ]);
    await rebuildForUser({ userId: 'u1' });
    const args = coCreate.mock.calls[0][0];
    expect(args.data.ingredientA).toBe('avocado');
    expect(args.data.ingredientB).toBe('lime');
  });

  it('does not pair an ingredient with itself', async () => {
    eventFindMany.mockResolvedValue([
      evt('cilantro', -7),
      evt('cilantro', -6),
    ]);
    const n = await rebuildForUser({ userId: 'u1' });
    expect(n).toBe(0);
  });

  it('skips non-basketed event types (expired, swappedIn, etc)', async () => {
    eventFindMany.mockResolvedValue([
      evt('cilantro', -7, 'expired'),
      evt('lime', -7, 'expired'),
    ]);
    const n = await rebuildForUser({ userId: 'u1' });
    expect(n).toBe(0);
  });

  it('idempotent: re-running with the same events yields the same row count', async () => {
    eventFindMany.mockResolvedValue([
      evt('cilantro', -7),
      evt('lime', -7),
      evt('avocado', -7),
    ]);
    const n1 = await rebuildForUser({ userId: 'u1' });
    coCreate.mockClear();
    const n2 = await rebuildForUser({ userId: 'u1' });
    expect(n1).toBe(n2);
    expect(n1).toBe(3); // 3 pairs: avocado-cilantro, avocado-lime, cilantro-lime
  });
});

describe('IG2.1 — applyDecay', () => {
  it('halves a count when age = halfLife', async () => {
    coFindMany.mockResolvedValue([
      {
        id: 'co-1',
        coCount: 4,
        lastSeenAt: dayOffset(-60), // exactly 1 half-life ago
      },
    ]);
    await applyDecay({
      userId: 'u1',
      asOfDate: NOW,
      halfLifeDays: 60,
    });
    const args = coUpdate.mock.calls[0][0];
    expect(args.where.id).toBe('co-1');
    expect(args.data.coCount).toBeCloseTo(2, 4);
  });

  it('quarters a count at 2 half-lives', async () => {
    coFindMany.mockResolvedValue([
      {
        id: 'co-1',
        coCount: 8,
        lastSeenAt: dayOffset(-120),
      },
    ]);
    await applyDecay({
      userId: 'u1',
      asOfDate: NOW,
      halfLifeDays: 60,
    });
    expect(coUpdate.mock.calls[0][0].data.coCount).toBeCloseTo(2, 3);
  });

  it('deletes rows whose decayed count falls below 0.05', async () => {
    coFindMany.mockResolvedValue([
      {
        id: 'co-stale',
        coCount: 0.1,
        lastSeenAt: dayOffset(-300), // many half-lives → near-zero
      },
    ]);
    await applyDecay({
      userId: 'u1',
      asOfDate: NOW,
      halfLifeDays: 60,
    });
    expect(coDelete).toHaveBeenCalledWith({ where: { id: 'co-stale' } });
    expect(coUpdate).not.toHaveBeenCalled();
  });

  it('returns the number of rows touched', async () => {
    coFindMany.mockResolvedValue([
      { id: '1', coCount: 4, lastSeenAt: dayOffset(-30) },
      { id: '2', coCount: 4, lastSeenAt: dayOffset(-30) },
    ]);
    const n = await applyDecay({
      userId: 'u1',
      asOfDate: NOW,
    });
    expect(n).toBe(2);
  });
});

describe('IG2.1 — getPairs', () => {
  it('returns [] for empty userId or empty anchor', async () => {
    expect(await getPairs({ userId: '', withIngredient: 'rice' })).toEqual([]);
    expect(await getPairs({ userId: 'u1', withIngredient: '' })).toEqual([]);
  });

  it('extracts the partner ingredient based on which slot the anchor is in', async () => {
    coFindMany.mockResolvedValue([
      {
        ingredientA: 'cilantro',
        ingredientB: 'lime',
        coCount: 5,
        lastSeenAt: NOW,
      },
      {
        ingredientA: 'avocado',
        ingredientB: 'lime',
        coCount: 3,
        lastSeenAt: NOW,
      },
    ]);
    const out = await getPairs({ userId: 'u1', withIngredient: 'lime' });
    expect(out.map((p) => p.ingredient)).toEqual(['cilantro', 'avocado']);
    expect(out[0].coCount).toBe(5);
  });

  it('caps results at k', async () => {
    coFindMany.mockResolvedValue([]);
    await getPairs({ userId: 'u1', withIngredient: 'lime', k: 3 });
    expect(coFindMany.mock.calls[0][0].take).toBe(3);
  });

  it('orders by coCount desc', async () => {
    coFindMany.mockResolvedValue([]);
    await getPairs({ userId: 'u1', withIngredient: 'lime' });
    expect(coFindMany.mock.calls[0][0].orderBy).toEqual({ coCount: 'desc' });
  });
});

describe('IG2.1 — DEFAULT_BASKET_WINDOW_DAYS', () => {
  it('exposes the canonical 7-day window', () => {
    expect(DEFAULT_BASKET_WINDOW_DAYS).toBe(7);
  });
});
