// backend/__tests__/services/surfaceYieldService.test.ts
// ROADMAP 4.0 Tier B3 — Per-surface signal-yield instrumentation (TDD).

import {
  recordSurfaceEvent,
  computeSurfaceYield,
  computeAllSurfaceYields,
  isLowYieldSurface,
  SURFACES,
} from '../../src/services/surfaceYieldService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  if (!mockPrisma.surfaceEvent) {
    mockPrisma.surfaceEvent = {
      create: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    };
  } else {
    mockPrisma.surfaceEvent.create = jest.fn();
    mockPrisma.surfaceEvent.groupBy = jest.fn();
    mockPrisma.surfaceEvent.findMany = jest.fn();
  }
  if (!mockPrisma.surfaceYieldSnapshot) {
    mockPrisma.surfaceYieldSnapshot = {
      upsert: jest.fn(),
      findMany: jest.fn(),
    };
  } else {
    mockPrisma.surfaceYieldSnapshot.upsert = jest.fn();
    mockPrisma.surfaceYieldSnapshot.findMany = jest.fn();
  }
});

describe('SURFACES', () => {
  it('exposes the canonical surface enum used by every recommendation surface', () => {
    expect(SURFACES).toContain('today_hero');
    expect(SURFACES).toContain('week_swap');
    expect(SURFACES).toContain('kitchen_discover');
    expect(SURFACES).toContain('sazon_tool');
    expect(SURFACES).toContain('smart_collection');
    expect(SURFACES).toContain('cravings_made_real');
  });
});

describe('recordSurfaceEvent', () => {
  it('persists an impression event', async () => {
    mockPrisma.surfaceEvent.create.mockResolvedValue({ id: 'evt-1' });
    await recordSurfaceEvent({
      userId: 'u1',
      surface: 'today_hero',
      action: 'impression',
      recipeId: 'r1',
    });
    expect(mockPrisma.surfaceEvent.create).toHaveBeenCalledTimes(1);
    const args = mockPrisma.surfaceEvent.create.mock.calls[0][0];
    expect(args.data.userId).toBe('u1');
    expect(args.data.surface).toBe('today_hero');
    expect(args.data.action).toBe('impression');
    expect(args.data.recipeId).toBe('r1');
  });

  it('rejects unknown surfaces', async () => {
    await expect(
      recordSurfaceEvent({
        userId: 'u1',
        surface: 'not-a-real-surface',
        action: 'impression',
      } as any)
    ).rejects.toThrow(/surface/i);
  });

  it('rejects unknown actions', async () => {
    await expect(
      recordSurfaceEvent({
        userId: 'u1',
        surface: 'today_hero',
        action: 'eaten' as any,
      })
    ).rejects.toThrow(/action/i);
  });

  it('persists optional variant key (for B4 A/B framework)', async () => {
    mockPrisma.surfaceEvent.create.mockResolvedValue({ id: 'evt-2' });
    await recordSurfaceEvent({
      userId: 'u1',
      surface: 'today_hero',
      action: 'tap',
      recipeId: 'r1',
      variant: 'experiment_protein_boost',
    });
    const args = mockPrisma.surfaceEvent.create.mock.calls[0][0];
    expect(args.data.variant).toBe('experiment_protein_boost');
  });
});

describe('computeSurfaceYield', () => {
  it('counts impressions/taps/cooks/rates from groupBy and computes yield', async () => {
    mockPrisma.surfaceEvent.groupBy.mockResolvedValue([
      { action: 'impression', _count: { _all: 100 } },
      { action: 'tap', _count: { _all: 25 } },
      { action: 'cook', _count: { _all: 10 } },
      { action: 'rate', _count: { _all: 5 } },
    ]);
    mockPrisma.surfaceYieldSnapshot.upsert.mockResolvedValue({});

    const snap = await computeSurfaceYield({
      surface: 'today_hero',
      asOfDate: new Date('2026-05-04'),
      windowDays: 1,
      persist: false,
    });

    expect(snap.impressions).toBe(100);
    expect(snap.taps).toBe(25);
    expect(snap.cooks).toBe(10);
    expect(snap.rates).toBe(5);
    // signalYield = (cooks + rates) / impressions = 15/100 = 0.15
    expect(snap.signalYield).toBeCloseTo(0.15, 5);
  });

  it('handles zero impressions (yield = 0, no division by zero)', async () => {
    mockPrisma.surfaceEvent.groupBy.mockResolvedValue([]);

    const snap = await computeSurfaceYield({
      surface: 'today_hero',
      asOfDate: new Date(),
      windowDays: 7,
      persist: false,
    });

    expect(snap.impressions).toBe(0);
    expect(snap.signalYield).toBe(0);
  });

  it('persists when persist=true', async () => {
    mockPrisma.surfaceEvent.groupBy.mockResolvedValue([
      { action: 'impression', _count: { _all: 10 } },
      { action: 'tap', _count: { _all: 3 } },
    ]);
    mockPrisma.surfaceYieldSnapshot.upsert.mockResolvedValue({});

    await computeSurfaceYield({
      surface: 'kitchen_discover',
      asOfDate: new Date('2026-05-04'),
      windowDays: 1,
      persist: true,
    });

    expect(mockPrisma.surfaceYieldSnapshot.upsert).toHaveBeenCalledTimes(1);
    const args = mockPrisma.surfaceYieldSnapshot.upsert.mock.calls[0][0];
    expect(args.create.surface).toBe('kitchen_discover');
  });

  it('passes variant filter to groupBy when provided', async () => {
    mockPrisma.surfaceEvent.groupBy.mockResolvedValue([]);
    await computeSurfaceYield({
      surface: 'today_hero',
      asOfDate: new Date(),
      windowDays: 1,
      variant: 'experiment_X',
      persist: false,
    });
    const args = mockPrisma.surfaceEvent.groupBy.mock.calls[0][0];
    expect(args.where.variant).toBe('experiment_X');
  });
});

describe('isLowYieldSurface', () => {
  it('flags surface with signalYield < 0.05 over a 7d period as low', () => {
    expect(
      isLowYieldSurface({ impressions: 1000, signalYield: 0.04 } as any)
    ).toBe(true);
    expect(
      isLowYieldSurface({ impressions: 1000, signalYield: 0.05 } as any)
    ).toBe(false);
  });

  it('does NOT flag surfaces with too few impressions (statistically meaningless)', () => {
    expect(
      isLowYieldSurface({ impressions: 49, signalYield: 0.0 } as any)
    ).toBe(false);
  });

  it('flags 0-yield surfaces with ≥50 impressions', () => {
    expect(
      isLowYieldSurface({ impressions: 50, signalYield: 0 } as any)
    ).toBe(true);
  });
});

describe('computeAllSurfaceYields', () => {
  it('runs computeSurfaceYield once per known surface', async () => {
    mockPrisma.surfaceEvent.groupBy.mockResolvedValue([]);
    mockPrisma.surfaceYieldSnapshot.upsert.mockResolvedValue({});

    const snaps = await computeAllSurfaceYields({
      asOfDate: new Date('2026-05-04'),
      windowDays: 1,
      persist: false,
    });

    expect(snaps).toHaveLength(SURFACES.length);
    snaps.forEach((s) => {
      expect(SURFACES).toContain(s.surface as any);
    });
  });
});
