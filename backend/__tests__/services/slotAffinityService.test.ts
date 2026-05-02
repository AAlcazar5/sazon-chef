// backend/__tests__/services/slotAffinityService.test.ts
// Group 10X Phase 4 — Slot-level taste affinity learning loop.

import {
  recordAffinityEvent,
  getSlotAffinity,
  getPairAffinity,
  getTopComponentsForSlot,
} from '../../src/services/slotAffinityService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  if (!mockPrisma.slotAffinity) {
    mockPrisma.slotAffinity = {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    };
  }
  if (!mockPrisma.pairAffinity) {
    mockPrisma.pairAffinity = {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    };
  } else if (!mockPrisma.pairAffinity.findUnique) {
    mockPrisma.pairAffinity.findUnique = jest.fn();
  }
  if (!mockPrisma.mealComponent) {
    mockPrisma.mealComponent = { findMany: jest.fn() };
  }
  // No pre-existing affinity row by default → nextScore = clamp(delta)
  mockPrisma.slotAffinity.findUnique.mockResolvedValue(null);
  mockPrisma.pairAffinity.findUnique.mockResolvedValue(null);
});

// ─── recordAffinityEvent ─────────────────────────────────────────────────────

describe('slotAffinityService.recordAffinityEvent — plate_saved', () => {
  it('upserts SlotAffinity with +0.1 delta for each component', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([
      { id: 'a', slot: 'protein' },
      { id: 'b', slot: 'base' },
    ]);
    mockPrisma.slotAffinity.upsert.mockResolvedValue({});
    mockPrisma.pairAffinity.upsert.mockResolvedValue({});

    await recordAffinityEvent({ type: 'plate_saved', userId: 'u1', componentIds: ['a', 'b'] });

    const calls = mockPrisma.slotAffinity.upsert.mock.calls;
    expect(calls.length).toBe(2);
    for (const [{ update }] of calls) {
      expect(update.score).toBeCloseTo(0.1);
      expect(update.sampleCount.increment).toBe(1);
    }
  });

  it('upserts PairAffinity for every unordered pair on plate_saved', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([
      { id: 'a', slot: 'protein' },
      { id: 'b', slot: 'base' },
      { id: 'c', slot: 'vegetable' },
    ]);
    mockPrisma.slotAffinity.upsert.mockResolvedValue({});
    mockPrisma.pairAffinity.upsert.mockResolvedValue({});

    await recordAffinityEvent({ type: 'plate_saved', userId: 'u1', componentIds: ['a', 'b', 'c'] });

    // 3 components → 3 pairs: (a,b), (a,c), (b,c)
    expect(mockPrisma.pairAffinity.upsert.mock.calls.length).toBe(3);
  });

  it('orders pair keys alphabetically so (b,a) and (a,b) hit the same row', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([
      { id: 'z', slot: 'protein' },
      { id: 'a', slot: 'base' },
    ]);
    mockPrisma.slotAffinity.upsert.mockResolvedValue({});
    mockPrisma.pairAffinity.upsert.mockResolvedValue({});

    await recordAffinityEvent({ type: 'plate_saved', userId: 'u1', componentIds: ['z', 'a'] });

    const pairCall = mockPrisma.pairAffinity.upsert.mock.calls[0][0];
    expect(pairCall.where.userId_componentIdA_componentIdB.componentIdA).toBe('a');
    expect(pairCall.where.userId_componentIdA_componentIdB.componentIdB).toBe('z');
  });
});

describe('slotAffinityService.recordAffinityEvent — plate_cooked', () => {
  it('upserts SlotAffinity with +0.2 delta for each component', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([{ id: 'a', slot: 'protein' }]);
    mockPrisma.slotAffinity.upsert.mockResolvedValue({});
    mockPrisma.pairAffinity.upsert.mockResolvedValue({});

    await recordAffinityEvent({ type: 'plate_cooked', userId: 'u1', componentIds: ['a'] });

    const [[{ update }]] = mockPrisma.slotAffinity.upsert.mock.calls;
    expect(update.score).toBeCloseTo(0.2);
  });
});

describe('slotAffinityService.recordAffinityEvent — plate_rated', () => {
  it('adds +0.3 per component for a 4-star rating', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([{ id: 'a', slot: 'protein' }]);
    mockPrisma.slotAffinity.upsert.mockResolvedValue({});
    mockPrisma.pairAffinity.upsert.mockResolvedValue({});

    await recordAffinityEvent({ type: 'plate_rated', userId: 'u1', componentIds: ['a'], stars: 4 });

    const [[{ update }]] = mockPrisma.slotAffinity.upsert.mock.calls;
    expect(update.score).toBeCloseTo(0.3);
  });

  it('adds +0.3 per component for a 5-star rating', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([{ id: 'a', slot: 'protein' }]);
    mockPrisma.slotAffinity.upsert.mockResolvedValue({});
    mockPrisma.pairAffinity.upsert.mockResolvedValue({});

    await recordAffinityEvent({ type: 'plate_rated', userId: 'u1', componentIds: ['a'], stars: 5 });

    const [[{ update }]] = mockPrisma.slotAffinity.upsert.mock.calls;
    expect(update.score).toBeCloseTo(0.3);
  });

  it('adds -0.4 per component for a 1-star rating', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([{ id: 'a', slot: 'protein' }]);
    mockPrisma.slotAffinity.upsert.mockResolvedValue({});
    mockPrisma.pairAffinity.upsert.mockResolvedValue({});

    await recordAffinityEvent({ type: 'plate_rated', userId: 'u1', componentIds: ['a'], stars: 1 });

    const [[{ update }]] = mockPrisma.slotAffinity.upsert.mock.calls;
    expect(update.score).toBeCloseTo(-0.4);
  });

  it('adds -0.4 per component for a 2-star rating', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([{ id: 'a', slot: 'protein' }]);
    mockPrisma.slotAffinity.upsert.mockResolvedValue({});
    mockPrisma.pairAffinity.upsert.mockResolvedValue({});

    await recordAffinityEvent({ type: 'plate_rated', userId: 'u1', componentIds: ['a'], stars: 2 });

    const [[{ update }]] = mockPrisma.slotAffinity.upsert.mock.calls;
    expect(update.score).toBeCloseTo(-0.4);
  });

  it('does nothing (no upsert calls) for a 3-star rating', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([{ id: 'a', slot: 'protein' }]);
    mockPrisma.slotAffinity.upsert.mockResolvedValue({});
    mockPrisma.pairAffinity.upsert.mockResolvedValue({});

    await recordAffinityEvent({ type: 'plate_rated', userId: 'u1', componentIds: ['a'], stars: 3 });

    expect(mockPrisma.slotAffinity.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.pairAffinity.upsert).not.toHaveBeenCalled();
  });

  it('increments pair affinity with +0.3 for a 4-star plate with 2 components', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([
      { id: 'a', slot: 'protein' },
      { id: 'b', slot: 'base' },
    ]);
    mockPrisma.slotAffinity.upsert.mockResolvedValue({});
    mockPrisma.pairAffinity.upsert.mockResolvedValue({});

    await recordAffinityEvent({ type: 'plate_rated', userId: 'u1', componentIds: ['a', 'b'], stars: 4 });

    expect(mockPrisma.pairAffinity.upsert.mock.calls.length).toBe(1);
    const [[{ update }]] = mockPrisma.pairAffinity.upsert.mock.calls;
    expect(update.score).toBeCloseTo(0.3);
  });
});

describe('slotAffinityService.recordAffinityEvent — swap_away', () => {
  it('upserts SlotAffinity with -0.05 delta for the swapped component', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([{ id: 'a', slot: 'sauce' }]);
    mockPrisma.slotAffinity.upsert.mockResolvedValue({});

    await recordAffinityEvent({ type: 'swap_away', userId: 'u1', componentId: 'a' });

    const [[{ update }]] = mockPrisma.slotAffinity.upsert.mock.calls;
    expect(update.score).toBeCloseTo(-0.05);
    expect(update.sampleCount.increment).toBe(1);
  });

  it('does not update pair affinity on swap_away', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([{ id: 'a', slot: 'sauce' }]);
    mockPrisma.slotAffinity.upsert.mockResolvedValue({});

    await recordAffinityEvent({ type: 'swap_away', userId: 'u1', componentId: 'a' });

    expect(mockPrisma.pairAffinity?.upsert ?? { mock: { calls: [] } }).toBeDefined();
    // pairAffinity.upsert should not be called for swap_away
    if (mockPrisma.pairAffinity) {
      expect(mockPrisma.pairAffinity.upsert).not.toHaveBeenCalled();
    }
  });
});

describe('slotAffinityService.recordAffinityEvent — score clamping', () => {
  it('clamps update.score to -2 when an existing -1.9 score would drop to -2.3', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([{ id: 'a', slot: 'protein' }]);
    mockPrisma.slotAffinity.findUnique.mockResolvedValueOnce({ score: -1.9 });
    mockPrisma.slotAffinity.upsert.mockResolvedValue({});
    mockPrisma.pairAffinity.upsert.mockResolvedValue({});

    await recordAffinityEvent({ type: 'plate_rated', userId: 'u1', componentIds: ['a'], stars: 1 });

    const [[{ update }]] = mockPrisma.slotAffinity.upsert.mock.calls;
    expect(update.score).toBe(-2);
  });

  it('clamps update.score to +2 when an existing 1.85 score would climb to 2.15', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([{ id: 'a', slot: 'protein' }]);
    mockPrisma.slotAffinity.findUnique.mockResolvedValueOnce({ score: 1.85 });
    mockPrisma.slotAffinity.upsert.mockResolvedValue({});
    mockPrisma.pairAffinity.upsert.mockResolvedValue({});

    await recordAffinityEvent({ type: 'plate_rated', userId: 'u1', componentIds: ['a'], stars: 4 });

    const [[{ update }]] = mockPrisma.slotAffinity.upsert.mock.calls;
    expect(update.score).toBe(2);
  });

  it('uses clamped score in create.score on initial insert', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([{ id: 'a', slot: 'protein' }]);
    mockPrisma.slotAffinity.upsert.mockResolvedValue({});
    mockPrisma.pairAffinity.upsert.mockResolvedValue({});

    await recordAffinityEvent({ type: 'plate_saved', userId: 'u1', componentIds: ['a'] });

    const [[{ create }]] = mockPrisma.slotAffinity.upsert.mock.calls;
    expect(create.score).toBeGreaterThanOrEqual(-2);
    expect(create.score).toBeLessThanOrEqual(2);
  });
});

// ─── getSlotAffinity ─────────────────────────────────────────────────────────

describe('slotAffinityService.getSlotAffinity', () => {
  it('returns score and sampleCount when a row exists', async () => {
    mockPrisma.slotAffinity.findFirst.mockResolvedValue({ score: 0.5, sampleCount: 3 });

    const result = await getSlotAffinity('u1', 'comp-a');

    expect(result).toEqual({ score: 0.5, sampleCount: 3 });
  });

  it('returns null when no row exists', async () => {
    mockPrisma.slotAffinity.findFirst.mockResolvedValue(null);

    const result = await getSlotAffinity('u1', 'comp-missing');

    expect(result).toBeNull();
  });
});

// ─── getPairAffinity ─────────────────────────────────────────────────────────

describe('slotAffinityService.getPairAffinity', () => {
  it('returns pair score when a row exists', async () => {
    mockPrisma.pairAffinity.findFirst.mockResolvedValue({ score: 0.8, sampleCount: 5 });

    const result = await getPairAffinity('u1', 'a', 'b');

    expect(result).toEqual({ score: 0.8, sampleCount: 5 });
  });

  it('normalises order so (b,a) query returns same row as (a,b)', async () => {
    mockPrisma.pairAffinity.findFirst.mockResolvedValue({ score: 0.8, sampleCount: 5 });

    await getPairAffinity('u1', 'b', 'a');

    const [[{ where }]] = mockPrisma.pairAffinity.findFirst.mock.calls;
    expect(where.componentIdA).toBe('a');
    expect(where.componentIdB).toBe('b');
  });

  it('returns null when no row exists', async () => {
    mockPrisma.pairAffinity.findFirst.mockResolvedValue(null);

    const result = await getPairAffinity('u1', 'x', 'y');

    expect(result).toBeNull();
  });
});

// ─── getTopComponentsForSlot ─────────────────────────────────────────────────

describe('slotAffinityService.getTopComponentsForSlot', () => {
  it('returns only rows with sampleCount >= 3, sorted by score desc', async () => {
    mockPrisma.slotAffinity.findMany.mockResolvedValue([
      { componentId: 'a', score: 0.9, sampleCount: 5 },
      { componentId: 'b', score: 0.7, sampleCount: 2 },  // excluded (sampleCount < 3)
      { componentId: 'c', score: 0.5, sampleCount: 3 },
    ]);

    const result = await getTopComponentsForSlot('u1', 'protein', 10);

    expect(result.map((r) => r.componentId)).toEqual(['a', 'c']);
  });

  it('returns at most `limit` results', async () => {
    mockPrisma.slotAffinity.findMany.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        componentId: `c${i}`,
        score: 1 - i * 0.1,
        sampleCount: 5,
      }))
    );

    const result = await getTopComponentsForSlot('u1', 'protein', 3);

    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('returns empty array when no rows exist', async () => {
    mockPrisma.slotAffinity.findMany.mockResolvedValue([]);

    const result = await getTopComponentsForSlot('u1', 'protein', 5);

    expect(result).toEqual([]);
  });
});
