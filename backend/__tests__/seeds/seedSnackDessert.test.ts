// Focused snack/dessert seed plan. The cuisine-floor seed
// (seed-500-newer-cuisines-dedup.ts) is driven by per-cuisine targets and a
// MEAL_TYPES rotation that is ~88% breakfast/lunch/dinner — it cannot produce
// a snack/dessert-weighted catalog pass. This planner is theme-driven instead:
// it rotates a curated catalog of N=1 snack/dessert archetypes (parfaits,
// Ninja Creami protein ice cream, whole-food vegan snacks, protein snacks, …)
// crossed with a specificity nudge, the same positive-diversity-axis pattern
// proven in seedDiversity.pickDiversityAxis.

import {
  SNACK_DESSERT_THEMES,
  SPECIFICITY_NUDGES,
  buildSnackDessertPlan,
  INTERNATIONAL_SNACK_CUISINES,
  INTERNATIONAL_SNACK_ARCHETYPES,
  buildInternationalSnackPlan,
  INTERNATIONAL_DESSERT_ARCHETYPES,
  buildInternationalDessertPlan,
  INTERNATIONAL_SAUCE_ARCHETYPES,
  buildInternationalSaucePlan,
} from '../../scripts/seedSnackDessert';

const BANNED = [
  'macro-friendly',
  "you're under",
  "you're over",
  'fast food makeover',
];

describe('SNACK_DESSERT_THEMES catalog', () => {
  it('every theme is a snack or dessert with a non-empty steer', () => {
    expect(SNACK_DESSERT_THEMES.length).toBeGreaterThan(0);
    for (const t of SNACK_DESSERT_THEMES) {
      expect(['snack', 'dessert']).toContain(t.mealType);
      expect(t.styleHint.trim().length).toBeGreaterThan(0);
      expect(t.key.trim().length).toBeGreaterThan(0);
    }
  });

  it('theme keys are unique', () => {
    const keys = SNACK_DESSERT_THEMES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('covers all four user-named buckets', () => {
    const hints = SNACK_DESSERT_THEMES.map((t) => t.styleHint.toLowerCase()).join(' | ');
    expect(hints).toMatch(/parfait/);
    expect(hints).toMatch(/ninja creami|nice cream|ice cream/);
    expect(hints).toMatch(/vegan/);
    expect(hints).toMatch(/protein/);
  });

  it('carries no banned vocabulary in any steer (brand-voice guard)', () => {
    for (const t of [...SNACK_DESSERT_THEMES, ...SPECIFICITY_NUDGES.map((s) => ({ styleHint: s }))]) {
      const low = t.styleHint.toLowerCase();
      for (const bad of BANNED) expect(low).not.toContain(bad);
      // goal-phase verbs only flagged as standalone words, not substrings
      expect(low).not.toMatch(/\b(cut|bulk|maintain)\b/);
    }
  });
});

describe('buildSnackDessertPlan', () => {
  it('returns exactly `count` jobs', () => {
    expect(buildSnackDessertPlan(50)).toHaveLength(50);
    expect(buildSnackDessertPlan(1)).toHaveLength(1);
  });

  it('returns an empty plan for non-positive counts', () => {
    expect(buildSnackDessertPlan(0)).toEqual([]);
    expect(buildSnackDessertPlan(-5)).toEqual([]);
  });

  it('every job is a snack or dessert with a populated styleHint', () => {
    for (const job of buildSnackDessertPlan(120)) {
      expect(['snack', 'dessert']).toContain(job.mealType);
      expect(job.styleHint.length).toBeGreaterThan(0);
      expect(job.themeKey.length).toBeGreaterThan(0);
    }
  });

  it('is deterministic for the same arguments', () => {
    expect(buildSnackDessertPlan(80)).toEqual(buildSnackDessertPlan(80));
    expect(buildSnackDessertPlan(80, { themeOffset: 3 })).toEqual(
      buildSnackDessertPlan(80, { themeOffset: 3 }),
    );
  });

  it('themeOffset rotates the starting theme', () => {
    const a = buildSnackDessertPlan(5, { themeOffset: 0 });
    const b = buildSnackDessertPlan(5, { themeOffset: 1 });
    expect(a[0].themeKey).not.toBe(b[0].themeKey);
  });

  it('the first themes×nudges steers are all distinct (max breadth before repeat)', () => {
    const cycle = SNACK_DESSERT_THEMES.length * SPECIFICITY_NUDGES.length;
    const steers = buildSnackDessertPlan(cycle).map((j) => j.styleHint);
    expect(new Set(steers).size).toBe(cycle);
  });

  it('each styleHint pairs the theme steer with a specificity nudge', () => {
    const job = buildSnackDessertPlan(1)[0];
    expect(job.styleHint).toContain(' — ');
  });

  it('keeps a balanced snack/dessert mix over a full cycle (neither below 30%)', () => {
    const cycle = SNACK_DESSERT_THEMES.length * SPECIFICITY_NUDGES.length;
    const plan = buildSnackDessertPlan(cycle);
    const snack = plan.filter((j) => j.mealType === 'snack').length;
    const dessert = plan.filter((j) => j.mealType === 'dessert').length;
    expect(snack / cycle).toBeGreaterThanOrEqual(0.3);
    expect(dessert / cycle).toBeGreaterThanOrEqual(0.3);
  });
});

describe('international snack catalog', () => {
  it('lists a broad spread of distinct world cuisines (≥ 20)', () => {
    expect(INTERNATIONAL_SNACK_CUISINES.length).toBeGreaterThanOrEqual(20);
    expect(new Set(INTERNATIONAL_SNACK_CUISINES).size).toBe(
      INTERNATIONAL_SNACK_CUISINES.length,
    );
  });

  it('spans every world region (not Western-default)', () => {
    const set = new Set(INTERNATIONAL_SNACK_CUISINES);
    // East/SE/South Asia, MENA, Sub-Saharan Africa, Latin America each represented
    expect(['Japanese', 'Korean', 'Thai', 'Vietnamese'].some((c) => set.has(c))).toBe(true);
    expect(['Indian', 'Pakistani', 'Sri Lankan'].some((c) => set.has(c))).toBe(true);
    expect(['Lebanese', 'Levantine', 'Turkish', 'Persian'].some((c) => set.has(c))).toBe(true);
    expect(['Ethiopian', 'Nigerian', 'Senegalese', 'South African'].some((c) => set.has(c))).toBe(true);
    expect(['Peruvian', 'Brazilian', 'Colombian', 'Mexican'].some((c) => set.has(c))).toBe(true);
  });

  it('archetypes are non-empty and carry no banned vocabulary', () => {
    expect(INTERNATIONAL_SNACK_ARCHETYPES.length).toBeGreaterThan(0);
    for (const a of INTERNATIONAL_SNACK_ARCHETYPES) {
      expect(a.trim().length).toBeGreaterThan(0);
      const low = a.toLowerCase();
      for (const bad of BANNED) expect(low).not.toContain(bad);
      expect(low).not.toMatch(/\b(cut|bulk|maintain)\b/);
    }
  });
});

describe('buildInternationalSnackPlan', () => {
  it('returns exactly `count` snack jobs, each with a pinned cuisine', () => {
    const plan = buildInternationalSnackPlan(60);
    expect(plan).toHaveLength(60);
    for (const job of plan) {
      expect(job.mealType).toBe('snack');
      expect(INTERNATIONAL_SNACK_CUISINES).toContain(job.cuisine);
      expect(job.styleHint.length).toBeGreaterThan(0);
      expect(job.styleHint).toContain(' — ');
    }
  });

  it('returns an empty plan for non-positive counts', () => {
    expect(buildInternationalSnackPlan(0)).toEqual([]);
    expect(buildInternationalSnackPlan(-3)).toEqual([]);
  });

  it('hits every cuisine once before repeating any (cuisine rotates fastest)', () => {
    const n = INTERNATIONAL_SNACK_CUISINES.length;
    const firstCycle = buildInternationalSnackPlan(n).map((j) => j.cuisine);
    expect(new Set(firstCycle).size).toBe(n);
  });

  it('is deterministic and cuisineOffset rotates the start', () => {
    expect(buildInternationalSnackPlan(40)).toEqual(buildInternationalSnackPlan(40));
    const a = buildInternationalSnackPlan(5, { cuisineOffset: 0 });
    const b = buildInternationalSnackPlan(5, { cuisineOffset: 1 });
    expect(a[0].cuisine).not.toBe(b[0].cuisine);
  });

  it('the first cuisines×archetypes steers are all distinct (max breadth)', () => {
    const cycle =
      INTERNATIONAL_SNACK_CUISINES.length * INTERNATIONAL_SNACK_ARCHETYPES.length;
    const steers = buildInternationalSnackPlan(cycle).map(
      (j) => `${j.cuisine}::${j.styleHint}`,
    );
    expect(new Set(steers).size).toBe(cycle);
  });
});

describe('buildInternationalDessertPlan', () => {
  it('dessert archetypes are non-empty and carry no banned vocabulary', () => {
    expect(INTERNATIONAL_DESSERT_ARCHETYPES.length).toBeGreaterThan(0);
    for (const a of INTERNATIONAL_DESSERT_ARCHETYPES) {
      expect(a.trim().length).toBeGreaterThan(0);
      const low = a.toLowerCase();
      for (const bad of BANNED) expect(low).not.toContain(bad);
      expect(low).not.toMatch(/\b(cut|bulk|maintain)\b/);
    }
  });

  it('returns exactly `count` dessert jobs, each with a pinned world cuisine', () => {
    const plan = buildInternationalDessertPlan(50);
    expect(plan).toHaveLength(50);
    for (const job of plan) {
      expect(job.mealType).toBe('dessert');
      expect(INTERNATIONAL_SNACK_CUISINES).toContain(job.cuisine);
      expect(job.styleHint).toContain(' — ');
      expect(job.themeKey.length).toBeGreaterThan(0);
    }
  });

  it('returns an empty plan for non-positive counts', () => {
    expect(buildInternationalDessertPlan(0)).toEqual([]);
    expect(buildInternationalDessertPlan(-2)).toEqual([]);
  });

  it('hits every cuisine once before repeating any', () => {
    const n = INTERNATIONAL_SNACK_CUISINES.length;
    const firstCycle = buildInternationalDessertPlan(n).map((j) => j.cuisine);
    expect(new Set(firstCycle).size).toBe(n);
  });

  it('is deterministic and cuisineOffset rotates the start', () => {
    expect(buildInternationalDessertPlan(40)).toEqual(buildInternationalDessertPlan(40));
    const a = buildInternationalDessertPlan(5, { cuisineOffset: 0 });
    const b = buildInternationalDessertPlan(5, { cuisineOffset: 1 });
    expect(a[0].cuisine).not.toBe(b[0].cuisine);
  });

  it('the first cuisines×archetypes steers are all distinct', () => {
    const cycle =
      INTERNATIONAL_SNACK_CUISINES.length * INTERNATIONAL_DESSERT_ARCHETYPES.length;
    const steers = buildInternationalDessertPlan(cycle).map(
      (j) => `${j.cuisine}::${j.styleHint}`,
    );
    expect(new Set(steers).size).toBe(cycle);
  });
});

describe('buildInternationalSaucePlan', () => {
  it('sauce archetypes are non-empty and carry no banned vocabulary', () => {
    expect(INTERNATIONAL_SAUCE_ARCHETYPES.length).toBeGreaterThan(0);
    for (const a of INTERNATIONAL_SAUCE_ARCHETYPES) {
      expect(a.trim().length).toBeGreaterThan(0);
      const low = a.toLowerCase();
      for (const bad of BANNED) expect(low).not.toContain(bad);
      expect(low).not.toMatch(/\b(cut|bulk|maintain)\b/);
    }
  });

  it('returns exactly `count` sauce jobs, each with a pinned world cuisine', () => {
    const plan = buildInternationalSaucePlan(50);
    expect(plan).toHaveLength(50);
    for (const job of plan) {
      expect(job.mealType).toBe('sauce');
      expect(INTERNATIONAL_SNACK_CUISINES).toContain(job.cuisine);
      expect(job.styleHint).toContain(' — ');
      expect(job.themeKey.length).toBeGreaterThan(0);
    }
  });

  it('returns an empty plan for non-positive counts', () => {
    expect(buildInternationalSaucePlan(0)).toEqual([]);
    expect(buildInternationalSaucePlan(-2)).toEqual([]);
  });

  it('hits every cuisine once before repeating any', () => {
    const n = INTERNATIONAL_SNACK_CUISINES.length;
    const firstCycle = buildInternationalSaucePlan(n).map((j) => j.cuisine);
    expect(new Set(firstCycle).size).toBe(n);
  });

  it('is deterministic and cuisineOffset rotates the start', () => {
    expect(buildInternationalSaucePlan(40)).toEqual(buildInternationalSaucePlan(40));
    const a = buildInternationalSaucePlan(5, { cuisineOffset: 0 });
    const b = buildInternationalSaucePlan(5, { cuisineOffset: 1 });
    expect(a[0].cuisine).not.toBe(b[0].cuisine);
  });

  it('the first cuisines×archetypes steers are all distinct', () => {
    const cycle =
      INTERNATIONAL_SNACK_CUISINES.length * INTERNATIONAL_SAUCE_ARCHETYPES.length;
    const steers = buildInternationalSaucePlan(cycle).map(
      (j) => `${j.cuisine}::${j.styleHint}`,
    );
    expect(new Set(steers).size).toBe(cycle);
  });
});
