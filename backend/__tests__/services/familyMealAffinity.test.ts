// Group 10X Phase 7+ — per-household-member SlotAffinity learning loop.
//
// The kid plate must adapt to *this* kid's accepted components, not a generic
// kid template. These tests pin the contract:
//   1. Cooking a family meal writes per-member affinity rows + a shared
//      account-level row (so household-head context still updates).
//   2. Each member's affinity is isolated — cooking for member A must not
//      bleed into member B's row.
//   3. Re-cooking the same combo updates an existing row (sampleCount += 1)
//      instead of duplicating rows.

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
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
  } else {
    mockPrisma.slotAffinity.findFirst = mockPrisma.slotAffinity.findFirst ?? jest.fn();
    mockPrisma.slotAffinity.create = mockPrisma.slotAffinity.create ?? jest.fn();
    mockPrisma.slotAffinity.update = mockPrisma.slotAffinity.update ?? jest.fn();
  }
  if (!mockPrisma.mealComponent) {
    mockPrisma.mealComponent = { findMany: jest.fn() };
  }
  mockPrisma.slotAffinity.findFirst.mockResolvedValue(null);
});

describe('recordSlotAffinity — per-household-member keying', () => {
  it('writes a row keyed on (userId, householdMemberId, componentId) when a member is provided', async () => {
    mockPrisma.slotAffinity.create.mockResolvedValue({});

    await recordSlotAffinity({
      userId: 'u1',
      componentId: 'comp-roast-carrot',
      slot: 'vegetable',
      householdMemberId: 'kid-a',
      delta: 0.2,
    });

    const [[{ where }]] = mockPrisma.slotAffinity.findFirst.mock.calls;
    expect(where).toEqual({
      userId: 'u1',
      householdMemberId: 'kid-a',
      componentId: 'comp-roast-carrot',
    });
    const [[{ data }]] = mockPrisma.slotAffinity.create.mock.calls;
    expect(data.householdMemberId).toBe('kid-a');
  });

  it('writes a row keyed on (userId, NULL, componentId) when no member is provided', async () => {
    mockPrisma.slotAffinity.create.mockResolvedValue({});

    await recordSlotAffinity({
      userId: 'u1',
      componentId: 'comp-roast-carrot',
      slot: 'vegetable',
      delta: 0.2,
    });

    const [[{ where }]] = mockPrisma.slotAffinity.findFirst.mock.calls;
    expect(where).toEqual({
      userId: 'u1',
      householdMemberId: null,
      componentId: 'comp-roast-carrot',
    });
    const [[{ data }]] = mockPrisma.slotAffinity.create.mock.calls;
    expect(data.householdMemberId).toBeNull();
  });
});

describe('recordFamilyMealCookedAffinity', () => {
  it('writes a per-member row for each plate that has a householdMemberId AND a shared account-level row', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([
      { id: 'pasta', slot: 'base' },
      { id: 'carrot', slot: 'vegetable' },
    ]);
    mockPrisma.slotAffinity.create.mockResolvedValue({});

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

    // Per-member rows (2 components) + shared rows (2 components) = 4 creates
    expect(mockPrisma.slotAffinity.create.mock.calls.length).toBe(4);

    const memberKeys = mockPrisma.slotAffinity.create.mock.calls
      .map(([a]: any) => a.data.householdMemberId)
      .sort();
    expect(memberKeys).toEqual(['kid-a', 'kid-a', null, null]);
  });

  it('isolates per-member affinity — cooking for member B does not touch member A rows', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([
      { id: 'pasta', slot: 'base' },
    ]);
    mockPrisma.slotAffinity.create.mockResolvedValue({});

    await recordFamilyMealCookedAffinity({
      userId: 'u1',
      plates: [
        { plateId: 'plate-b', householdMemberId: 'kid-b', componentIds: ['pasta'] },
      ],
    });

    const memberIds = mockPrisma.slotAffinity.create.mock.calls
      .map(([a]: any) => a.data.householdMemberId);
    expect(memberIds).toContain('kid-b');
    expect(memberIds).not.toContain('kid-a');
  });

  it('re-cooking the same (member, component) combo updates the existing row with sampleCount += 1', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([{ id: 'pasta', slot: 'base' }]);
    // Existing row found for the per-member lookup → update path
    mockPrisma.slotAffinity.findFirst.mockResolvedValue({ id: 'sa-1', score: 0.4 });
    mockPrisma.slotAffinity.update.mockResolvedValue({});

    await recordFamilyMealCookedAffinity({
      userId: 'u1',
      plates: [
        { plateId: 'p1', householdMemberId: 'kid-a', componentIds: ['pasta'] },
      ],
    });

    // Update was called for both the per-member and shared rows
    expect(mockPrisma.slotAffinity.update).toHaveBeenCalled();
    const [[{ data }]] = mockPrisma.slotAffinity.update.mock.calls;
    expect(data.sampleCount.increment).toBe(1);
  });

  it('plates without a householdMemberId only write the shared (NULL) row', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValue([{ id: 'pasta', slot: 'base' }]);
    mockPrisma.slotAffinity.create.mockResolvedValue({});

    await recordFamilyMealCookedAffinity({
      userId: 'u1',
      plates: [{ plateId: 'p1', componentIds: ['pasta'] }],
    });

    expect(mockPrisma.slotAffinity.create.mock.calls.length).toBe(1);
    const [[{ data }]] = mockPrisma.slotAffinity.create.mock.calls;
    expect(data.householdMemberId).toBeNull();
  });
});
