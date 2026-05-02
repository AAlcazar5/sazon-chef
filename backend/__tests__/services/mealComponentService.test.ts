// backend/__tests__/services/mealComponentService.test.ts
// Group 10X Phase 1 — Build-a-Plate backend service tests.

import {
  listComponents,
  saveComposedPlate,
  computePantryCoverage,
} from '../../src/services/mealComponentService';
import { MEAL_COMPONENT_SEED, SEED_SLOT_COUNTS } from '../../src/services/mealComponentSeedData';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeAll(() => {
  if (!mockPrisma.mealComponent) {
    mockPrisma.mealComponent = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    };
  }
  if (!mockPrisma.composedPlate) {
    mockPrisma.composedPlate = {
      create: jest.fn(),
      update: jest.fn(),
    };
  }
});

beforeEach(() => {
  jest.clearAllMocks();
});

const buildComponent = (overrides: Partial<any> = {}) => ({
  id: 'c1',
  slot: 'protein',
  name: 'Salmon',
  description: null,
  defaultPortionGrams: 150,
  caloriesPerPortion: 280,
  proteinG: 30,
  carbsG: 0,
  fatG: 18,
  fiberG: 0,
  estimatedCostPerPortion: 4.5,
  cuisineTags: JSON.stringify(['Mediterranean']),
  dietaryTags: JSON.stringify(['gluten_free', 'high_protein']),
  cookMethodHint: 'pan_sear',
  pantryIngredientNames: JSON.stringify(['salmon', 'olive oil', 'lemon']),
  imageUrl: null,
  isUserCreated: false,
  userId: null,
  createdAt: new Date(),
  ...overrides,
});

describe('mealComponentService.computePantryCoverage', () => {
  it('returns 66.7% when 2/3 ingredients match the pantry', () => {
    const coverage = computePantryCoverage(
      ['salmon', 'olive oil', 'lemon'],
      ['salmon', 'olive oil', 'butter']
    );
    expect(coverage).toBeCloseTo(66.7, 1);
  });

  it('returns 0% when the pantry is empty', () => {
    const coverage = computePantryCoverage(['salmon', 'olive oil', 'lemon'], []);
    expect(coverage).toBe(0);
  });

  it('returns 100% when every ingredient is in pantry', () => {
    const coverage = computePantryCoverage(['rice'], ['rice', 'salt']);
    expect(coverage).toBe(100);
  });

  it('is case-insensitive when matching', () => {
    const coverage = computePantryCoverage(['Salmon'], ['salmon']);
    expect(coverage).toBe(100);
  });

  it('returns 0 for components with no pantry ingredients (avoids NaN)', () => {
    const coverage = computePantryCoverage([], ['salmon']);
    expect(coverage).toBe(0);
  });
});

describe('mealComponentService.listComponents', () => {
  it('passes slot filter to prisma where clause', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValueOnce([]);
    mockPrisma.pantryItem.findMany.mockResolvedValueOnce([]);

    await listComponents({ userId: 'u1', slot: 'protein' });

    expect(mockPrisma.mealComponent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ slot: 'protein' }) })
    );
  });

  it('filters by dietary tag (JSON contains)', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValueOnce([
      buildComponent({ id: 'a', dietaryTags: JSON.stringify(['vegan']) }),
      buildComponent({ id: 'b', dietaryTags: JSON.stringify(['gluten_free']) }),
    ]);
    mockPrisma.pantryItem.findMany.mockResolvedValueOnce([]);

    const result = await listComponents({ userId: 'u1', dietary: 'vegan' });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('filters by cuisine tag', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValueOnce([
      buildComponent({ id: 'a', cuisineTags: JSON.stringify(['Mediterranean']) }),
      buildComponent({ id: 'b', cuisineTags: JSON.stringify(['Asian']) }),
    ]);
    mockPrisma.pantryItem.findMany.mockResolvedValueOnce([]);

    const result = await listComponents({ userId: 'u1', cuisine: 'Asian' });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
  });

  it('text search matches name (case-insensitive)', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValueOnce([
      buildComponent({ id: 'a', name: 'Salmon' }),
      buildComponent({ id: 'b', name: 'Chicken Thigh' }),
    ]);
    mockPrisma.pantryItem.findMany.mockResolvedValueOnce([]);

    const result = await listComponents({ userId: 'u1', q: 'salm' });

    expect(result.map((c: any) => c.id)).toEqual(['a']);
  });

  it('attaches pantryCoveragePercent for each component using user pantry', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValueOnce([
      buildComponent({ pantryIngredientNames: JSON.stringify(['salmon', 'lemon']) }),
    ]);
    mockPrisma.pantryItem.findMany.mockResolvedValueOnce([{ name: 'salmon' }]);

    const result = await listComponents({ userId: 'u1' });

    expect(result[0].pantryCoveragePercent).toBe(50);
  });

  it('combines slot + dietary + cuisine + q filters together', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValueOnce([
      buildComponent({
        id: 'match',
        slot: 'sauce',
        name: 'Chimichurri',
        cuisineTags: JSON.stringify(['South American']),
        dietaryTags: JSON.stringify(['vegan', 'gluten_free']),
      }),
      buildComponent({
        id: 'wrong-cuisine',
        slot: 'sauce',
        name: 'Chimichurri Italian',
        cuisineTags: JSON.stringify(['Italian']),
        dietaryTags: JSON.stringify(['vegan']),
      }),
    ]);
    mockPrisma.pantryItem.findMany.mockResolvedValueOnce([]);

    const result = await listComponents({
      userId: 'u1',
      slot: 'sauce',
      dietary: 'vegan',
      cuisine: 'South American',
      q: 'chimi',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('match');
  });
});

describe('mealComponentService.saveComposedPlate', () => {
  const protein = buildComponent({
    id: 'p1',
    slot: 'protein',
    name: 'Salmon',
    caloriesPerPortion: 200,
    proteinG: 25,
    carbsG: 0,
    fatG: 12,
    estimatedCostPerPortion: 4,
    pantryIngredientNames: JSON.stringify(['salmon', 'olive oil']),
    cookMethodHint: 'pan_sear',
  });
  const base = buildComponent({
    id: 'b1',
    slot: 'base',
    name: 'Brown Rice',
    caloriesPerPortion: 200,
    proteinG: 5,
    carbsG: 40,
    fatG: 1,
    estimatedCostPerPortion: 1,
    pantryIngredientNames: JSON.stringify(['brown rice']),
    cookMethodHint: 'simmer',
  });

  it('totals macros = sum of components × portion multiplier', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValueOnce([protein, base]);
    mockPrisma.pantryItem.findMany.mockResolvedValueOnce([{ name: 'salmon' }]);
    mockPrisma.composedPlate.create.mockImplementationOnce(({ data }: any) =>
      Promise.resolve({ id: 'plate-1', ...data })
    );

    const result = await saveComposedPlate({
      userId: 'u1',
      components: [
        { slot: 'protein', componentId: 'p1', portionMultiplier: 2 },
        { slot: 'base', componentId: 'b1', portionMultiplier: 1 },
      ],
      saveAsRecipe: false,
    });

    expect(result.plate.totalCalories).toBe(200 * 2 + 200);
    expect(result.plate.totalProtein).toBe(25 * 2 + 5);
    expect(result.plate.totalCarbs).toBe(0 * 2 + 40);
    expect(result.plate.totalFat).toBe(12 * 2 + 1);
    expect(result.plate.totalCost).toBe(4 * 2 + 1);
    expect(result.recipe).toBeUndefined();
  });

  it('throws when components array is empty', async () => {
    await expect(
      saveComposedPlate({ userId: 'u1', components: [], saveAsRecipe: false })
    ).rejects.toThrow(/at least one component/i);
  });

  it('throws when a referenced component does not exist', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValueOnce([]);

    await expect(
      saveComposedPlate({
        userId: 'u1',
        components: [{ slot: 'protein', componentId: 'missing', portionMultiplier: 1 }],
        saveAsRecipe: false,
      })
    ).rejects.toThrow(/component/i);
  });

  it('computes pantryCoveragePercent across the plate (union of all component ingredients)', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValueOnce([protein, base]);
    mockPrisma.pantryItem.findMany.mockResolvedValueOnce([
      { name: 'salmon' },
      { name: 'olive oil' },
    ]);
    mockPrisma.composedPlate.create.mockImplementationOnce(({ data }: any) =>
      Promise.resolve({ id: 'plate-1', ...data })
    );

    const result = await saveComposedPlate({
      userId: 'u1',
      components: [
        { slot: 'protein', componentId: 'p1', portionMultiplier: 1 },
        { slot: 'base', componentId: 'b1', portionMultiplier: 1 },
      ],
      saveAsRecipe: false,
    });

    expect(result.plate.pantryCoveragePercent).toBeCloseTo(66.7, 1);
  });

  it('saveAsRecipe: true creates a Recipe with source=user-composed and adds to cookbook', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValueOnce([protein, base]);
    mockPrisma.pantryItem.findMany.mockResolvedValueOnce([]);
    mockPrisma.composedPlate.create.mockImplementationOnce(({ data }: any) =>
      Promise.resolve({ id: 'plate-1', ...data })
    );
    mockPrisma.recipe.create.mockImplementationOnce(({ data }: any) =>
      Promise.resolve({
        id: 'recipe-1',
        ...data,
        ingredients: [],
        instructions: [],
      })
    );
    mockPrisma.savedRecipe.upsert.mockResolvedValueOnce({ id: 'sr-1' });
    mockPrisma.composedPlate.update.mockResolvedValueOnce({});

    const result = await saveComposedPlate({
      userId: 'u1',
      components: [
        { slot: 'protein', componentId: 'p1', portionMultiplier: 1 },
        { slot: 'base', componentId: 'b1', portionMultiplier: 1 },
      ],
      saveAsRecipe: true,
    });

    expect(result.recipe).toBeDefined();
    expect(mockPrisma.recipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'u1',
          isUserCreated: true,
          source: 'user-composed',
        }),
      })
    );
    expect(mockPrisma.savedRecipe.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ userId: 'u1', recipeId: 'recipe-1' }),
      })
    );
  });

  it('auto-generates a plate name when none provided', async () => {
    mockPrisma.mealComponent.findMany.mockResolvedValueOnce([protein, base]);
    mockPrisma.pantryItem.findMany.mockResolvedValueOnce([]);
    mockPrisma.composedPlate.create.mockImplementationOnce(({ data }: any) =>
      Promise.resolve({ id: 'plate-1', ...data })
    );

    const result = await saveComposedPlate({
      userId: 'u1',
      components: [
        { slot: 'protein', componentId: 'p1', portionMultiplier: 1 },
        { slot: 'base', componentId: 'b1', portionMultiplier: 1 },
      ],
      saveAsRecipe: false,
    });

    expect(result.plate.name).toMatch(/Salmon.*Brown Rice/);
  });
});

describe('seed integrity', () => {
  it('contains the spec-mandated component counts (25 / 15 / 50 / 25 / 10 = 125)', () => {
    expect(SEED_SLOT_COUNTS.protein).toBe(25);
    expect(SEED_SLOT_COUNTS.base).toBe(15);
    expect(SEED_SLOT_COUNTS.vegetable).toBe(50);
    expect(SEED_SLOT_COUNTS.sauce).toBe(25);
    expect(SEED_SLOT_COUNTS.garnish).toBe(10);
  });

  it('seed array contains 125 components matching slot counts', () => {
    const counts: Record<string, number> = {};
    for (const c of MEAL_COMPONENT_SEED) {
      counts[c.slot] = (counts[c.slot] || 0) + 1;
    }
    expect(counts.protein).toBe(25);
    expect(counts.base).toBe(15);
    expect(counts.vegetable).toBe(50);
    expect(counts.sauce).toBe(25);
    expect(counts.garnish).toBe(10);
    expect(MEAL_COMPONENT_SEED.length).toBe(125);
  });

  it('every seed row has stable id + parseable JSON tag arrays', () => {
    for (const c of MEAL_COMPONENT_SEED) {
      expect(c.id).toMatch(/^[a-z0-9_-]+$/);
      expect(() => JSON.parse(c.cuisineTags)).not.toThrow();
      expect(() => JSON.parse(c.dietaryTags)).not.toThrow();
      expect(() => JSON.parse(c.pantryIngredientNames)).not.toThrow();
      expect(JSON.parse(c.pantryIngredientNames).length).toBeGreaterThan(0);
      expect(c.caloriesPerPortion).toBeGreaterThan(0);
    }
  });
});
