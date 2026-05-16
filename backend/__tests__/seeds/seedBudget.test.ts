// Target-saved mode: "keep generating until N recipes are actually SAVED —
// duplicates and failures don't count toward N" — with a mandatory attempt
// cap so a saturated cuisine can't run spend away to infinity.

import { resolveRunBudget, evaluateStop } from '../../scripts/seedBudget';

describe('resolveRunBudget', () => {
  it('legacy mode (no TARGET_SAVED): plan + cap are just RECIPE_BUDGET', () => {
    const b = resolveRunBudget({ recipeBudget: 500, targetSaved: null, maxAttempts: null, attemptMultiplier: 5 });
    expect(b).toEqual({ targetSaved: null, planCap: 500, maxAttempts: 500 });
  });

  it('target mode: maxAttempts defaults to targetSaved × multiplier and bounds the plan', () => {
    const b = resolveRunBudget({ recipeBudget: 500, targetSaved: 500, maxAttempts: null, attemptMultiplier: 5 });
    expect(b).toEqual({ targetSaved: 500, planCap: 2500, maxAttempts: 2500 });
  });

  it('explicit MAX_ATTEMPTS overrides the multiplier default', () => {
    const b = resolveRunBudget({ recipeBudget: 500, targetSaved: 500, maxAttempts: 1200, attemptMultiplier: 5 });
    expect(b).toEqual({ targetSaved: 500, planCap: 1200, maxAttempts: 1200 });
  });

  it('never lets the attempt cap fall below the target (multiplier clamped ≥ 1)', () => {
    const b = resolveRunBudget({ recipeBudget: 500, targetSaved: 500, maxAttempts: null, attemptMultiplier: 0.2 });
    expect(b.maxAttempts).toBeGreaterThanOrEqual(500);
  });

  it('treats a non-positive TARGET_SAVED as legacy mode', () => {
    const b = resolveRunBudget({ recipeBudget: 300, targetSaved: 0, maxAttempts: null, attemptMultiplier: 5 });
    expect(b.targetSaved).toBeNull();
    expect(b.planCap).toBe(300);
  });
});

describe('evaluateStop', () => {
  const cap = 2500;

  it('keeps going when under target, under cap, plan not exhausted', () => {
    expect(
      evaluateStop({ succeeded: 120, targetSaved: 500, attempts: 300, maxAttempts: cap, planExhausted: false }),
    ).toEqual({ stop: false, reason: null });
  });

  it('stops with target_reached the moment saves hit the target (dups/fails irrelevant)', () => {
    expect(
      evaluateStop({ succeeded: 500, targetSaved: 500, attempts: 1900, maxAttempts: cap, planExhausted: false }),
    ).toEqual({ stop: true, reason: 'target_reached' });
  });

  it('target_reached wins even if the attempt cap is also hit', () => {
    expect(
      evaluateStop({ succeeded: 500, targetSaved: 500, attempts: cap, maxAttempts: cap, planExhausted: false }),
    ).toEqual({ stop: true, reason: 'target_reached' });
  });

  it('stops with max_attempts when the cap is hit before the target', () => {
    expect(
      evaluateStop({ succeeded: 410, targetSaved: 500, attempts: cap, maxAttempts: cap, planExhausted: false }),
    ).toEqual({ stop: true, reason: 'max_attempts' });
  });

  it('stops with plan_exhausted when no legitimate cuisine slots remain', () => {
    expect(
      evaluateStop({ succeeded: 410, targetSaved: 500, attempts: 900, maxAttempts: cap, planExhausted: true }),
    ).toEqual({ stop: true, reason: 'plan_exhausted' });
  });

  it('legacy mode (targetSaved null) never reports target_reached', () => {
    expect(
      evaluateStop({ succeeded: 9999, targetSaved: null, attempts: 10, maxAttempts: 500, planExhausted: false }),
    ).toEqual({ stop: false, reason: null });
    expect(
      evaluateStop({ succeeded: 9999, targetSaved: null, attempts: 500, maxAttempts: 500, planExhausted: false }).reason,
    ).toBe('max_attempts');
  });
});
