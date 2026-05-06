// ROADMAP 4.0 HX0.2 — heroRationaleBuilder service tests.

import { buildHeroRationale } from '../../src/services/heroRationaleBuilder';

describe('buildHeroRationale (HX0.2)', () => {
  it('returns null when no signal is strong enough (cold-start)', () => {
    expect(buildHeroRationale({})).toBeNull();
    expect(buildHeroRationale({ pantryCoverage: 0.1 })).toBeNull();
  });

  it('builds a primary line ≤ 90 chars + structured secondary list', () => {
    const r = buildHeroRationale({
      pantryCoverage: 0.62,
      nutrientGap: 'magnesium',
      cuisineNovelty: false,
      cuisineLabel: 'Italian',
      topPantryIngredient: 'cilantro',
    });
    expect(r).not.toBeNull();
    expect(r!.primaryReason.length).toBeLessThanOrEqual(90);
    expect(Array.isArray(r!.secondaryReasons)).toBe(true);
    expect(r!.secondaryReasons.length).toBeLessThanOrEqual(3);
    expect(r!.signals.length).toBeGreaterThan(0);
  });

  it('cuisine novelty wins the primary slot when present', () => {
    const r = buildHeroRationale({
      cuisineNovelty: true,
      cuisineLabel: 'Persian',
      pantryCoverage: 0.65,
      topPantryIngredient: 'walnuts',
    });
    expect(r!.primaryReason.toLowerCase()).toContain('first');
    expect(r!.primaryReason.toLowerCase()).toContain('persian');
    expect(r!.signals[0]).toBe('cuisine_novelty');
  });

  it('uses lifestyle voice — no banned vocabulary', () => {
    const inputs = [
      { nutrientGap: 'iron' },
      { friendCooks: 3 },
      { cuisineCadenceDays: 21, cuisineLabel: 'Thai' },
      { pantryCoverage: 0.7, topPantryIngredient: 'sumac' },
    ];
    for (const input of inputs) {
      const r = buildHeroRationale(input);
      if (!r) continue;
      expect(r.primaryReason).not.toMatch(/you should/i);
      expect(r.primaryReason).not.toMatch(/you're missing|you are missing/i);
      expect(r.primaryReason).not.toMatch(/you need/i);
      expect(r.primaryReason).not.toMatch(/failing/i);
    }
  });

  it('caps secondary list at 3 even with many active signals', () => {
    const r = buildHeroRationale({
      pantryCoverage: 0.65,
      nutrientGap: 'magnesium',
      cuisineNovelty: true,
      cuisineLabel: 'Persian',
      friendCooks: 4,
      cookTime: 25,
      preferredCookTime: 30,
      proteinPerServing: 35,
      topPantryIngredient: 'walnuts',
    });
    expect(r!.secondaryReasons.length).toBeLessThanOrEqual(3);
  });

  it('truncates over-long primary lines with an ellipsis', () => {
    const r = buildHeroRationale({
      cuisineNovelty: true,
      cuisineLabel: 'Northern-Argentinean-Andean-Highland fusion with sumac and saffron',
    });
    expect(r!.primaryReason.length).toBeLessThanOrEqual(90);
    expect(r!.primaryReason.endsWith('…')).toBe(true);
  });

  it('cuisine cadence fires only when ≥ 14 days', () => {
    const recent = buildHeroRationale({ cuisineCadenceDays: 5, cuisineLabel: 'Thai', pantryCoverage: 0.5 });
    const stale = buildHeroRationale({ cuisineCadenceDays: 21, cuisineLabel: 'Thai', pantryCoverage: 0.5 });
    expect(recent?.signals).not.toContain('cuisine_cadence');
    expect(stale?.signals).toContain('cuisine_cadence');
  });
});
