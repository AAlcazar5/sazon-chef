// backend/__tests__/services/userSignalCoverageService.test.ts
// ROADMAP 4.0 Tier B1 — Per-user signal-coverage telemetry (TDD).

import {
  computeUserSignalSnapshot,
  isLowSignal,
} from '../../src/services/userSignalCoverageService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  if (!mockPrisma.cookingLog) {
    mockPrisma.cookingLog = { count: jest.fn() };
  } else {
    mockPrisma.cookingLog.count = jest.fn();
  }
  if (!mockPrisma.recipeFeedback) {
    mockPrisma.recipeFeedback = { count: jest.fn() };
  } else if (!mockPrisma.recipeFeedback.count) {
    mockPrisma.recipeFeedback.count = jest.fn();
  } else {
    mockPrisma.recipeFeedback.count = jest.fn();
  }
  if (!mockPrisma.cravingSearchEvent) {
    mockPrisma.cravingSearchEvent = { count: jest.fn() };
  } else {
    mockPrisma.cravingSearchEvent.count = jest.fn();
  }
  if (!mockPrisma.leftoverInventory) {
    mockPrisma.leftoverInventory = { count: jest.fn() };
  } else {
    mockPrisma.leftoverInventory.count = jest.fn();
  }
  if (!mockPrisma.userSignalSnapshot) {
    mockPrisma.userSignalSnapshot = {
      upsert: jest.fn(),
      findFirst: jest.fn(),
    };
  } else {
    mockPrisma.userSignalSnapshot.upsert = jest.fn();
    mockPrisma.userSignalSnapshot.findFirst = jest.fn();
  }
});

describe('computeUserSignalSnapshot', () => {
  it('counts cooks from CookingLog within the window', async () => {
    mockPrisma.cookingLog.count.mockResolvedValue(5);
    mockPrisma.recipeFeedback.count.mockResolvedValue(0);
    mockPrisma.cravingSearchEvent.count.mockResolvedValue(0);
    mockPrisma.leftoverInventory.count.mockResolvedValue(0);
    mockPrisma.userSignalSnapshot.upsert.mockImplementation(async ({ create }: any) => create);

    const snap = await computeUserSignalSnapshot('user-1', 7);

    expect(snap.cooks).toBe(5);
    expect(snap.totalSignals).toBe(5);
    const where = mockPrisma.cookingLog.count.mock.calls[0][0].where;
    expect(where.userId).toBe('user-1');
    expect(where.cookedAt).toBeDefined();
  });

  it('counts ratings from RecipeFeedback within the window', async () => {
    mockPrisma.cookingLog.count.mockResolvedValue(0);
    mockPrisma.recipeFeedback.count
      .mockResolvedValueOnce(3) // ratings
      .mockResolvedValueOnce(2); // taste-feedback subset
    mockPrisma.cravingSearchEvent.count.mockResolvedValue(0);
    mockPrisma.leftoverInventory.count.mockResolvedValue(0);
    mockPrisma.userSignalSnapshot.upsert.mockImplementation(async ({ create }: any) => create);

    const snap = await computeUserSignalSnapshot('user-2', 7);

    expect(snap.ratings).toBe(3);
    expect(snap.tasteFeedback).toBe(2);
  });

  it('counts cravingSearches from CravingSearchEvent', async () => {
    mockPrisma.cookingLog.count.mockResolvedValue(0);
    mockPrisma.recipeFeedback.count.mockResolvedValue(0);
    mockPrisma.cravingSearchEvent.count.mockResolvedValue(7);
    mockPrisma.leftoverInventory.count.mockResolvedValue(0);
    mockPrisma.userSignalSnapshot.upsert.mockImplementation(async ({ create }: any) => create);

    const snap = await computeUserSignalSnapshot('user-3', 30);
    expect(snap.cravingSearches).toBe(7);
  });

  it('counts leftoverDecisions from LeftoverInventory', async () => {
    mockPrisma.cookingLog.count.mockResolvedValue(0);
    mockPrisma.recipeFeedback.count.mockResolvedValue(0);
    mockPrisma.cravingSearchEvent.count.mockResolvedValue(0);
    mockPrisma.leftoverInventory.count.mockResolvedValue(2);
    mockPrisma.userSignalSnapshot.upsert.mockImplementation(async ({ create }: any) => create);

    const snap = await computeUserSignalSnapshot('user-4', 7);
    expect(snap.leftoverDecisions).toBe(2);
  });

  it('totalSignals sums all signal counts', async () => {
    mockPrisma.cookingLog.count.mockResolvedValue(4);
    mockPrisma.recipeFeedback.count
      .mockResolvedValueOnce(3) // ratings
      .mockResolvedValueOnce(2); // taste feedback
    mockPrisma.cravingSearchEvent.count.mockResolvedValue(5);
    mockPrisma.leftoverInventory.count.mockResolvedValue(1);
    mockPrisma.userSignalSnapshot.upsert.mockImplementation(async ({ create }: any) => create);

    const snap = await computeUserSignalSnapshot('user-5', 7);
    // 4 cooks + 3 ratings + 2 tasteFeedback + 5 cravingSearches + 1 leftoverDecisions = 15
    expect(snap.totalSignals).toBe(15);
  });

  it('defaults missing signals to 0 (swaps, utterances, photoUploads, preCookCheckIns, postCookNutritionViews)', async () => {
    mockPrisma.cookingLog.count.mockResolvedValue(2);
    mockPrisma.recipeFeedback.count.mockResolvedValue(0);
    mockPrisma.cravingSearchEvent.count.mockResolvedValue(0);
    mockPrisma.leftoverInventory.count.mockResolvedValue(0);
    mockPrisma.userSignalSnapshot.upsert.mockImplementation(async ({ create }: any) => create);

    const snap = await computeUserSignalSnapshot('user-6', 7);
    expect(snap.swaps).toBe(0);
    expect(snap.utterances).toBe(0);
    expect(snap.photoUploads).toBe(0);
    expect(snap.preCookCheckIns).toBe(0);
    expect(snap.postCookNutritionViews).toBe(0);
  });

  it('persists the snapshot via upsert', async () => {
    mockPrisma.cookingLog.count.mockResolvedValue(1);
    mockPrisma.recipeFeedback.count.mockResolvedValue(0);
    mockPrisma.cravingSearchEvent.count.mockResolvedValue(0);
    mockPrisma.leftoverInventory.count.mockResolvedValue(0);
    mockPrisma.userSignalSnapshot.upsert.mockImplementation(async ({ create }: any) => create);

    await computeUserSignalSnapshot('user-7', 30);

    expect(mockPrisma.userSignalSnapshot.upsert).toHaveBeenCalledTimes(1);
    const args = mockPrisma.userSignalSnapshot.upsert.mock.calls[0][0];
    expect(args.create.userId).toBe('user-7');
    expect(args.create.period).toBe(30);
  });

  it('honors the asOf parameter when computing window bounds', async () => {
    mockPrisma.cookingLog.count.mockResolvedValue(0);
    mockPrisma.recipeFeedback.count.mockResolvedValue(0);
    mockPrisma.cravingSearchEvent.count.mockResolvedValue(0);
    mockPrisma.leftoverInventory.count.mockResolvedValue(0);
    mockPrisma.userSignalSnapshot.upsert.mockImplementation(async ({ create }: any) => create);

    const asOf = new Date('2026-05-04T00:00:00Z');
    await computeUserSignalSnapshot('user-8', 7, asOf);

    const where = mockPrisma.cookingLog.count.mock.calls[0][0].where;
    const since = where.cookedAt.gte as Date;
    // Should be 7 days before asOf
    const expectedSince = new Date(asOf.getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(since.getTime()).toBe(expectedSince.getTime());
  });

  it('throws when period is not positive', async () => {
    await expect(computeUserSignalSnapshot('user', 0)).rejects.toThrow();
    await expect(computeUserSignalSnapshot('user', -7)).rejects.toThrow();
  });
});

describe('isLowSignal', () => {
  it('flags 7-day snapshot with totalSignals < 5 as low signal', () => {
    expect(isLowSignal({ period: 7, totalSignals: 4 } as any)).toBe(true);
    expect(isLowSignal({ period: 7, totalSignals: 5 } as any)).toBe(false);
  });

  it('flags 30-day snapshot with totalSignals < 15 as low signal', () => {
    expect(isLowSignal({ period: 30, totalSignals: 14 } as any)).toBe(true);
    expect(isLowSignal({ period: 30, totalSignals: 15 } as any)).toBe(false);
  });

  it('flags 90-day snapshot with totalSignals < 30 as low signal', () => {
    expect(isLowSignal({ period: 90, totalSignals: 29 } as any)).toBe(true);
    expect(isLowSignal({ period: 90, totalSignals: 30 } as any)).toBe(false);
  });

  it('returns true for unknown period (conservative default — flag for review)', () => {
    expect(isLowSignal({ period: 14, totalSignals: 100 } as any)).toBe(true);
  });
});
