// backend/__tests__/services/leftoverInventoryService.test.ts
// Group 10X Phase 6 — Leftover continuity service tests.

import {
  addLeftoversFromPlate,
  getActiveLeftovers,
  decrementLeftover,
  consumeLeftoversForPlate,
  TTL_DAYS_BY_SLOT,
} from '../../src/services/leftoverInventoryService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeAll(() => {
  if (!mockPrisma.leftoverInventory) {
    mockPrisma.leftoverInventory = {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    };
  }
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date('2026-05-02T12:00:00Z'));
  mockPrisma.leftoverInventory.findMany.mockResolvedValue([]);
  mockPrisma.leftoverInventory.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.leftoverInventory.updateMany.mockResolvedValue({ count: 0 });
  mockPrisma.leftoverInventory.createMany.mockResolvedValue({ count: 0 });
});

afterAll(() => {
  jest.useRealTimers();
});

describe('TTL_DAYS_BY_SLOT', () => {
  it('encodes the canonical food-safety TTLs from the roadmap', () => {
    expect(TTL_DAYS_BY_SLOT.protein).toBe(3);
    expect(TTL_DAYS_BY_SLOT.base).toBe(5);
    expect(TTL_DAYS_BY_SLOT.vegetable).toBe(3);
    expect(TTL_DAYS_BY_SLOT.sauce).toBe(7);
    expect(TTL_DAYS_BY_SLOT.garnish).toBe(2);
  });
});

describe('addLeftoversFromPlate', () => {
  it('persists each leftover with expiresAt = now + TTL_DAYS for that slot', async () => {
    await addLeftoversFromPlate({
      userId: 'user-1',
      sourcePlateId: 'plate-1',
      leftovers: [
        { componentId: 'salmon-1', slot: 'protein', portionsRemaining: 1 },
        { componentId: 'rice-1', slot: 'base', portionsRemaining: 2 },
        { componentId: 'tahini-1', slot: 'sauce', portionsRemaining: 0.5 },
      ],
    });

    expect(mockPrisma.leftoverInventory.createMany).toHaveBeenCalledTimes(1);
    const data = mockPrisma.leftoverInventory.createMany.mock.calls[0][0].data;

    expect(data).toHaveLength(3);
    const protein = data.find((d: any) => d.componentId === 'salmon-1')!;
    const base = data.find((d: any) => d.componentId === 'rice-1')!;
    const sauce = data.find((d: any) => d.componentId === 'tahini-1')!;

    expect(protein.expiresAt).toEqual(new Date('2026-05-05T12:00:00Z')); // +3d
    expect(base.expiresAt).toEqual(new Date('2026-05-07T12:00:00Z')); // +5d
    expect(sauce.expiresAt).toEqual(new Date('2026-05-09T12:00:00Z')); // +7d
    expect(protein.userId).toBe('user-1');
    expect(protein.sourcePlateId).toBe('plate-1');
    expect(protein.portionsRemaining).toBe(1);
  });

  it('skips leftovers with non-positive portionsRemaining', async () => {
    await addLeftoversFromPlate({
      userId: 'user-1',
      sourcePlateId: 'plate-1',
      leftovers: [
        { componentId: 'salmon-1', slot: 'protein', portionsRemaining: 0 },
        { componentId: 'rice-1', slot: 'base', portionsRemaining: -0.5 },
        { componentId: 'tahini-1', slot: 'sauce', portionsRemaining: 0.5 },
      ],
    });

    const data = mockPrisma.leftoverInventory.createMany.mock.calls[0][0].data;
    expect(data).toHaveLength(1);
    expect(data[0].componentId).toBe('tahini-1');
  });

  it('is a no-op when leftovers array is empty', async () => {
    await addLeftoversFromPlate({
      userId: 'user-1',
      sourcePlateId: 'plate-1',
      leftovers: [],
    });
    expect(mockPrisma.leftoverInventory.createMany).not.toHaveBeenCalled();
  });

  it('falls back to a 3-day TTL for unknown slot values (defensive)', async () => {
    await addLeftoversFromPlate({
      userId: 'user-1',
      sourcePlateId: 'plate-1',
      leftovers: [
        { componentId: 'mystery-1', slot: 'unknown_slot', portionsRemaining: 1 },
      ],
    });
    const row = mockPrisma.leftoverInventory.createMany.mock.calls[0][0].data[0];
    expect(row.expiresAt).toEqual(new Date('2026-05-05T12:00:00Z'));
  });
});

describe('getActiveLeftovers', () => {
  it('queries only rows where expiresAt > now and userId matches', async () => {
    await getActiveLeftovers('user-abc');
    const callArgs = mockPrisma.leftoverInventory.findMany.mock.calls[0][0];
    expect(callArgs.where.userId).toBe('user-abc');
    expect(callArgs.where.expiresAt.gt).toEqual(new Date('2026-05-02T12:00:00Z'));
    expect(callArgs.where.portionsRemaining.gt).toBe(0);
  });

  it('returns rows sorted by createdAt DESC (newest leftovers first)', async () => {
    await getActiveLeftovers('user-1');
    const callArgs = mockPrisma.leftoverInventory.findMany.mock.calls[0][0];
    expect(callArgs.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('returns the inventory rows from prisma', async () => {
    const rows = [
      { id: 'lo-1', componentId: 'salmon-1', slot: 'protein', portionsRemaining: 1 },
    ];
    mockPrisma.leftoverInventory.findMany.mockResolvedValueOnce(rows);
    const result = await getActiveLeftovers('user-1');
    expect(result).toEqual(rows);
  });
});

describe('decrementLeftover', () => {
  it('reduces portionsRemaining when current > portionsUsed', async () => {
    mockPrisma.leftoverInventory.findFirst.mockResolvedValueOnce({
      id: 'lo-1',
      portionsRemaining: 2,
    });
    await decrementLeftover({ userId: 'user-1', componentId: 'salmon-1', portionsUsed: 0.5 });
    expect(mockPrisma.leftoverInventory.update).toHaveBeenCalledWith({
      where: { id: 'lo-1' },
      data: { portionsRemaining: 1.5 },
    });
    expect(mockPrisma.leftoverInventory.delete).not.toHaveBeenCalled();
  });

  it('deletes the row when portionsUsed >= portionsRemaining', async () => {
    mockPrisma.leftoverInventory.findFirst.mockResolvedValueOnce({
      id: 'lo-1',
      portionsRemaining: 1,
    });
    await decrementLeftover({ userId: 'user-1', componentId: 'salmon-1', portionsUsed: 1 });
    expect(mockPrisma.leftoverInventory.delete).toHaveBeenCalledWith({ where: { id: 'lo-1' } });
    expect(mockPrisma.leftoverInventory.update).not.toHaveBeenCalled();
  });

  it('is a no-op when no active leftover exists for that component', async () => {
    mockPrisma.leftoverInventory.findFirst.mockResolvedValueOnce(null);
    await decrementLeftover({ userId: 'user-1', componentId: 'ghost', portionsUsed: 1 });
    expect(mockPrisma.leftoverInventory.update).not.toHaveBeenCalled();
    expect(mockPrisma.leftoverInventory.delete).not.toHaveBeenCalled();
  });

  it('scopes findFirst to userId AND componentId AND active (expiresAt > now, portionsRemaining > 0)', async () => {
    mockPrisma.leftoverInventory.findFirst.mockResolvedValueOnce(null);
    await decrementLeftover({ userId: 'user-xyz', componentId: 'rice-1', portionsUsed: 0.5 });
    const callArgs = mockPrisma.leftoverInventory.findFirst.mock.calls[0][0];
    expect(callArgs.where.userId).toBe('user-xyz');
    expect(callArgs.where.componentId).toBe('rice-1');
    expect(callArgs.where.expiresAt.gt).toEqual(new Date('2026-05-02T12:00:00Z'));
    expect(callArgs.where.portionsRemaining.gt).toBe(0);
  });
});

describe('consumeLeftoversForPlate', () => {
  it('decrements every component on the plate that exists in inventory', async () => {
    mockPrisma.leftoverInventory.findFirst
      .mockResolvedValueOnce({ id: 'lo-1', portionsRemaining: 2 })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'lo-3', portionsRemaining: 0.5 });

    await consumeLeftoversForPlate({
      userId: 'user-1',
      plateComponents: [
        { componentId: 'salmon-1', portionMultiplier: 1 },
        { componentId: 'fresh-rice', portionMultiplier: 1 },
        { componentId: 'tahini-1', portionMultiplier: 1 },
      ],
    });

    expect(mockPrisma.leftoverInventory.update).toHaveBeenCalledWith({
      where: { id: 'lo-1' },
      data: { portionsRemaining: 1 },
    });
    expect(mockPrisma.leftoverInventory.delete).toHaveBeenCalledWith({ where: { id: 'lo-3' } });
  });

  it('decrements by portionMultiplier (so 2x portion uses 2 units)', async () => {
    mockPrisma.leftoverInventory.findFirst.mockResolvedValueOnce({
      id: 'lo-1',
      portionsRemaining: 3,
    });

    await consumeLeftoversForPlate({
      userId: 'user-1',
      plateComponents: [{ componentId: 'salmon-1', portionMultiplier: 2 }],
    });

    expect(mockPrisma.leftoverInventory.update).toHaveBeenCalledWith({
      where: { id: 'lo-1' },
      data: { portionsRemaining: 1 },
    });
  });

  it('is a no-op when plateComponents is empty', async () => {
    await consumeLeftoversForPlate({ userId: 'user-1', plateComponents: [] });
    expect(mockPrisma.leftoverInventory.findFirst).not.toHaveBeenCalled();
  });
});
