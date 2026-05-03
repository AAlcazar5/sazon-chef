// Group 10X Phase 7+ — affinity read path with optional householdMember filter.
//
// `getSlotAffinity(userId, componentId, householdMemberId?)` must:
//   - default to the account-level row (householdMemberId: null) when no
//     member is passed (backwards compatible with the original 2-arg call).
//   - return the per-member row when a member id is passed.

import { getSlotAffinity, getTopComponentsForSlot } from '../../src/services/slotAffinityService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  if (!mockPrisma.slotAffinity) {
    mockPrisma.slotAffinity = {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    };
  }
});

describe('getSlotAffinity — default (no householdMemberId)', () => {
  it('queries with householdMemberId: null', async () => {
    mockPrisma.slotAffinity.findFirst.mockResolvedValue({ score: 0.5, sampleCount: 4 });

    await getSlotAffinity('u1', 'comp-a');

    const [[args]] = mockPrisma.slotAffinity.findFirst.mock.calls;
    expect(args.where).toMatchObject({ userId: 'u1', componentId: 'comp-a', householdMemberId: null });
  });
});

describe('getSlotAffinity — with householdMemberId', () => {
  it('queries with the explicit memberId', async () => {
    mockPrisma.slotAffinity.findFirst.mockResolvedValue({ score: 0.9, sampleCount: 6 });

    const result = await getSlotAffinity('u1', 'comp-a', 'kid-a');

    expect(result).toEqual({ score: 0.9, sampleCount: 6 });
    const [[args]] = mockPrisma.slotAffinity.findFirst.mock.calls;
    expect(args.where).toMatchObject({
      userId: 'u1',
      componentId: 'comp-a',
      householdMemberId: 'kid-a',
    });
  });

  it('returns null when no row exists for that member', async () => {
    mockPrisma.slotAffinity.findFirst.mockResolvedValue(null);

    const result = await getSlotAffinity('u1', 'comp-a', 'kid-b');

    expect(result).toBeNull();
  });
});

describe('getTopComponentsForSlot — with householdMemberId', () => {
  it('queries with the explicit memberId scope', async () => {
    mockPrisma.slotAffinity.findMany.mockResolvedValue([
      { componentId: 'a', score: 0.9, sampleCount: 5 },
    ]);

    await getTopComponentsForSlot('u1', 'protein', 5, 'kid-a');

    const [[args]] = mockPrisma.slotAffinity.findMany.mock.calls;
    expect(args.where).toMatchObject({ userId: 'u1', slot: 'protein', householdMemberId: 'kid-a' });
  });

  it('defaults to householdMemberId: null when no memberId is passed', async () => {
    mockPrisma.slotAffinity.findMany.mockResolvedValue([]);

    await getTopComponentsForSlot('u1', 'protein', 5);

    const [[args]] = mockPrisma.slotAffinity.findMany.mock.calls;
    expect(args.where).toMatchObject({ userId: 'u1', slot: 'protein', householdMemberId: null });
  });
});
