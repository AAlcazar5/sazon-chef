// backend/__tests__/services/dailyCheckInService.test.ts
// ROADMAP 4.0 Tier C7 — Daily check-in (TDD).

import {
  validateCheckInInput,
  upsertDailyCheckIn,
  getRecentCheckIns,
  computeAdaptationSignal,
} from '../../src/services/dailyCheckInService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  if (!mockPrisma.dailyCheckIn) {
    mockPrisma.dailyCheckIn = {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    };
  } else {
    mockPrisma.dailyCheckIn.upsert = jest.fn();
    mockPrisma.dailyCheckIn.findMany = jest.fn();
    mockPrisma.dailyCheckIn.findUnique = jest.fn();
  }
});

describe('validateCheckInInput', () => {
  it('passes a fully populated valid input', () => {
    expect(() =>
      validateCheckInInput({
        userId: 'u1',
        date: new Date(),
        hungerNow: 3,
        energyAtLastMeal: 4,
        satietyFromYesterday: 4,
        reflectionText: 'felt great',
      })
    ).not.toThrow();
  });

  it('passes when only reflection is provided (skip is allowed)', () => {
    expect(() =>
      validateCheckInInput({
        userId: 'u1',
        date: new Date(),
        reflectionText: 'felt fine',
      })
    ).not.toThrow();
  });

  it('throws on empty userId', () => {
    expect(() =>
      validateCheckInInput({ userId: '', date: new Date() })
    ).toThrow(/userId/i);
  });

  it('throws on Likert values outside 1..5', () => {
    expect(() =>
      validateCheckInInput({
        userId: 'u1',
        date: new Date(),
        hungerNow: 0,
      })
    ).toThrow(/hunger/i);
    expect(() =>
      validateCheckInInput({
        userId: 'u1',
        date: new Date(),
        energyAtLastMeal: 6,
      })
    ).toThrow(/energy/i);
    expect(() =>
      validateCheckInInput({
        userId: 'u1',
        date: new Date(),
        satietyFromYesterday: -1,
      })
    ).toThrow(/satiety/i);
  });

  it('throws when reflection text exceeds 500 chars', () => {
    expect(() =>
      validateCheckInInput({
        userId: 'u1',
        date: new Date(),
        reflectionText: 'x'.repeat(501),
      })
    ).toThrow(/reflection/i);
  });
});

describe('upsertDailyCheckIn', () => {
  it('upserts on (userId, date) — one row per user per day', async () => {
    mockPrisma.dailyCheckIn.upsert.mockResolvedValue({ id: 'ci-1' });
    const date = new Date('2026-05-04T00:00:00Z');
    await upsertDailyCheckIn({
      userId: 'u1',
      date,
      hungerNow: 3,
      reflectionText: 'felt great',
    });
    expect(mockPrisma.dailyCheckIn.upsert).toHaveBeenCalledTimes(1);
    const args = mockPrisma.dailyCheckIn.upsert.mock.calls[0][0];
    expect(args.where.userId_date).toEqual({ userId: 'u1', date });
  });

  it('persists nutritionSnapshot as JSON string when provided', async () => {
    mockPrisma.dailyCheckIn.upsert.mockResolvedValue({ id: 'ci-2' });
    await upsertDailyCheckIn({
      userId: 'u1',
      date: new Date(),
      nutritionSnapshot: { calories: 1800, protein: 120 },
    });
    const args = mockPrisma.dailyCheckIn.upsert.mock.calls[0][0];
    expect(typeof args.create.nutritionSnapshot).toBe('string');
    expect(JSON.parse(args.create.nutritionSnapshot)).toEqual({ calories: 1800, protein: 120 });
  });

  it('rejects invalid input before hitting the DB', async () => {
    await expect(
      upsertDailyCheckIn({
        userId: '',
        date: new Date(),
      })
    ).rejects.toThrow(/userId/i);
    expect(mockPrisma.dailyCheckIn.upsert).not.toHaveBeenCalled();
  });
});

describe('getRecentCheckIns', () => {
  it('returns rows in date-desc order limited by `limit`', async () => {
    mockPrisma.dailyCheckIn.findMany.mockResolvedValue([
      { id: '3', date: new Date('2026-05-04') },
      { id: '2', date: new Date('2026-05-03') },
      { id: '1', date: new Date('2026-05-02') },
    ]);
    const rows = await getRecentCheckIns('u1', 3);
    expect(rows).toHaveLength(3);
    const args = mockPrisma.dailyCheckIn.findMany.mock.calls[0][0];
    expect(args.orderBy.date).toBe('desc');
    expect(args.take).toBe(3);
  });

  it('defaults limit to 7 when not provided', async () => {
    mockPrisma.dailyCheckIn.findMany.mockResolvedValue([]);
    await getRecentCheckIns('u1');
    const args = mockPrisma.dailyCheckIn.findMany.mock.calls[0][0];
    expect(args.take).toBe(7);
  });
});

describe('computeAdaptationSignal', () => {
  it('detects "always low energy after dinner" pattern (3+ low energies in last 5)', () => {
    const checkIns = [
      { date: new Date('2026-05-01'), energyAtLastMeal: 1 },
      { date: new Date('2026-05-02'), energyAtLastMeal: 2 },
      { date: new Date('2026-05-03'), energyAtLastMeal: 5 },
      { date: new Date('2026-05-04'), energyAtLastMeal: 1 },
      { date: new Date('2026-05-05'), energyAtLastMeal: 4 },
    ];
    const signal = computeAdaptationSignal(checkIns as any);
    expect(signal).toContain('low-energy-after-meals');
  });

  it('detects "hungry too soon" pattern (avg hunger ≥4 across last 5)', () => {
    const checkIns = [
      { date: new Date('2026-05-01'), hungerNow: 4 },
      { date: new Date('2026-05-02'), hungerNow: 5 },
      { date: new Date('2026-05-03'), hungerNow: 4 },
      { date: new Date('2026-05-04'), hungerNow: 5 },
      { date: new Date('2026-05-05'), hungerNow: 4 },
    ];
    const signal = computeAdaptationSignal(checkIns as any);
    expect(signal).toContain('frequent-hunger');
  });

  it('returns empty array when patterns are healthy', () => {
    const checkIns = [
      { date: new Date('2026-05-01'), hungerNow: 2, energyAtLastMeal: 4 },
      { date: new Date('2026-05-02'), hungerNow: 2, energyAtLastMeal: 5 },
    ];
    expect(computeAdaptationSignal(checkIns as any)).toEqual([]);
  });

  it('handles empty input', () => {
    expect(computeAdaptationSignal([])).toEqual([]);
  });
});
