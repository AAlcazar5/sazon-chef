// Mixed all-mealType catalog pass that "beefs up the lowest count
// categories". allocateByDeficit weights the run toward the thinnest
// mealTypes (every type still represented via a smoothing floor);
// buildMixedCatalogPlan turns that allocation into cuisine-pinned jobs with
// per-mealType archetype steers, reusing the international rotation pattern.

import {
  MIXED_MEALTYPES,
  allocateByDeficit,
  buildMixedCatalogPlan,
} from '../../scripts/seedMixedCatalog';
import { INTERNATIONAL_SNACK_CUISINES } from '../../scripts/seedSnackDessert';

// Real catalog snapshot 2026-05-17 — dinner is fattest, dessert thinnest.
const COUNTS = {
  dinner: 4158,
  lunch: 2348,
  snack: 1734,
  breakfast: 1459,
  sauce: 500,
  dessert: 232,
} as const;

describe('allocateByDeficit', () => {
  it('covers exactly the six catalog meal types', () => {
    expect([...MIXED_MEALTYPES].sort()).toEqual(
      ['breakfast', 'dessert', 'dinner', 'lunch', 'sauce', 'snack'].sort(),
    );
  });

  it('sums to exactly the requested total', () => {
    expect(
      Object.values(allocateByDeficit(500, COUNTS)).reduce((a, b) => a + b, 0),
    ).toBe(500);
    expect(
      Object.values(allocateByDeficit(2500, COUNTS)).reduce((a, b) => a + b, 0),
    ).toBe(2500);
  });

  it('gives every meal type a non-zero share (mix guaranteed)', () => {
    const a = allocateByDeficit(500, COUNTS);
    for (const mt of MIXED_MEALTYPES) expect(a[mt]).toBeGreaterThan(0);
  });

  it('weights thinnest categories highest, fattest lowest', () => {
    const a = allocateByDeficit(500, COUNTS);
    expect(a.dessert).toBeGreaterThan(a.sauce);
    expect(a.sauce).toBeGreaterThan(a.breakfast);
    expect(a.breakfast).toBeGreaterThan(a.snack);
    expect(a.snack).toBeGreaterThan(a.lunch);
    expect(a.lunch).toBeGreaterThan(a.dinner);
  });

  it('is deterministic', () => {
    expect(allocateByDeficit(500, COUNTS)).toEqual(allocateByDeficit(500, COUNTS));
  });

  it('handles a zero/empty count map without crashing', () => {
    const a = allocateByDeficit(60, {
      breakfast: 0, lunch: 0, dinner: 0, snack: 0, dessert: 0, sauce: 0,
    });
    expect(Object.values(a).reduce((x, y) => x + y, 0)).toBe(60);
    for (const mt of MIXED_MEALTYPES) expect(a[mt]).toBe(10);
  });
});

describe('buildMixedCatalogPlan', () => {
  it('returns exactly `count` jobs', () => {
    expect(buildMixedCatalogPlan(500, COUNTS)).toHaveLength(500);
    expect(buildMixedCatalogPlan(0, COUNTS)).toEqual([]);
    expect(buildMixedCatalogPlan(-3, COUNTS)).toEqual([]);
  });

  it('every job has a valid mealType, pinned world cuisine, and a steer', () => {
    for (const job of buildMixedCatalogPlan(600, COUNTS)) {
      expect(MIXED_MEALTYPES).toContain(job.mealType);
      expect(INTERNATIONAL_SNACK_CUISINES).toContain(job.cuisine);
      expect(job.styleHint).toContain(' — ');
      expect(job.groupKey.length).toBeGreaterThan(0);
    }
  });

  it('represents all six meal types in a 500-job plan', () => {
    const seen = new Set(buildMixedCatalogPlan(500, COUNTS).map((j) => j.mealType));
    expect([...seen].sort()).toEqual(
      ['breakfast', 'dessert', 'dinner', 'lunch', 'sauce', 'snack'].sort(),
    );
  });

  it('plan composition matches the deficit allocation', () => {
    const plan = buildMixedCatalogPlan(500, COUNTS);
    const byType = (mt: string) => plan.filter((j) => j.mealType === mt).length;
    const alloc = allocateByDeficit(500, COUNTS);
    for (const mt of MIXED_MEALTYPES) expect(byType(mt)).toBe(alloc[mt]);
    expect(byType('dessert')).toBeGreaterThan(byType('dinner'));
  });

  it('is deterministic and cuisineOffset rotates cuisines', () => {
    expect(buildMixedCatalogPlan(120, COUNTS)).toEqual(
      buildMixedCatalogPlan(120, COUNTS),
    );
    const a = buildMixedCatalogPlan(40, COUNTS, { cuisineOffset: 0 });
    const b = buildMixedCatalogPlan(40, COUNTS, { cuisineOffset: 1 });
    expect(a.map((j) => j.cuisine)).not.toEqual(b.map((j) => j.cuisine));
  });

  it('interleaves meal types so any prefix tracks the allocation (TARGET_SAVED safety)', () => {
    // The run stops at TARGET_SAVED even though planCap is 5× that. If the
    // plan emitted one mealType block at a time, a 500-stop inside a 2500
    // plan would only ever produce the first block. Every meal type must
    // appear within the first `target` jobs, roughly in allocation ratio.
    const plan = buildMixedCatalogPlan(2500, COUNTS);
    const first500 = plan.slice(0, 500);
    const seen = new Set(first500.map((j) => j.mealType));
    expect([...seen].sort()).toEqual(
      ['breakfast', 'dessert', 'dinner', 'lunch', 'sauce', 'snack'].sort(),
    );
    // Thinnest (dessert/sauce) must dominate the prefix over fattest (dinner).
    const c = (mt: string) => first500.filter((j) => j.mealType === mt).length;
    expect(c('dessert')).toBeGreaterThan(c('dinner'));
    expect(c('sauce')).toBeGreaterThan(c('dinner'));
    expect(c('dessert')).toBeGreaterThan(50);
    expect(c('sauce')).toBeGreaterThan(50);
  });

  it('rotates cuisines within a meal type (not all the same cuisine)', () => {
    const dessertCuisines = new Set(
      buildMixedCatalogPlan(500, COUNTS)
        .filter((j) => j.mealType === 'dessert')
        .map((j) => j.cuisine),
    );
    expect(dessertCuisines.size).toBeGreaterThan(5);
  });
});
