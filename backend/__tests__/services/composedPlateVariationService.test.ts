// backend/__tests__/services/composedPlateVariationService.test.ts
// Group 10X straggler — "Vary this plate" service tests.

import {
  generatePlateVariations,
  type PlateVariation,
} from '../../src/services/composedPlateVariationService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

const buildComponent = (overrides: Partial<any>) => ({
  id: 'c1',
  slot: 'protein',
  name: 'Salmon',
  caloriesPerPortion: 200,
  proteinG: 25,
  carbsG: 0,
  fatG: 10,
  estimatedCostPerPortion: 3,
  cuisineTags: JSON.stringify([]),
  dietaryTags: JSON.stringify([]),
  cookMethodHint: 'pan_sear',
  pantryIngredientNames: JSON.stringify([]),
  userId: null,
  ...overrides,
});

beforeAll(() => {
  if (!mockPrisma.mealComponent) {
    mockPrisma.mealComponent = { findMany: jest.fn() };
  }
});

beforeEach(() => {
  // mockReset clears both call history AND queued mockResolvedValueOnce values,
  // which clearAllMocks does NOT do — without this, queued values leak between tests.
  mockPrisma.composedPlate.findUnique.mockReset();
  mockPrisma.mealComponent.findMany.mockReset();
  mockPrisma.composedPlate.findUnique.mockResolvedValue(null);
  mockPrisma.mealComponent.findMany.mockResolvedValue([]);
});

const SOURCE_PLATE = {
  id: 'plate-1',
  userId: 'user-1',
  componentIds: JSON.stringify([
    { slot: 'protein', componentId: 'salmon-1', portionMultiplier: 1 },
    { slot: 'base', componentId: 'rice-1', portionMultiplier: 1 },
    { slot: 'vegetable', componentId: 'broc-1', portionMultiplier: 1 },
    { slot: 'sauce', componentId: 'tahini-1', portionMultiplier: 0.5 },
  ]),
};

describe('generatePlateVariations', () => {
  it('returns empty array when plate not found', async () => {
    mockPrisma.composedPlate.findUnique.mockResolvedValueOnce(null);
    const result = await generatePlateVariations({ plateId: 'ghost', userId: 'user-1', count: 3 });
    expect(result).toEqual([]);
  });

  it('throws when plate belongs to a different user (IDOR guard)', async () => {
    mockPrisma.composedPlate.findUnique.mockResolvedValueOnce({
      ...SOURCE_PLATE,
      userId: 'somebody-else',
    });
    await expect(
      generatePlateVariations({ plateId: 'plate-1', userId: 'user-1', count: 3 })
    ).rejects.toThrow(/forbidden|not found/i);
  });

  it('returns up to N variations, each differing from source by exactly one slot', async () => {
    mockPrisma.composedPlate.findUnique.mockResolvedValueOnce(SOURCE_PLATE);
    mockPrisma.mealComponent.findMany
      // Original components
      .mockResolvedValueOnce([
        buildComponent({ id: 'salmon-1', slot: 'protein' }),
        buildComponent({ id: 'rice-1', slot: 'base' }),
        buildComponent({ id: 'broc-1', slot: 'vegetable' }),
        buildComponent({ id: 'tahini-1', slot: 'sauce' }),
      ])
      // Alternatives by slot — protein
      .mockResolvedValueOnce([
        buildComponent({ id: 'chicken-1', slot: 'protein', name: 'Chicken' }),
        buildComponent({ id: 'tofu-1', slot: 'protein', name: 'Tofu' }),
      ])
      // base
      .mockResolvedValueOnce([
        buildComponent({ id: 'farro-1', slot: 'base', name: 'Farro' }),
      ])
      // vegetable
      .mockResolvedValueOnce([
        buildComponent({ id: 'carrot-1', slot: 'vegetable', name: 'Carrots' }),
      ])
      // sauce
      .mockResolvedValueOnce([
        buildComponent({ id: 'yogurt-1', slot: 'sauce', name: 'Yogurt Sauce' }),
      ]);

    const result = await generatePlateVariations({
      plateId: 'plate-1',
      userId: 'user-1',
      count: 3,
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(3);

    const sourceIds = new Set(['salmon-1', 'rice-1', 'broc-1', 'tahini-1']);
    for (const variation of result) {
      const variationIds = variation.components.map((c) => c.componentId);
      const overlap = variationIds.filter((id) => sourceIds.has(id)).length;
      // ≥3 of original 4 components per spec
      expect(overlap).toBeGreaterThanOrEqual(3);
      // exactly one slot differs
      const differentCount = variation.components.filter(
        (c) => !sourceIds.has(c.componentId)
      ).length;
      expect(differentCount).toBe(1);
    }
  });

  it('includes the swappedSlot + swappedFrom + swappedTo metadata for UI display', async () => {
    mockPrisma.composedPlate.findUnique.mockResolvedValueOnce(SOURCE_PLATE);
    mockPrisma.mealComponent.findMany
      .mockResolvedValueOnce([
        buildComponent({ id: 'salmon-1', slot: 'protein' }),
        buildComponent({ id: 'rice-1', slot: 'base' }),
        buildComponent({ id: 'broc-1', slot: 'vegetable' }),
        buildComponent({ id: 'tahini-1', slot: 'sauce' }),
      ])
      .mockResolvedValueOnce([
        buildComponent({ id: 'chicken-1', slot: 'protein', name: 'Chicken' }),
      ])
      .mockResolvedValue([]);

    const result = await generatePlateVariations({
      plateId: 'plate-1',
      userId: 'user-1',
      count: 3,
    });

    const proteinSwap = result.find((v) => v.swappedSlot === 'protein');
    expect(proteinSwap).toBeDefined();
    expect(proteinSwap!.swappedFrom).toBe('salmon-1');
    expect(proteinSwap!.swappedTo).toBe('chicken-1');
  });

  it('recomputes totalCalories and totalProtein for each variation', async () => {
    mockPrisma.composedPlate.findUnique.mockResolvedValueOnce(SOURCE_PLATE);
    mockPrisma.mealComponent.findMany
      .mockResolvedValueOnce([
        buildComponent({ id: 'salmon-1', slot: 'protein', caloriesPerPortion: 200, proteinG: 25 }),
        buildComponent({ id: 'rice-1', slot: 'base', caloriesPerPortion: 200, proteinG: 4 }),
        buildComponent({ id: 'broc-1', slot: 'vegetable', caloriesPerPortion: 50, proteinG: 4 }),
        buildComponent({ id: 'tahini-1', slot: 'sauce', caloriesPerPortion: 100, proteinG: 6 }),
      ])
      .mockResolvedValueOnce([
        buildComponent({ id: 'chicken-1', slot: 'protein', caloriesPerPortion: 250, proteinG: 35 }),
      ])
      .mockResolvedValue([]);

    const result = await generatePlateVariations({
      plateId: 'plate-1',
      userId: 'user-1',
      count: 3,
    });

    const proteinSwap = result.find((v) => v.swappedSlot === 'protein')!;
    // chicken (250) + rice (200) + broccoli (50) + tahini@0.5 (50) = 550
    expect(proteinSwap.totalCalories).toBe(550);
    // chicken (35) + rice (4) + broc (4) + tahini@0.5 (3) = 46
    expect(proteinSwap.totalProtein).toBe(46);
  });

  it('skips slots that have no alternative components', async () => {
    mockPrisma.composedPlate.findUnique.mockResolvedValueOnce(SOURCE_PLATE);
    mockPrisma.mealComponent.findMany
      .mockResolvedValueOnce([
        buildComponent({ id: 'salmon-1', slot: 'protein' }),
        buildComponent({ id: 'rice-1', slot: 'base' }),
        buildComponent({ id: 'broc-1', slot: 'vegetable' }),
        buildComponent({ id: 'tahini-1', slot: 'sauce' }),
      ])
      // Only protein has alternatives
      .mockResolvedValueOnce([buildComponent({ id: 'chicken-1', slot: 'protein' })])
      .mockResolvedValueOnce([]) // base — no alts
      .mockResolvedValueOnce([]) // vegetable — no alts
      .mockResolvedValueOnce([]); // sauce — no alts

    const result = await generatePlateVariations({
      plateId: 'plate-1',
      userId: 'user-1',
      count: 3,
    });

    // Only one variation possible (the protein swap)
    expect(result).toHaveLength(1);
    expect(result[0].swappedSlot).toBe('protein');
  });

  it('respects user-scoped components (IDOR — only loads userId=null OR userId=current)', async () => {
    mockPrisma.composedPlate.findUnique.mockResolvedValueOnce({
      ...SOURCE_PLATE,
      userId: 'user-xyz',
    });
    mockPrisma.mealComponent.findMany.mockResolvedValue([]);
    await generatePlateVariations({ plateId: 'plate-1', userId: 'user-xyz', count: 3 });

    // Calls 2..N (alternatives lookup) must be IDOR-scoped
    const alternativeCalls = mockPrisma.mealComponent.findMany.mock.calls.slice(1);
    for (const call of alternativeCalls) {
      expect(call[0].where.OR).toEqual(
        expect.arrayContaining([{ userId: null }, { userId: 'user-xyz' }])
      );
    }
  });

  it('clamps count parameter to [1, 5] for safety', async () => {
    mockPrisma.composedPlate.findUnique.mockResolvedValueOnce(SOURCE_PLATE);
    mockPrisma.mealComponent.findMany
      .mockResolvedValueOnce([
        buildComponent({ id: 'salmon-1', slot: 'protein' }),
        buildComponent({ id: 'rice-1', slot: 'base' }),
      ])
      .mockResolvedValueOnce(Array.from({ length: 20 }, (_, i) =>
        buildComponent({ id: `protein-${i}`, slot: 'protein' })
      ))
      .mockResolvedValue([]);

    const result = await generatePlateVariations({
      plateId: 'plate-1',
      userId: 'user-1',
      count: 999,
    });
    expect(result.length).toBeLessThanOrEqual(5);
  });
});
