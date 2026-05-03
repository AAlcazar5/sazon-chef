// backend/__tests__/services/familyMealService.test.ts
// Group 10X Phase 7 — Family mode service tests.

import {
  buildFamilyMeal,
  mergeSharedCookSteps,
  computePerPlateMacros,
  divergeFromSharedBase,
  persistFamilyMeal,
} from '../../src/services/familyMealService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

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

describe('divergeFromSharedBase', () => {
  it('builds N plates that all share the sharedSlots and add their own divergent slots', () => {
    const plates = divergeFromSharedBase({
      sharedSlots: [
        { slot: 'protein', componentId: 'p_chicken' },
        { slot: 'base', componentId: 'b_rice' },
      ],
      perPlateDivergentSlots: [
        { plateId: 'kid', slots: [{ slot: 'vegetable', componentId: 'v_plain_carrots' }] },
        { plateId: 'adult', slots: [{ slot: 'vegetable', componentId: 'v_roasted_carrots' }, { slot: 'sauce', componentId: 's_chimichurri' }] },
      ],
    });
    expect(plates).toHaveLength(2);
    expect(plates[0].plateId).toBe('kid');
    expect(plates[0].components).toHaveLength(3); // 2 shared + 1 divergent
    expect(plates[1].components).toHaveLength(4); // 2 shared + 2 divergent
    // Default portionMultiplier of 1 on every component
    expect(plates[0].components.every((c) => c.portionMultiplier === 1)).toBe(true);
  });

  it('throws when no output plates are specified', () => {
    expect(() =>
      divergeFromSharedBase({
        sharedSlots: [{ slot: 'protein', componentId: 'p_chicken' }],
        perPlateDivergentSlots: [],
      }),
    ).toThrow(/at least one/i);
  });

  it('throws when more than 6 output plates are requested', () => {
    expect(() =>
      divergeFromSharedBase({
        sharedSlots: [{ slot: 'protein', componentId: 'p_chicken' }],
        perPlateDivergentSlots: Array.from({ length: 7 }, (_, i) => ({
          plateId: `p${i}`,
          slots: [{ slot: 'vegetable' as const, componentId: 'v_x' }],
        })),
      }),
    ).toThrow(/at most/i);
  });
});

describe('persistFamilyMeal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('IDOR guard — rejects when any plate does not belong to the user', async () => {
    mockPrisma.composedPlate.findMany.mockResolvedValueOnce([
      { id: 'p1' }, // p2 missing → not owned
    ]);
    await expect(
      persistFamilyMeal({
        userId: 'u1',
        plates: [
          { plateId: 'p1', components: [{ slot: 'protein', componentId: 'c1', portionMultiplier: 1 }] },
          { plateId: 'p2', components: [{ slot: 'base', componentId: 'c2', portionMultiplier: 1 }] },
        ],
      }),
    ).rejects.toThrow(/forbidden|not found/i);
    expect(mockPrisma.composedFamilyMeal.create).not.toHaveBeenCalled();
  });

  it('persists with merged cook steps + position indices, returns id + plate order', async () => {
    mockPrisma.composedPlate.findMany.mockResolvedValueOnce([{ id: 'p1' }, { id: 'p2' }]);
    mockPrisma.composedFamilyMeal.create.mockResolvedValueOnce({
      id: 'fm1',
      userId: 'u1',
      name: 'Sunday',
      cookStepsJson: '[]',
      plates: [
        { plateId: 'p1', positionIndex: 0 },
        { plateId: 'p2', positionIndex: 1 },
      ],
    });
    const result = await persistFamilyMeal({
      userId: 'u1',
      name: 'Sunday',
      plates: [
        { plateId: 'p1', components: [{ slot: 'protein', componentId: 'c1', portionMultiplier: 1 }] },
        { plateId: 'p2', components: [{ slot: 'protein', componentId: 'c1', portionMultiplier: 2 }] },
      ],
    });
    expect(result.id).toBe('fm1');
    expect(result.plateIds).toEqual(['p1', 'p2']);
    // The merged cook step should have totalPortions=3 (1+2 across plates)
    expect(result.cookSteps).toHaveLength(1);
    expect(result.cookSteps[0].totalPortions).toBe(3);
    expect(result.cookSteps[0].servesPlateIds.sort()).toEqual(['p1', 'p2']);
  });

  it('rejects empty plates list', async () => {
    await expect(persistFamilyMeal({ userId: 'u1', plates: [] })).rejects.toThrow(
      /at least one plate/i,
    );
  });

  it('rejects more than 6 plates', async () => {
    const plates = Array.from({ length: 7 }, (_, i) => ({
      plateId: `p${i}`,
      components: [{ slot: 'protein' as const, componentId: 'c1', portionMultiplier: 1 }],
    }));
    await expect(persistFamilyMeal({ userId: 'u1', plates })).rejects.toThrow(/maximum/i);
  });
});
