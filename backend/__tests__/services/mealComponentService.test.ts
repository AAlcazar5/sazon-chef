// backend/__tests__/services/mealComponentService.test.ts
// Group 10X Phase 1+2 — Build-a-Plate backend service tests.

import {
  listComponents,
  saveComposedPlate,
  computePantryCoverage,
  generatePermutations,
  getPlateFromPantry,
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
  if (!mockPrisma.user) {
    mockPrisma.user = {
      findUnique: jest.fn(),
    };
  }
  if (!mockPrisma.slotAffinity) {
    mockPrisma.slotAffinity = {
      findMany: jest.fn(),
      aggregate: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
    };
  }
  if (!mockPrisma.pairAffinity) {
    mockPrisma.pairAffinity = {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
    };
  }
});

beforeEach(() => {
  jest.clearAllMocks();
  // Default stubs for affinity tables so P2 tests that don't set them up still pass
  if (mockPrisma.slotAffinity) {
    mockPrisma.slotAffinity.findMany.mockResolvedValue([]);
    mockPrisma.slotAffinity.aggregate.mockResolvedValue({ _sum: { sampleCount: 0 } });
  }
  if (mockPrisma.pairAffinity) {
    mockPrisma.pairAffinity.findMany.mockResolvedValue([]);
  }
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

describe('mealComponentService.generatePermutations', () => {
  const makeDbComponent = (id: string, slot: string, cuisines: string[], dietary: string[] = []) => ({
    id,
    slot,
    name: `Component-${id}`,
    description: null,
    defaultPortionGrams: 150,
    caloriesPerPortion: 200,
    proteinG: 20,
    carbsG: 10,
    fatG: 5,
    fiberG: 2,
    estimatedCostPerPortion: 2,
    cuisineTags: JSON.stringify(cuisines),
    dietaryTags: JSON.stringify(dietary),
    cookMethodHint: 'pan_sear',
    pantryIngredientNames: JSON.stringify(['ingredient-a']),
    imageUrl: null,
    isUserCreated: false,
    userId: null,
    createdAt: new Date(),
  });

  const proteinKorean = makeDbComponent('p-korean', 'protein', ['Korean', 'Asian']);
  const proteinArgentinian = makeDbComponent('p-arg', 'protein', ['Argentinian', 'South American']);
  const proteinMed = makeDbComponent('p-med', 'protein', ['Mediterranean']);
  const sauceMed = makeDbComponent('s-med', 'sauce', ['Mediterranean']);
  const sauceKorean = makeDbComponent('s-korean', 'sauce', ['Korean', 'Asian']);

  const veganProtein = makeDbComponent('p-vegan', 'protein', ['Asian'], ['vegan', 'vegetarian']);
  const nonVeganProtein = makeDbComponent('p-nonvegan', 'protein', ['Mediterranean'], ['gluten_free']);

  beforeEach(() => {
    mockPrisma.mealComponent.findMany.mockReset();
    mockPrisma.pantryItem.findMany.mockReset();
    mockPrisma.user.findUnique.mockReset();
  });

  it('respects locked slots — locked componentId appears in every permutation', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.pantryItem.findMany.mockResolvedValueOnce([]);
    mockPrisma.mealComponent.findMany
      .mockResolvedValueOnce([sauceMed, sauceKorean])  // slotsToFill: sauce
      .mockResolvedValueOnce([proteinMed]);  // lookup for locked component p-med

    const result = await generatePermutations({
      userId: 'u1',
      lockedSlots: [{ slot: 'protein', componentId: 'p-med' }],
      slotsToFill: ['sauce'],
      maxResults: 10,
      prioritizePantry: false,
    });

    for (const perm of result) {
      const proteinSlot = perm.components.find((c) => c.slot === 'protein');
      expect(proteinSlot?.component.id).toBe('p-med');
    }
  });

  it('rejects permutations where components clash (kimchi/Korean + chimichurri/Argentinian)', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.pantryItem.findMany.mockResolvedValueOnce([]);
    mockPrisma.mealComponent.findMany
      .mockResolvedValueOnce([sauceMed, makeDbComponent('s-arg', 'sauce', ['Argentinian', 'South American'])])
      .mockResolvedValueOnce([proteinKorean]);  // lookup for locked component p-korean

    const result = await generatePermutations({
      userId: 'u1',
      lockedSlots: [{ slot: 'protein', componentId: 'p-korean' }],
      slotsToFill: ['sauce'],
      maxResults: 10,
      prioritizePantry: false,
    });

    for (const perm of result) {
      const sauceSlot = perm.components.find((c) => c.slot === 'sauce');
      expect(sauceSlot?.component.id).not.toBe('s-arg');
    }
  });

  it('dietary filter excludes non-vegan components when user requires vegan', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      preferences: {
        dietaryRestrictions: [{ name: 'vegan', severity: 'strict' }],
      },
      macroGoals: null,
    });
    mockPrisma.pantryItem.findMany.mockResolvedValueOnce([]);
    // No locked slots — no initial findMany for locked components
    mockPrisma.mealComponent.findMany
      .mockResolvedValueOnce([veganProtein, nonVeganProtein]);

    const result = await generatePermutations({
      userId: 'u1',
      lockedSlots: [],
      slotsToFill: ['protein'],
      maxResults: 10,
      prioritizePantry: false,
    });

    for (const perm of result) {
      const proteinSlot = perm.components.find((c) => c.slot === 'protein');
      expect(proteinSlot?.component.id).toBe('p-vegan');
    }
  });

  it('returns at most maxResults permutations', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.pantryItem.findMany.mockResolvedValueOnce([]);
    mockPrisma.mealComponent.findMany
      .mockResolvedValueOnce([proteinMed, proteinKorean, proteinArgentinian]);

    const result = await generatePermutations({
      userId: 'u1',
      lockedSlots: [],
      slotsToFill: ['protein'],
      maxResults: 2,
      prioritizePantry: false,
    });

    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('each permutation has a coherenceScore and pantryCoveragePercent', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.pantryItem.findMany.mockResolvedValueOnce([]);
    mockPrisma.mealComponent.findMany
      .mockResolvedValueOnce([proteinMed]);

    const result = await generatePermutations({
      userId: 'u1',
      lockedSlots: [],
      slotsToFill: ['protein'],
      maxResults: 5,
      prioritizePantry: false,
    });

    expect(result.length).toBeGreaterThan(0);
    for (const perm of result) {
      expect(typeof perm.coherenceScore).toBe('number');
      expect(typeof perm.pantryCoveragePercent).toBe('number');
    }
  });
});

describe('mealComponentService.getPlateFromPantry', () => {
  const makeDbComponent = (id: string, slot: string, ingredients: string[], cuisines: string[] = ['Mediterranean']) => ({
    id,
    slot,
    name: `Component-${id}`,
    description: null,
    defaultPortionGrams: 150,
    caloriesPerPortion: 200,
    proteinG: 20,
    carbsG: 10,
    fatG: 5,
    fiberG: 2,
    estimatedCostPerPortion: 2,
    cuisineTags: JSON.stringify(cuisines),
    dietaryTags: JSON.stringify([]),
    cookMethodHint: 'pan_sear',
    pantryIngredientNames: JSON.stringify(ingredients),
    imageUrl: null,
    isUserCreated: false,
    userId: null,
    createdAt: new Date(),
  });

  beforeEach(() => {
    mockPrisma.mealComponent.findMany.mockReset();
    mockPrisma.pantryItem.findMany.mockReset();
    mockPrisma.user.findUnique.mockReset();
  });

  it('returns null when pantry is empty', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.pantryItem.findMany.mockResolvedValueOnce([]);
    mockPrisma.mealComponent.findMany.mockResolvedValue([]);

    const result = await getPlateFromPantry({ userId: 'u1' });
    expect(result).toBeNull();
  });

  it('returns a coherent plate when pantry contains a complete coherent set', async () => {
    const protein = makeDbComponent('p1', 'protein', ['salmon', 'olive oil']);
    const base = makeDbComponent('b1', 'base', ['brown rice', 'salt']);
    const veg = makeDbComponent('v1', 'vegetable', ['spinach', 'garlic']);
    const sauce = makeDbComponent('s1', 'sauce', ['greek yogurt', 'lemon']);

    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.pantryItem.findMany.mockResolvedValueOnce([
      { name: 'salmon' }, { name: 'olive oil' },
      { name: 'brown rice' }, { name: 'salt' },
      { name: 'spinach' }, { name: 'garlic' },
      { name: 'greek yogurt' }, { name: 'lemon' },
    ]);
    mockPrisma.mealComponent.findMany.mockImplementation(({ where }: any) => {
      const slot = where?.slot;
      if (slot === 'protein') return Promise.resolve([protein]);
      if (slot === 'base') return Promise.resolve([base]);
      if (slot === 'vegetable') return Promise.resolve([veg]);
      if (slot === 'sauce') return Promise.resolve([sauce]);
      return Promise.resolve([]);
    });

    const result = await getPlateFromPantry({ userId: 'u1' });

    expect(result).not.toBeNull();
    expect(result!.components).toHaveLength(4);
    expect(result!.pantryCoveragePercent).toBeGreaterThanOrEqual(80);
    expect(result!.coherenceScore).toBeGreaterThan(0);
  });

  it('is deterministic — same inputs return the same plate', async () => {
    const protein = makeDbComponent('p1', 'protein', ['salmon']);
    const base = makeDbComponent('b1', 'base', ['brown rice']);
    const veg = makeDbComponent('v1', 'vegetable', ['spinach']);
    const sauce = makeDbComponent('s1', 'sauce', ['lemon']);

    const setupMocks = () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.pantryItem.findMany.mockResolvedValueOnce([
        { name: 'salmon' }, { name: 'brown rice' },
        { name: 'spinach' }, { name: 'lemon' },
      ]);
      mockPrisma.mealComponent.findMany.mockImplementation(({ where }: any) => {
        const slot = where?.slot;
        if (slot === 'protein') return Promise.resolve([protein]);
        if (slot === 'base') return Promise.resolve([base]);
        if (slot === 'vegetable') return Promise.resolve([veg]);
        if (slot === 'sauce') return Promise.resolve([sauce]);
        return Promise.resolve([]);
      });
    };

    setupMocks();
    const result1 = await getPlateFromPantry({ userId: 'u1' });

    mockPrisma.user.findUnique.mockReset();
    mockPrisma.pantryItem.findMany.mockReset();
    mockPrisma.mealComponent.findMany.mockReset();

    setupMocks();
    const result2 = await getPlateFromPantry({ userId: 'u1' });

    expect(result1).not.toBeNull();
    expect(result2).not.toBeNull();
    expect(result1!.id).toBe(result2!.id);
    expect(result1!.components.map((c) => c.component.id)).toEqual(
      result2!.components.map((c) => c.component.id)
    );
  });
});

// ─── Phase 4: Affinity-weighted permutations ─────────────────────────────────

describe('mealComponentService.generatePermutations — affinity weighting (Phase 4)', () => {
  const makeDbComp = (id: string, slot: string, cuisines: string[] = ['Mediterranean']) => ({
    id,
    slot,
    name: `Component-${id}`,
    description: null,
    defaultPortionGrams: 150,
    caloriesPerPortion: 200,
    proteinG: 20,
    carbsG: 10,
    fatG: 5,
    fiberG: 2,
    estimatedCostPerPortion: 2,
    cuisineTags: JSON.stringify(cuisines),
    dietaryTags: JSON.stringify([]),
    cookMethodHint: 'pan_sear',
    pantryIngredientNames: JSON.stringify(['ingredient-a']),
    imageUrl: null,
    isUserCreated: false,
    userId: null,
    createdAt: new Date(),
  });

  beforeEach(() => {
    mockPrisma.mealComponent.findMany.mockReset();
    mockPrisma.pantryItem.findMany.mockReset();
    mockPrisma.user.findUnique.mockReset();
    if (mockPrisma.slotAffinity) {
      mockPrisma.slotAffinity.findMany = jest.fn();
      mockPrisma.slotAffinity.aggregate = jest.fn();
    } else {
      mockPrisma.slotAffinity = {
        findMany: jest.fn(),
        aggregate: jest.fn(),
        upsert: jest.fn(),
        findFirst: jest.fn(),
      };
    }
    if (!mockPrisma.pairAffinity) {
      mockPrisma.pairAffinity = {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
      };
    } else {
      mockPrisma.pairAffinity.findMany = jest.fn();
    }
  });

  it('below 10-sample threshold, ranking is unchanged from P2 baseline (no affinity weighting)', async () => {
    const pHigh = makeDbComp('p-high', 'protein');
    const pLow = makeDbComp('p-low', 'protein');

    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.pantryItem.findMany.mockResolvedValueOnce([]);
    mockPrisma.mealComponent.findMany.mockResolvedValueOnce([pHigh, pLow]);

    // Fewer than 10 total samples → affinity should not be applied
    mockPrisma.slotAffinity.findMany.mockResolvedValueOnce([
      { componentId: 'p-high', score: 2.0, sampleCount: 2 },
      { componentId: 'p-low', score: 0.0, sampleCount: 2 },
    ]);
    mockPrisma.slotAffinity.aggregate.mockResolvedValueOnce({ _sum: { sampleCount: 4 } });
    mockPrisma.pairAffinity.findMany.mockResolvedValueOnce([]);

    const result = await generatePermutations({
      userId: 'u1',
      lockedSlots: [],
      slotsToFill: ['protein'],
      maxResults: 10,
      prioritizePantry: false,
    });

    // With 4 total samples (< 10), both candidates should appear (order may be either way)
    expect(result.length).toBe(2);
  });

  it('above 10-sample threshold, candidate with high-affinity component ranks above equal-coherence candidate', async () => {
    // Two identical components except id; one has high affinity, other has low
    const pFavorite = makeDbComp('p-fav', 'protein');
    const pUnknown = makeDbComp('p-unk', 'protein');

    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.pantryItem.findMany.mockResolvedValueOnce([]);
    mockPrisma.mealComponent.findMany.mockResolvedValueOnce([pFavorite, pUnknown]);

    // 15 total samples → threshold met
    mockPrisma.slotAffinity.findMany.mockResolvedValueOnce([
      { componentId: 'p-fav', score: 1.5, sampleCount: 10 },
      { componentId: 'p-unk', score: 0.0, sampleCount: 5 },
    ]);
    mockPrisma.slotAffinity.aggregate.mockResolvedValueOnce({ _sum: { sampleCount: 15 } });
    mockPrisma.pairAffinity.findMany.mockResolvedValueOnce([]);

    const result = await generatePermutations({
      userId: 'u1',
      lockedSlots: [],
      slotsToFill: ['protein'],
      maxResults: 10,
      prioritizePantry: false,
    });

    expect(result.length).toBe(2);
    expect(result[0].components[0].component.id).toBe('p-fav');
  });

  it('pair affinity boosts candidates whose component pairs have high pair scores', async () => {
    const pA = makeDbComp('pA', 'protein');
    const pB = makeDbComp('pB', 'protein');
    const sX = makeDbComp('sX', 'sauce');

    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.pantryItem.findMany.mockResolvedValueOnce([]);
    mockPrisma.mealComponent.findMany
      .mockResolvedValueOnce([pA, pB])   // protein slot
      .mockResolvedValueOnce([sX]);      // sauce slot

    // 20 total samples → pair affinity applies
    mockPrisma.slotAffinity.findMany.mockResolvedValueOnce([]);
    mockPrisma.slotAffinity.aggregate.mockResolvedValueOnce({ _sum: { sampleCount: 20 } });
    // pA + sX is a well-loved pair; pB + sX is novel
    mockPrisma.pairAffinity.findMany.mockResolvedValueOnce([
      { componentIdA: 'pA', componentIdB: 'sX', score: 1.8, sampleCount: 10 },
    ]);

    const result = await generatePermutations({
      userId: 'u1',
      lockedSlots: [],
      slotsToFill: ['protein', 'sauce'],
      maxResults: 10,
      prioritizePantry: false,
    });

    // The candidate containing pA should rank above the candidate containing pB
    const first = result[0].components.find((c) => c.slot === 'protein');
    expect(first?.component.id).toBe('pA');
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
