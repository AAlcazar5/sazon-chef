// backend/__tests__/services/adjacencyWritebackService.test.ts
// ROADMAP 4.0 Tier C3+C4 — Adjacency writeback (TDD).

import {
  recordAdjacencySignal,
  applyDecay,
  getDynamicAdjacencyWeight,
} from '../../src/services/adjacencyWritebackService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  if (!mockPrisma.cuisineAdjacencyWeight) {
    mockPrisma.cuisineAdjacencyWeight = {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    };
  } else {
    mockPrisma.cuisineAdjacencyWeight.upsert = jest.fn();
    mockPrisma.cuisineAdjacencyWeight.findUnique = jest.fn();
    mockPrisma.cuisineAdjacencyWeight.findMany = jest.fn();
    mockPrisma.cuisineAdjacencyWeight.update = jest.fn();
    mockPrisma.cuisineAdjacencyWeight.updateMany = jest.fn();
  }
});

describe('recordAdjacencySignal', () => {
  it('upserts the (source, target) pair and increments weight + count', async () => {
    mockPrisma.cuisineAdjacencyWeight.upsert.mockResolvedValue({});

    await recordAdjacencySignal({
      sourceCuisine: 'thai',
      targetCuisine: 'burmese',
      signal: 'tap',
    });

    expect(mockPrisma.cuisineAdjacencyWeight.upsert).toHaveBeenCalledTimes(1);
    const args = mockPrisma.cuisineAdjacencyWeight.upsert.mock.calls[0][0];
    expect(args.where.sourceCuisine_targetCuisine).toEqual({
      sourceCuisine: 'thai',
      targetCuisine: 'burmese',
    });
    expect(args.create.weight).toBeGreaterThan(0);
    expect(args.create.signalCount).toBe(1);
  });

  it('weights tap signals higher than impression signals', async () => {
    mockPrisma.cuisineAdjacencyWeight.upsert.mockResolvedValue({});

    await recordAdjacencySignal({ sourceCuisine: 'a', targetCuisine: 'b', signal: 'tap' });
    const tapArgs = mockPrisma.cuisineAdjacencyWeight.upsert.mock.calls[0][0];
    const tapWeight = tapArgs.create.weight as number;
    const tapIncrement = tapArgs.update.weight.increment as number;

    await recordAdjacencySignal({ sourceCuisine: 'a', targetCuisine: 'b', signal: 'impression' });
    const impArgs = mockPrisma.cuisineAdjacencyWeight.upsert.mock.calls[1][0];
    const impWeight = impArgs.create.weight as number;
    const impIncrement = impArgs.update.weight.increment as number;

    expect(tapWeight).toBeGreaterThan(impWeight);
    expect(tapIncrement).toBeGreaterThan(impIncrement);
  });

  it('weights cook signals highest of all', async () => {
    mockPrisma.cuisineAdjacencyWeight.upsert.mockResolvedValue({});

    await recordAdjacencySignal({ sourceCuisine: 'a', targetCuisine: 'b', signal: 'cook' });
    const cookArgs = mockPrisma.cuisineAdjacencyWeight.upsert.mock.calls[0][0];
    await recordAdjacencySignal({ sourceCuisine: 'a', targetCuisine: 'b', signal: 'tap' });
    const tapArgs = mockPrisma.cuisineAdjacencyWeight.upsert.mock.calls[1][0];

    expect(cookArgs.create.weight).toBeGreaterThan(tapArgs.create.weight);
  });

  it('rejects when sourceCuisine === targetCuisine (self-edge is meaningless)', async () => {
    await expect(
      recordAdjacencySignal({ sourceCuisine: 'thai', targetCuisine: 'thai', signal: 'tap' })
    ).rejects.toThrow(/same cuisine/i);
  });

  it('rejects unknown signal type', async () => {
    await expect(
      recordAdjacencySignal({
        sourceCuisine: 'a',
        targetCuisine: 'b',
        signal: 'eaten' as any,
      })
    ).rejects.toThrow(/signal/i);
  });

  it('rejects empty cuisine names', async () => {
    await expect(
      recordAdjacencySignal({ sourceCuisine: '', targetCuisine: 'b', signal: 'tap' })
    ).rejects.toThrow(/cuisine/i);
    await expect(
      recordAdjacencySignal({ sourceCuisine: 'a', targetCuisine: '', signal: 'tap' })
    ).rejects.toThrow(/cuisine/i);
  });

  it('lower-cases both cuisine names for stability', async () => {
    mockPrisma.cuisineAdjacencyWeight.upsert.mockResolvedValue({});

    await recordAdjacencySignal({ sourceCuisine: 'Thai', targetCuisine: 'Burmese', signal: 'tap' });
    const args = mockPrisma.cuisineAdjacencyWeight.upsert.mock.calls[0][0];
    expect(args.where.sourceCuisine_targetCuisine).toEqual({
      sourceCuisine: 'thai',
      targetCuisine: 'burmese',
    });
  });

  // ─── C4: family + cuisine tap signals
  it('accepts family-tap signal type (C4)', async () => {
    mockPrisma.cuisineAdjacencyWeight.upsert.mockResolvedValue({});
    await recordAdjacencySignal({
      sourceCuisine: 'thai',
      targetCuisine: 'burmese',
      signal: 'family-tap',
    });
    expect(mockPrisma.cuisineAdjacencyWeight.upsert).toHaveBeenCalledTimes(1);
  });

  it('accepts cuisine-tap signal type (C4)', async () => {
    mockPrisma.cuisineAdjacencyWeight.upsert.mockResolvedValue({});
    await recordAdjacencySignal({
      sourceCuisine: 'thai',
      targetCuisine: 'vietnamese',
      signal: 'cuisine-tap',
    });
    expect(mockPrisma.cuisineAdjacencyWeight.upsert).toHaveBeenCalledTimes(1);
  });
});

describe('applyDecay', () => {
  it('decays all weights toward 0 with the half-life formula', async () => {
    mockPrisma.cuisineAdjacencyWeight.findMany.mockResolvedValue([
      { id: '1', sourceCuisine: 'thai', targetCuisine: 'burmese', weight: 10, signalCount: 5, updatedAt: new Date(), createdAt: new Date() },
      { id: '2', sourceCuisine: 'a', targetCuisine: 'b', weight: 4, signalCount: 2, updatedAt: new Date(), createdAt: new Date() },
    ]);
    mockPrisma.cuisineAdjacencyWeight.update.mockResolvedValue({});

    await applyDecay({ halfLifeDays: 90, sinceDays: 90 });

    expect(mockPrisma.cuisineAdjacencyWeight.update).toHaveBeenCalledTimes(2);
    const decayedFirst = mockPrisma.cuisineAdjacencyWeight.update.mock.calls[0][0].data.weight;
    const decayedSecond = mockPrisma.cuisineAdjacencyWeight.update.mock.calls[1][0].data.weight;
    // After exactly one half-life, weights should halve.
    expect(decayedFirst).toBeCloseTo(5, 5);
    expect(decayedSecond).toBeCloseTo(2, 5);
  });

  it('skips rows with weight near 0 (efficiency: nothing to decay)', async () => {
    mockPrisma.cuisineAdjacencyWeight.findMany.mockResolvedValue([
      { id: 'tiny', sourceCuisine: 'a', targetCuisine: 'b', weight: 0.001, signalCount: 0, updatedAt: new Date(), createdAt: new Date() },
    ]);
    mockPrisma.cuisineAdjacencyWeight.update.mockResolvedValue({});

    await applyDecay({ halfLifeDays: 90, sinceDays: 90, minWeight: 0.01 });

    expect(mockPrisma.cuisineAdjacencyWeight.update).not.toHaveBeenCalled();
  });
});

describe('getDynamicAdjacencyWeight', () => {
  it('returns 0 when no row exists', async () => {
    mockPrisma.cuisineAdjacencyWeight.findUnique.mockResolvedValue(null);
    const w = await getDynamicAdjacencyWeight('thai', 'burmese');
    expect(w).toBe(0);
  });

  it('returns the persisted weight when a row exists', async () => {
    mockPrisma.cuisineAdjacencyWeight.findUnique.mockResolvedValue({ weight: 12.5 });
    const w = await getDynamicAdjacencyWeight('thai', 'burmese');
    expect(w).toBe(12.5);
  });

  it('lower-cases inputs before lookup', async () => {
    mockPrisma.cuisineAdjacencyWeight.findUnique.mockResolvedValue({ weight: 5 });
    await getDynamicAdjacencyWeight('Thai', 'Burmese');
    const args = mockPrisma.cuisineAdjacencyWeight.findUnique.mock.calls[0][0];
    expect(args.where.sourceCuisine_targetCuisine).toEqual({
      sourceCuisine: 'thai',
      targetCuisine: 'burmese',
    });
  });
});
