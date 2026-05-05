// backend/__tests__/services/adjacencyWritebackV2.test.ts
// ROADMAP 4.0 F4 — per-user adjacency writeback (sibling of C3/C4 globals).

const mockPerUserUpsert = jest.fn();
const mockPerUserFind = jest.fn();
const mockGlobalFind = jest.fn();

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    userCuisineAdjacencyWeight: {
      upsert: (...args: unknown[]) => mockPerUserUpsert(...args),
      findUnique: (...args: unknown[]) => mockPerUserFind(...args),
    },
    cuisineAdjacencyWeight: {
      findUnique: (...args: unknown[]) => mockGlobalFind(...args),
    },
  },
}));

import {
  recordPerUserAdjacencySignal,
  getPerUserAdjacencyWeight,
  getBlendedAdjacencyWeight,
} from '../../src/services/adjacencyWritebackService';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('recordPerUserAdjacencySignal', () => {
  it('upserts with the userId in the unique key', async () => {
    mockPerUserUpsert.mockResolvedValue(undefined);
    await recordPerUserAdjacencySignal({
      userId: 'u1',
      sourceCuisine: 'Persian',
      targetCuisine: 'Lebanese',
      signal: 'cook',
    });
    expect(mockPerUserUpsert).toHaveBeenCalledTimes(1);
    const arg = mockPerUserUpsert.mock.calls[0][0];
    expect(arg.where.userId_sourceCuisine_targetCuisine.userId).toBe('u1');
    expect(arg.where.userId_sourceCuisine_targetCuisine.sourceCuisine).toBe('persian');
    expect(arg.where.userId_sourceCuisine_targetCuisine.targetCuisine).toBe('lebanese');
  });

  it('cook signal weights 5x', async () => {
    mockPerUserUpsert.mockResolvedValue(undefined);
    await recordPerUserAdjacencySignal({
      userId: 'u1',
      sourceCuisine: 'thai',
      targetCuisine: 'burmese',
      signal: 'cook',
    });
    expect(mockPerUserUpsert.mock.calls[0][0].create.weight).toBe(5);
  });

  it('impression signal weights 0.1x', async () => {
    mockPerUserUpsert.mockResolvedValue(undefined);
    await recordPerUserAdjacencySignal({
      userId: 'u1',
      sourceCuisine: 'thai',
      targetCuisine: 'burmese',
      signal: 'impression',
    });
    expect(mockPerUserUpsert.mock.calls[0][0].create.weight).toBe(0.1);
  });

  it('rejects empty userId', async () => {
    await expect(
      recordPerUserAdjacencySignal({
        userId: '',
        sourceCuisine: 'thai',
        targetCuisine: 'burmese',
        signal: 'cook',
      }),
    ).rejects.toThrow(/userId required/);
  });

  it('rejects self-edge', async () => {
    await expect(
      recordPerUserAdjacencySignal({
        userId: 'u1',
        sourceCuisine: 'thai',
        targetCuisine: 'THAI',
        signal: 'cook',
      }),
    ).rejects.toThrow(/self-edge/);
  });

  it('rejects unknown signal', async () => {
    await expect(
      recordPerUserAdjacencySignal({
        userId: 'u1',
        sourceCuisine: 'thai',
        targetCuisine: 'burmese',
        signal: 'fake' as never,
      }),
    ).rejects.toThrow(/unknown signal/);
  });
});

describe('getPerUserAdjacencyWeight', () => {
  it('returns weight + signalCount when row exists', async () => {
    mockPerUserFind.mockResolvedValue({ weight: 12.5, signalCount: 8 });
    const result = await getPerUserAdjacencyWeight('u1', 'persian', 'lebanese');
    expect(result).toEqual({ weight: 12.5, signalCount: 8 });
  });

  it('returns zeros when no row exists', async () => {
    mockPerUserFind.mockResolvedValue(null);
    const result = await getPerUserAdjacencyWeight('u1', 'persian', 'lebanese');
    expect(result).toEqual({ weight: 0, signalCount: 0 });
  });
});

describe('getBlendedAdjacencyWeight', () => {
  it('returns global only when per-user signalCount < 3 (cold start)', async () => {
    mockGlobalFind.mockResolvedValue({ weight: 10 });
    mockPerUserFind.mockResolvedValue({ weight: 50, signalCount: 2 });
    const blended = await getBlendedAdjacencyWeight('u1', 'persian', 'lebanese');
    expect(blended).toBe(10);
  });

  it('blends 70/30 when per-user signalCount >= 3', async () => {
    mockGlobalFind.mockResolvedValue({ weight: 10 });
    mockPerUserFind.mockResolvedValue({ weight: 30, signalCount: 5 });
    // 10 * 0.7 + 30 * 0.3 = 7 + 9 = 16
    const blended = await getBlendedAdjacencyWeight('u1', 'persian', 'lebanese');
    expect(blended).toBe(16);
  });

  it('returns 0 when both global and per-user are absent', async () => {
    mockGlobalFind.mockResolvedValue(null);
    mockPerUserFind.mockResolvedValue(null);
    const blended = await getBlendedAdjacencyWeight('u1', 'persian', 'lebanese');
    expect(blended).toBe(0);
  });

  it('per-user blend exactly at floor (3 signals) starts blending', async () => {
    mockGlobalFind.mockResolvedValue({ weight: 0 });
    mockPerUserFind.mockResolvedValue({ weight: 100, signalCount: 3 });
    // 0 * 0.7 + 100 * 0.3 = 30
    const blended = await getBlendedAdjacencyWeight('u1', 'persian', 'lebanese');
    expect(blended).toBe(30);
  });
});
