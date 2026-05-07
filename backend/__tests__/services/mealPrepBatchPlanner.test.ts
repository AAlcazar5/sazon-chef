// ROADMAP 4.0 WK3.1 — mealPrepBatchPlanner test.

import {
  proposeMealPrepBatchPlan,
  PREP_TOLERANCE_BY_SKILL,
  __INTERNALS,
  type PlannedMeal,
} from '../../src/services/recommender/mealPrepBatchPlanner';

const PREP_TIMES = new Map<string, number>([
  ['brown rice', 25],
  ['roasted veg', 30],
  ['soy-glazed protein', 20],
  ['quinoa', 25],
  ['salad mix', 5],
]);

const grainBowl = (id: string): PlannedMeal => ({
  mealId: id,
  kind: 'lunch',
  ingredients: ['brown rice', 'roasted veg', 'salad mix'],
});

const stirFry = (id: string): PlannedMeal => ({
  mealId: id,
  kind: 'dinner',
  ingredients: ['brown rice', 'soy-glazed protein'],
});

describe('WK3.1 — proposeMealPrepBatchPlan', () => {
  it('returns null on empty meals', () => {
    expect(
      proposeMealPrepBatchPlan({
        meals: [],
        prepTimeByIngredient: PREP_TIMES,
      }),
    ).toBeNull();
  });

  it('proposes a single block bundling shared ingredients across grain bowls + stir-fries', () => {
    const meals: PlannedMeal[] = [
      grainBowl('m1'),
      grainBowl('m2'),
      grainBowl('m3'),
      stirFry('m4'),
      stirFry('m5'),
    ];
    const plan = proposeMealPrepBatchPlan({
      meals,
      prepTimeByIngredient: PREP_TIMES,
    });
    expect(plan).not.toBeNull();
    const ingredients = plan!.ingredientsToBatch.map((i) => i.ingredient);
    expect(ingredients).toEqual(expect.arrayContaining(['brown rice', 'roasted veg']));
    expect(plan!.estimatedMinutes).toBeLessThanOrEqual(90);
    expect(plan!.coversMeals).toBe(5);
  });

  it('total estimated minutes never exceeds prep tolerance', () => {
    const meals = [grainBowl('m1'), grainBowl('m2'), grainBowl('m3'), stirFry('m4'), stirFry('m5')];
    const plan = proposeMealPrepBatchPlan({
      meals,
      prepTimeByIngredient: PREP_TIMES,
      prepToleranceMin: 90,
    });
    expect(plan!.estimatedMinutes).toBeLessThanOrEqual(90);
  });

  it('respects beginner cap (≤ 60 min)', () => {
    const meals = [grainBowl('m1'), grainBowl('m2'), grainBowl('m3'), stirFry('m4'), stirFry('m5')];
    const plan = proposeMealPrepBatchPlan({
      meals,
      prepTimeByIngredient: PREP_TIMES,
      skillTier: 'beginner',
    });
    expect(plan).not.toBeNull();
    expect(plan!.estimatedMinutes).toBeLessThanOrEqual(60);
  });

  it('beginner cap may exclude expensive ingredients (greedy by frequency, capped by time)', () => {
    // Beginner cap is 60 min. brown rice (25) + roasted veg (30) = 55 fits.
    // soy-glazed protein (20) — adding would push to 75; should be skipped.
    const meals = [grainBowl('m1'), grainBowl('m2'), grainBowl('m3'), stirFry('m4'), stirFry('m5')];
    const plan = proposeMealPrepBatchPlan({
      meals,
      prepTimeByIngredient: PREP_TIMES,
      skillTier: 'beginner',
    });
    const ingredients = plan!.ingredientsToBatch.map((i) => i.ingredient);
    expect(ingredients).toContain('brown rice');
    expect(ingredients).toContain('roasted veg');
    // soy-glazed protein only used in 2 meals — won't fit under beginner cap
    // alongside rice + veg.
    expect(plan!.estimatedMinutes).toBeLessThanOrEqual(60);
  });

  it('returns null when no ingredient repeats (nothing to batch)', () => {
    const meals: PlannedMeal[] = [
      { mealId: 'm1', kind: 'lunch', ingredients: ['salmon'] },
      { mealId: 'm2', kind: 'dinner', ingredients: ['steak'] },
      { mealId: 'm3', kind: 'breakfast', ingredients: ['eggs'] },
    ];
    expect(
      proposeMealPrepBatchPlan({
        meals,
        prepTimeByIngredient: PREP_TIMES,
      }),
    ).toBeNull();
  });

  it('returns null when shared ingredients cover < MIN_MEALS_COVERED', () => {
    const meals: PlannedMeal[] = [
      { mealId: 'm1', kind: 'lunch', ingredients: ['quinoa'] },
      { mealId: 'm2', kind: 'lunch', ingredients: ['quinoa'] },
      // only 2 meals share quinoa; below MIN_MEALS_COVERED (3)
    ];
    expect(
      proposeMealPrepBatchPlan({
        meals,
        prepTimeByIngredient: PREP_TIMES,
      }),
    ).toBeNull();
  });

  it('breakdown reflects covered meal kinds (e.g., "3 lunchs + 2 dinners")', () => {
    const meals = [grainBowl('m1'), grainBowl('m2'), grainBowl('m3'), stirFry('m4'), stirFry('m5')];
    const plan = proposeMealPrepBatchPlan({
      meals,
      prepTimeByIngredient: PREP_TIMES,
    });
    expect(plan!.breakdown).toContain('lunch');
    expect(plan!.breakdown).toContain('dinner');
  });

  it('case-insensitive ingredient matching (rice vs Rice)', () => {
    const meals: PlannedMeal[] = [
      { mealId: 'm1', kind: 'lunch', ingredients: ['Brown Rice', 'roasted veg'] },
      { mealId: 'm2', kind: 'lunch', ingredients: ['BROWN RICE', 'roasted veg'] },
      { mealId: 'm3', kind: 'dinner', ingredients: ['brown rice', 'roasted veg'] },
    ];
    const plan = proposeMealPrepBatchPlan({
      meals,
      prepTimeByIngredient: PREP_TIMES,
    });
    expect(plan).not.toBeNull();
    expect(plan!.ingredientsToBatch.map((i) => i.ingredient)).toContain('brown rice');
  });

  it('does not double-count an ingredient appearing twice in the same meal', () => {
    const meals: PlannedMeal[] = [
      { mealId: 'm1', kind: 'lunch', ingredients: ['brown rice', 'brown rice', 'roasted veg'] },
      { mealId: 'm2', kind: 'lunch', ingredients: ['brown rice', 'roasted veg'] },
      { mealId: 'm3', kind: 'dinner', ingredients: ['brown rice', 'roasted veg'] },
    ];
    const plan = proposeMealPrepBatchPlan({
      meals,
      prepTimeByIngredient: PREP_TIMES,
    });
    const rice = plan!.ingredientsToBatch.find((i) => i.ingredient === 'brown rice');
    expect(rice!.frequency).toBe(3); // not 4
  });

  it('falls back to DEFAULT_PREP_MINUTES (15) when an ingredient is missing from the prep-time map', () => {
    const meals: PlannedMeal[] = [
      { mealId: 'm1', kind: 'lunch', ingredients: ['unknown-component'] },
      { mealId: 'm2', kind: 'lunch', ingredients: ['unknown-component'] },
      { mealId: 'm3', kind: 'dinner', ingredients: ['unknown-component'] },
    ];
    const plan = proposeMealPrepBatchPlan({
      meals,
      prepTimeByIngredient: new Map(),
    });
    expect(plan).not.toBeNull();
    expect(plan!.ingredientsToBatch[0].estimatedMinutes).toBe(__INTERNALS.DEFAULT_PREP_MINUTES);
  });

  it('publishes prep-tolerance map for KitchenIQ skill tiers', () => {
    expect(PREP_TOLERANCE_BY_SKILL.beginner).toBe(60);
    expect(PREP_TOLERANCE_BY_SKILL.intermediate).toBe(75);
    expect(PREP_TOLERANCE_BY_SKILL.advanced).toBe(90);
  });

  it('does not mutate input meals or prep-time map', () => {
    const meals = [grainBowl('m1'), grainBowl('m2'), grainBowl('m3'), stirFry('m4'), stirFry('m5')];
    const before = JSON.stringify(meals);
    const beforeMap = new Map(PREP_TIMES);
    proposeMealPrepBatchPlan({
      meals,
      prepTimeByIngredient: PREP_TIMES,
    });
    expect(JSON.stringify(meals)).toBe(before);
    expect(PREP_TIMES.size).toBe(beforeMap.size);
  });

  it('publishes constants for cap-test inspection', () => {
    expect(__INTERNALS.DEFAULT_PREP_MINUTES).toBe(15);
    expect(__INTERNALS.MIN_FREQUENCY_FOR_BATCH).toBe(2);
    expect(__INTERNALS.MIN_MEALS_COVERED).toBe(3);
  });
});
