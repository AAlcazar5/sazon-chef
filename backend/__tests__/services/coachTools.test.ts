// Group 10Y Phase 3 + Phase 7: Coach tool-use bridge — read + write tool dispatcher tests.

const mockPantryFindMany = jest.fn();
const mockLeftoverFindMany = jest.fn();
const mockMacroGoalsFindUnique = jest.fn();
const mockMealHistoryFindMany = jest.fn();
const mockMealHistoryCreate = jest.fn();
const mockMealFindMany = jest.fn();
const mockUserPreferencesFindUnique = jest.fn();
const mockSavedRecipeFindMany = jest.fn();
const mockCookingLogFindMany = jest.fn();
const mockRecipeFindMany = jest.fn();
const mockRecipeFindUnique = jest.fn();
const mockMealComponentFindMany = jest.fn();
const mockComposedPlateFindUnique = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    pantryItem: { findMany: (...a: unknown[]) => mockPantryFindMany(...a) },
    leftoverInventory: {
      findMany: (...a: unknown[]) => mockLeftoverFindMany(...a),
    },
    macroGoals: {
      findUnique: (...a: unknown[]) => mockMacroGoalsFindUnique(...a),
    },
    mealHistory: {
      findMany: (...a: unknown[]) => mockMealHistoryFindMany(...a),
      create: (...a: unknown[]) => mockMealHistoryCreate(...a),
    },
    meal: { findMany: (...a: unknown[]) => mockMealFindMany(...a) },
    userPreferences: {
      findUnique: (...a: unknown[]) => mockUserPreferencesFindUnique(...a),
    },
    savedRecipe: {
      findMany: (...a: unknown[]) => mockSavedRecipeFindMany(...a),
    },
    cookingLog: {
      findMany: (...a: unknown[]) => mockCookingLogFindMany(...a),
    },
    recipe: {
      findMany: (...a: unknown[]) => mockRecipeFindMany(...a),
      findUnique: (...a: unknown[]) => mockRecipeFindUnique(...a),
    },
    mealComponent: {
      findMany: (...a: unknown[]) => mockMealComponentFindMany(...a),
    },
    composedPlate: {
      findUnique: (...a: unknown[]) => mockComposedPlateFindUnique(...a),
    },
  },
}));

const mockSaveComposedPlate = jest.fn();
jest.mock('@/services/mealComponentService', () => ({
  saveComposedPlate: (...a: unknown[]) => mockSaveComposedPlate(...a),
  COMPONENT_SLOTS: ['protein', 'base', 'vegetable', 'sauce', 'garnish'] as const,
}));

const mockEmitAnalytics = jest.fn();
jest.mock('@/services/coachAnalytics', () => ({
  emit: (...a: unknown[]) => mockEmitAnalytics(...a),
}));

import {
  coachToolDefinitions,
  runCoachTool,
} from '../../src/services/coachTools';

const baseRecipe = {
  id: 'r1',
  title: 'Mediterranean Chicken Bowl',
  description: 'Bright lemon-herb chicken over rice',
  cookTime: 25,
  cuisine: 'Mediterranean',
  calories: 520,
  protein: 42,
  carbs: 38,
  fat: 18,
  fiber: 6,
  sugar: 4,
  ingredients: [
    { text: 'chicken thigh' },
    { text: 'olive oil' },
    { text: 'lemon' },
    { text: 'rice' },
  ],
  instructions: [{ text: 'cook' }],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPantryFindMany.mockResolvedValue([]);
  mockLeftoverFindMany.mockResolvedValue([]);
  mockMacroGoalsFindUnique.mockResolvedValue(null);
  mockMealHistoryFindMany.mockResolvedValue([]);
  mockMealFindMany.mockResolvedValue([]);
  mockUserPreferencesFindUnique.mockResolvedValue(null);
  mockSavedRecipeFindMany.mockResolvedValue([]);
  mockCookingLogFindMany.mockResolvedValue([]);
  mockRecipeFindMany.mockResolvedValue([]);
});

describe('coachToolDefinitions', () => {
  it('exposes the 6 tools (4 read + 2 write)', () => {
    expect(coachToolDefinitions).toHaveLength(6);
    const names = coachToolDefinitions.map((t) => t.name).sort();
    expect(names).toEqual([
      'compose_plate',
      'find_recipes',
      'get_pantry',
      'get_today_remaining_macros',
      'log_meal',
      'search_cookbook',
    ]);
  });

  it('write tool descriptions flag Pro-only and explicit-confirmation requirement', () => {
    const compose = coachToolDefinitions.find((t) => t.name === 'compose_plate');
    const log = coachToolDefinitions.find((t) => t.name === 'log_meal');
    expect(compose?.description?.toLowerCase()).toMatch(/pro/);
    expect(compose?.description?.toLowerCase()).toMatch(/confirm/);
    expect(log?.description?.toLowerCase()).toMatch(/pro/);
    expect(log?.description?.toLowerCase()).toMatch(/confirm/);
  });

  it('descriptions reference personalized rankings', () => {
    const findRecipes = coachToolDefinitions.find(
      (t) => t.name === 'find_recipes',
    );
    expect(findRecipes?.description?.toLowerCase()).toMatch(
      /personaliz|70\/30|affinity|ranking/,
    );
    const search = coachToolDefinitions.find(
      (t) => t.name === 'search_cookbook',
    );
    expect(search?.description?.toLowerCase()).toMatch(
      /personaliz|cooked|saved|rated/,
    );
  });
});

describe('runCoachTool: get_pantry', () => {
  it('returns Prisma rows scoped to the requesting user', async () => {
    mockPantryFindMany.mockResolvedValue([
      { id: 'p1', name: 'chicken thigh', category: 'protein' },
      { id: 'p2', name: 'lemon', category: 'produce' },
    ]);
    mockLeftoverFindMany.mockResolvedValue([
      {
        id: 'l1',
        componentId: 'c1',
        slot: 'protein',
        portionsRemaining: 2,
        expiresAt: new Date('2026-05-08T00:00:00Z'),
      },
    ]);

    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'get_pantry',
      input: {},
      tier: 'free',
    });

    expect(mockPantryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    );
    expect(mockLeftoverFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    );
    expect(result).toMatchObject({
      pantry: expect.any(Array),
      leftoverInventory: expect.any(Array),
    });
    const r = result as { pantry: Array<{ name: string }> };
    expect(r.pantry.map((p) => p.name)).toEqual(['chicken thigh', 'lemon']);
  });
});

describe('runCoachTool: get_today_remaining_macros', () => {
  it('subtracts today consumed macros from goals', async () => {
    mockMacroGoalsFindUnique.mockResolvedValue({
      userId: 'user-1',
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 70,
      fiber: 30,
    });
    mockMealFindMany.mockResolvedValue([
      { calories: 600, protein: 40, carbs: 60, fat: 20, fiber: 5 },
      { calories: 400, protein: 30, carbs: 30, fat: 15, fiber: 4 },
    ]);

    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'get_today_remaining_macros',
      input: {},
      tier: 'free',
    });

    const r = result as {
      remaining: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
    };
    expect(r.remaining.calories).toBe(1000);
    expect(r.remaining.protein).toBe(80);
    expect(r.remaining.carbs).toBe(110);
    expect(r.remaining.fat).toBe(35);
  });

  it('returns nulls when no goals set', async () => {
    mockMacroGoalsFindUnique.mockResolvedValue(null);

    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'get_today_remaining_macros',
      input: {},
      tier: 'free',
    });
    const r = result as { remaining: null };
    expect(r.remaining).toBeNull();
  });
});

describe('runCoachTool: find_recipes', () => {
  it('filters by cuisine and maxPrepMinutes; results carry personalization', async () => {
    mockRecipeFindMany.mockResolvedValue([
      baseRecipe,
      {
        ...baseRecipe,
        id: 'r2',
        title: 'Slow Italian Lasagna',
        cuisine: 'Italian',
        cookTime: 90,
      },
      {
        ...baseRecipe,
        id: 'r3',
        title: 'Quick Greek Salad',
        cuisine: 'Greek',
        cookTime: 10,
      },
    ]);
    mockUserPreferencesFindUnique.mockResolvedValue({
      id: 'pref-1',
      userId: 'user-1',
      cookTimePreference: 30,
      spiceLevel: 'medium',
      bannedIngredients: [],
      likedCuisines: [{ name: 'Mediterranean' }],
      dietaryRestrictions: [],
      preferredSuperfoods: [],
    });
    mockMacroGoalsFindUnique.mockResolvedValue({
      id: 'mg-1',
      userId: 'user-1',
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 70,
    });
    mockPantryFindMany.mockResolvedValue([
      { name: 'chicken thigh' },
      { name: 'olive oil' },
      { name: 'lemon' },
      { name: 'rice' },
    ]);

    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'find_recipes',
      input: {
        cuisines: ['Mediterranean', 'Greek'],
        maxPrepMinutes: 30,
      },
      tier: 'free',
    });

    const r = result as {
      recipes: Array<{
        id: string;
        title: string;
        cuisine: string;
        cookTime: number;
        personalization: {
          pantryCoverage: number;
          macroFit: 'green' | 'amber' | 'red';
          affinityScore: number;
        };
      }>;
    };

    expect(r.recipes.length).toBeGreaterThan(0);
    // Verify the Prisma query was built with cuisine + cookTime filters.
    expect(mockRecipeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          cuisine: { in: ['Mediterranean', 'Greek'] },
          cookTime: { lte: 30 },
        }),
      }),
    );
    // All returned items carry the personalization envelope
    for (const rec of r.recipes) {
      expect(rec.personalization.pantryCoverage).toBeGreaterThanOrEqual(0);
      expect(rec.personalization.pantryCoverage).toBeLessThanOrEqual(1);
      expect(['green', 'amber', 'red']).toContain(
        rec.personalization.macroFit,
      );
      expect(typeof rec.personalization.affinityScore).toBe('number');
    }
    // Mediterranean recipe has full pantry coverage
    const med = r.recipes.find((x) => x.id === 'r1');
    expect(med?.personalization.pantryCoverage).toBe(1);
  });

  it('returns empty list when no recipes match filters', async () => {
    mockRecipeFindMany.mockResolvedValue([]);
    mockUserPreferencesFindUnique.mockResolvedValue(null);
    mockMacroGoalsFindUnique.mockResolvedValue(null);
    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'find_recipes',
      input: { cuisines: ['Martian'] },
      tier: 'free',
    });
    const r = result as { recipes: unknown[] };
    expect(r.recipes).toEqual([]);
  });
});

describe('runCoachTool: search_cookbook', () => {
  it('boosts recently-cooked + 4-star+ rated recipes in the ranking', async () => {
    const old = new Date('2025-01-01T00:00:00Z');
    const recent = new Date('2026-05-01T00:00:00Z');

    // Three saved recipes; r2 is recently cooked, r3 has 5-star rating, r1 is plain
    mockSavedRecipeFindMany.mockResolvedValue([
      {
        id: 's1',
        recipeId: 'r1',
        userId: 'user-1',
        savedDate: old,
        rating: null,
        recipe: { ...baseRecipe, id: 'r1', title: 'Plain Chicken' },
      },
      {
        id: 's2',
        recipeId: 'r2',
        userId: 'user-1',
        savedDate: old,
        rating: null,
        recipe: { ...baseRecipe, id: 'r2', title: 'Chicken Recently Cooked' },
      },
      {
        id: 's3',
        recipeId: 'r3',
        userId: 'user-1',
        savedDate: old,
        rating: 5,
        recipe: { ...baseRecipe, id: 'r3', title: 'Chicken Highly Rated' },
      },
    ]);
    mockCookingLogFindMany.mockResolvedValue([
      { recipeId: 'r2', cookedAt: recent },
    ]);
    mockUserPreferencesFindUnique.mockResolvedValue(null);
    mockMacroGoalsFindUnique.mockResolvedValue(null);
    mockPantryFindMany.mockResolvedValue([]);

    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'search_cookbook',
      input: { query: 'chicken' },
      tier: 'free',
    });

    const r = result as { recipes: Array<{ id: string }> };
    expect(r.recipes.length).toBe(3);
    // The plain (no boost) recipe should rank below the boosted ones
    const ids = r.recipes.map((x) => x.id);
    expect(ids.indexOf('r1')).toBeGreaterThan(ids.indexOf('r2'));
    expect(ids.indexOf('r1')).toBeGreaterThan(ids.indexOf('r3'));
  });

  it('returns empty list when no cookbook matches the query', async () => {
    mockSavedRecipeFindMany.mockResolvedValue([]);
    mockCookingLogFindMany.mockResolvedValue([]);

    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'search_cookbook',
      input: { query: 'pizza' },
      tier: 'free',
    });
    const r = result as { recipes: unknown[] };
    expect(r.recipes).toEqual([]);
  });
});

describe('runCoachTool: tier gating', () => {
  it('all 4 read-only tools run on free tier', async () => {
    mockPantryFindMany.mockResolvedValue([]);
    mockLeftoverFindMany.mockResolvedValue([]);
    mockMacroGoalsFindUnique.mockResolvedValue(null);
    mockMealFindMany.mockResolvedValue([]);
    mockSavedRecipeFindMany.mockResolvedValue([]);
    mockCookingLogFindMany.mockResolvedValue([]);
    mockRecipeFindMany.mockResolvedValue([]);
    mockUserPreferencesFindUnique.mockResolvedValue(null);

    const names = ['get_pantry', 'get_today_remaining_macros', 'find_recipes', 'search_cookbook'] as const;
    for (const name of names) {
      await expect(
        runCoachTool({
          userId: 'user-1',
          name,
          input: name === 'search_cookbook' ? { query: 'x' } : {},
          tier: 'free',
        }),
      ).resolves.toBeDefined();
    }
  });

  it('rejects unknown tool names', async () => {
    await expect(
      runCoachTool({
        userId: 'user-1',
        name: 'unknown_tool' as never,
        input: {},
        tier: 'premium',
      }),
    ).rejects.toThrow();
  });
});

describe('runCoachTool: compose_plate (write, Pro-only)', () => {
  beforeEach(() => {
    mockSaveComposedPlate.mockReset();
    mockMealComponentFindMany.mockReset();
    mockMealComponentFindMany.mockResolvedValue([]);
  });

  it('happy path — composes plate and returns plateId/macros/pantryCoverage/allergenSafe', async () => {
    mockMealComponentFindMany.mockResolvedValue([
      { id: 'c1', slot: 'protein', name: 'Grilled Chicken', pantryIngredientNames: '["chicken thigh"]', cuisineTags: '[]', dietaryTags: '[]' },
    ]);
    mockUserPreferencesFindUnique.mockResolvedValue({
      id: 'pref-1',
      userId: 'user-1',
      cookTimePreference: 30,
      bannedIngredients: [],
      likedCuisines: [],
      dietaryRestrictions: [],
      preferredSuperfoods: [],
    });
    mockSaveComposedPlate.mockResolvedValue({
      plate: {
        id: 'plate-1',
        totalCalories: 520,
        totalProtein: 42,
        totalCarbs: 38,
        totalFat: 18,
        pantryCoveragePercent: 80,
      },
    });

    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'compose_plate',
      input: {
        slots: [{ slot: 'protein', componentId: 'c1' }],
        servings: 1,
      },
      tier: 'premium',
    });

    expect(mockSaveComposedPlate).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      plateId: 'plate-1',
      totalMacros: { calories: 520, protein: 42, carbs: 38, fat: 18 },
      pantryCoverage: 80,
      allergenSafe: true,
      slots: expect.any(Array),
    });
  });

  it('resolves a slot query string into a componentId via mealComponent lookup', async () => {
    mockMealComponentFindMany.mockResolvedValueOnce([
      { id: 'c1', slot: 'protein', name: 'Grilled Chicken', pantryIngredientNames: '[]', cuisineTags: '[]', dietaryTags: '[]' },
    ]);
    mockUserPreferencesFindUnique.mockResolvedValue(null);
    mockSaveComposedPlate.mockResolvedValue({
      plate: {
        id: 'plate-1',
        totalCalories: 100,
        totalProtein: 10,
        totalCarbs: 5,
        totalFat: 2,
        pantryCoveragePercent: 0,
      },
    });

    await runCoachTool({
      userId: 'user-1',
      name: 'compose_plate',
      input: {
        slots: [{ slot: 'protein', query: 'chicken' }],
      },
      tier: 'premium',
    });

    const composeArgs = mockSaveComposedPlate.mock.calls[0][0];
    expect(composeArgs.components[0].componentId).toBe('c1');
  });

  it('allergen violation — returns allergenSafe.violations and does NOT call composer', async () => {
    mockMealComponentFindMany.mockResolvedValue([
      {
        id: 'c1',
        slot: 'protein',
        name: 'Peanut Sauce Chicken',
        pantryIngredientNames: '["peanut", "chicken"]',
        cuisineTags: '[]',
        dietaryTags: '[]',
      },
    ]);
    mockUserPreferencesFindUnique.mockResolvedValue({
      id: 'pref-1',
      userId: 'user-1',
      cookTimePreference: 30,
      bannedIngredients: [{ name: 'peanut' }],
      likedCuisines: [],
      dietaryRestrictions: [],
      preferredSuperfoods: [],
    });

    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'compose_plate',
      input: { slots: [{ slot: 'protein', componentId: 'c1' }] },
      tier: 'premium',
    });

    const r = result as {
      allergenSafe: true | { violations: string[] };
    };
    expect(r.allergenSafe).not.toBe(true);
    if (r.allergenSafe !== true) {
      expect(r.allergenSafe.violations.length).toBeGreaterThan(0);
    }
    expect(mockSaveComposedPlate).not.toHaveBeenCalled();
  });
});

describe('runCoachTool: log_meal (write, Pro-only)', () => {
  beforeEach(() => {
    mockMealHistoryCreate.mockReset();
    mockRecipeFindUnique.mockReset();
    mockComposedPlateFindUnique.mockReset();
  });

  it('happy path — creates MealHistory row and returns macros/mealType', async () => {
    mockRecipeFindUnique.mockResolvedValue({
      id: 'r1',
      userId: 'user-1',
      title: 'Chicken Bowl',
      calories: 500,
      protein: 40,
      carbs: 30,
      fat: 20,
      ingredients: [{ text: 'chicken' }, { text: 'rice' }],
    });
    mockUserPreferencesFindUnique.mockResolvedValue(null);
    mockMealHistoryCreate.mockResolvedValue({
      id: 'mh-1',
      recipeId: 'r1',
      userId: 'user-1',
      date: new Date('2026-05-03T18:00:00Z'),
      consumed: true,
      feedback: null,
    });

    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'log_meal',
      input: {
        recipeId: 'r1',
        servings: 1,
        mealType: 'dinner',
        eatenAt: '2026-05-03T18:00:00Z',
      },
      tier: 'premium',
    });

    expect(mockMealHistoryCreate).toHaveBeenCalledTimes(1);
    const createArgs = mockMealHistoryCreate.mock.calls[0][0];
    expect(createArgs.data.userId).toBe('user-1');
    expect(createArgs.data.recipeId).toBe('r1');
    expect(createArgs.data.consumed).toBe(true);

    expect(result).toMatchObject({
      id: 'mh-1',
      totalCalories: 500,
      totalProtein: 40,
      totalCarbs: 30,
      totalFat: 20,
      mealType: 'dinner',
    });
  });

  it('scales macros by servings', async () => {
    mockRecipeFindUnique.mockResolvedValue({
      id: 'r1',
      userId: 'user-1',
      title: 'Chicken Bowl',
      calories: 500,
      protein: 40,
      carbs: 30,
      fat: 20,
      ingredients: [],
    });
    mockUserPreferencesFindUnique.mockResolvedValue(null);
    mockMealHistoryCreate.mockResolvedValue({
      id: 'mh-1',
      recipeId: 'r1',
      userId: 'user-1',
      date: new Date(),
      consumed: true,
      feedback: null,
    });

    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'log_meal',
      input: { recipeId: 'r1', servings: 2, mealType: 'lunch' },
      tier: 'premium',
    });

    expect(result).toMatchObject({
      totalCalories: 1000,
      totalProtein: 80,
    });
  });

  it('ownership 404 — recipe owned by another user → NOT_FOUND', async () => {
    mockRecipeFindUnique.mockResolvedValue({
      id: 'r1',
      userId: 'other-user',
      title: 'Other',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      ingredients: [],
    });
    mockUserPreferencesFindUnique.mockResolvedValue(null);

    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'log_meal',
      input: { recipeId: 'r1', servings: 1, mealType: 'dinner' },
      tier: 'premium',
    });

    expect(result).toMatchObject({ error: 'NOT_FOUND' });
    expect(mockMealHistoryCreate).not.toHaveBeenCalled();
  });

  it('allergen violation aborts log_meal write', async () => {
    mockRecipeFindUnique.mockResolvedValue({
      id: 'r1',
      userId: 'user-1',
      title: 'Peanut Bowl',
      calories: 500,
      protein: 40,
      carbs: 30,
      fat: 20,
      ingredients: [{ text: 'peanut sauce' }, { text: 'chicken' }],
    });
    mockUserPreferencesFindUnique.mockResolvedValue({
      id: 'pref-1',
      userId: 'user-1',
      cookTimePreference: 30,
      bannedIngredients: [{ name: 'peanut' }],
      likedCuisines: [],
      dietaryRestrictions: [],
      preferredSuperfoods: [],
    });

    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'log_meal',
      input: { recipeId: 'r1', servings: 1, mealType: 'dinner' },
      tier: 'premium',
    });

    expect(result).toMatchObject({
      error: 'ALLERGEN_VIOLATION',
      details: expect.any(Object),
    });
    expect(mockMealHistoryCreate).not.toHaveBeenCalled();
  });
});

describe('runCoachTool: tier gating for write tools', () => {
  beforeEach(() => {
    mockEmitAnalytics.mockReset();
    mockMealHistoryCreate.mockReset();
    mockSaveComposedPlate.mockReset();
  });

  it('free user calling log_meal returns PRO_FEATURE without persisting', async () => {
    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'log_meal',
      input: { recipeId: 'r1', servings: 1, mealType: 'dinner' },
      tier: 'free',
    });
    expect(result).toMatchObject({
      error: 'PRO_FEATURE',
      feature: 'write_tools',
    });
    expect(mockMealHistoryCreate).not.toHaveBeenCalled();
  });

  it('free user calling compose_plate returns PRO_FEATURE without persisting', async () => {
    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'compose_plate',
      input: { slots: [{ slot: 'protein', componentId: 'c1' }] },
      tier: 'free',
    });
    expect(result).toMatchObject({
      error: 'PRO_FEATURE',
      feature: 'write_tools',
    });
    expect(mockSaveComposedPlate).not.toHaveBeenCalled();
  });

  it('free user calling find_recipes (read tool) still works', async () => {
    mockPantryFindMany.mockResolvedValue([]);
    mockUserPreferencesFindUnique.mockResolvedValue(null);
    mockMacroGoalsFindUnique.mockResolvedValue(null);
    mockMealFindMany.mockResolvedValue([]);
    mockRecipeFindMany.mockResolvedValue([]);

    const { result } = await runCoachTool({
      userId: 'user-1',
      name: 'find_recipes',
      input: {},
      tier: 'free',
    });
    expect(result).toMatchObject({ recipes: [] });
  });
});

describe('runCoachTool: analytics emission', () => {
  beforeEach(() => {
    mockEmitAnalytics.mockReset();
    mockPantryFindMany.mockResolvedValue([]);
    mockLeftoverFindMany.mockResolvedValue([]);
  });

  it('emits coach_tool_call on read tool success', async () => {
    await runCoachTool({
      userId: 'user-1',
      name: 'get_pantry',
      input: {},
      tier: 'free',
    });
    const calls = mockEmitAnalytics.mock.calls.filter(
      ([event]) => event === 'coach_tool_call',
    );
    expect(calls.length).toBeGreaterThan(0);
    const props = calls[0][1] as Record<string, unknown>;
    expect(props.tool).toBe('get_pantry');
    expect(props.tier).toBe('free');
    expect(props.success).toBe(true);
  });

  it('emits coach_tool_call with errorCode on PRO_FEATURE block', async () => {
    await runCoachTool({
      userId: 'user-1',
      name: 'log_meal',
      input: { recipeId: 'r1', servings: 1, mealType: 'dinner' },
      tier: 'free',
    });
    const calls = mockEmitAnalytics.mock.calls.filter(
      ([event]) => event === 'coach_tool_call',
    );
    expect(calls.length).toBeGreaterThan(0);
    const props = calls[0][1] as Record<string, unknown>;
    expect(props.tool).toBe('log_meal');
    expect(props.success).toBe(false);
    expect(props.errorCode).toBe('PRO_FEATURE');
  });
});
