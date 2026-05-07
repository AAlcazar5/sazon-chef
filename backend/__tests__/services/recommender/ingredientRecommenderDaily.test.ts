// ROADMAP 4.0 IG9.2 — Daily rollup test.
//
// Aggregates the unified `recommenderEvent` stream (ingredient surfaces only)
// into per-user-per-day acceptance rates per source. Idempotent re-run; raw
// events have a 90-day TTL but the daily roll-up is retained indefinitely.

import {
  rollupForDate,
  rollupForUserRange,
  __INTERNALS,
} from '../../../src/services/recommender/ingredientRecommenderDaily';
import { prisma } from '../../../src/lib/prisma';

const findMany = jest.fn();
const upsert = jest.fn();
(prisma as any).recommenderEvent = { findMany };
(prisma as any).ingredientRecommenderDaily = { upsert };

beforeEach(() => {
  findMany.mockReset();
  upsert.mockReset();
  upsert.mockResolvedValue({});
});

const USER = 'user-1';
const DATE = new Date('2026-05-07T00:00:00.000Z');

function event(opts: {
  surface: string;
  eventType: string;
  source: string;
  asOf?: Date;
  suggestedItem?: string;
}) {
  return {
    asOf: opts.asOf ?? new Date('2026-05-07T12:00:00.000Z'),
    contextSnapshot: JSON.stringify({
      surface: opts.surface,
      eventType: opts.eventType,
      metadata: {
        source: opts.source,
        suggestedItem: opts.suggestedItem ?? 'cilantro',
      },
    }),
  };
}

describe('IG9.2 — rollupForDate', () => {
  it('aggregates events into per-source counts', async () => {
    findMany.mockResolvedValue([
      event({ surface: 'ingredient_recommend', eventType: 'impression', source: 'cadence' }),
      event({ surface: 'ingredient_recommend', eventType: 'impression', source: 'cadence' }),
      event({ surface: 'ingredient_recommend', eventType: 'tap', source: 'cadence' }),
      event({ surface: 'ingredient_recommend', eventType: 'accept', source: 'cadence' }),
      event({ surface: 'ingredient_co_purchase', eventType: 'impression', source: 'co_purchase' }),
      event({ surface: 'ingredient_co_purchase', eventType: 'dismiss', source: 'co_purchase' }),
    ]);
    const summary = await rollupForDate({ userId: USER, date: DATE });
    expect(summary.upsertedSources).toEqual(
      expect.arrayContaining(['cadence', 'co_purchase']),
    );
    expect(upsert).toHaveBeenCalledTimes(2);
    const cadenceCall = upsert.mock.calls.find(
      (c) => c[0].create.source === 'cadence',
    );
    expect(cadenceCall[0].create).toMatchObject({
      userId: USER,
      source: 'cadence',
      impressions: 2,
      taps: 1,
      accepts: 1,
      dismisses: 0,
      acceptanceRate: 0.5,
    });
    const copCall = upsert.mock.calls.find(
      (c) => c[0].create.source === 'co_purchase',
    );
    expect(copCall[0].create).toMatchObject({
      impressions: 1,
      dismisses: 1,
      acceptanceRate: 0,
    });
  });

  it('includes pantry_iq events alongside ingredient surfaces', async () => {
    findMany.mockResolvedValue([
      event({ surface: 'pantry_iq', eventType: 'impression', source: 'cultural' }),
      event({ surface: 'pantry_iq', eventType: 'tap', source: 'cultural' }),
      event({ surface: 'pantry_iq', eventType: 'accept', source: 'cultural' }),
    ]);
    await rollupForDate({ userId: USER, date: DATE });
    expect(upsert).toHaveBeenCalledTimes(1);
    const args = upsert.mock.calls[0][0];
    expect(args.create.source).toBe('cultural');
    expect(args.create.impressions).toBe(1);
    expect(args.create.accepts).toBe(1);
    expect(args.create.acceptanceRate).toBe(1);
  });

  it('ignores non-ingredient surfaces', async () => {
    findMany.mockResolvedValue([
      event({ surface: 'today_hero', eventType: 'impression', source: 'cadence' }),
      event({ surface: 'week_slot', eventType: 'tap', source: 'cadence' }),
    ]);
    const summary = await rollupForDate({ userId: USER, date: DATE });
    expect(summary.upsertedSources).toEqual([]);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('skips events with malformed contextSnapshot JSON', async () => {
    findMany.mockResolvedValue([
      { asOf: DATE, contextSnapshot: '{not-json' },
      event({ surface: 'ingredient_recommend', eventType: 'impression', source: 'cadence' }),
    ]);
    const summary = await rollupForDate({ userId: USER, date: DATE });
    expect(summary.skipped).toBe(1);
    expect(summary.upsertedSources).toEqual(['cadence']);
  });

  it('skips events missing source metadata', async () => {
    findMany.mockResolvedValue([
      {
        asOf: DATE,
        contextSnapshot: JSON.stringify({
          surface: 'ingredient_recommend',
          eventType: 'impression',
          metadata: {},
        }),
      },
    ]);
    const summary = await rollupForDate({ userId: USER, date: DATE });
    expect(summary.upsertedSources).toEqual([]);
    expect(summary.skipped).toBe(1);
  });

  it('queries the day window in UTC [start, next-day-start)', async () => {
    findMany.mockResolvedValue([]);
    await rollupForDate({ userId: USER, date: DATE });
    expect(findMany).toHaveBeenCalledTimes(1);
    const where = findMany.mock.calls[0][0].where;
    expect(where.userId).toBe(USER);
    expect(where.asOf.gte).toEqual(DATE);
    const next = new Date(DATE);
    next.setUTCDate(next.getUTCDate() + 1);
    expect(where.asOf.lt).toEqual(next);
  });

  it('idempotent: re-running with same events produces same upsert payloads', async () => {
    const events = [
      event({ surface: 'ingredient_recommend', eventType: 'impression', source: 'cadence' }),
      event({ surface: 'ingredient_recommend', eventType: 'accept', source: 'cadence' }),
    ];
    findMany.mockResolvedValue(events);
    await rollupForDate({ userId: USER, date: DATE });
    const firstPayload = upsert.mock.calls[0][0];
    upsert.mockClear();
    findMany.mockResolvedValue(events);
    await rollupForDate({ userId: USER, date: DATE });
    expect(upsert.mock.calls[0][0]).toEqual(firstPayload);
  });

  it('upsert update path uses set semantics (not increment) so re-runs don\'t double-count', async () => {
    findMany.mockResolvedValue([
      event({ surface: 'ingredient_recommend', eventType: 'impression', source: 'cadence' }),
    ]);
    await rollupForDate({ userId: USER, date: DATE });
    const args = upsert.mock.calls[0][0];
    expect(args.update).toMatchObject({
      impressions: 1,
      taps: 0,
      accepts: 0,
      dismisses: 0,
    });
    expect(args.update.impressions).not.toEqual({ increment: 1 });
  });

  it('rejects empty userId', async () => {
    await expect(
      rollupForDate({ userId: '', date: DATE }),
    ).rejects.toThrow(/userId/);
  });

  it('aggregates 50 mixed events correctly per source', async () => {
    // 30 cadence (15 impr / 8 tap / 7 accept), 20 co_purchase (10 impr / 6 accept / 4 dismiss)
    const events: ReturnType<typeof event>[] = [];
    for (let i = 0; i < 15; i += 1)
      events.push(event({ surface: 'ingredient_recommend', eventType: 'impression', source: 'cadence' }));
    for (let i = 0; i < 8; i += 1)
      events.push(event({ surface: 'ingredient_recommend', eventType: 'tap', source: 'cadence' }));
    for (let i = 0; i < 7; i += 1)
      events.push(event({ surface: 'ingredient_recommend', eventType: 'accept', source: 'cadence' }));
    for (let i = 0; i < 10; i += 1)
      events.push(event({ surface: 'ingredient_co_purchase', eventType: 'impression', source: 'co_purchase' }));
    for (let i = 0; i < 6; i += 1)
      events.push(event({ surface: 'ingredient_co_purchase', eventType: 'accept', source: 'co_purchase' }));
    for (let i = 0; i < 4; i += 1)
      events.push(event({ surface: 'ingredient_co_purchase', eventType: 'dismiss', source: 'co_purchase' }));
    findMany.mockResolvedValue(events);
    await rollupForDate({ userId: USER, date: DATE });
    expect(upsert).toHaveBeenCalledTimes(2);
    const cadence = upsert.mock.calls.find((c) => c[0].create.source === 'cadence')[0].create;
    expect(cadence.impressions).toBe(15);
    expect(cadence.accepts).toBe(7);
    expect(cadence.acceptanceRate).toBeCloseTo(7 / 15, 4);
    const cop = upsert.mock.calls.find((c) => c[0].create.source === 'co_purchase')[0].create;
    expect(cop.impressions).toBe(10);
    expect(cop.accepts).toBe(6);
    expect(cop.dismisses).toBe(4);
    expect(cop.acceptanceRate).toBeCloseTo(0.6, 4);
  });
});

describe('IG9.2 — rollupForUserRange', () => {
  it('rolls up each day in the range', async () => {
    findMany.mockResolvedValue([]);
    const start = new Date('2026-05-05T00:00:00.000Z');
    const end = new Date('2026-05-07T00:00:00.000Z');
    await rollupForUserRange({ userId: USER, start, end });
    expect(findMany).toHaveBeenCalledTimes(3);
  });

  it('rejects inverted range', async () => {
    await expect(
      rollupForUserRange({
        userId: USER,
        start: new Date('2026-05-07T00:00:00.000Z'),
        end: new Date('2026-05-05T00:00:00.000Z'),
      }),
    ).rejects.toThrow(/range/);
  });
});

describe('IG9.2 — INTERNALS', () => {
  it('publishes the surface allowlist', () => {
    expect(__INTERNALS.INGREDIENT_SURFACES).toEqual(
      expect.arrayContaining([
        'ingredient_recommend',
        'ingredient_co_purchase',
        'pantry_iq',
      ]),
    );
  });

  it('publishes the source allowlist', () => {
    expect(__INTERNALS.KNOWN_SOURCES).toEqual(
      expect.arrayContaining([
        'cadence',
        'co_purchase',
        'embedding',
        'static',
        'user',
        'crowd',
        'cultural',
      ]),
    );
  });
});
