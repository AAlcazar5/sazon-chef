// backend/__tests__/services/churnTraceService.test.ts
// ROADMAP 4.0 Tier B5 — Churn-trace replay (TDD).

import {
  getChurnTrace,
  findChurnedUsers,
  redactPii,
} from '../../src/services/churnTraceService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  if (!mockPrisma.user) {
    mockPrisma.user = { findUnique: jest.fn(), findMany: jest.fn() };
  } else {
    mockPrisma.user.findUnique = jest.fn();
    mockPrisma.user.findMany = jest.fn();
  }
  if (!mockPrisma.cookingLog) {
    mockPrisma.cookingLog = { findMany: jest.fn() };
  } else {
    mockPrisma.cookingLog.findMany = jest.fn();
  }
  if (!mockPrisma.recipeFeedback) {
    mockPrisma.recipeFeedback = { findMany: jest.fn() };
  } else {
    mockPrisma.recipeFeedback.findMany = jest.fn();
  }
  if (!mockPrisma.cravingSearchEvent) {
    mockPrisma.cravingSearchEvent = { findMany: jest.fn() };
  } else {
    mockPrisma.cravingSearchEvent.findMany = jest.fn();
  }
  if (!mockPrisma.surfaceEvent) {
    mockPrisma.surfaceEvent = { findMany: jest.fn() };
  } else {
    mockPrisma.surfaceEvent.findMany = jest.fn();
  }
  if (!mockPrisma.leftoverInventory) {
    mockPrisma.leftoverInventory = { findMany: jest.fn() };
  } else {
    mockPrisma.leftoverInventory.findMany = jest.fn();
  }
});

describe('redactPii', () => {
  it('masks email keeping first 2 chars + domain', () => {
    expect(redactPii({ email: 'alice@example.com' }).email).toBe('al****@example.com');
    expect(redactPii({ email: 'a@example.com' }).email).toBe('***@example.com');
  });

  it('keeps only the first name (drops last name)', () => {
    expect(redactPii({ name: 'Alice Hooper' }).name).toBe('Alice');
    expect(redactPii({ name: 'Bob' }).name).toBe('Bob');
  });

  it('strips ip + phone fields entirely', () => {
    const result = redactPii({ email: 'x@y.com', name: 'Z', ip: '1.2.3.4', phone: '555-1212' } as any);
    expect((result as any).ip).toBeUndefined();
    expect((result as any).phone).toBeUndefined();
  });

  it('returns the input unchanged when no PII fields present', () => {
    const input = { id: 'u1' } as any;
    const result = redactPii(input);
    expect(result).toEqual({ id: 'u1' });
  });
});

describe('findChurnedUsers', () => {
  it('returns users whose lastActiveAt is older than churnThresholdDays', async () => {
    const asOf = new Date('2026-05-04T00:00:00Z');
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'u-churned', lastActiveAt: new Date('2026-04-15T00:00:00Z'), email: 'a@b.com', name: 'Alice Hooper' },
    ]);
    const churned = await findChurnedUsers({ asOfDate: asOf, churnThresholdDays: 14 });
    expect(churned).toHaveLength(1);
    expect(churned[0].id).toBe('u-churned');
  });

  it('passes an "lt" filter on lastActiveAt to Prisma', async () => {
    const asOf = new Date('2026-05-04T00:00:00Z');
    mockPrisma.user.findMany.mockResolvedValue([]);
    await findChurnedUsers({ asOfDate: asOf, churnThresholdDays: 14 });
    const args = mockPrisma.user.findMany.mock.calls[0][0];
    expect(args.where.lastActiveAt).toBeDefined();
    expect(args.where.lastActiveAt.lt).toBeInstanceOf(Date);
  });

  it('returns redacted user fields (email masked, name first-only)', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'u1', lastActiveAt: new Date('2026-04-01'), email: 'alice@x.com', name: 'Alice Hooper' },
    ]);
    const churned = await findChurnedUsers({ asOfDate: new Date('2026-05-04'), churnThresholdDays: 14 });
    expect(churned[0].email).toBe('al****@x.com');
    expect(churned[0].name).toBe('Alice');
  });
});

describe('getChurnTrace', () => {
  const asOf = new Date('2026-05-04T00:00:00Z');

  beforeEach(() => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u-1',
      email: 'alice@x.com',
      name: 'Alice Hooper',
      lastActiveAt: new Date('2026-04-15'),
    });
    mockPrisma.cookingLog.findMany.mockResolvedValue([]);
    mockPrisma.recipeFeedback.findMany.mockResolvedValue([]);
    mockPrisma.cravingSearchEvent.findMany.mockResolvedValue([]);
    mockPrisma.surfaceEvent.findMany.mockResolvedValue([]);
    mockPrisma.leftoverInventory.findMany.mockResolvedValue([]);
  });

  it('throws when the user does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(
      getChurnTrace({ userId: 'unknown', asOfDate: asOf })
    ).rejects.toThrow(/not found/i);
  });

  it('returns redacted user fields in the response', async () => {
    const trace = await getChurnTrace({ userId: 'u-1', asOfDate: asOf });
    expect(trace.user.email).toBe('al****@x.com');
    expect(trace.user.name).toBe('Alice');
  });

  it('only includes events within the lookback window (default 14 days)', async () => {
    const inWindow = new Date('2026-04-25T00:00:00Z');
    const outOfWindow = new Date('2026-04-10T00:00:00Z'); // 24 days ago
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      { id: 'c1', recipeId: 'r1', cookedAt: inWindow, notes: null },
      { id: 'c2', recipeId: 'r2', cookedAt: outOfWindow, notes: null },
    ]);

    const trace = await getChurnTrace({ userId: 'u-1', asOfDate: asOf, lookbackDays: 14 });

    // Verify Prisma was queried with a 14d-ago lower bound
    const cookCall = mockPrisma.cookingLog.findMany.mock.calls[0][0];
    const expectedSince = new Date(asOf.getTime() - 14 * 24 * 60 * 60 * 1000);
    expect((cookCall.where.cookedAt as any).gte.getTime()).toBe(expectedSince.getTime());
  });

  it('flags a 1-star (disliked) RecipeFeedback as a NOT-ADAPTED signal', async () => {
    mockPrisma.recipeFeedback.findMany.mockResolvedValue([
      {
        id: 'rf1',
        recipeId: 'r-thai',
        liked: false,
        disliked: true,
        consumed: false,
        dislikeReason: 'not_my_style',
        createdAt: new Date('2026-04-25'),
      },
    ]);

    const trace = await getChurnTrace({ userId: 'u-1', asOfDate: asOf });
    const flag = trace.notAdaptedSignals.find((s) => s.kind === 'disliked-without-down-rank');
    expect(flag).toBeDefined();
    expect(flag?.recipeId).toBe('r-thai');
  });

  it('flags an expired leftover that was never surfaced as a NOT-ADAPTED signal', async () => {
    mockPrisma.leftoverInventory.findMany.mockResolvedValue([
      {
        id: 'l1',
        componentId: 'c1',
        slot: 'protein',
        portionsRemaining: 1,
        createdAt: new Date('2026-04-25'),
        expiresAt: new Date('2026-04-30'), // expired before asOf
      },
    ]);

    const trace = await getChurnTrace({ userId: 'u-1', asOfDate: asOf });
    const flag = trace.notAdaptedSignals.find((s) => s.kind === 'expired-leftover-not-surfaced');
    expect(flag).toBeDefined();
  });

  it('returns events sorted chronologically (newest first)', async () => {
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      { id: 'c-old', recipeId: 'r1', cookedAt: new Date('2026-04-20'), notes: null },
      { id: 'c-new', recipeId: 'r2', cookedAt: new Date('2026-04-30'), notes: null },
    ]);
    mockPrisma.recipeFeedback.findMany.mockResolvedValue([
      { id: 'rf-mid', recipeId: 'r3', liked: true, disliked: false, consumed: true, createdAt: new Date('2026-04-25') },
    ]);

    const trace = await getChurnTrace({ userId: 'u-1', asOfDate: asOf });
    expect(trace.events.length).toBeGreaterThanOrEqual(3);
    // Newest first
    for (let i = 0; i < trace.events.length - 1; i++) {
      expect(trace.events[i].at.getTime()).toBeGreaterThanOrEqual(trace.events[i + 1].at.getTime());
    }
  });

  it('returns an empty events array + empty notAdaptedSignals when no activity in window', async () => {
    const trace = await getChurnTrace({ userId: 'u-1', asOfDate: asOf });
    expect(trace.events).toEqual([]);
    expect(trace.notAdaptedSignals).toEqual([]);
  });

  it('exposes the lookback window in the response', async () => {
    const trace = await getChurnTrace({ userId: 'u-1', asOfDate: asOf, lookbackDays: 14 });
    expect(trace.lookbackDays).toBe(14);
    expect(trace.windowSince.getTime()).toBe(asOf.getTime() - 14 * 24 * 60 * 60 * 1000);
  });
});
