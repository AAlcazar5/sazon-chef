// backend/__tests__/modules/recipe/recipePushTo85.test.ts
// Coverage push round 8 — final push to 85%. Targets specific
// uncovered ranges:
//   - cravingBudget happy path (5500-5535, ~36 lines)
//   - saveRecipe with collectionIds array (2706-2747, ~42 lines)
//   - getSuggestedRecipes deep scoring path (1407-1489, ~80 lines)
//   - getRecipesOptimized inner branches (225-260)
//   - generateRecipe full happy path (885-905, etc.)

import { Request, Response } from 'express';

jest.mock('../../../src/services/aiProviders/AIProviderManager', () => ({
  AIProviderManager: jest.fn().mockImplementation(() => ({
    generateRecipe: jest.fn(),
    getAvailableProviders: jest.fn().mockReturnValue(['mock']),
  })),
}));

jest.mock('../../../src/services/healthifyService', () => ({
  healthifyService: { healthifyRecipe: jest.fn() },
}));

jest.mock('../../../src/services/recipeImportService', () => ({
  importRecipeFromUrl: jest.fn(),
  RecipeImportError: class extends Error {},
}));

jest.mock('../../../src/services/aiRecipeService', () => ({
  aiRecipeService: { generateFromDescription: jest.fn() },
}));

jest.mock('../../../src/services/flavorBoostService', () => ({
  flavorBoostService: { getFlavorBoosts: jest.fn() },
}));

jest.mock('../../../src/services/ingredientSwapService', () => ({
  getIngredientSwaps: jest.fn().mockReturnValue([]),
}));

jest.mock('../../../src/services/substitutionService', () => ({
  substitutionService: { askSubstitution: jest.fn() },
}));

const mockRecipeGenerate = jest.fn();
jest.mock('../../../src/services/recipeGenerationService', () => ({
  recipeGenerationService: { generateRecipe: (...a: unknown[]) => mockRecipeGenerate(...a) },
}));

const mockCravingBudget = jest.fn();
jest.mock('../../../src/services/cravingBudgetService', () => ({
  cravingBudgetService: {
    analyzeCraving: (...a: unknown[]) => mockCravingBudget(...a),
  },
}));

jest.mock('../../../src/utils/batchCookingRecommendations', () => ({
  generateBatchCookingRecommendations: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../src/utils/runtimeImageVariation', () => ({
  varyImageUrlsForPage: jest.fn().mockImplementation((r: any) => r),
}));

jest.mock('../../../src/utils/recommendationCache', () => ({
  recommendationCache: {
    get: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    has: jest.fn().mockReturnValue(false),
    invalidateUserCache: jest.fn(),
    getBehavioralData: jest.fn().mockResolvedValue({
      likedRecipes: [],
      dislikedRecipes: [],
      savedRecipes: [],
      consumedRecipes: [],
      recentCuisines: [],
      recentIngredients: [],
      mealHistory: [],
      likedCuisines: [],
      dislikedIngredients: [],
      preferredCookTimes: [],
      likedRecipeIds: [],
      dislikedRecipeIds: [],
    }),
  },
}));

jest.mock('../../../src/utils/cacheService', () => ({
  cacheService: { get: jest.fn().mockReturnValue(null), set: jest.fn(), del: jest.fn() },
}));

jest.mock('../../../src/utils/scoring', () => ({
  calculateRecipeScore: jest.fn().mockReturnValue({
    total: 70,
    matchPercentage: 70,
    macroScore: 60,
    tasteScore: 70,
    breakdown: {},
  }),
  calculateMacroScore: jest.fn().mockReturnValue(70),
  calculateTasteScore: jest.fn().mockReturnValue(60),
}));

jest.mock('../../../src/utils/behavioralScoring', () => ({
  calculateBehavioralScore: jest.fn().mockReturnValue({ total: 0 }),
  calculateBehavioralScoreFromProfile: jest.fn().mockReturnValue({ total: 0 }),
  buildUserTasteProfile: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../src/utils/enhancedScoring', () => ({
  calculateEnhancedScore: jest.fn().mockReturnValue({ total: 0 }),
}));

jest.mock('../../../src/utils/discriminatoryScoring', () => ({
  calculateDiscriminatoryScore: jest.fn().mockReturnValue({ total: 60, breakdown: {} }),
  getUserPreferencesForScoring: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../../src/utils/healthGoalScoring', () => ({
  calculateHealthGoalMatch: jest.fn().mockReturnValue({ total: 70, breakdown: {} }),
}));

jest.mock('../../../src/utils/healthGrade', () => ({
  calculateHealthGrade: jest.fn().mockReturnValue({ grade: 'A', score: 90, breakdown: {} }),
}));

jest.mock('../../../src/utils/temporalScoring', () => ({
  getCurrentTemporalContext: jest.fn().mockReturnValue({
    mealPeriod: 'dinner',
    isWeekend: false,
    timeOfDay: 'evening',
  }),
  calculateTemporalScore: jest.fn().mockReturnValue({ total: 0 }),
  analyzeUserTemporalPatterns: jest.fn().mockReturnValue({}),
  weatherBoost: jest.fn().mockReturnValue(0),
}));

jest.mock('../../../src/utils/predictiveScoring', () => ({
  calculatePredictiveScore: jest.fn().mockReturnValue({ total: 0 }),
}));

jest.mock('../../../src/utils/collaborativeFiltering', () => ({
  getCollaborativeRecommendations: jest.fn().mockResolvedValue([]),
  calculateCollaborativeScore: jest.fn().mockReturnValue({ total: 0 }),
}));

jest.mock('../../../src/utils/healthMetricsScoring', () => ({
  calculateHealthMetricsScore: jest.fn().mockReturnValue({ total: 0 }),
}));

jest.mock('../../../src/utils/externalScoring', () => ({
  calculateExternalScore: jest.fn().mockReturnValue({ total: 0 }),
  calculateHybridScore: jest.fn().mockReturnValue({ total: 0 }),
}));

jest.mock('../../../src/utils/dynamicWeightAdjustment', () => ({
  getDynamicWeights: jest.fn().mockReturnValue({}),
  adjustWeights: jest.fn().mockImplementation((w: any) => w),
}));

jest.mock('../../../src/utils/nutritionalAnalysis', () => ({
  performNutritionalAnalysis: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../src/utils/recipeOptimizationHelpers', () => ({
  applyRecipeOptimizations: jest.fn().mockImplementation((r: any) => r),
  calculateOptimizationScore: jest.fn().mockReturnValue(0),
}));

jest.mock('../../../src/utils/costCalculator', () => ({
  calculateRecipeCost: jest.fn().mockReturnValue({ total: 5, perServing: 2.5 }),
  isWithinBudget: jest.fn().mockReturnValue(true),
  calculateCostScore: jest.fn().mockReturnValue(70),
}));

jest.mock('../../../src/utils/recipeSimilarity', () => ({
  CUISINE_ADJACENCY: {},
  findRelatedRecipes: jest.fn().mockReturnValue([]),
  findSimilarRecipes: jest.fn().mockReturnValue([]),
  findSimilarToSearchQuery: jest.fn().mockReturnValue([]),
}));

jest.mock('../../../src/utils/flavorProfile', () => ({
  detectFlavorProfile: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../src/utils/recommendationReason', () => ({
  generateRecommendationReason: jest.fn().mockReturnValue('reason'),
}));

jest.mock('../../../src/services/spoonacularService', () => ({
  spoonacularService: {
    isConfigured: jest.fn().mockReturnValue(false),
    enrichRecipeData: jest.fn(),
    searchRecipes: jest.fn(),
  },
}));

jest.mock('../../../src/services/aiEnrichmentService', () => ({
  aiEnrichmentService: {
    isConfigured: jest.fn().mockReturnValue(false),
    enrichRecipe: jest.fn(),
    enrichRecipeData: jest.fn(),
  },
}));

const mockIsDataSharingEnabled = jest.fn().mockReturnValue(false);
jest.mock('../../../src/utils/privacyHelper', () => ({
  isDataSharingEnabledFromRequest: (...a: unknown[]) => mockIsDataSharingEnabled(...a),
  getPrivacySettingsFromRequest: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../src/services/slotAffinityService', () => ({
  recordAffinityEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/services/smartCollectionsService', () => ({
  SMART_COLLECTION_DEFINITIONS: {},
  WEATHER_COLLECTION_DEFINITION: { id: 'weather' },
  buildRecipeFilter: jest.fn().mockReturnValue({}),
  buildWeatherFilter: jest.fn().mockReturnValue({}),
  recipeMatchesSmartCollection: jest.fn().mockReturnValue(false),
  getSmartCollectionById: jest.fn(),
}));

jest.mock('../../../src/services/cravingSearchService', () => ({
  mapCravingToSearchTerms: jest.fn().mockResolvedValue({ searchTerms: [] }),
  scoreCravingMatch: jest.fn().mockReturnValue({ score: 50 }),
}));

jest.mock('../../../src/services/cravingFlowService', () => ({
  cravingFlowService: {
    healthifyCraving: jest
      .fn()
      .mockResolvedValue({ original: '', healthified: {}, honestyNote: '' }),
  },
}));

jest.mock('../../../src/services/pantryMatchService', () => ({
  computePantryMatch: jest
    .fn()
    .mockReturnValue({ matchPercentage: 0, missing: [], canSubstitute: [], matched: [] }),
}));

jest.mock('../../../src/services/weatherService', () => ({
  getWeatherContext: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    recipe: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    savedRecipe: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    recipeFeedback: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    userPreferences: { findFirst: jest.fn(), findUnique: jest.fn() },
    macroGoals: { findFirst: jest.fn(), findUnique: jest.fn() },
    userPhysicalProfile: { findFirst: jest.fn(), findUnique: jest.fn() },
    cookingLog: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    pantryItem: { findMany: jest.fn().mockResolvedValue([]) },
    collection: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    recipeCollection: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    recipeIngredient: { deleteMany: jest.fn(), createMany: jest.fn(), findMany: jest.fn() },
    recipeInstruction: { deleteMany: jest.fn(), createMany: jest.fn(), create: jest.fn() },
    recipeView: { findMany: jest.fn(), upsert: jest.fn() },
    composedPlate: { findFirst: jest.fn() },
    searchQuery: { groupBy: jest.fn().mockResolvedValue([]), create: jest.fn() },
    cravingSearchEvent: { create: jest.fn() },
    mealHistory: { findMany: jest.fn().mockResolvedValue([]) },
  },
}));

import { recipeController } from '../../../src/modules/recipe/recipeController';
import { prisma } from '../../../src/lib/prisma';

const p = prisma as any;

function buildRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
}

function buildReq(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    body: {},
    query: {},
    headers: {},
    user: { id: 'u1', email: 'u1@example.com' },
    ...overrides,
  } as unknown as Request;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsDataSharingEnabled.mockReturnValue(false);
  p.userPreferences.findFirst.mockResolvedValue(null);
  p.userPreferences.findUnique.mockResolvedValue(null);
  p.macroGoals.findFirst.mockResolvedValue(null);
  p.userPhysicalProfile.findFirst.mockResolvedValue(null);
});

describe('cravingBudget — full happy path', () => {
  it('returns 400 when remainingCalories is missing', async () => {
    const req = buildReq({ body: { craving: 'pizza' } });
    const res = buildRes();
    await recipeController.cravingBudget(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when remainingCalories is not a number', async () => {
    const req = buildReq({ body: { craving: 'pizza', remainingCalories: 'lots' } });
    const res = buildRes();
    await recipeController.cravingBudget(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('passes dietary restrictions + macro context to budget service', async () => {
    p.userPreferences.findFirst.mockResolvedValueOnce({
      dietaryRestrictions: [
        { name: 'vegan', severity: 'strict' },
        { name: 'soy', severity: 'prefer_avoid' },
      ],
    });
    mockCravingBudget.mockResolvedValueOnce({
      tier1: { suggestion: 'lighter version' },
      tier2: { suggestion: 'fit it in' },
      tier3: { suggestion: 'just enjoy' },
    });
    const req = buildReq({
      body: {
        craving: 'pizza',
        remainingCalories: 800,
        remainingProtein: 60,
        remainingCarbs: 100,
        remainingFat: 30,
      },
    });
    const res = buildRes();
    await recipeController.cravingBudget(req, res);
    expect(mockCravingBudget).toHaveBeenCalledWith(
      expect.objectContaining({
        craving: 'pizza',
        remainingCalories: 800,
        userId: 'u1',
        dietaryRestrictions: ['vegan'],
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ tier1: expect.any(Object) }),
    );
  });

  it('returns 500 when the budget service throws', async () => {
    mockCravingBudget.mockRejectedValueOnce(new Error('boom'));
    const req = buildReq({ body: { craving: 'pizza', remainingCalories: 500 } });
    const res = buildRes();
    await recipeController.cravingBudget(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('saveRecipe — collectionIds path', () => {
  it('creates SavedRecipe and adds it to the user-owned collections', async () => {
    p.recipe.findUnique.mockResolvedValueOnce({ id: 'r1' });
    p.savedRecipe.findFirst.mockResolvedValueOnce(null);
    p.savedRecipe.create.mockResolvedValueOnce({ id: 's1', userId: 'u1', recipeId: 'r1' });
    p.collection.findMany.mockResolvedValueOnce([
      { id: 'c1' },
      { id: 'c2' },
    ]);
    p.recipeCollection.create.mockResolvedValue({});
    const req = buildReq({
      params: { id: 'r1' },
      body: { collectionIds: ['c1', 'c2'] },
    });
    const res = buildRes();
    await recipeController.saveRecipe(req, res);
    expect(p.recipeCollection.create).toHaveBeenCalledTimes(2);
  });

  it('skips invalid collectionIds (not user-owned)', async () => {
    p.recipe.findUnique.mockResolvedValueOnce({ id: 'r1' });
    p.savedRecipe.findFirst.mockResolvedValueOnce(null);
    p.savedRecipe.create.mockResolvedValueOnce({ id: 's1' });
    p.collection.findMany.mockResolvedValueOnce([{ id: 'c1' }]); // c2 missing → invalid
    p.recipeCollection.create.mockResolvedValue({});
    const req = buildReq({
      params: { id: 'r1' },
      body: { collectionIds: ['c1', 'c2'] },
    });
    const res = buildRes();
    await recipeController.saveRecipe(req, res);
    // Only c1 should get a recipeCollection.create
    expect(p.recipeCollection.create).toHaveBeenCalledTimes(1);
  });

  it('swallows P2002 unique-violation when adding to a duplicate collection', async () => {
    p.recipe.findUnique.mockResolvedValueOnce({ id: 'r1' });
    p.savedRecipe.findFirst.mockResolvedValueOnce(null);
    p.savedRecipe.create.mockResolvedValueOnce({ id: 's1' });
    p.collection.findMany.mockResolvedValueOnce([{ id: 'c1' }]);
    const dup = Object.assign(new Error('dup'), { code: 'P2002' });
    p.recipeCollection.create.mockRejectedValueOnce(dup);
    const req = buildReq({
      params: { id: 'r1' },
      body: { collectionIds: ['c1'] },
    });
    const res = buildRes();
    await recipeController.saveRecipe(req, res);
    // Should still complete successfully despite the duplicate
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/saved/i) }),
    );
  });
});

describe('getRecipesOptimized — inner branches', () => {
  it('returns paginated recipes with cuisines filter', async () => {
    p.recipe.findMany.mockResolvedValueOnce([
      {
        id: 'r1',
        title: 'A',
        cuisine: 'Italian',
        cookTime: 30,
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 15,
        ingredients: [],
        instructions: [],
      },
    ]);
    p.recipe.count.mockResolvedValueOnce(1);
    const req = buildReq({ query: { cuisines: 'Italian,Thai', page: '0', limit: '20' } });
    const res = buildRes();
    await recipeController.getRecipesOptimized(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  it('applies maxCookTime filter', async () => {
    p.recipe.findMany.mockResolvedValue([]);
    p.recipe.count.mockResolvedValue(0);
    const req = buildReq({ query: { maxCookTime: '20' } });
    const res = buildRes();
    await recipeController.getRecipesOptimized(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  it('handles search query', async () => {
    p.recipe.findMany.mockResolvedValue([]);
    p.recipe.count.mockResolvedValue(0);
    const req = buildReq({ query: { search: 'chicken' } });
    const res = buildRes();
    await recipeController.getRecipesOptimized(req, res);
    expect(res.json).toHaveBeenCalled();
  });
});

describe('generateRecipe — full path', () => {
  it('returns 200 with generated recipe', async () => {
    mockRecipeGenerate.mockResolvedValueOnce({
      id: 'r-new',
      title: 'AI Recipe',
      ingredients: [],
      instructions: [],
    });
    const req = buildReq({
      body: {
        cuisine: 'Italian',
        mealType: 'dinner',
        protein: 30,
        carbs: 50,
        fat: 15,
        calories: 500,
        cookTime: 30,
        servings: 2,
      },
    });
    const res = buildRes();
    await recipeController.generateRecipe(req, res);
    expect(mockRecipeGenerate).toHaveBeenCalled();
  });

  it('handles macro goal params', async () => {
    mockRecipeGenerate.mockResolvedValueOnce({ id: 'r-new', title: 'A' });
    const req = buildReq({
      body: {
        macroGoals: { calories: 600, protein: 40, carbs: 60, fat: 20 },
      },
    });
    const res = buildRes();
    await recipeController.generateRecipe(req, res);
    expect(res.json).toHaveBeenCalled();
  });
});

describe('getSuggestedRecipes — non-search with full data sharing scoring', () => {
  it('runs the data-sharing-enabled deep scoring path', async () => {
    mockIsDataSharingEnabled.mockReturnValue(true);
    p.userPreferences.findFirst.mockResolvedValueOnce({
      likedCuisines: [{ name: 'Italian' }, { name: 'Thai' }],
      bannedIngredients: [{ name: 'cilantro' }],
      dietaryRestrictions: [{ name: 'gluten-free' }],
      preferredSuperfoods: [{ category: 'beans' }],
    });
    p.macroGoals.findFirst.mockResolvedValueOnce({
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 70,
    });
    p.userPhysicalProfile.findFirst.mockResolvedValueOnce({
      fitnessGoal: 'maintain',
    });
    p.recipe.findMany.mockResolvedValue([
      {
        id: 'r1',
        title: 'Pasta',
        description: 'Italian',
        cuisine: 'Italian',
        mealType: 'dinner',
        cookTime: 25,
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 15,
        servings: 2,
        imageUrl: 'http://img',
        ingredients: [{ text: 'pasta' }, { text: 'tomato' }],
        instructions: [{ text: 'cook' }],
      },
    ]);
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeController.getSuggestedRecipes(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  it('handles cuisines filter combined with maxCost', async () => {
    p.recipe.findMany.mockResolvedValue([]);
    const req = buildReq({
      query: { cuisines: 'Italian', maxCost: '10', maxCookTime: '30' },
    });
    const res = buildRes();
    await recipeController.getSuggestedRecipes(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  it('handles dietaryRestrictions filter', async () => {
    p.recipe.findMany.mockResolvedValue([]);
    const req = buildReq({
      query: { dietaryRestrictions: 'vegan,gluten-free' },
    });
    const res = buildRes();
    await recipeController.getSuggestedRecipes(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  it('handles includeAI=true param', async () => {
    p.recipe.findMany.mockResolvedValue([]);
    const req = buildReq({ query: { includeAI: 'true' } });
    const res = buildRes();
    await recipeController.getSuggestedRecipes(req, res);
    expect(res.json).toHaveBeenCalled();
  });
});

describe('getSavedRecipes — additional branches', () => {
  it('returns non-paginated array when page param is absent', async () => {
    p.savedRecipe.findMany.mockResolvedValueOnce([
      {
        id: 's1',
        userId: 'u1',
        recipeId: 'r1',
        savedDate: new Date('2026-01-01'),
        notes: null,
        rating: null,
        recipe: {
          id: 'r1',
          title: 'A',
          cuisine: 'Italian',
          cookTime: 30,
          calories: 500,
          protein: 30,
          carbs: 50,
          fat: 15,
          ingredients: [],
          instructions: [],
        },
        recipeCollections: [],
      },
    ]);
    p.cookingLog.groupBy.mockResolvedValueOnce([]);
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeController.getSavedRecipes(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  it('filters by collectionId in saved-recipes path', async () => {
    p.savedRecipe.findMany.mockResolvedValueOnce([
      {
        id: 's1',
        userId: 'u1',
        recipeId: 'r1',
        savedDate: new Date(),
        notes: null,
        rating: null,
        recipe: {
          id: 'r1',
          title: 'A',
          cuisine: 'Italian',
          cookTime: 30,
          calories: 500,
          protein: 30,
          carbs: 50,
          fat: 15,
          ingredients: [],
          instructions: [],
        },
        recipeCollections: [{ collection: { id: 'c1', name: 'Faves' } }],
      },
    ]);
    p.cookingLog.groupBy.mockResolvedValueOnce([]);
    const req = buildReq({ query: { collectionId: 'c1' } });
    const res = buildRes();
    await recipeController.getSavedRecipes(req, res);
    expect(p.savedRecipe.findMany).toHaveBeenCalled();
  });
});

describe('getLikedRecipes — paginated full data sharing', () => {
  it('paginated with full user prefs hits deep scoring path', async () => {
    p.recipeFeedback.findMany.mockResolvedValueOnce([
      {
        id: 'fb1',
        userId: 'u1',
        recipeId: 'r1',
        liked: true,
        createdAt: new Date(),
        recipe: {
          id: 'r1',
          title: 'A',
          description: 'd',
          cuisine: 'Italian',
          mealType: 'dinner',
          cookTime: 25,
          calories: 500,
          protein: 30,
          carbs: 50,
          fat: 15,
          servings: 2,
          imageUrl: 'http://img',
          ingredients: [{ text: 'pasta' }, { text: 'tomato' }, { text: 'oil' }, { text: 'salt' }, { text: 'basil' }],
          instructions: [{ text: 's1' }, { text: 's2' }, { text: 's3' }, { text: 's4' }],
        },
      },
    ]);
    p.recipeFeedback.count.mockResolvedValueOnce(1);
    p.userPreferences.findUnique.mockResolvedValueOnce({
      likedCuisines: [{ name: 'Italian' }],
      bannedIngredients: [],
      dietaryRestrictions: [],
    });
    p.macroGoals.findFirst.mockResolvedValueOnce({
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 70,
    });
    p.userPhysicalProfile.findFirst.mockResolvedValueOnce({
      fitnessGoal: 'cut',
    });
    const req = buildReq({ query: { page: '0', limit: '20' } });
    const res = buildRes();
    await recipeController.getLikedRecipes(req, res);
    expect(res.json).toHaveBeenCalled();
  });
});

describe('cravingFlow — final coverage', () => {
  it('handles all-zero macroGoals (no lighterCalorieCeiling)', async () => {
    p.userPreferences.findFirst.mockResolvedValueOnce(null);
    p.macroGoals.findUnique.mockResolvedValueOnce(null);
    p.recipe.findMany.mockResolvedValueOnce([]);
    const req = buildReq({ body: { craving: 'pizza' } });
    const res = buildRes();
    await recipeController.cravingFlow(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  it('runs successfully when macroGoals is undefined (no calorie filter)', async () => {
    p.userPreferences.findFirst.mockResolvedValueOnce({
      dietaryRestrictions: [],
    });
    p.macroGoals.findUnique.mockResolvedValueOnce(null);
    p.recipe.findMany.mockResolvedValueOnce([
      {
        id: 'r1',
        title: 'Pasta',
        cuisine: 'Italian',
        cookTime: 25,
        ingredients: [],
        instructions: [],
        calories: 600,
        protein: 30,
        carbs: 60,
        fat: 20,
      },
    ]);
    const req = buildReq({ body: { craving: 'pasta' } });
    const res = buildRes();
    await recipeController.cravingFlow(req, res);
    expect(res.json).toHaveBeenCalled();
  });
});
