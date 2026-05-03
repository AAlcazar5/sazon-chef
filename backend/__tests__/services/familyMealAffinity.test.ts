// Group 10X Phase 7+ — per-household-member SlotAffinity learning loop.
//
// The kid plate must adapt to *this* kid's accepted components, not a generic
// kid template. These tests pin the contract:
//   1. Cooking a family meal writes per-member affinity rows + a shared
//      account-level row (so household-head context still updates).
//   2. Each member's affinity is isolated — cooking for member A must not
//      bleed into member B's row.
//   3. Re-cooking the same combo upserts (sampleCount += 1) instead of
//      duplicating rows.

import {
  recordSlotAffinity,
  recordFamilyMealCookedAffinity,
} from '../../src/services/slotAffinityService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  if (!mockPrisma.slotAffinity) {
    mockPrisma.slotAffinity = {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    };
  }
  if (!mockPrisma.mealComponent) {
    mockPrisma.mealComponent = { findMany: jest.fn() };
  }
  mockPrisma.slotAffinity.findUnique.mockResolvedValue(null);
});

describe('recordSlotAffinity — per-household-member keying', () => {
  it('writes a row keyed on (userId, householdMemberId, componentId) when a member is provided', async () => {
    mockPrisma.slotAffinity.upsert.mockResolvedValue({});

    await recordSlotAffinity({
      userId: 'u1',
      componentId: 'comp-roast-carrot',
      slot: 'vegetable',
      householdMemberId: 'kid-a',
      delta: 0.2,
    });

    const [[args]] = mockPrisma.slotAffinity.upsert.mock.calls;
    expect(args.where.userId_householdMemberId_componentId).toEqual({
      userId: 'u1',
      householdMemberId: 'kid-a',
      componentId: 'comp-roast-carrot',
    });
    expect(args.create.householdMemberId).toBe('kid-a');
  });

  it('writes a row keyed on (userId, NULL, componentId) when no member is provided', async () => {
    mockPrisma.slotAffinity.upsert.mockResolvedValue({});

    await recordSlotAffinity({
      userId: 'u1',
      componentId: 'comp-roast-carrot',
      slot: 'vegetable',
      delta: 0.2,
    });

    const [[args]] = mockPrisma.slotAffinity.upsert.mock.calls;
    expect(args.where.userId_householdMemberId_componentId).toEqual({
      userId: 'u1',
      householdMemberId: null,
      componentId: 'comp-roast-carrot',
    });
    expect(args.create.householdMemberId).toBeNull();
  });
});

describe('recordFamilyMealCookedAffinity', () => {
  it('writes a per-member row for each plate that has a householdMemberId AND a shared account-level row', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([
      { id: 'pasta', slot: 'base' },
      { id: 'carrot', slot: 'vegetable' },
    ]);
    mockPrisma.slotAffinity.upsert.mockResolvedValue({});

    await recordFamilyMealCookedAffinity({
      userId: 'u1',
      plates: [
        {
          plateId: 'plate-kid',
          householdMemberId: 'kid-a',
          componentIds: ['pasta', 'carrot'],
        },
      ],
    });

    // Per-member rows (2 components) + shared rows (2 components) = 4 upserts
    expect(mockPrisma.slotAffinity.upsert.mock.calls.length).toBe(4);

    const memberKeys = mockPrisma.slotAffinity.upsert.mock.calls
      .map(([a]: any) => a.where.userId_householdMemberId_componentId.householdMemberId)
      .sort();
    expect(memberKeys).toEqual(['kid-a', 'kid-a', null, null]);
  });

  it('isolates per-member affinity — cooking for member B does not touch member A rows', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([
      { id: 'pasta', slot: 'base' },
    ]);
    mockPrisma.slotAffinity.upsert.mockResolvedValue({});

    await recordFamilyMealCookedAffinity({
      userId: 'u1',
      plates: [
        { plateId: 'plate-b', householdMemberId: 'kid-b', componentIds: ['pasta'] },
      ],
    });

    const memberIds = mockPrisma.slotAffinity.upsert.mock.calls
      .map(([a]: any) => a.where.userId_householdMemberId_componentId.householdMemberId);
    expect(memberIds).toContain('kid-b');
    expect(memberIds).not.toContain('kid-a');
  });

  it('re-cooking the same (member, component) combo passes sampleCount.increment=1 to upsert.update', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([{ id: 'pasta', slot: 'base' }]);
    mockPrisma.slotAffinity.findUnique.mockResolvedValue({ score: 0.4 });
    mockPrisma.slotAffinity.upsert.mockResolvedValue({});

    await recordFamilyMealCookedAffinity({
      userId: 'u1',
      plates: [
        { plateId: 'p1', householdMemberId: 'kid-a', componentIds: ['pasta'] },
      ],
    });

    // First upsert call is the per-member row
    const memberCall = mockPrisma.slotAffinity.upsert.mock.calls.find(
      ([a]: any) => a.where.userId_householdMemberId_componentId.householdMemberId === 'kid-a',
    );
    expect(memberCall).toBeDefined();
    expect(memberCall[0].update.sampleCount.increment).toBe(1);
  });

  it('plates without a householdMemberId only write the shared (NULL) row', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([{ id: 'pasta', slot: 'base' }]);
    mockPrisma.slotAffinity.upsert.mockResolvedValue({});

    await recordFamilyMealCookedAffinity({
      userId: 'u1',
      plates: [{ plateId: 'p1', componentIds: ['pasta'] }],
    });

    expect(mockPrisma.slotAffinity.upsert.mock.calls.length).toBe(1);
    const [[args]] = mockPrisma.slotAffinity.upsert.mock.calls;
    expect(args.where.userId_householdMemberId_componentId.householdMemberId).toBeNull();
  });
});
