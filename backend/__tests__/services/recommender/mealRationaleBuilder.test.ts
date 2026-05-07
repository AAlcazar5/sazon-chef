// ROADMAP 4.0 WK8.1 — mealRationaleBuilder test.

import {
  buildMealRationale,
  __INTERNALS,
} from '../../../src/services/recommender/mealRationaleBuilder';

describe('WK8.1 — buildMealRationale', () => {
  it('returns empty string when no signals are active', () => {
    expect(buildMealRationale({ signals: {} })).toBe('');
  });

  it('stitches carryOver + microGap + cuisineLean within ≤ 90 chars', () => {
    const r = buildMealRationale({
      signals: {
        carryOver: { sourceLabel: "Sunday's chili" },
        magnesiumGap: { addressedMicros: ['magnesium'] },
        cuisineLean: { cluster: 'Mediterranean' },
      },
    });
    expect(r.length).toBeLessThanOrEqual(90);
    expect(r).toContain("Sunday's chili");
    expect(r).toContain('magnesium');
    expect(r).toContain('Mediterranean');
  });

  it('handles a 5-signal input by prioritizing — output ≤ 90 chars', () => {
    const r = buildMealRationale({
      signals: {
        pantryBoost: { matched: ['rice', 'tofu'] },
        carryOver: { sourceLabel: "Sunday's chili" },
        leftoverChain: { eatOnDay: 'Tuesday' },
        magnesiumGap: { addressedMicros: ['magnesium'] },
        cuisineLean: { cluster: 'Mediterranean' },
      },
    });
    expect(r.length).toBeLessThanOrEqual(90);
    // Highest-priority signal (carryOver) MUST appear.
    expect(r).toContain("Sunday's chili");
  });

  it('drops lowest-priority signals first when over budget', () => {
    // Force a tight budget so only the top 2 fit.
    const r = buildMealRationale({
      signals: {
        carryOver: { sourceLabel: "Sunday's chili" },
        leftoverChain: { eatOnDay: 'Tuesday' },
        cuisineLean: { cluster: 'Mediterranean' },
      },
      maxLength: 50,
    });
    expect(r.length).toBeLessThanOrEqual(50);
    expect(r).toContain("Sunday's chili"); // highest priority survives
  });

  it('does not use banned vocabulary (no "deficient", "target", "warning", "under your goal")', () => {
    const r = buildMealRationale({
      signals: {
        magnesiumGap: { addressedMicros: ['magnesium'] },
      },
    });
    expect(/deficient|warning|under your goal|over your goal|hit your target/i.test(r)).toBe(false);
  });

  it('uses lifestyle voice for micro gaps ("leans into" not "fixes deficiency")', () => {
    const r = buildMealRationale({
      signals: {
        magnesiumGap: { addressedMicros: ['magnesium'] },
      },
    });
    expect(r).toMatch(/leans into magnesium/i);
  });

  it('renders pantry boost as "built on your X + Y"', () => {
    const r = buildMealRationale({
      signals: {
        pantryBoost: { matched: ['rice', 'tofu'] },
      },
    });
    expect(r).toMatch(/built on your rice \+ tofu/);
  });

  it('renders use-it-up as "uses up your X"', () => {
    const r = buildMealRationale({
      signals: {
        useItUp: { ingredient: 'cilantro' },
      },
    });
    expect(r).toBe('uses up your cilantro');
  });

  it('renders carry-over as "uses Sunday\'s chili"', () => {
    const r = buildMealRationale({
      signals: {
        carryOver: { sourceLabel: "Sunday's chili" },
      },
    });
    expect(r).toBe("uses Sunday's chili");
  });

  it('renders cuisine lean as "Mediterranean vibe"', () => {
    const r = buildMealRationale({
      signals: {
        cuisineLean: { cluster: 'Mediterranean' },
      },
    });
    expect(r).toBe('Mediterranean vibe');
  });

  it('uses " · " as the separator between fragments', () => {
    const r = buildMealRationale({
      signals: {
        carryOver: { sourceLabel: "Sunday's chili" },
        cuisineLean: { cluster: 'Mediterranean' },
      },
    });
    expect(r.includes(' · ')).toBe(true);
  });

  it('treats microGap as the canonical alias of magnesiumGap', () => {
    const r = buildMealRationale({
      signals: {
        microGap: { addressedMicros: ['iron'] },
      },
    });
    expect(r).toBe('leans into iron');
  });

  it('skips signals with empty arrays (defensive)', () => {
    const r = buildMealRationale({
      signals: {
        pantryBoost: { matched: [] },
        magnesiumGap: { addressedMicros: [] },
        cuisineLean: { cluster: 'Mediterranean' },
      },
    });
    expect(r).toBe('Mediterranean vibe');
  });

  it('publishes constants for cap-test inspection', () => {
    expect(__INTERNALS.MAX_LENGTH).toBe(90);
    expect(__INTERNALS.SEPARATOR).toBe(' · ');
  });
});
