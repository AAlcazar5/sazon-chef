// backend/__tests__/services/adaptiveNotificationService.test.ts
// ROADMAP 4.0 Tier C12 — Adaptive notification scheduling (TDD).

import {
  pickBestTemplate,
  shouldFireNotification,
  buildNotificationCopy,
  type AdaptiveNotificationContext,
} from '../../src/services/adaptiveNotificationService';

const baseContext: AdaptiveNotificationContext = {
  userId: 'user-1',
  now: new Date('2026-05-04T17:00:00'), // Tuesday 5pm
  typicalCookHour: 17,
  recentSentCount: 0,
  // Has an actionable signal by default so cadence/windowing tests aren't
  // accidentally gated on signal presence.
  expiringPantryItems: [{ name: 'salmon', daysUntilExpiry: 2 }],
  remainingMacros: { calories: 800, protein: 30, fiber: 12 },
  hasPlannedMealForToday: true,
  cuisineVarietyLast7: 5,
};

describe('shouldFireNotification — cadence + windowing', () => {
  it('fires only within ±60 min of the user\'s typical cook hour', () => {
    expect(
      shouldFireNotification({
        ...baseContext,
        now: new Date('2026-05-04T17:00:00'),
        typicalCookHour: 17,
      })
    ).toBe(true);
    expect(
      shouldFireNotification({
        ...baseContext,
        now: new Date('2026-05-04T15:00:00'),
        typicalCookHour: 17,
      })
    ).toBe(false);
  });

  it('respects 3-per-day cap', () => {
    expect(
      shouldFireNotification({
        ...baseContext,
        recentSentCount: 3,
      })
    ).toBe(false);
    expect(
      shouldFireNotification({
        ...baseContext,
        recentSentCount: 2,
      })
    ).toBe(true);
  });

  it('returns false when there is nothing to say (no expiring items, plan exists, no big macro gap)', () => {
    expect(
      shouldFireNotification({
        ...baseContext,
        expiringPantryItems: [],
        remainingMacros: { calories: 500, protein: 30, fiber: 12 },
        hasPlannedMealForToday: true,
      })
    ).toBe(false);
  });

  it('fires when there are expiring pantry items', () => {
    expect(
      shouldFireNotification({
        ...baseContext,
        expiringPantryItems: [{ name: 'salmon', daysUntilExpiry: 1 }],
      })
    ).toBe(true);
  });

  it('fires when user has no planned meal for today', () => {
    expect(
      shouldFireNotification({
        ...baseContext,
        hasPlannedMealForToday: false,
      })
    ).toBe(true);
  });
});

describe('pickBestTemplate', () => {
  it('returns "expiring-pantry" when there are items expiring within 2 days', () => {
    expect(
      pickBestTemplate({
        ...baseContext,
        expiringPantryItems: [{ name: 'salmon', daysUntilExpiry: 1 }],
      })
    ).toBe('expiring-pantry');
  });

  it('returns "no-plan-tonight" when user has no planned meal for today', () => {
    expect(
      pickBestTemplate({
        ...baseContext,
        hasPlannedMealForToday: false,
        expiringPantryItems: [],
      })
    ).toBe('no-plan-tonight');
  });

  it('returns "fiber-gap" when remaining fiber is well below typical (>10g short)', () => {
    expect(
      pickBestTemplate({
        ...baseContext,
        remainingMacros: { calories: 500, protein: 30, fiber: -12 },
        expiringPantryItems: [],
        hasPlannedMealForToday: true,
      })
    ).toBe('fiber-gap');
  });

  it('returns "low-variety" when last 7d cuisine variety is low (<3 cuisines)', () => {
    expect(
      pickBestTemplate({
        ...baseContext,
        cuisineVarietyLast7: 1,
        expiringPantryItems: [],
        hasPlannedMealForToday: true,
      })
    ).toBe('low-variety');
  });

  it('returns null when nothing actionable', () => {
    expect(
      pickBestTemplate({
        ...baseContext,
        expiringPantryItems: [],
        hasPlannedMealForToday: true,
        remainingMacros: { calories: 500, protein: 30, fiber: 12 },
        cuisineVarietyLast7: 5,
      })
    ).toBeNull();
  });

  it('prioritizes expiring-pantry above other templates when both apply', () => {
    expect(
      pickBestTemplate({
        ...baseContext,
        expiringPantryItems: [{ name: 'salmon', daysUntilExpiry: 1 }],
        hasPlannedMealForToday: false,
        cuisineVarietyLast7: 1,
      })
    ).toBe('expiring-pantry');
  });
});

describe('buildNotificationCopy', () => {
  it('builds expiring-pantry copy referencing the actual ingredient', () => {
    const copy = buildNotificationCopy('expiring-pantry', {
      ...baseContext,
      expiringPantryItems: [{ name: 'salmon', daysUntilExpiry: 2 }],
    });
    expect(copy.title.toLowerCase()).toMatch(/salmon|expir/);
    expect(copy.body.toLowerCase()).toMatch(/salmon/);
  });

  it('builds no-plan-tonight copy when user has no plan', () => {
    const copy = buildNotificationCopy('no-plan-tonight', {
      ...baseContext,
      hasPlannedMealForToday: false,
    });
    expect(copy.body.toLowerCase()).toMatch(/tonight|cook/);
  });

  it('builds fiber-gap copy in invitational lifestyle voice (no verdict)', () => {
    const copy = buildNotificationCopy('fiber-gap', {
      ...baseContext,
      remainingMacros: { calories: 500, protein: 30, fiber: -12 },
    });
    // Lifestyle voice — no "you missed your goal" / "you're under target".
    expect(copy.body.toLowerCase()).not.toMatch(/missed your|under target|you'?re under/);
    // Should be invitation-tone — "want to try", "fancy", etc.
    expect(copy.body.toLowerCase()).toMatch(/fancy|want to|try/);
  });

  it('builds low-variety copy referencing the last cuisine', () => {
    const copy = buildNotificationCopy('low-variety', {
      ...baseContext,
      cuisineVarietyLast7: 1,
    });
    expect(copy.body.toLowerCase()).toMatch(/different|new|adventure/i);
  });

  it('throws on unknown template', () => {
    expect(() =>
      buildNotificationCopy('not-a-template' as any, baseContext)
    ).toThrow();
  });
});
