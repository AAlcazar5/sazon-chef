// ROADMAP 4.0 WK5.1 — userMacroDistributionService test.

import {
  computeMacroDistribution,
  STANDARD_DISTRIBUTION,
  __INTERNALS,
  type CookEvent,
  type MacroDistribution,
} from '../../src/services/recommender/userMacroDistributionService';

const cooked = (kind: CookEvent['kind'], date = '2026-05-01'): CookEvent => ({
  date,
  kind,
  cooked: true,
});
const skipped = (kind: CookEvent['kind'], date = '2026-05-01'): CookEvent => ({
  date,
  kind,
  cooked: false,
});

const sumDistribution = (d: MacroDistribution): number =>
  d.breakfast + d.lunch + d.dinner + d.snacks + d.dessert;

describe('WK5.1 — computeMacroDistribution', () => {
  it('returns STANDARD_DISTRIBUTION at cold tier (regardless of events)', () => {
    const result = computeMacroDistribution({
      cookEvents: Array.from({ length: 30 }, () => cooked('lunch')),
      signalTier: 'cold',
    });
    expect(result).toEqual(STANDARD_DISTRIBUTION);
  });

  it('breakfast-skipper at high tier yields ~0 breakfast share', () => {
    const events: CookEvent[] = [
      ...Array.from({ length: 30 }, () => skipped('breakfast')),
      ...Array.from({ length: 12 }, () => cooked('lunch')),
      ...Array.from({ length: 14 }, () => cooked('dinner')),
      ...Array.from({ length: 3 }, () => cooked('snacks')),
      ...Array.from({ length: 1 }, () => cooked('dessert')),
    ];
    const result = computeMacroDistribution({
      cookEvents: events,
      signalTier: 'high',
    });
    expect(result.breakfast).toBe(0);
    // Lunch + dinner together should dominate.
    expect(result.lunch + result.dinner).toBeGreaterThan(0.7);
  });

  it('high-tier distribution sums to ~1.0', () => {
    const events: CookEvent[] = [
      ...Array.from({ length: 5 }, () => cooked('breakfast')),
      ...Array.from({ length: 12 }, () => cooked('lunch')),
      ...Array.from({ length: 14 }, () => cooked('dinner')),
      ...Array.from({ length: 3 }, () => cooked('snacks')),
      ...Array.from({ length: 1 }, () => cooked('dessert')),
    ];
    const result = computeMacroDistribution({
      cookEvents: events,
      signalTier: 'high',
    });
    expect(Math.abs(sumDistribution(result) - 1)).toBeLessThan(1e-9);
  });

  it('mid-tier blends learned + standard at 50/50', () => {
    // Pure-lunch user. Learned: lunch=1, others=0.
    // Blended at 0.5 → lunch=0.5*1 + 0.5*0.30 = 0.65
    //                  breakfast=0 + 0.5*0.25 = 0.125
    const events: CookEvent[] = Array.from({ length: 5 }, () => cooked('lunch'));
    const result = computeMacroDistribution({
      cookEvents: events,
      signalTier: 'mid',
    });
    expect(result.lunch).toBeCloseTo(0.65, 5);
    expect(result.breakfast).toBeCloseTo(0.125, 5);
    expect(result.dinner).toBeCloseTo(0.175, 5);
    expect(Math.abs(sumDistribution(result) - 1)).toBeLessThan(1e-9);
  });

  it('skipped events do not influence the distribution', () => {
    const eventsAllSkipped: CookEvent[] = Array.from({ length: 50 }, () =>
      skipped('breakfast'),
    );
    const result = computeMacroDistribution({
      cookEvents: eventsAllSkipped,
      signalTier: 'high',
    });
    // No cooked events → falls back to standard distribution.
    expect(result).toEqual(STANDARD_DISTRIBUTION);
  });

  it('idempotent: same input yields same output', () => {
    const events: CookEvent[] = [
      cooked('breakfast'),
      cooked('lunch'),
      cooked('lunch'),
      cooked('dinner'),
      cooked('dinner'),
      cooked('dinner'),
    ];
    const a = computeMacroDistribution({ cookEvents: events, signalTier: 'high' });
    const b = computeMacroDistribution({ cookEvents: events, signalTier: 'high' });
    expect(a).toEqual(b);
  });

  it('matches the breakfast-skipper roadmap example (~0/0.4/0.45/0.10/0.05)', () => {
    // Construct a fixture roughly matching the roadmap example.
    const events: CookEvent[] = [
      ...Array.from({ length: 16 }, () => cooked('lunch')),   // 0.40
      ...Array.from({ length: 18 }, () => cooked('dinner')),  // 0.45
      ...Array.from({ length: 4 }, () => cooked('snacks')),   // 0.10
      ...Array.from({ length: 2 }, () => cooked('dessert')),  // 0.05
      // breakfast: 0
    ];
    const result = computeMacroDistribution({
      cookEvents: events,
      signalTier: 'high',
    });
    expect(result.breakfast).toBe(0);
    expect(result.lunch).toBeCloseTo(0.4, 1);
    expect(result.dinner).toBeCloseTo(0.45, 1);
    expect(result.snacks).toBeCloseTo(0.10, 1);
    expect(result.dessert).toBeCloseTo(0.05, 1);
  });

  it('does not return any user-facing strings (lifestyle-voice guard)', () => {
    const result = computeMacroDistribution({
      cookEvents: [cooked('lunch'), cooked('dinner')],
      signalTier: 'high',
    });
    // Distribution shape: only numeric fields. No "you skipped X" copy.
    const keys = Object.keys(result).sort();
    expect(keys).toEqual(['breakfast', 'dessert', 'dinner', 'lunch', 'snacks']);
    for (const k of keys) {
      expect(typeof (result as any)[k]).toBe('number');
    }
  });

  it('does not mutate the input cookEvents', () => {
    const events: CookEvent[] = [cooked('lunch'), cooked('dinner')];
    const before = JSON.stringify(events);
    computeMacroDistribution({ cookEvents: events, signalTier: 'high' });
    expect(JSON.stringify(events)).toBe(before);
  });

  it('handles an empty events array (mid + high tier) → falls back to standard', () => {
    const a = computeMacroDistribution({ cookEvents: [], signalTier: 'mid' });
    const b = computeMacroDistribution({ cookEvents: [], signalTier: 'high' });
    expect(a).toEqual(STANDARD_DISTRIBUTION);
    expect(b).toEqual(STANDARD_DISTRIBUTION);
  });

  it('publishes MID_BLEND constant for cap-test inspection', () => {
    expect(__INTERNALS.MID_BLEND).toBe(0.5);
  });

  it('STANDARD_DISTRIBUTION sums to 1.0', () => {
    expect(Math.abs(sumDistribution(STANDARD_DISTRIBUTION) - 1)).toBeLessThan(1e-9);
  });
});
