// backend/__tests__/services/nutrientGapService.test.ts
// Group 10X Phase 9 — daily nutrient gap detection tests.

import {
  computeNutrientGap,
  rankComponentsForGap,
  TARGET_DAILY_NUTRIENTS,
} from '../../src/services/nutrientGapService';

describe('TARGET_DAILY_NUTRIENTS', () => {
  it('encodes daily targets for the 5 tracked nutrients', () => {
    expect(TARGET_DAILY_NUTRIENTS.fiberG).toBeGreaterThan(0);
    expect(TARGET_DAILY_NUTRIENTS.omega3G).toBeGreaterThan(0);
    expect(TARGET_DAILY_NUTRIENTS.vitaminDIu).toBeGreaterThan(0);
    expect(TARGET_DAILY_NUTRIENTS.ironMg).toBeGreaterThan(0);
    expect(TARGET_DAILY_NUTRIENTS.magnesiumMg).toBeGreaterThan(0);
  });
});

describe('computeNutrientGap', () => {
  it('returns the largest gap (target - intake) across nutrients', () => {
    const intake = {
      fiberG: 5, // gap from 28 = 23
      omega3G: 1, // gap from 1.6 = 0.6
      vitaminDIu: 600, // gap from 600 = 0 (met)
      ironMg: 8, // gap from 18 = 10
      magnesiumMg: 200, // gap from 400 = 200
    };
    const gap = computeNutrientGap(intake);
    // Largest pct gap should be fiber (23/28 ≈ 82%) or magnesium (200/400 = 50%)
    expect(gap.topGap).toBeDefined();
    expect(['fiberG', 'magnesiumMg']).toContain(gap.topGap);
  });

  it('returns null topGap when all nutrients meet/exceed target', () => {
    const intake = {
      fiberG: 50,
      omega3G: 5,
      vitaminDIu: 1000,
      ironMg: 30,
      magnesiumMg: 500,
    };
    const gap = computeNutrientGap(intake);
    expect(gap.topGap).toBeNull();
  });

  it('handles partial intake objects (missing keys treated as 0)', () => {
    const gap = computeNutrientGap({ fiberG: 0 });
    expect(gap.topGap).toBeDefined();
  });
});

describe('rankComponentsForGap', () => {
  const components = [
    { id: 'lentils-1', fiberG: 8, omega3G: 0, vitaminDIu: 0, ironMg: 3, magnesiumMg: 36 },
    { id: 'salmon-1', fiberG: 0, omega3G: 1.5, vitaminDIu: 450, ironMg: 0.5, magnesiumMg: 30 },
    { id: 'spinach-1', fiberG: 2, omega3G: 0, vitaminDIu: 0, ironMg: 3, magnesiumMg: 80 },
    { id: 'rice-1', fiberG: 1, omega3G: 0, vitaminDIu: 0, ironMg: 0.5, magnesiumMg: 20 },
  ];

  it('ranks components by their contribution to the top gap', () => {
    const ranked = rankComponentsForGap(components, 'fiberG');
    expect(ranked[0].id).toBe('lentils-1');
    expect(ranked[ranked.length - 1].id).toBe('salmon-1');
  });

  it('returns input order when topGap is null', () => {
    const ranked = rankComponentsForGap(components, null);
    expect(ranked).toEqual(components);
  });

  it('handles empty components array', () => {
    expect(rankComponentsForGap([], 'fiberG')).toEqual([]);
  });
});
