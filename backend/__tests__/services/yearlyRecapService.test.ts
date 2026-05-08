// J13 — Sazon Wrapped yearly recap aggregation tests.
//
// Pure aggregation. Given a year of cooked recipes + ingredient counts +
// nutrient totals + cuisine first-cooked timestamps, produce a 5-card
// payload for the Wrapped surface. No DB calls in this service.

import {
  buildYearlyWrapped,
  computeLongestCuisineStreak,
  computeFirstTimeCuisine,
  computeUniqueIngredientCount,
  type YearlyRecapInputs,
} from '../../src/services/yearlyRecapService';

const d = (iso: string): Date => new Date(iso);

describe('computeLongestCuisineStreak', () => {
  it('returns null for empty input', () => {
    expect(computeLongestCuisineStreak([])).toBeNull();
  });

  it('returns the longest run of consecutive same-cuisine cooks', () => {
    const cooks = [
      { recipeId: '1', cuisine: 'Italian', cookedAt: d('2026-01-01') },
      { recipeId: '2', cuisine: 'Italian', cookedAt: d('2026-01-03') },
      { recipeId: '3', cuisine: 'Italian', cookedAt: d('2026-01-05') },
      { recipeId: '4', cuisine: 'Thai', cookedAt: d('2026-01-07') },
      { recipeId: '5', cuisine: 'Thai', cookedAt: d('2026-01-09') },
    ];
    const r = computeLongestCuisineStreak(cooks);
    expect(r).toEqual({ cuisine: 'Italian', length: 3 });
  });

  it('respects chronological order regardless of input order', () => {
    const cooks = [
      { recipeId: '5', cuisine: 'Thai', cookedAt: d('2026-01-09') },
      { recipeId: '1', cuisine: 'Italian', cookedAt: d('2026-01-01') },
      { recipeId: '4', cuisine: 'Thai', cookedAt: d('2026-01-07') },
      { recipeId: '2', cuisine: 'Italian', cookedAt: d('2026-01-03') },
      { recipeId: '3', cuisine: 'Italian', cookedAt: d('2026-01-05') },
    ];
    expect(computeLongestCuisineStreak(cooks)).toEqual({
      cuisine: 'Italian',
      length: 3,
    });
  });

  it('skips cooks without a cuisine label', () => {
    const cooks = [
      { recipeId: '1', cuisine: 'Italian', cookedAt: d('2026-01-01') },
      { recipeId: '2', cuisine: null, cookedAt: d('2026-01-02') },
      { recipeId: '3', cuisine: 'Italian', cookedAt: d('2026-01-03') },
    ];
    expect(computeLongestCuisineStreak(cooks)).toEqual({
      cuisine: 'Italian',
      length: 2,
    });
  });
});

describe('computeFirstTimeCuisine', () => {
  it('returns null when nothing was cooked for the first time this year', () => {
    const cuisines = [
      { cuisine: 'Italian', firstCookedAt: d('2024-03-01') },
      { cuisine: 'Thai', firstCookedAt: d('2025-08-15') },
    ];
    expect(computeFirstTimeCuisine(cuisines, 2026)).toBeNull();
  });

  it('returns the latest first-time cuisine within the target year', () => {
    const cuisines = [
      { cuisine: 'Italian', firstCookedAt: d('2024-03-01') },
      { cuisine: 'Persian', firstCookedAt: d('2026-02-10') },
      { cuisine: 'Salvadoran', firstCookedAt: d('2026-08-22') },
      { cuisine: 'Thai', firstCookedAt: d('2025-08-15') },
    ];
    expect(computeFirstTimeCuisine(cuisines, 2026)).toEqual({
      cuisine: 'Salvadoran',
      firstCookedAt: d('2026-08-22'),
    });
  });

  it('handles empty input', () => {
    expect(computeFirstTimeCuisine([], 2026)).toBeNull();
  });
});

describe('computeUniqueIngredientCount', () => {
  it('counts unique non-staple ingredients (case-insensitive)', () => {
    const ings = [
      { name: 'Tomato', count: 4 },
      { name: 'tomato', count: 2 },
      { name: 'Salt', count: 30 }, // staple — excluded
      { name: 'Saffron', count: 1 },
      { name: 'olive oil', count: 50 }, // staple — excluded
    ];
    expect(computeUniqueIngredientCount(ings)).toBe(2);
  });

  it('returns 0 for empty input', () => {
    expect(computeUniqueIngredientCount([])).toBe(0);
  });
});

describe('buildYearlyWrapped — full payload', () => {
  const baseInputs = (): YearlyRecapInputs => ({
    userId: 'u1',
    year: 2026,
    cooks: [
      { recipeId: '1', cuisine: 'Italian', cookedAt: d('2026-01-01') },
      { recipeId: '2', cuisine: 'Italian', cookedAt: d('2026-01-03') },
      { recipeId: '3', cuisine: 'Italian', cookedAt: d('2026-01-05') },
      { recipeId: '4', cuisine: 'Thai', cookedAt: d('2026-02-07') },
      { recipeId: '5', cuisine: 'Persian', cookedAt: d('2026-04-09') },
      { recipeId: '6', cuisine: 'Persian', cookedAt: d('2026-04-12') },
      { recipeId: '7', cuisine: 'Salvadoran', cookedAt: d('2026-08-22') },
      { recipeId: '8', cuisine: 'Mexican', cookedAt: d('2026-09-01') },
      { recipeId: '9', cuisine: 'Mexican', cookedAt: d('2026-09-15') },
      { recipeId: '10', cuisine: 'Mexican', cookedAt: d('2026-12-01') },
    ],
    ingredients: [
      { name: 'tomato', count: 6 },
      { name: 'saffron', count: 2 },
      { name: 'salt', count: 50 }, // staple
      { name: 'lime', count: 4 },
      { name: 'cilantro', count: 5 },
    ],
    nutrientTotals: { magnesium: 14000, iron: 3500 },
    nutrientTargets: { magnesium: 14000, iron: 5000 },
    cuisinesEverTried: [
      { cuisine: 'Italian', firstCookedAt: d('2024-03-01') },
      { cuisine: 'Thai', firstCookedAt: d('2025-08-15') },
      { cuisine: 'Persian', firstCookedAt: d('2026-04-09') },
      { cuisine: 'Salvadoran', firstCookedAt: d('2026-08-22') },
      { cuisine: 'Mexican', firstCookedAt: d('2024-11-04') },
    ],
  });

  it('returns a 5-card payload with the right card types in order', () => {
    const out = buildYearlyWrapped(baseInputs());
    expect(out.slides).toHaveLength(5);
    expect(out.slides.map((s) => s.type)).toEqual([
      'top_cuisines',
      'ingredients_tasted',
      'longest_streak',
      'micros',
      'first_time',
    ]);
  });

  it('top_cuisines slide lists the user\'s top 5 cuisines by count', () => {
    const out = buildYearlyWrapped(baseInputs());
    const slide = out.slides.find((s) => s.type === 'top_cuisines')!;
    expect(slide.detail).toEqual([
      'Italian · 3',
      'Mexican · 3',
      'Persian · 2',
      'Salvadoran · 1',
      'Thai · 1',
    ]);
  });

  it('ingredients_tasted slide reports the unique ingredient count', () => {
    const out = buildYearlyWrapped(baseInputs());
    const slide = out.slides.find((s) => s.type === 'ingredients_tasted')!;
    // 4 non-staple unique: tomato, saffron, lime, cilantro
    expect(slide.primary).toMatch(/^4/);
  });

  it('longest_streak slide names the longest consecutive cuisine run', () => {
    const out = buildYearlyWrapped(baseInputs());
    const slide = out.slides.find((s) => s.type === 'longest_streak')!;
    // Italian appears 3 times in a row at the start of the year
    expect(slide.primary).toMatch(/Italian/);
  });

  it('micros slide names the top nutrient that exceeded target', () => {
    const out = buildYearlyWrapped(baseInputs());
    const slide = out.slides.find((s) => s.type === 'micros')!;
    expect(slide.primary).toMatch(/magnesium/i);
  });

  it('first_time slide names the latest cuisine cooked for the first time this year', () => {
    const out = buildYearlyWrapped(baseInputs());
    const slide = out.slides.find((s) => s.type === 'first_time')!;
    expect(slide.primary).toMatch(/Salvadoran/);
  });

  it('returns cookCount + isSparse=false for a normal year', () => {
    const out = buildYearlyWrapped(baseInputs());
    expect(out.cookCount).toBe(10);
    expect(out.isSparse).toBe(false);
  });

  it('isSparse=true when ≤5 cooks; framing reflects a sparse year', () => {
    const inputs = baseInputs();
    const sparse: YearlyRecapInputs = { ...inputs, cooks: inputs.cooks.slice(0, 3) };
    const out = buildYearlyWrapped(sparse);
    expect(out.isSparse).toBe(true);
    expect(out.cookCount).toBe(3);
    // Sparse year still returns 5 slides — graceful framing, not absent
    expect(out.slides).toHaveLength(5);
    // Sparse-year micros + first_time may be null/absent — must NOT throw
    const microsSlide = out.slides.find((s) => s.type === 'micros');
    expect(microsSlide).toBeDefined();
  });

  it('handles a user with zero cooks (returns sparse with friendly placeholders)', () => {
    const inputs: YearlyRecapInputs = {
      userId: 'u-empty',
      year: 2026,
      cooks: [],
      ingredients: [],
      nutrientTotals: {},
      nutrientTargets: {},
      cuisinesEverTried: [],
    };
    const out = buildYearlyWrapped(inputs);
    expect(out.cookCount).toBe(0);
    expect(out.isSparse).toBe(true);
    expect(out.slides).toHaveLength(5);
    // None of the slides throw on empty data
    for (const slide of out.slides) {
      expect(typeof slide.primary).toBe('string');
      expect(slide.primary.length).toBeGreaterThan(0);
    }
  });

  it('voice: never uses banned vocabulary (cut/bulk/maintain/macro-friendly)', () => {
    const out = buildYearlyWrapped(baseInputs());
    const allText = out.slides
      .flatMap((s) => [s.title, s.subtitle ?? '', s.primary, ...(s.detail ?? [])])
      .join(' ')
      .toLowerCase();
    for (const banned of ['cut', 'bulk', 'maintain', 'macro-friendly']) {
      // word-boundary check to avoid matching "cuts" inside "biscuits" etc.
      const re = new RegExp(`\\b${banned}\\b`, 'i');
      expect(allText).not.toMatch(re);
    }
  });

  it('userId + year are echoed in the payload', () => {
    const out = buildYearlyWrapped(baseInputs());
    expect(out.userId).toBe('u1');
    expect(out.year).toBe(2026);
  });
});
