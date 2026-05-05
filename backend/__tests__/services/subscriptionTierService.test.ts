// backend/__tests__/services/subscriptionTierService.test.ts
// ROADMAP 4.0 PRC1 — feature-gate matrix + tier enforcement.

const mockUserFindUnique = jest.fn();
const mockComposedPlateCount = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => mockUserFindUnique(...a) },
    composedPlate: { count: (...a: unknown[]) => mockComposedPlateCount(...a) },
  },
}));

import {
  hasFeatureAccess,
  evaluateAccess,
  FREE_BUILD_A_PLATE_WEEKLY_LIMIT,
  __forTest,
  type FeatureKey,
} from '../../src/services/subscriptionTierService';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('hasFeatureAccess (pure tier check)', () => {
  const ALL_GATED: FeatureKey[] = [
    'coachChat', 'coachMemory', 'coachPhotoAttach',
    'adaptiveNutritionCoverage', 'culturalPrimers', 'voiceCooking',
    'adaptiveNotifications', 'fullNutritionView', 'buildAPlateUnlimited',
  ];

  describe('premium tier — active subscription', () => {
    const user = { subscriptionTier: 'premium', subscriptionStatus: 'active' };
    it.each(ALL_GATED)('grants %s', feature => {
      expect(hasFeatureAccess(user, feature)).toBe(true);
    });
  });

  describe('premium tier — trialing subscription', () => {
    const user = { subscriptionTier: 'premium', subscriptionStatus: 'trialing' };
    it.each(ALL_GATED)('grants %s during trial', feature => {
      expect(hasFeatureAccess(user, feature)).toBe(true);
    });
  });

  describe('premium tier — past_due / canceled', () => {
    it('past_due blocks gated features', () => {
      const user = { subscriptionTier: 'premium', subscriptionStatus: 'past_due' };
      expect(hasFeatureAccess(user, 'coachChat')).toBe(false);
    });
    it('canceled blocks gated features', () => {
      const user = { subscriptionTier: 'premium', subscriptionStatus: 'canceled' };
      expect(hasFeatureAccess(user, 'coachChat')).toBe(false);
    });
  });

  describe('free tier', () => {
    const user = { subscriptionTier: 'free', subscriptionStatus: 'free' };
    it.each(ALL_GATED)('blocks %s', feature => {
      expect(hasFeatureAccess(user, feature)).toBe(false);
    });
  });

  it('annual + monthly intervals both grant access (interval lives on Stripe, not User)', () => {
    // Both intervals write the same User columns — tier='premium', status='active'.
    const annualUser = { subscriptionTier: 'premium', subscriptionStatus: 'active' };
    const monthlyUser = { subscriptionTier: 'premium', subscriptionStatus: 'active' };
    expect(hasFeatureAccess(annualUser, 'coachChat')).toBe(true);
    expect(hasFeatureAccess(monthlyUser, 'coachChat')).toBe(true);
  });
});

describe('evaluateAccess — premium short-circuit', () => {
  it('returns { allowed: true, reason: premium_grants } for active premium', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ subscriptionTier: 'premium', subscriptionStatus: 'active' });
    expect(await evaluateAccess('u1', 'coachChat')).toEqual({
      allowed: true,
      reason: 'premium_grants',
    });
    expect(mockComposedPlateCount).not.toHaveBeenCalled();
  });

  it('returns { allowed: true, reason: premium_grants } for trialing premium on a rate-limited feature', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ subscriptionTier: 'premium', subscriptionStatus: 'trialing' });
    expect(await evaluateAccess('u1', 'buildAPlateUnlimited')).toEqual({
      allowed: true,
      reason: 'premium_grants',
    });
    // No rate-limit query for premium.
    expect(mockComposedPlateCount).not.toHaveBeenCalled();
  });
});

describe('evaluateAccess — free tier with rate limits', () => {
  it('grants Build-a-Plate access while under the weekly cap, with remaining count', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ subscriptionTier: 'free', subscriptionStatus: 'free' });
    mockComposedPlateCount.mockResolvedValueOnce(1);
    const decision = await evaluateAccess('u1', 'buildAPlateUnlimited');
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe('free_tier_grants');
    expect(decision.remaining).toBe(FREE_BUILD_A_PLATE_WEEKLY_LIMIT - 1);
    expect(decision.resetsAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it('blocks Build-a-Plate at the weekly cap', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ subscriptionTier: 'free', subscriptionStatus: 'free' });
    mockComposedPlateCount.mockResolvedValueOnce(FREE_BUILD_A_PLATE_WEEKLY_LIMIT);
    const decision = await evaluateAccess('u1', 'buildAPlateUnlimited');
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('rate_limited');
    expect(decision.remaining).toBe(0);
    expect(decision.resetsAt).toBeDefined();
  });

  it('counts plates from the current ISO week only (queries with gte: monday)', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ subscriptionTier: 'free', subscriptionStatus: 'free' });
    mockComposedPlateCount.mockResolvedValueOnce(0);
    await evaluateAccess('u1', 'buildAPlateUnlimited');
    const call = mockComposedPlateCount.mock.calls[0][0];
    expect(call.where.userId).toBe('u1');
    expect(call.where.createdAt.gte).toBeInstanceOf(Date);
    // Monday of the current ISO week, UTC.
    const expectedMonday = __forTest.startOfWeekUtc();
    expect((call.where.createdAt.gte as Date).toISOString()).toBe(expectedMonday.toISOString());
  });

  it('blocks free tier on premium-only features', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ subscriptionTier: 'free', subscriptionStatus: 'free' });
    expect(await evaluateAccess('u1', 'coachChat')).toEqual({
      allowed: false,
      reason: 'tier_too_low',
    });
  });

  it('treats past_due like free for the gate', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ subscriptionTier: 'premium', subscriptionStatus: 'past_due' });
    expect(await evaluateAccess('u1', 'coachChat')).toEqual({
      allowed: false,
      reason: 'tier_too_low',
    });
  });
});

describe('evaluateAccess — missing user', () => {
  it('returns subscription_inactive when user not found', async () => {
    mockUserFindUnique.mockResolvedValueOnce(null);
    expect(await evaluateAccess('missing', 'coachChat')).toEqual({
      allowed: false,
      reason: 'subscription_inactive',
    });
  });
});

describe('week boundary helpers', () => {
  it('startOfWeekUtc is the Monday at 00:00:00.000 UTC', () => {
    const monday = __forTest.startOfWeekUtc();
    expect(monday.getUTCDay()).toBe(1);
    expect(monday.getUTCHours()).toBe(0);
    expect(monday.getUTCMinutes()).toBe(0);
    expect(monday.getUTCSeconds()).toBe(0);
  });

  it('startOfNextWeekUtc is exactly 7 days after startOfWeekUtc', () => {
    const monday = __forTest.startOfWeekUtc();
    const nextMonday = __forTest.startOfNextWeekUtc();
    expect(nextMonday.getTime() - monday.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
