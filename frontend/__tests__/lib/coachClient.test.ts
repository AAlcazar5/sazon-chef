// Phase 4 (10Y-D): client-side derivation of Coach feature flags from
// subscription state. The single source of truth for "what does this user's
// coach look like".

import { deriveCoachFlags, FREE_DAILY_MESSAGE_CAP } from '../../lib/coachClient';

describe('deriveCoachFlags', () => {
  it('free user gets capped, no photos, no memory, no weekly check-in, Sonnet', () => {
    const flags = deriveCoachFlags({ tier: 'free', isPremium: false });
    expect(flags.tier).toBe('free');
    expect(flags.canAttachPhotos).toBe(false);
    expect(flags.dailyMessageCap).toBe(FREE_DAILY_MESSAGE_CAP);
    expect(flags.dailyMessageCap).toBe(10);
    expect(flags.hasMemory).toBe(false);
    expect(flags.hasWeeklyCheckin).toBe(false);
    expect(flags.modelLabel).toBe('Sonnet');
  });

  it('premium user gets unlimited, photos, memory, weekly check-in, Opus', () => {
    const flags = deriveCoachFlags({ tier: 'premium', isPremium: true });
    expect(flags.tier).toBe('premium');
    expect(flags.canAttachPhotos).toBe(true);
    expect(flags.dailyMessageCap).toBeNull();
    expect(flags.hasMemory).toBe(true);
    expect(flags.hasWeeklyCheckin).toBe(true);
    expect(flags.modelLabel).toBe('Opus');
  });

  it('treats isPremium=false as free even if tier text is premium (defensive)', () => {
    const flags = deriveCoachFlags({ tier: 'premium', isPremium: false });
    expect(flags.tier).toBe('free');
    expect(flags.modelLabel).toBe('Sonnet');
  });
});
