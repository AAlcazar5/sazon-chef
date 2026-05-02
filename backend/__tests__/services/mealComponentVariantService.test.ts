// backend/__tests__/services/mealComponentVariantService.test.ts
// Group 10X-Deferred — MealComponentVariant tests.

import {
  listVariantsForComponent,
  getCompatibleVariants,
  computeVariantMacros,
} from '../../src/services/mealComponentVariantService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeAll(() => {
  if (!mockPrisma.mealComponentVariant) {
    mockPrisma.mealComponentVariant = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    };
  }
});

beforeEach(() => {
  jest.clearAllMocks();
});

const buildVariant = (overrides: Partial<any> = {}) => ({
  id: 'v1',
  componentId: 'c1',
  variantKey: 'roasted',
  displayName: 'Roasted Carrots',
  cookTimeMinutes: 25,
  caloriePerPortionDelta: 30,
  equipmentNeeded: 'oven',
  flavorProfile: 'sweet,charred',
  compatibilityScores: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('mealComponentVariantService.listVariantsForComponent', () => {
  it('returns variants for a component', async () => {
    const variants = [
      buildVariant({ id: 'v1', variantKey: 'roasted' }),
      buildVariant({ id: 'v2', variantKey: 'steamed', displayName: 'Steamed Carrots' }),
    ];
    mockPrisma.mealComponentVariant.findMany.mockResolvedValueOnce(variants);

    const result = await listVariantsForComponent('c1');

    expect(result).toHaveLength(2);
    expect(result.map((v) => v.variantKey)).toEqual(['roasted', 'steamed']);
    expect(mockPrisma.mealComponentVariant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { componentId: 'c1' } })
    );
  });

  it('returns an empty list when the component has no variants', async () => {
    mockPrisma.mealComponentVariant.findMany.mockResolvedValueOnce([]);

    const result = await listVariantsForComponent('c1');

    expect(result).toEqual([]);
  });

  it('returns [] when componentId is not found (prisma returns empty)', async () => {
    mockPrisma.mealComponentVariant.findMany.mockResolvedValueOnce([]);

    const result = await listVariantsForComponent('does-not-exist');

    expect(result).toEqual([]);
  });
});

describe('mealComponentVariantService.getCompatibleVariants', () => {
  it('sorts variants by compatibility against a single locked protein (highest first)', async () => {
    const variants = [
      buildVariant({
        id: 'v-raw',
        variantKey: 'raw',
        displayName: 'Raw Carrot Ribbons',
        compatibilityScores: JSON.stringify({ 'protein-chimi': 0.5 }),
      }),
      buildVariant({
        id: 'v-charred',
        variantKey: 'charred',
        displayName: 'Charred Carrots',
        compatibilityScores: JSON.stringify({ 'protein-chimi': 0.9 }),
      }),
      buildVariant({
        id: 'v-pickled',
        variantKey: 'pickled',
        displayName: 'Pickled Carrots',
        compatibilityScores: JSON.stringify({ 'protein-chimi': 0.7 }),
      }),
    ];
    mockPrisma.mealComponentVariant.findMany.mockResolvedValueOnce(variants);

    const result = await getCompatibleVariants('c1', [
      { slot: 'protein', componentId: 'protein-chimi' },
    ]);

    expect(result.map((r) => r.variant.id)).toEqual(['v-charred', 'v-pickled', 'v-raw']);
    expect(result[0].compatibilityScore).toBe(0.9);
    expect(result[1].compatibilityScore).toBe(0.7);
    expect(result[2].compatibilityScore).toBe(0.5);
  });

  it('tie-breaks by displayName alphabetically when scores are equal', async () => {
    const variants = [
      buildVariant({
        id: 'v-zucchini',
        displayName: 'Zucchini Style',
        compatibilityScores: JSON.stringify({ p1: 0.7 }),
      }),
      buildVariant({
        id: 'v-apple',
        displayName: 'Apple Style',
        compatibilityScores: JSON.stringify({ p1: 0.7 }),
      }),
    ];
    mockPrisma.mealComponentVariant.findMany.mockResolvedValueOnce(variants);

    const result = await getCompatibleVariants('c1', [
      { slot: 'protein', componentId: 'p1' },
    ]);

    expect(result[0].variant.displayName).toBe('Apple Style');
    expect(result[1].variant.displayName).toBe('Zucchini Style');
  });

  it('defaults to neutral 0.5 when a variant has no compatibilityScores entry for the locked component', async () => {
    const variants = [
      buildVariant({
        id: 'v-no-scores',
        compatibilityScores: null,
      }),
    ];
    mockPrisma.mealComponentVariant.findMany.mockResolvedValueOnce(variants);

    const result = await getCompatibleVariants('c1', [
      { slot: 'protein', componentId: 'p1' },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].compatibilityScore).toBe(0.5);
  });

  it('averages compatibility scores across multiple locked slots', async () => {
    const variants = [
      buildVariant({
        id: 'v-a',
        compatibilityScores: JSON.stringify({ 'p1': 0.8, 's1': 0.4 }),
      }),
    ];
    mockPrisma.mealComponentVariant.findMany.mockResolvedValueOnce(variants);

    const result = await getCompatibleVariants('c1', [
      { slot: 'protein', componentId: 'p1' },
      { slot: 'sauce', componentId: 's1' },
    ]);

    expect(result[0].compatibilityScore).toBeCloseTo(0.6, 5);
  });

  it('falls back to neutral 0.5 for every locked slot lacking a score entry', async () => {
    const variants = [
      buildVariant({
        id: 'v-empty',
        compatibilityScores: JSON.stringify({}),
      }),
    ];
    mockPrisma.mealComponentVariant.findMany.mockResolvedValueOnce(variants);

    const result = await getCompatibleVariants('c1', [
      { slot: 'protein', componentId: 'p1' },
      { slot: 'sauce', componentId: 's1' },
    ]);

    expect(result[0].compatibilityScore).toBe(0.5);
  });

  it('returns [] when the component has no variants', async () => {
    mockPrisma.mealComponentVariant.findMany.mockResolvedValueOnce([]);

    const result = await getCompatibleVariants('c1', [
      { slot: 'protein', componentId: 'p1' },
    ]);

    expect(result).toEqual([]);
  });

  it('returns neutral 0.5 when no slots are locked', async () => {
    const variants = [
      buildVariant({ id: 'v-a', compatibilityScores: JSON.stringify({ p1: 0.9 }) }),
    ];
    mockPrisma.mealComponentVariant.findMany.mockResolvedValueOnce(variants);

    const result = await getCompatibleVariants('c1', []);

    expect(result).toHaveLength(1);
    expect(result[0].compatibilityScore).toBe(0.5);
  });

  it('treats malformed compatibilityScores JSON as empty (graceful fallback)', async () => {
    const variants = [
      buildVariant({ id: 'v-bad', compatibilityScores: 'not-json' }),
      buildVariant({ id: 'v-array', compatibilityScores: JSON.stringify([1, 2, 3]) }),
    ];
    mockPrisma.mealComponentVariant.findMany.mockResolvedValueOnce(variants);

    const result = await getCompatibleVariants('c1', [
      { slot: 'protein', componentId: 'p1' },
    ]);

    expect(result).toHaveLength(2);
    for (const r of result) {
      expect(r.compatibilityScore).toBe(0.5);
    }
  });
});

describe('mealComponentVariantService.computeVariantMacros', () => {
  const baseComponent = {
    caloriesPerPortion: 100,
    proteinG: 5,
    carbsG: 20,
    fatG: 1,
  };

  it('adds positive caloriePerPortionDelta to base calories', () => {
    const variant = buildVariant({ caloriePerPortionDelta: 50 });

    const result = computeVariantMacros(baseComponent, variant);

    expect(result.calories).toBe(150);
    expect(result.protein).toBe(5);
    expect(result.carbs).toBe(20);
    expect(result.fat).toBe(1);
  });

  it('subtracts negative caloriePerPortionDelta from base calories', () => {
    const variant = buildVariant({ caloriePerPortionDelta: -30 });

    const result = computeVariantMacros(baseComponent, variant);

    expect(result.calories).toBe(70);
  });

  it('clamps calories to 0 when delta drives the total below zero', () => {
    const variant = buildVariant({ caloriePerPortionDelta: -500 });

    const result = computeVariantMacros(baseComponent, variant);

    expect(result.calories).toBe(0);
  });

  it('leaves protein, carbs, and fat unchanged from the base component', () => {
    const variant = buildVariant({ caloriePerPortionDelta: 75 });

    const result = computeVariantMacros(baseComponent, variant);

    expect(result.protein).toBe(baseComponent.proteinG);
    expect(result.carbs).toBe(baseComponent.carbsG);
    expect(result.fat).toBe(baseComponent.fatG);
  });
});
