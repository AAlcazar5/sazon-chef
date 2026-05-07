// ROADMAP 4.0 IG3.1 + IG3.2 — cadence model + predictRunningLow test.

import { prisma } from '../../src/lib/prisma';
import {
  computeCadenceSnapshot,
  refreshCadenceForIngredient,
  refreshCadenceForUser,
  getCadence,
  predictRunningLow,
  confidenceForSampleCount,
} from '../../src/services/ingredientCadenceService';

const eventFindMany = jest.fn();
const cadenceUpsert = jest.fn();
const cadenceFindUnique = jest.fn();
const cadenceFindMany = jest.fn();

(prisma as any).ingredientEvent = {
  ...((prisma as any).ingredientEvent ?? {}),
  findMany: eventFindMany,
};
(prisma as any).ingredientCadence = {
  ...((prisma as any).ingredientCadence ?? {}),
  upsert: cadenceUpsert,
  findUnique: cadenceFindUnique,
  findMany: cadenceFindMany,
};

beforeEach(() => {
  eventFindMany.mockReset();
  cadenceUpsert.mockReset();
  cadenceFindUnique.mockReset();
  cadenceFindMany.mockReset();
  cadenceUpsert.mockResolvedValue({});
  cadenceFindUnique.mockResolvedValue(null);
  cadenceFindMany.mockResolvedValue([]);
});

const NOW = new Date('2026-05-06T12:00:00Z');
const dayOffset = (d: number) => new Date(NOW.getTime() + d * 86400000);

describe('IG3.1 — confidenceForSampleCount', () => {
  it('cold/medium/high mapping', () => {
    expect(confidenceForSampleCount(0)).toBe('low');
    expect(confidenceForSampleCount(2)).toBe('low');
    expect(confidenceForSampleCount(3)).toBe('medium');
    expect(confidenceForSampleCount(4)).toBe('medium');
    expect(confidenceForSampleCount(5)).toBe('high');
    expect(confidenceForSampleCount(99)).toBe('high');
  });
});

describe('IG3.1 — computeCadenceSnapshot', () => {
  it('returns null for empty userId or ingredient', async () => {
    expect(
      await computeCadenceSnapshot({ userId: '', ingredientName: 'milk' }),
    ).toBeNull();
    expect(
      await computeCadenceSnapshot({ userId: 'u1', ingredientName: '' }),
    ).toBeNull();
  });

  it('returns null when there are no purchase events', async () => {
    eventFindMany.mockResolvedValue([]);
    const snap = await computeCadenceSnapshot({
      userId: 'u1',
      ingredientName: 'milk',
    });
    expect(snap).toBeNull();
  });

  it('computes mean ≈ 7d for evenly-spaced milk purchases', async () => {
    eventFindMany.mockResolvedValue([
      { ingredientName: 'milk', occurredAt: dayOffset(-42) },
      { ingredientName: 'milk', occurredAt: dayOffset(-35) },
      { ingredientName: 'milk', occurredAt: dayOffset(-28) },
      { ingredientName: 'milk', occurredAt: dayOffset(-21) },
      { ingredientName: 'milk', occurredAt: dayOffset(-14) },
      { ingredientName: 'milk', occurredAt: dayOffset(-7) },
    ]);
    const snap = await computeCadenceSnapshot({
      userId: 'u1',
      ingredientName: 'milk',
    });
    expect(snap).not.toBeNull();
    expect(snap!.meanIntervalDays).toBeCloseTo(7, 5);
    expect(snap!.stdDevDays).toBeCloseTo(0, 5);
    expect(snap!.lastPurchasedAt!.toISOString()).toBe(
      dayOffset(-7).toISOString(),
    );
    expect(snap!.sampleCount).toBe(6);
    expect(snap!.confidence).toBe('high');
  });

  it('records cold-start confidence on a single event', async () => {
    eventFindMany.mockResolvedValue([
      { ingredientName: 'eggs', occurredAt: dayOffset(-7) },
    ]);
    const snap = await computeCadenceSnapshot({
      userId: 'u1',
      ingredientName: 'eggs',
    });
    expect(snap!.sampleCount).toBe(1);
    expect(snap!.confidence).toBe('low');
    expect(snap!.meanIntervalDays).toBeNull();
  });

  it('reports nonzero stdDev for noisy intervals', async () => {
    // Intervals of 5, 9, 7, 11 → mean 8, stdDev > 0
    eventFindMany.mockResolvedValue([
      { ingredientName: 'milk', occurredAt: dayOffset(-32) },
      { ingredientName: 'milk', occurredAt: dayOffset(-27) },
      { ingredientName: 'milk', occurredAt: dayOffset(-18) },
      { ingredientName: 'milk', occurredAt: dayOffset(-11) },
      { ingredientName: 'milk', occurredAt: dayOffset(0) },
    ]);
    const snap = await computeCadenceSnapshot({
      userId: 'u1',
      ingredientName: 'milk',
    });
    expect(snap!.meanIntervalDays).toBeCloseTo(8, 5);
    expect(snap!.stdDevDays).toBeGreaterThan(1);
  });
});

describe('IG3.1 — refreshCadenceForIngredient', () => {
  it('upserts on the (userId, ingredientName) unique key', async () => {
    eventFindMany.mockResolvedValue([
      { ingredientName: 'milk', occurredAt: dayOffset(-14) },
      { ingredientName: 'milk', occurredAt: dayOffset(-7) },
    ]);
    await refreshCadenceForIngredient({
      userId: 'u1',
      ingredientName: 'milk',
    });
    expect(cadenceUpsert).toHaveBeenCalledTimes(1);
    const args = cadenceUpsert.mock.calls[0][0];
    expect(args.where.userId_ingredientName).toEqual({
      userId: 'u1',
      ingredientName: 'milk',
    });
    expect(args.create.meanIntervalDays).toBeCloseTo(7);
  });

  it('returns null without upserting when no events', async () => {
    eventFindMany.mockResolvedValue([]);
    const result = await refreshCadenceForIngredient({
      userId: 'u1',
      ingredientName: 'milk',
    });
    expect(result).toBeNull();
    expect(cadenceUpsert).not.toHaveBeenCalled();
  });
});

describe('IG3.1 — refreshCadenceForUser', () => {
  it('rejects empty userId', async () => {
    await expect(refreshCadenceForUser({ userId: '' })).rejects.toThrow(
      /userId/,
    );
  });

  it('refreshes once per distinct ingredient', async () => {
    // distinct call returns 2 ingredients
    eventFindMany.mockImplementationOnce(() =>
      Promise.resolve([
        { ingredientName: 'milk' },
        { ingredientName: 'eggs' },
      ]),
    );
    // subsequent per-ingredient calls return events
    eventFindMany.mockImplementation(() =>
      Promise.resolve([
        { ingredientName: 'x', occurredAt: dayOffset(-14) },
        { ingredientName: 'x', occurredAt: dayOffset(-7) },
      ]),
    );
    const n = await refreshCadenceForUser({ userId: 'u1' });
    expect(n).toBe(2);
    expect(cadenceUpsert).toHaveBeenCalledTimes(2);
  });
});

describe('IG3.1 — getCadence', () => {
  it('returns null on empty input', async () => {
    expect(await getCadence('', 'milk')).toBeNull();
    expect(await getCadence('u1', '')).toBeNull();
  });

  it('reads the snapshot via the unique key', async () => {
    cadenceFindUnique.mockResolvedValue({
      userId: 'u1',
      ingredientName: 'milk',
      meanIntervalDays: 7,
      stdDevDays: 1,
      lastPurchasedAt: dayOffset(-3),
      sampleCount: 5,
      confidence: 'high',
    });
    const snap = await getCadence('u1', 'milk');
    expect(snap!.meanIntervalDays).toBe(7);
    expect(snap!.confidence).toBe('high');
  });
});

describe('IG3.2 — predictRunningLow', () => {
  it('returns [] for empty userId', async () => {
    expect(await predictRunningLow({ userId: '' })).toEqual([]);
    expect(cadenceFindMany).not.toHaveBeenCalled();
  });

  it('flags high-confidence ingredient at ratio 0.85', async () => {
    cadenceFindMany.mockResolvedValue([
      {
        ingredientName: 'milk',
        meanIntervalDays: 7,
        lastPurchasedAt: dayOffset(-6), // ratio = 6/7 ≈ 0.857
        confidence: 'high',
      },
    ]);
    const out = await predictRunningLow({ userId: 'u1', asOfDate: NOW });
    expect(out).toHaveLength(1);
    expect(out[0].ingredientName).toBe('milk');
    expect(out[0].ratio).toBeCloseTo(6 / 7);
  });

  it('does NOT flag high-confidence ingredient below 0.85', async () => {
    cadenceFindMany.mockResolvedValue([
      {
        ingredientName: 'milk',
        meanIntervalDays: 7,
        lastPurchasedAt: dayOffset(-3), // ratio = 0.43
        confidence: 'high',
      },
    ]);
    const out = await predictRunningLow({ userId: 'u1', asOfDate: NOW });
    expect(out).toEqual([]);
  });

  it('low-confidence requires ratio ≥ 1.05 (avoid false alarms)', async () => {
    cadenceFindMany.mockResolvedValue([
      {
        ingredientName: 'eggs',
        meanIntervalDays: 14,
        lastPurchasedAt: dayOffset(-14), // ratio = 1.0 — below 1.05 floor
        confidence: 'low',
      },
    ]);
    expect(
      await predictRunningLow({ userId: 'u1', asOfDate: NOW }),
    ).toEqual([]);

    cadenceFindMany.mockResolvedValue([
      {
        ingredientName: 'eggs',
        meanIntervalDays: 14,
        lastPurchasedAt: dayOffset(-15), // ratio = 1.07 — past floor
        confidence: 'low',
      },
    ]);
    expect(
      (await predictRunningLow({ userId: 'u1', asOfDate: NOW })).length,
    ).toBe(1);
  });

  it('orders most-overdue first', async () => {
    cadenceFindMany.mockResolvedValue([
      {
        ingredientName: 'milk',
        meanIntervalDays: 7,
        lastPurchasedAt: dayOffset(-7), // ratio 1.0
        confidence: 'high',
      },
      {
        ingredientName: 'eggs',
        meanIntervalDays: 14,
        lastPurchasedAt: dayOffset(-21), // ratio 1.5
        confidence: 'high',
      },
    ]);
    const out = await predictRunningLow({ userId: 'u1', asOfDate: NOW });
    expect(out.map((i) => i.ingredientName)).toEqual(['eggs', 'milk']);
  });

  it('respects pantryNames filter', async () => {
    cadenceFindMany.mockResolvedValue([]);
    await predictRunningLow({
      userId: 'u1',
      asOfDate: NOW,
      pantryNames: ['milk', 'eggs'],
    });
    const where = cadenceFindMany.mock.calls[0][0].where;
    expect(where.ingredientName).toEqual({ in: ['milk', 'eggs'] });
  });

  it('skips rows with non-positive meanIntervalDays', async () => {
    cadenceFindMany.mockResolvedValue([
      {
        ingredientName: 'mystery',
        meanIntervalDays: 0,
        lastPurchasedAt: dayOffset(-30),
        confidence: 'high',
      },
    ]);
    expect(
      await predictRunningLow({ userId: 'u1', asOfDate: NOW }),
    ).toEqual([]);
  });
});
