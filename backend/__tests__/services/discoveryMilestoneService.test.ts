// backend/__tests__/services/discoveryMilestoneService.test.ts
// ROADMAP 4.0 Tier J5 — Discovery milestones (TDD).

import {
  KNOWN_MILESTONE_KEYS,
  isKnownMilestoneKey,
  markMilestone,
  getMilestonesAchieved,
  buildAppliancesMilestoneKey,
  describeMilestone,
} from '../../src/services/discoveryMilestoneService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  if (!mockPrisma.user) {
    mockPrisma.user = { findUnique: jest.fn(), update: jest.fn() };
  } else {
    mockPrisma.user.findUnique = jest.fn();
    mockPrisma.user.update = jest.fn();
  }
});

describe('KNOWN_MILESTONE_KEYS', () => {
  it('includes the launch milestones (photo, leftover, appliances)', () => {
    expect(KNOWN_MILESTONE_KEYS).toContain('first-photo');
    expect(KNOWN_MILESTONE_KEYS).toContain('first-leftover');
    expect(KNOWN_MILESTONE_KEYS).toContain('first-appliance:ninja-creami');
    expect(KNOWN_MILESTONE_KEYS).toContain('first-appliance:air-fryer');
    expect(KNOWN_MILESTONE_KEYS).toContain('first-appliance:instant-pot');
  });
});

describe('isKnownMilestoneKey', () => {
  it('accepts known keys', () => {
    expect(isKnownMilestoneKey('first-photo')).toBe(true);
    expect(isKnownMilestoneKey('first-appliance:ninja-creami')).toBe(true);
  });
  it('rejects unknown keys', () => {
    expect(isKnownMilestoneKey('first-streak')).toBe(false);
    expect(isKnownMilestoneKey('')).toBe(false);
  });
});

describe('buildAppliancesMilestoneKey', () => {
  it('lowercases + slugifies appliance names', () => {
    expect(buildAppliancesMilestoneKey('Ninja Creami')).toBe('first-appliance:ninja-creami');
    expect(buildAppliancesMilestoneKey('Air Fryer')).toBe('first-appliance:air-fryer');
    expect(buildAppliancesMilestoneKey('Instant Pot')).toBe('first-appliance:instant-pot');
  });
  it('returns null for empty appliance', () => {
    expect(buildAppliancesMilestoneKey('')).toBeNull();
    expect(buildAppliancesMilestoneKey('   ')).toBeNull();
  });
});

describe('markMilestone', () => {
  it('persists the new key to discoveryMilestones', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ discoveryMilestones: null });
    mockPrisma.user.update.mockResolvedValue({});
    const result = await markMilestone('user-1', 'first-photo');
    expect(result).toEqual({ alreadyAchieved: false, newlyAchieved: true });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { discoveryMilestones: JSON.stringify(['first-photo']) },
    });
  });

  it('is idempotent — second call does not duplicate', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      discoveryMilestones: JSON.stringify(['first-photo']),
    });
    const result = await markMilestone('user-1', 'first-photo');
    expect(result).toEqual({ alreadyAchieved: true, newlyAchieved: false });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('appends to existing milestones', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      discoveryMilestones: JSON.stringify(['first-photo']),
    });
    mockPrisma.user.update.mockResolvedValue({});
    await markMilestone('user-1', 'first-leftover');
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { discoveryMilestones: JSON.stringify(['first-photo', 'first-leftover']) },
    });
  });

  it('rejects unknown milestone keys', async () => {
    await expect(markMilestone('user-1', 'first-streak')).rejects.toThrow();
  });

  it('rejects empty userId', async () => {
    await expect(markMilestone('', 'first-photo')).rejects.toThrow();
  });

  it('handles malformed stored JSON gracefully (resets to fresh array)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      discoveryMilestones: 'not-json-at-all',
    });
    mockPrisma.user.update.mockResolvedValue({});
    const result = await markMilestone('user-1', 'first-photo');
    expect(result.newlyAchieved).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { discoveryMilestones: JSON.stringify(['first-photo']) },
    });
  });
});

describe('getMilestonesAchieved', () => {
  it('returns the persisted set', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      discoveryMilestones: JSON.stringify(['first-photo', 'first-leftover']),
    });
    const set = await getMilestonesAchieved('user-1');
    expect(set).toEqual(['first-photo', 'first-leftover']);
  });

  it('returns empty array when never set', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ discoveryMilestones: null });
    expect(await getMilestonesAchieved('user-1')).toEqual([]);
  });

  it('returns empty array when user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    expect(await getMilestonesAchieved('user-1')).toEqual([]);
  });

  it('returns empty array when stored JSON is malformed', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ discoveryMilestones: 'corrupt' });
    expect(await getMilestonesAchieved('user-1')).toEqual([]);
  });
});

describe('describeMilestone', () => {
  it('returns lifestyle copy for first-photo', () => {
    const desc = describeMilestone('first-photo');
    expect(desc).toBeTruthy();
    expect(desc?.title.length).toBeGreaterThan(0);
    expect(desc?.body.length).toBeGreaterThan(0);
  });
  it('returns lifestyle copy for first-leftover', () => {
    const desc = describeMilestone('first-leftover');
    expect(desc).toBeTruthy();
  });
  it('returns lifestyle copy for any first-appliance key', () => {
    const desc = describeMilestone('first-appliance:ninja-creami');
    expect(desc).toBeTruthy();
    expect(desc?.title.toLowerCase()).toContain('ninja creami');
  });
  it('returns null for unknown key', () => {
    expect(describeMilestone('first-streak')).toBeNull();
  });
});
