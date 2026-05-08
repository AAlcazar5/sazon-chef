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
// S16 — universal-agent tool mocks.
const mockMealPlanFindFirst = jest.fn();
const mockMealPlanCreate = jest.fn();
const mockShoppingListFindFirst = jest.fn();
const mockShoppingListCreate = jest.fn();
const mockShoppingListItemCreate = jest.fn();
const mockComposedPlateCount = jest.fn();
const mockMealCreate = jest.fn();
const mockMealDeleteMany = jest.fn();
const mockTransaction = jest.fn();

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
    meal: {
      findMany: (...a: unknown[]) => mockMealFindMany(...a),
      create: (...a: unknown[]) => mockMealCreate(...a),
      deleteMany: (...a: unknown[]) => mockMealDeleteMany(...a),
    },
    mealPlan: {
      findFirst: (...a: unknown[]) => mockMealPlanFindFirst(...a),
      create: (...a: unknown[]) => mockMealPlanCreate(...a),
    },
    shoppingList: {
      findFirst: (...a: unknown[]) => mockShoppingListFindFirst(...a),
      create: (...a: unknown[]) => mockShoppingListCreate(...a),
    },
    shoppingListItem: {
      create: (...a: unknown[]) => mockShoppingListItemCreate(...a),
    },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
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
      count: (...a: unknown[]) => mockComposedPlateCount(...a),
    },
  },
}));

const mockGenerateRecipe = jest.fn();
const mockSaveGeneratedRecipe = jest.fn();
jest.mock('@/services/aiRecipeService', () => ({
  aiRecipeService: {
    generateRecipe: (...a: unknown[]) => mockGenerateRecipe(...a),
    saveGeneratedRecipe: (...a: unknown[]) => mockSaveGeneratedRecipe(...a),
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
  // S16 mocks default to empty / null
  mockMealPlanFindFirst.mockResolvedValue(null);
  mockMealPlanCreate.mockResolvedValue({ id: 'mp-new', startDate: new Date(), endDate: new Date() });
  mockShoppingListFindFirst.mockResolvedValue(null);
  mockShoppingListCreate.mockResolvedValue({ id: 'sl-new' });
  mockShoppingListItemCreate.mockResolvedValue({ id: 'sli-1', name: 'eggs' });
  mockComposedPlateCount.mockResolvedValue(0);
  mockMealCreate.mockResolvedValue({ id: 'm-new' });
  mockMealDeleteMany.mockResolvedValue({ count: 0 });
  mockTransaction.mockImplementation((promises: Promise<unknown>[]) => Promise.all(promises));
  mockGenerateRecipe.mockReset();
  mockSaveGeneratedRecipe.mockReset();
});

describe('coachToolDefinitions', () => {
  it('exposes 15 tools (10 read + 5 write) — S16 adds 4 reads + 3 writes for universal-agent surface', () => {
    expect(coachToolDefinitions).toHaveLength(15);
    const names = coachToolDefinitions.map((t) => t.name).sort();
    expect(names).toContain('find_recipes_smart');
    expect(names).toContain('propose_tonight');
    expect(names).toEqual([
      'add_to_shopping_list',
      'compose_plate',
      'find_recipes',
      'find_recipes_smart',
      'generate_recipe',
      'get_meal_plan',
      'get_pantry',
      'get_recipe_detail',
      'get_shopping_list',
      'get_today_remaining_macros',
      'get_user_profile',
      'log_meal',
      'propose_tonight',
      'schedule_meal',
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

describe('runCoachTool: read-tool allergen guard (Phase 8)', () => {
  it('find_recipes excludes recipes that violate banned ingredients and reports filteredForAllergens', async () => {
    const peanutRecipe = {
      ...baseRecipe,
      id: 'r-peanut',
      title: 'Peanut Sauce Bowl',
      ingredients: [
        { text: 'chicken thigh' },
        { text: 'peanut butter sauce' },
      ],
    };
    const safeRecipe = { ...baseRecipe, id: 'r-safe', title: 'Lemon Chicken' };
    mockRecipeFindMany.mockResolvedValue([peanutRecipe, safeRecipe]);
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
      name: 'find_recipes',
      input: {},
      tier: 'free',
    });

    const r = result as {
      recipes: Array<{ id: string }>;
      filteredForAllergens: number;
    };
    expect(r.recipes.find((x) => x.id === 'r-peanut')).toBeUndefined();
    expect(r.recipes.find((x) => x.id === 'r-safe')).toBeDefined();
    expect(r.filteredForAllergens).toBeGreaterThanOrEqual(1);
  });

  it('search_cookbook excludes saved recipes that violate banned ingredients', async () => {
    const peanutRecipe = {
      ...baseRecipe,
      id: 'r-peanut',
      title: 'Peanut Chicken',
      ingredients: [
        { text: 'chicken thigh' },
        { text: 'peanut sauce' },
      ],
    };
    const safeRecipe = { ...baseRecipe, id: 'r-safe', title: 'Lemon Chicken' };
    mockSavedRecipeFindMany.mockResolvedValue([
      {
        id: 's1',
        recipeId: 'r-peanut',
        userId: 'user-1',
        rating: null,
        recipe: peanutRecipe,
      },
      {
        id: 's2',
        recipeId: 'r-safe',
        userId: 'user-1',
        rating: null,
        recipe: safeRecipe,
      },
    ]);
    mockCookingLogFindMany.mockResolvedValue([]);
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
      name: 'search_cookbook',
      input: { query: 'chicken' },
      tier: 'free',
    });

    const r = result as {
      recipes: Array<{ id: string }>;
      filteredForAllergens: number;
    };
    expect(r.recipes.find((x) => x.id === 'r-peanut')).toBeUndefined();
    expect(r.recipes.find((x) => x.id === 'r-safe')).toBeDefined();
    expect(r.filteredForAllergens).toBeGreaterThanOrEqual(1);
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

// ─── S16 — universal-agent tools ────────────────────────────────────────────

describe('runCoachTool: get_meal_plan', () => {
  it('returns null plan when no active plan exists', async () => {
    mockMealPlanFindFirst.mockResolvedValue(null);
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'get_meal_plan',
      input: {},
      tier: 'free',
    });
    expect(result).toEqual({ plan: null, slots: [] });
  });

  it('flattens meals into date+mealType slots with recipe titles', async () => {
    mockMealPlanFindFirst.mockResolvedValue({
      id: 'p1',
      name: 'This Week',
      startDate: new Date('2026-05-04T00:00:00Z'),
      endDate: new Date('2026-05-10T00:00:00Z'),
      meals: [
        {
          id: 'm1',
          date: new Date('2026-05-05T00:00:00Z'),
          mealType: 'dinner',
          recipeId: 'r1',
          recipe: { id: 'r1', title: 'Sumac Chicken' },
          isCompleted: false,
          customName: null,
        },
        {
          id: 'm2',
          date: new Date('2026-05-06T00:00:00Z'),
          mealType: 'lunch',
          recipeId: null,
          recipe: null,
          isCompleted: false,
          customName: 'Leftovers',
        },
      ],
    });
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'get_meal_plan',
      input: {},
      tier: 'free',
    });
    const r = result as { plan: { id: string }; slots: Array<{ date: string; mealType: string; recipeTitle: string | null; customName: string | null }> };
    expect(r.plan.id).toBe('p1');
    expect(r.slots).toHaveLength(2);
    expect(r.slots[0]).toMatchObject({
      date: '2026-05-05',
      mealType: 'dinner',
      recipeTitle: 'Sumac Chicken',
    });
    expect(r.slots[1]).toMatchObject({
      mealType: 'lunch',
      recipeTitle: null,
      customName: 'Leftovers',
    });
  });
});

describe('runCoachTool: get_shopping_list', () => {
  it('returns null list when none active', async () => {
    mockShoppingListFindFirst.mockResolvedValue(null);
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'get_shopping_list',
      input: {},
      tier: 'free',
    });
    expect(result).toEqual({ list: null, items: [] });
  });

  it('returns items with category + purchased state', async () => {
    mockShoppingListFindFirst.mockResolvedValue({
      id: 'sl1',
      name: 'My List',
      items: [
        { id: 'i1', name: 'eggs', quantity: '12', category: 'dairy', purchased: false, recipeId: null },
        { id: 'i2', name: 'rice', quantity: '1 lb', category: 'grains', purchased: true, recipeId: 'r1' },
      ],
    });
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'get_shopping_list',
      input: {},
      tier: 'free',
    });
    const r = result as { list: { id: string }; items: Array<{ name: string; purchased: boolean }> };
    expect(r.list.id).toBe('sl1');
    expect(r.items).toHaveLength(2);
    expect(r.items[0]).toMatchObject({ name: 'eggs', purchased: false });
  });
});

describe('runCoachTool: get_user_profile', () => {
  it('returns allergens, dietary, cuisines, skill tier, macro goals', async () => {
    mockUserPreferencesFindUnique.mockResolvedValue({
      cookTimePreference: 30,
      spiceLevel: 'medium',
      bannedIngredients: [{ name: 'peanut' }],
      likedCuisines: [{ name: 'persian' }, { name: 'thai' }],
      dietaryRestrictions: [{ name: 'gluten-free' }],
      preferredSuperfoods: [],
    });
    mockMacroGoalsFindUnique.mockResolvedValue({
      calories: 2200,
      protein: 160,
      carbs: 220,
      fat: 75,
    });
    mockComposedPlateCount.mockResolvedValue(2); // beginner
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'get_user_profile',
      input: {},
      tier: 'free',
    });
    expect(result).toMatchObject({
      allergies: ['peanut'],
      dietaryRestrictions: ['gluten-free'],
      likedCuisines: ['persian', 'thai'],
      cookTimePreference: 30,
      spiceLevel: 'medium',
      skillTier: 'beginner',
      macroGoals: { calories: 2200, protein: 160, carbs: 220, fat: 75 },
    });
  });

  it('handles missing prefs gracefully', async () => {
    mockUserPreferencesFindUnique.mockResolvedValue(null);
    mockMacroGoalsFindUnique.mockResolvedValue(null);
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'get_user_profile',
      input: {},
      tier: 'free',
    });
    expect(result).toMatchObject({
      allergies: [],
      dietaryRestrictions: [],
      likedCuisines: [],
      macroGoals: null,
    });
  });
});

describe('runCoachTool: get_recipe_detail', () => {
  it('rejects empty recipeId', async () => {
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'get_recipe_detail',
      input: {},
      tier: 'free',
    });
    expect((result as { error: string }).error).toBe('INVALID_INPUT');
  });

  it('returns NOT_FOUND when recipe missing', async () => {
    mockRecipeFindUnique.mockResolvedValue(null);
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'get_recipe_detail',
      input: { recipeId: 'r-ghost' },
      tier: 'free',
    });
    expect((result as { error: string }).error).toBe('NOT_FOUND');
  });

  it('returns full recipe payload with ordered ingredients + instructions', async () => {
    mockRecipeFindUnique.mockResolvedValue({
      id: 'r1',
      title: 'Sumac Chicken',
      description: 'Bright + tangy',
      cuisine: 'persian',
      cookTime: 35,
      calories: 480,
      protein: 38,
      carbs: 22,
      fat: 24,
      fiber: 3,
      imageUrl: null,
      source: 'curated',
      sourceUrl: null,
      ingredients: [
        { text: 'chicken thigh', order: 1 },
        { text: 'sumac', order: 2 },
      ],
      instructions: [
        { text: 'Marinate', step: 1 },
        { text: 'Sear', step: 2 },
      ],
    });
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'get_recipe_detail',
      input: { recipeId: 'r1' },
      tier: 'free',
    });
    expect(result).toMatchObject({
      id: 'r1',
      title: 'Sumac Chicken',
      cuisine: 'persian',
      ingredients: ['chicken thigh', 'sumac'],
      instructions: ['Marinate', 'Sear'],
    });
  });
});

describe('runCoachTool: add_to_shopping_list (Pro)', () => {
  it('blocks free tier with PRO_FEATURE', async () => {
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'add_to_shopping_list',
      input: { items: [{ name: 'eggs' }] },
      tier: 'free',
    });
    expect((result as { error: string }).error).toBe('PRO_FEATURE');
  });

  it('rejects empty items', async () => {
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'add_to_shopping_list',
      input: { items: [] },
      tier: 'premium',
    });
    expect((result as { error: string }).error).toBe('INVALID_INPUT');
  });

  it('appends items to the active list (creates list if missing)', async () => {
    mockShoppingListFindFirst.mockResolvedValue(null);
    mockShoppingListCreate.mockResolvedValue({ id: 'sl-new' });
    mockShoppingListItemCreate
      .mockResolvedValueOnce({ id: 'sli-1', name: 'eggs' })
      .mockResolvedValueOnce({ id: 'sli-2', name: 'rice' });
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'add_to_shopping_list',
      input: {
        items: [
          { name: 'eggs', quantity: '12' },
          { name: 'rice', quantity: '1 lb', category: 'grains' },
        ],
      },
      tier: 'premium',
    });
    expect(result).toMatchObject({ listId: 'sl-new', addedCount: 2 });
    expect(mockShoppingListCreate).toHaveBeenCalled();
    expect(mockShoppingListItemCreate).toHaveBeenCalledTimes(2);
  });

  it('reuses an existing active list if present', async () => {
    mockShoppingListFindFirst.mockResolvedValue({ id: 'sl-existing' });
    mockShoppingListItemCreate.mockResolvedValue({ id: 'sli-1', name: 'eggs' });
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'add_to_shopping_list',
      input: { items: [{ name: 'eggs' }] },
      tier: 'premium',
    });
    expect((result as { listId: string }).listId).toBe('sl-existing');
    expect(mockShoppingListCreate).not.toHaveBeenCalled();
  });
});

describe('runCoachTool: schedule_meal (Pro)', () => {
  it('blocks free tier with PRO_FEATURE', async () => {
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'schedule_meal',
      input: { recipeId: 'r1', date: '2026-05-08', mealType: 'dinner' },
      tier: 'free',
    });
    expect((result as { error: string }).error).toBe('PRO_FEATURE');
  });

  it('rejects missing fields', async () => {
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'schedule_meal',
      input: { recipeId: 'r1' },
      tier: 'premium',
    });
    expect((result as { error: string }).error).toBe('INVALID_INPUT');
  });

  it('rejects invalid date string', async () => {
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'schedule_meal',
      input: { recipeId: 'r1', date: 'tomorrow', mealType: 'dinner' },
      tier: 'premium',
    });
    expect((result as { error: string }).error).toBe('INVALID_INPUT');
  });

  it('blocks scheduling a recipe that violates the user\'s allergens', async () => {
    mockRecipeFindUnique.mockResolvedValue({
      id: 'r1',
      title: 'Peanut Stew',
      ingredients: [{ text: 'peanut butter' }, { text: 'water' }],
    });
    mockUserPreferencesFindUnique.mockResolvedValue({
      bannedIngredients: [{ name: 'peanut' }],
    });
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'schedule_meal',
      input: { recipeId: 'r1', date: '2026-05-08', mealType: 'dinner' },
      tier: 'premium',
    });
    expect((result as { error: string }).error).toBe('ALLERGEN_VIOLATION');
  });

  it('drops the meal into the active week plan and replaces existing slot', async () => {
    mockRecipeFindUnique.mockResolvedValue({
      id: 'r1',
      title: 'Sumac Chicken',
      ingredients: [{ text: 'chicken' }],
    });
    mockUserPreferencesFindUnique.mockResolvedValue({ bannedIngredients: [] });
    mockMealPlanFindFirst.mockResolvedValue({
      id: 'p1',
      startDate: new Date('2026-05-04'),
      endDate: new Date('2026-05-10'),
    });
    mockMealCreate.mockResolvedValue({ id: 'm-new' });
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'schedule_meal',
      input: { recipeId: 'r1', date: '2026-05-08', mealType: 'dinner' },
      tier: 'premium',
    });
    expect(result).toMatchObject({
      mealId: 'm-new',
      planId: 'p1',
      date: '2026-05-08',
      mealType: 'dinner',
      recipeId: 'r1',
      recipeTitle: 'Sumac Chicken',
    });
    expect(mockMealDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ mealPlanId: 'p1', mealType: 'dinner' }),
      }),
    );
    expect(mockMealCreate).toHaveBeenCalledTimes(1);
  });

  it('creates a new week-long plan when no active plan covers the date', async () => {
    mockRecipeFindUnique.mockResolvedValue({
      id: 'r1',
      title: 'Sumac Chicken',
      ingredients: [{ text: 'chicken' }],
    });
    mockUserPreferencesFindUnique.mockResolvedValue({ bannedIngredients: [] });
    mockMealPlanFindFirst.mockResolvedValue(null);
    mockMealPlanCreate.mockResolvedValue({
      id: 'p-new',
      startDate: new Date('2026-05-04'),
      endDate: new Date('2026-05-10'),
    });
    await runCoachTool({
      userId: 'u1',
      name: 'schedule_meal',
      input: { recipeId: 'r1', date: '2026-05-08', mealType: 'dinner' },
      tier: 'premium',
    });
    expect(mockMealPlanCreate).toHaveBeenCalledTimes(1);
  });
});

describe('runCoachTool: generate_recipe (Pro)', () => {
  it('blocks free tier with PRO_FEATURE', async () => {
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'generate_recipe',
      input: { brief: 'Persian fesenjan with mushrooms' },
      tier: 'free',
    });
    expect((result as { error: string }).error).toBe('PRO_FEATURE');
  });

  it('rejects too-short brief', async () => {
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'generate_recipe',
      input: { brief: 'fo' },
      tier: 'premium',
    });
    expect((result as { error: string }).error).toBe('INVALID_INPUT');
  });

  it('returns recipeId + title on successful generation + persist', async () => {
    mockGenerateRecipe.mockResolvedValue({
      title: 'Vegan Fesenjan',
      cuisine: 'persian',
    });
    mockSaveGeneratedRecipe.mockResolvedValue({
      id: 'r-new',
      title: 'Vegan Fesenjan',
    });
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'generate_recipe',
      input: { brief: 'Persian fesenjan with mushrooms instead of walnuts' },
      tier: 'premium',
    });
    expect(result).toMatchObject({
      recipeId: 'r-new',
      title: 'Vegan Fesenjan',
    });
    expect(mockGenerateRecipe).toHaveBeenCalledTimes(1);
    expect(mockSaveGeneratedRecipe).toHaveBeenCalledTimes(1);
  });

  it('returns SAVE_FAILED when persist returns null', async () => {
    mockGenerateRecipe.mockResolvedValue({ title: 'Generated' });
    mockSaveGeneratedRecipe.mockResolvedValue(null);
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'generate_recipe',
      input: { brief: 'a healthy dinner' },
      tier: 'premium',
    });
    expect((result as { error: string }).error).toBe('SAVE_FAILED');
  });

  it('returns GENERATION_FAILED when AI provider throws', async () => {
    mockGenerateRecipe.mockRejectedValue(new Error('upstream timeout'));
    const { result } = await runCoachTool({
      userId: 'u1',
      name: 'generate_recipe',
      input: { brief: 'a quick lunch' },
      tier: 'premium',
    });
    expect((result as { error: string }).error).toBe('GENERATION_FAILED');
  });
});
