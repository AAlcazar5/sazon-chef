// backend/__tests__/services/familyMealService.test.ts
// Group 10X Phase 7 — Family mode service tests.

import {
  buildFamilyMeal,
  mergeSharedCookSteps,
  computePerPlateMacros,
} from '../../src/services/familyMealService';

describe('mergeSharedCookSteps', () => {
  it('merges shared componentId across plates into a single cook step with summed portions', () => {
    const plates = [
      {
        plateId: 'kid',
        components: [
          { componentId: 'pasta-1', portionMultiplier: 1, slot: 'base' as const },
          { componentId: 'carrot-roast', portionMultiplier: 1, slot: 'vegetable' as const },
        ],
      },
      {
        plateId: 'adult',
        components: [
          { componentId: 'farro-1', portionMultiplier: 1, slot: 'base' as const },
          { componentId: 'carrot-roast', portionMultiplier: 1, slot: 'vegetable' as const },
        ],
      },
      {
        plateId: 'parent2',
        components: [
          { componentId: 'farro-1', portionMultiplier: 1.5, slot: 'base' as const },
          { componentId: 'carrot-roast', portionMultiplier: 1, slot: 'vegetable' as const },
        ],
      },
    ];

    const merged = mergeSharedCookSteps(plates);

    const carrot = merged.find((s) => s.componentId === 'carrot-roast')!;
    expect(carrot.totalPortions).toBe(3);
    expect(carrot.servesPlateIds.sort()).toEqual(['adult', 'kid', 'parent2']);

    const farro = merged.find((s) => s.componentId === 'farro-1')!;
    expect(farro.totalPortions).toBe(2.5);
    expect(farro.servesPlateIds.sort()).toEqual(['adult', 'parent2']);

    const pasta = merged.find((s) => s.componentId === 'pasta-1')!;
    expect(pasta.totalPortions).toBe(1);
    expect(pasta.servesPlateIds).toEqual(['kid']);
  });

  it('returns an empty array for an empty plate list', () => {
    expect(mergeSharedCookSteps([])).toEqual([]);
  });

  it('handles a single plate (no merging)', () => {
    const merged = mergeSharedCookSteps([
      {
        plateId: 'p1',
        components: [{ componentId: 'c1', portionMultiplier: 1, slot: 'base' as const }],
      },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].totalPortions).toBe(1);
  });
});

describe('computePerPlateMacros', () => {
  const componentIndex = {
    'salmon-1': { caloriesPerPortion: 200, proteinG: 25, carbsG: 0, fatG: 10 },
    'rice-1': { caloriesPerPortion: 200, proteinG: 4, carbsG: 42, fatG: 2 },
    'broc-1': { caloriesPerPortion: 50, proteinG: 4, carbsG: 6, fatG: 1 },
  };

  it('computes per-plate totals (not summed across plates)', () => {
    const plates = [
      {
        plateId: 'kid',
        components: [
          { componentId: 'rice-1', portionMultiplier: 1, slot: 'base' as const },
          { componentId: 'broc-1', portionMultiplier: 0.5, slot: 'vegetable' as const },
        ],
      },
      {
        plateId: 'adult',
        components: [
          { componentId: 'salmon-1', portionMultiplier: 1, slot: 'protein' as const },
          { componentId: 'rice-1', portionMultiplier: 1.5, slot: 'base' as const },
          { componentId: 'broc-1', portionMultiplier: 1, slot: 'vegetable' as const },
        ],
      },
    ];

    const macros = computePerPlateMacros(plates, componentIndex);
    const kid = macros.find((m) => m.plateId === 'kid')!;
    const adult = macros.find((m) => m.plateId === 'adult')!;

    expect(kid.calories).toBe(225);
    expect(kid.protein).toBe(6);
    expect(adult.calories).toBe(550);
    expect(adult.protein).toBe(35);
  });

  it('returns 0 macros for plates with no components', () => {
    const macros = computePerPlateMacros(
      [{ plateId: 'empty', components: [] }],
      componentIndex
    );
    expect(macros[0].calories).toBe(0);
    expect(macros[0].protein).toBe(0);
  });

  it('skips unknown componentIds defensively (no crash)', () => {
    const macros = computePerPlateMacros(
      [
        {
          plateId: 'p1',
          components: [{ componentId: 'ghost', portionMultiplier: 1, slot: 'base' as const }],
        },
      ],
      componentIndex
    );
    expect(macros[0].calories).toBe(0);
  });
});

describe('buildFamilyMeal', () => {
  it('rejects when plates array is empty', () => {
    expect(() => buildFamilyMeal({ plates: [], userId: 'u1' })).toThrow(/at least one plate/i);
  });

  it('rejects when plates exceeds the 6-plate cap', () => {
    const plates = Array.from({ length: 7 }, (_, i) => ({
      plateId: `p${i}`,
      components: [{ componentId: 'c1', portionMultiplier: 1, slot: 'base' as const }],
    }));
    expect(() => buildFamilyMeal({ plates, userId: 'u1' })).toThrow(/maximum.*6/i);
  });

  it('returns a FamilyMeal with merged steps + per-plate breakdown', () => {
    const result = buildFamilyMeal({
      plates: [
        {
          plateId: 'kid',
          components: [{ componentId: 'pasta-1', portionMultiplier: 1, slot: 'base' as const }],
        },
        {
          plateId: 'adult',
          components: [{ componentId: 'farro-1', portionMultiplier: 1, slot: 'base' as const }],
        },
      ],
      userId: 'u1',
    });
    expect(result.userId).toBe('u1');
    expect(result.plates).toHaveLength(2);
    expect(result.cookSteps).toHaveLength(2);
  });
});
