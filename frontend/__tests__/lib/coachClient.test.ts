// Phase 4 (10Y-D) + Tier S: client-side derivation of Coach feature flags
// from subscription state. The single source of truth for "what does this
// user's coach look like".

import { deriveCoachFlags, FREE_DAILY_MESSAGE_CAP } from '../../lib/coachClient';

describe('deriveCoachFlags', () => {
  it('free user gets capped, no memory, no weekly check-in, Haiku 4.5', () => {
    const flags = deriveCoachFlags({ tier: 'free', isPremium: false });
    expect(flags.tier).toBe('free');
    // Founder ask 2026-05-22: photo attach temporarily unblocked for free
    // tier to enable manual camera-to-pantry testing pre-launch. Roadmap
    // Tier Y "Restore photo-attach paywall" tracks the revert; flip both
    // this expectation + lib/coachClient.ts canAttachPhotos back to false then.
    expect(flags.canAttachPhotos).toBe(true);
    expect(flags.dailyMessageCap).toBe(FREE_DAILY_MESSAGE_CAP);
    expect(flags.dailyMessageCap).toBe(10);
    expect(flags.hasMemory).toBe(false);
    expect(flags.hasWeeklyCheckin).toBe(false);
    expect(flags.modelLabel).toBe('Haiku 4.5');
  });

  it('premium chat user gets Sonnet 4.6 ✦ chat label by default', () => {
    const flags = deriveCoachFlags({ tier: 'premium', isPremium: true });
    expect(flags.tier).toBe('premium');
    expect(flags.canAttachPhotos).toBe(true);
    expect(flags.dailyMessageCap).toBeNull();
    expect(flags.hasMemory).toBe(true);
    expect(flags.hasWeeklyCheckin).toBe(true);
    expect(flags.modelLabel).toBe('Sonnet 4.6 ✦ chat');
  });

  it('premium deep_plan user gets Opus 4.7 ✦ deep plan label', () => {
    const flags = deriveCoachFlags(
      { tier: 'premium', isPremium: true },
      'deep_plan',
    );
    expect(flags.modelLabel).toBe('Opus 4.7 ✦ deep plan');
  });

  it('free user always shows Haiku label regardless of intent', () => {
    const flags = deriveCoachFlags(
      { tier: 'free', isPremium: false },
      'deep_plan',
    );
    expect(flags.modelLabel).toBe('Haiku 4.5');
  });

  it('treats isPremium=false as free even if tier text is premium (defensive)', () => {
    const flags = deriveCoachFlags({ tier: 'premium', isPremium: false });
    expect(flags.tier).toBe('free');
    expect(flags.modelLabel).toBe('Haiku 4.5');
  });
});
