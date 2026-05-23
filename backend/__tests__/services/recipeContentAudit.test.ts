// Tier U item-1 (founder roadmap 2026-05-23): retrospective content
// audit tests. Pins the rules a catalog recipe must clear to count
// toward the >85% pass-rate launch gate.

import {
  auditRecipe,
  rollupAuditResults,
  type AuditedRecipeShape,
} from '../../src/services/recipeContentAudit';

function recipe(over: Partial<AuditedRecipeShape> = {}): AuditedRecipeShape {
  return {
    id: 'r_' + Math.random().toString(36).slice(2, 8),
    title: 'Pomodoro',
    cuisine: 'Italian',
    calories: 450,
    cookTime: 25,
    ingredients: [{ name: 'tomato', amount: 2, unit: 'cup' }],
    instructions: [{ text: 'Simmer.', step: 1 }],
    ...over,
  };
}

describe('auditRecipe — passes', () => {
  it('a clean recipe with all fields → passed=true, no failures', () => {
    const result = auditRecipe(recipe());
    expect(result.passed).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.detail).toEqual([]);
  });

  it('accepts plain-string ingredients + instructions (legacy rows)', () => {
    const result = auditRecipe(
      recipe({
        ingredients: ['tomato', 'basil', 'olive oil'],
        instructions: ['Simmer.', 'Toss.'],
      }),
    );
    expect(result.passed).toBe(true);
  });

  it('null calories / null cookTime are not failures (legacy data is OK)', () => {
    const result = auditRecipe(recipe({ calories: null, cookTime: null }));
    expect(result.passed).toBe(true);
  });
});

describe('auditRecipe — fails', () => {
  it('zero ingredients → no_ingredients', () => {
    const result = auditRecipe(recipe({ ingredients: [] }));
    expect(result.passed).toBe(false);
    expect(result.failures).toContain('no_ingredients');
  });

  it('all-whitespace ingredients → no_ingredients (clean filter)', () => {
    const result = auditRecipe(recipe({ ingredients: ['   ', '\t'] }));
    expect(result.failures).toContain('no_ingredients');
  });

  it('some-but-not-all empty ingredient names → empty_ingredient_name', () => {
    const result = auditRecipe(
      recipe({
        ingredients: [
          { name: 'tomato' },
          { name: '' },
          { name: '  ' },
        ],
      }),
    );
    expect(result.failures).toContain('empty_ingredient_name');
  });

  it('duplicate ingredient names (case-insensitive) → duplicate_ingredients', () => {
    const result = auditRecipe(
      recipe({
        ingredients: [{ name: 'Tomato' }, { name: 'tomato' }, { name: 'basil' }],
      }),
    );
    expect(result.failures).toContain('duplicate_ingredients');
  });

  it('zero instructions → no_instructions', () => {
    const result = auditRecipe(recipe({ instructions: [] }));
    expect(result.failures).toContain('no_instructions');
  });

  it('calories < 50 → calorie_outlier_low', () => {
    const result = auditRecipe(recipe({ calories: 30 }));
    expect(result.failures).toContain('calorie_outlier_low');
  });

  it('calories > 2000 → calorie_outlier_high', () => {
    const result = auditRecipe(recipe({ calories: 2400 }));
    expect(result.failures).toContain('calorie_outlier_high');
  });

  it('cook time <= 0 → invalid_cook_time', () => {
    const result = auditRecipe(recipe({ cookTime: 0 }));
    expect(result.failures).toContain('invalid_cook_time');
    expect(auditRecipe(recipe({ cookTime: -5 })).failures).toContain(
      'invalid_cook_time',
    );
  });

  it('multiple failures accumulate', () => {
    const result = auditRecipe(
      recipe({
        ingredients: [],
        instructions: [],
        calories: 30,
      }),
    );
    expect(result.failures).toEqual(
      expect.arrayContaining([
        'no_ingredients',
        'no_instructions',
        'calorie_outlier_low',
      ]),
    );
  });
});

describe('rollupAuditResults', () => {
  it('empty input → 100% pass rate, no cuisines, no failure codes', () => {
    const rollup = rollupAuditResults([]);
    expect(rollup.totalRecipes).toBe(0);
    expect(rollup.passRate).toBe(1);
    expect(rollup.perCuisine).toEqual([]);
    expect(rollup.failureCodeCounts).toEqual({});
  });

  it('rolls up per-cuisine pass rates', () => {
    const rollup = rollupAuditResults([
      auditRecipe(recipe({ cuisine: 'Italian' })),
      auditRecipe(recipe({ cuisine: 'Italian' })),
      auditRecipe(recipe({ cuisine: 'Italian', ingredients: [] })), // fail
      auditRecipe(recipe({ cuisine: 'Thai' })),
    ]);

    expect(rollup.totalRecipes).toBe(4);
    expect(rollup.passed).toBe(3);
    expect(rollup.failed).toBe(1);

    const italian = rollup.perCuisine.find((c) => c.cuisine === 'Italian');
    expect(italian).toEqual({
      cuisine: 'Italian',
      total: 3,
      passed: 2,
      passRate: 2 / 3,
    });

    const thai = rollup.perCuisine.find((c) => c.cuisine === 'Thai');
    expect(thai).toEqual({
      cuisine: 'Thai',
      total: 1,
      passed: 1,
      passRate: 1,
    });
  });

  it('per-cuisine list sorted by passRate ASC (worst first)', () => {
    const rollup = rollupAuditResults([
      auditRecipe(recipe({ cuisine: 'A' })),
      auditRecipe(recipe({ cuisine: 'B', ingredients: [] })), // fail
      auditRecipe(recipe({ cuisine: 'C', ingredients: [] })), // fail
      auditRecipe(recipe({ cuisine: 'C' })),
    ]);
    expect(rollup.perCuisine[0].cuisine).toBe('B');
    expect(rollup.perCuisine[0].passRate).toBe(0);
    expect(rollup.perCuisine[1].cuisine).toBe('C');
    expect(rollup.perCuisine[1].passRate).toBe(0.5);
    expect(rollup.perCuisine[2].cuisine).toBe('A');
  });

  it('failureCodeCounts counts each code across all results', () => {
    const rollup = rollupAuditResults([
      auditRecipe(recipe({ ingredients: [] })),
      auditRecipe(recipe({ ingredients: [] })),
      auditRecipe(recipe({ calories: 30 })),
    ]);
    expect(rollup.failureCodeCounts.no_ingredients).toBe(2);
    expect(rollup.failureCodeCounts.calorie_outlier_low).toBe(1);
  });

  it('null cuisine becomes (unknown) in the rollup', () => {
    const rollup = rollupAuditResults([
      auditRecipe(recipe({ cuisine: null })),
    ]);
    expect(rollup.perCuisine[0].cuisine).toBe('(unknown)');
  });
});
