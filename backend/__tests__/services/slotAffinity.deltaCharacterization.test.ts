// CHARACTERIZATION (W-A4 prerequisite). The loop-value backtest must reuse
// the REAL affinity delta math, not a reimplementation that could drift.
// This pins deltaForEvent + clamp to their current values BEFORE they are
// exported for reuse, so any future change to the 70/30-adjacent map is a
// loud test failure (CLAUDE.md: never touch scoring without a
// characterization test first). Values transcribed from slotAffinityService
// as of 2026-05-18 — do not "fix" this test to match new behavior; a diff
// here is a deliberate scoring change that needs its own review.

import { deltaForEvent, clamp } from '../../src/services/slotAffinityService';

describe('clamp — locked at [-2, 2]', () => {
  it('passes through in-range', () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(1.37)).toBe(1.37);
    expect(clamp(-1.99)).toBe(-1.99);
  });
  it('clamps both bounds', () => {
    expect(clamp(2)).toBe(2);
    expect(clamp(2.0001)).toBe(2);
    expect(clamp(50)).toBe(2);
    expect(clamp(-2)).toBe(-2);
    expect(clamp(-2.0001)).toBe(-2);
    expect(clamp(-50)).toBe(-2);
  });
});

describe('deltaForEvent — locked map (the 70/30-adjacent invariant)', () => {
  const u = 'u';
  it('plate_saved = +0.1', () => {
    expect(deltaForEvent({ type: 'plate_saved', userId: u, componentIds: ['c'] })).toBe(0.1);
  });
  it('plate_cooked = +0.2', () => {
    expect(deltaForEvent({ type: 'plate_cooked', userId: u, componentIds: ['c'] })).toBe(0.2);
  });
  it('plate_rated: >=4★ = +0.3, <=2★ = -0.4, 3★ = null (neutral)', () => {
    expect(deltaForEvent({ type: 'plate_rated', userId: u, componentIds: ['c'], stars: 5 })).toBe(0.3);
    expect(deltaForEvent({ type: 'plate_rated', userId: u, componentIds: ['c'], stars: 4 })).toBe(0.3);
    expect(deltaForEvent({ type: 'plate_rated', userId: u, componentIds: ['c'], stars: 3 })).toBeNull();
    expect(deltaForEvent({ type: 'plate_rated', userId: u, componentIds: ['c'], stars: 2 })).toBe(-0.4);
    expect(deltaForEvent({ type: 'plate_rated', userId: u, componentIds: ['c'], stars: 1 })).toBe(-0.4);
  });
  it('swap_away = -0.05', () => {
    expect(deltaForEvent({ type: 'swap_away', userId: u, componentId: 'c' })).toBe(-0.05);
  });
});
