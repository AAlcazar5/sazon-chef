// backend/__tests__/services/userConditioning.test.ts
// ROADMAP 4.0 Tier C1 — AI prompt user-conditioning layer (TDD).

import {
  buildUserConditioningAddendum,
  type UserPromptState,
} from '../../src/services/userConditioningService';

const neutral: UserPromptState = {
  nutritionUIDensity: 'minimal',
};

describe('buildUserConditioningAddendum — empty / neutral state', () => {
  it('returns null for fully empty state (lifestyle default)', () => {
    expect(buildUserConditioningAddendum(neutral)).toBeNull();
  });

  it('returns null when nutritionUIDensity = "minimal" even with other signals', () => {
    expect(
      buildUserConditioningAddendum({
        nutritionUIDensity: 'minimal',
        goalPhase: 'cut',
        nutrientGaps: ['fiber'],
        superfoodAffinity: ['lentils'],
      })
    ).toBeNull();
  });
});

describe('buildUserConditioningAddendum — goal phase', () => {
  it('emits a cut-aware line when goalPhase = "cut"', () => {
    const out = buildUserConditioningAddendum({
      nutritionUIDensity: 'macros',
      goalPhase: 'cut',
    });
    expect(out).not.toBeNull();
    expect(out!.toLowerCase()).toMatch(/calorie deficit|lower-calorie|cut/i);
  });

  it('emits a bulk-aware line when goalPhase = "bulk"', () => {
    const out = buildUserConditioningAddendum({
      nutritionUIDensity: 'macros',
      goalPhase: 'bulk',
    });
    expect(out).not.toBeNull();
    expect(out!.toLowerCase()).toMatch(/surplus|hearty|protein-forward/i);
  });

  it('does NOT emit goal-phase line when goalPhase = "maintain"', () => {
    const out = buildUserConditioningAddendum({
      nutritionUIDensity: 'macros',
      goalPhase: 'maintain',
    });
    if (out) {
      expect(out.toLowerCase()).not.toMatch(/deficit|surplus/);
    }
  });
});

describe('buildUserConditioningAddendum — structured intents', () => {
  it('emits protein nudge when proteinTargetNudge is set', () => {
    const out = buildUserConditioningAddendum({
      nutritionUIDensity: 'macros',
      structuredIntents: { proteinTargetNudge: true },
    });
    expect(out).not.toBeNull();
    expect(out!.toLowerCase()).toMatch(/protein-dense|protein-forward/);
  });

  it('emits fiber nudge when fiberTargetNudge is set', () => {
    const out = buildUserConditioningAddendum({
      nutritionUIDensity: 'macros',
      structuredIntents: { fiberTargetNudge: true },
    });
    expect(out).not.toBeNull();
    expect(out!.toLowerCase()).toMatch(/fiber/);
  });

  it('emits variety hint when cuisineVarietyBoost is set', () => {
    const out = buildUserConditioningAddendum({
      nutritionUIDensity: 'macros',
      structuredIntents: { cuisineVarietyBoost: true },
    });
    expect(out).not.toBeNull();
    expect(out!.toLowerCase()).toMatch(/variety|adjacent/);
  });
});

describe('buildUserConditioningAddendum — lightening behavior', () => {
  it('skips "lighter version" suggestions when cookHistoryLightenRate is low', () => {
    const out = buildUserConditioningAddendum({
      nutritionUIDensity: 'macros',
      cookHistoryLightenRate: 0.05,
    });
    expect(out).not.toBeNull();
    expect(out!.toLowerCase()).toMatch(/skip.*lighter|do not.*lighter/i);
  });

  it('does NOT add the skip-lightening line when rate is high', () => {
    const out = buildUserConditioningAddendum({
      nutritionUIDensity: 'macros',
      cookHistoryLightenRate: 0.5,
    });
    if (out) {
      expect(out.toLowerCase()).not.toMatch(/skip.*lighter/i);
    }
  });
});

describe('buildUserConditioningAddendum — superfood + gap pairing', () => {
  it('surfaces superfood callout only when affinity exists for a gap-relevant ingredient', () => {
    const out = buildUserConditioningAddendum({
      nutritionUIDensity: 'macros + micros',
      nutrientGaps: ['fiber'],
      superfoodAffinity: ['lentils', 'oats'],
    });
    expect(out).not.toBeNull();
    expect(out!.toLowerCase()).toMatch(/lentils|oats/);
  });

  it('does NOT surface a generic superfood when user has no affinity for it', () => {
    const out = buildUserConditioningAddendum({
      nutritionUIDensity: 'macros + micros',
      nutrientGaps: ['fiber'],
      superfoodAffinity: [],
    });
    if (out) {
      expect(out.toLowerCase()).not.toMatch(/lentils|oats|chia/);
    }
  });
});

describe('buildUserConditioningAddendum — divergence (two users, different prompts)', () => {
  it('returns different addenda for two users with different state', () => {
    const a = buildUserConditioningAddendum({
      nutritionUIDensity: 'macros',
      goalPhase: 'cut',
      structuredIntents: { proteinTargetNudge: true },
    });
    const b = buildUserConditioningAddendum({
      nutritionUIDensity: 'macros',
      goalPhase: 'bulk',
      structuredIntents: { fiberTargetNudge: true },
    });
    expect(a).not.toEqual(b);
  });
});
