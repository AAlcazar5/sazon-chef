// Path A — UserTier resolver tests.

const prismaMock = {
  user: { findUnique: jest.fn() },
};
jest.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { mapTier, resolveUserTier } from '../../src/services/userTierService';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('mapTier', () => {
  it('maps the literal "free" to free', () => {
    expect(mapTier('free')).toBe('free');
  });

  it('maps the literal "premium" to premium', () => {
    expect(mapTier('premium')).toBe('premium');
  });

  it('downgrades "chef" to premium when CHEF_TIER_ENABLED is off', () => {
    expect(mapTier('chef', false)).toBe('premium');
  });

  it('keeps "chef" when CHEF_TIER_ENABLED is on', () => {
    expect(mapTier('chef', true)).toBe('chef');
  });

  it('is case-insensitive + trims whitespace', () => {
    expect(mapTier('  PREMIUM  ')).toBe('premium');
    expect(mapTier('Free')).toBe('free');
  });

  it('falls back to free for null / undefined / unknown strings', () => {
    expect(mapTier(null)).toBe('free');
    expect(mapTier(undefined)).toBe('free');
    expect(mapTier('enterprise')).toBe('free');
  });
});

describe('resolveUserTier', () => {
  it('returns free when userId is null (anonymous flow)', async () => {
    expect(await resolveUserTier(null)).toBe('free');
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('reads the tier from the User row', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ subscriptionTier: 'premium' });
    expect(await resolveUserTier('u1')).toBe('premium');
  });

  it('fails open to free when the User row is missing', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    expect(await resolveUserTier('u1')).toBe('free');
  });

  it('fails open to free when the DB read errors', async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error('db down'));
    expect(await resolveUserTier('u1')).toBe('free');
  });
});
