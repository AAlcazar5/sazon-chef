// Phase 4 (10Y-D): server-side tier resolution from user subscription state.
// Premium gating requires both tier === 'premium' AND status in (active, trialing).

import { resolveCoachTier } from '../../src/services/coachService';

describe('resolveCoachTier', () => {
  it('free tier + free status maps to free', () => {
    expect(
      resolveCoachTier({ subscriptionTier: 'free', subscriptionStatus: 'free' }),
    ).toBe('free');
  });

  it('premium tier + active status maps to premium', () => {
    expect(
      resolveCoachTier({
        subscriptionTier: 'premium',
        subscriptionStatus: 'active',
      }),
    ).toBe('premium');
  });

  it('premium tier + trialing status maps to premium', () => {
    expect(
      resolveCoachTier({
        subscriptionTier: 'premium',
        subscriptionStatus: 'trialing',
      }),
    ).toBe('premium');
  });

  it('premium tier + past_due status downgrades to free', () => {
    expect(
      resolveCoachTier({
        subscriptionTier: 'premium',
        subscriptionStatus: 'past_due',
      }),
    ).toBe('free');
  });

  it('premium tier + canceled status downgrades to free', () => {
    expect(
      resolveCoachTier({
        subscriptionTier: 'premium',
        subscriptionStatus: 'canceled',
      }),
    ).toBe('free');
  });

  it('null/undefined user is free', () => {
    expect(resolveCoachTier(null)).toBe('free');
    expect(resolveCoachTier(undefined)).toBe('free');
  });

  it('missing fields default to free', () => {
    expect(resolveCoachTier({})).toBe('free');
    expect(resolveCoachTier({ subscriptionTier: 'premium' })).toBe('free');
  });
});
