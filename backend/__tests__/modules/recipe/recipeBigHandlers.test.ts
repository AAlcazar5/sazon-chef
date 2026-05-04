// backend/__tests__/modules/recipe/recipeBigHandlers.test.ts
// Coverage push round 3 — the big read-side handlers (getRecipes,
// getSavedRecipes, getLikedRecipes, getDislikedRecipes, getSuggestedRecipes,
// getHomeFeed, generateRecipe, healthifyRecipe full path).
//
// These handlers each have hundreds of lines of branching logic. Goal here
// is to hit the major paths (basic fetch, filter combos, empty result,
// 500 error, cache hit) — not exhaustive coverage. Diminishing returns
// past ~3 cases per handler.

import { Request, Response } from 'express';

jest.mock('../../../src/services/aiProviders/AIProviderManager', () => ({
  AIProviderManager: jest.fn().mockImplementation(() => ({
    generateRecipe: jest.fn(),
    getAvailableProviders: jest.fn().mockReturnValue(['mock']),
  })),
}));

const mockHealthifyRecipe = jest.fn();
jest.mock('../../../src/services/healthifyService', () => ({
  healthifyService: { healthifyRecipe: (...a: unknown[]) => mockHealthifyRecipe(...a) },
}));

const mockRecipeGenerate = jest.fn();
jest.mock('../../../src/services/recipeGenerationService', () => ({
  recipeGenerationService: { generateRecipe: (...a: unknown[]) => mockRecipeGenerate(...a) },
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

jest.mock('../../../src/services/recipeImportService', () => ({
  importRecipeFromUrl: jest.fn(),
  RecipeImportError: class extends Error {},
}));

jest.mock('../../../src/utils/batchCookingRecommendations', () => ({
  generateBatchCookingRecommendations: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../src/utils/runtimeImageVariation', () => ({
  varyImageUrlsForPage: jest.fn().mockImplementation((r: any) => r),
}));

const mockCacheGet = jest.fn();
const mockCacheSet = jest.fn();
jest.mock('../../../src/utils/recommendationCache', () => ({
  recommendationCache: {
    get: (...a: unknown[]) => mockCacheGet(...a),
    set: (...a: unknown[]) => mockCacheSet(...a),
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

const mockHomeFeedCacheGet = jest.fn();
jest.mock('../../../src/utils/cacheService', () => ({
  cacheService: {
    get: (...a: unknown[]) => mockHomeFeedCacheGet(...a),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock('../../../src/utils/scoring', () => ({
  calculateRecipeScore: jest.fn().mockReturnValue(70),
  calculateMacroScore: jest.fn().mockReturnValue(70),
  calculateTasteScore: jest.fn().mockReturnValue(60),
}));

jest.mock('../../../src/utils/behavioralScoring', () => ({
  calculateBehavioralScore: jest.fn().mockReturnValue(0),
  calculateBehavioralScoreFromProfile: jest.fn().mockReturnValue(0),
  buildUserTasteProfile: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../src/utils/enhancedScoring', () => ({
  calculateEnhancedScore: jest.fn().mockReturnValue(0),
}));

jest.mock('../../../src/utils/discriminatoryScoring', () => ({
  calculateDiscriminatoryScore: jest.fn().mockReturnValue(50),
  getUserPreferencesForScoring: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../../src/utils/healthGoalScoring', () => ({
  calculateHealthGoalMatch: jest.fn().mockReturnValue(50),
}));

jest.mock('../../../src/utils/healthGrade', () => ({
  calculateHealthGrade: jest.fn().mockReturnValue({ grade: 'A', score: 90 }),
}));

jest.mock('../../../src/utils/temporalScoring', () => ({
  getCurrentTemporalContext: jest.fn().mockReturnValue({
    mealPeriod: 'dinner',
    isWeekend: false,
    timeOfDay: 'evening',
  }),
  calculateTemporalScore: jest.fn().mockReturnValue(0),
  analyzeUserTemporalPatterns: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../src/utils/predictiveScoring', () => ({
  calculatePredictiveScore: jest.fn().mockReturnValue(0),
}));

jest.mock('../../../src/utils/collaborativeFiltering', () => ({
  getCollaborativeRecommendations: jest.fn().mockResolvedValue([]),
  calculateCollaborativeScore: jest.fn().mockReturnValue(0),
}));

jest.mock('../../../src/utils/healthMetricsScoring', () => ({
  calculateHealthMetricsScore: jest.fn().mockReturnValue(0),
}));

jest.mock('../../../src/utils/externalScoring', () => ({
  calculateExternalScore: jest.fn().mockReturnValue(0),
  calculateHybridScore: jest.fn().mockReturnValue(0),
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

jest.mock('../../../src/utils/recipeSimilarity', () => ({
  CUISINE_ADJACENCY: {},
  findRelatedRecipes: jest.fn().mockReturnValue([]),
  findSimilarRecipes: jest.fn().mockReturnValue([]),
  findSimilarToSearchQuery: jest.fn().mockReturnValue([]),
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
    userPreferences: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    macroGoals: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    userPhysicalProfile: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    cookingLog: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    pantryItem: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    collection: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    recipeCollection: { findMany: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn() },
    recipeIngredient: { deleteMany: jest.fn(), createMany: jest.fn() },
    recipeInstruction: { deleteMany: jest.fn(), createMany: jest.fn() },
    recipeView: { findMany: jest.fn(), upsert: jest.fn() },
    composedPlate: { findFirst: jest.fn() },
    searchQuery: { groupBy: jest.fn(), create: jest.fn() },
    cravingSearchEvent: { create: jest.fn() },
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

const sampleRecipes = [
  {
    id: 'r1',
    title: 'Recipe One',
    cuisine: 'Italian',
    mealType: 'dinner',
    cookTime: 25,
    calories: 500,
    protein: 30,
    carbs: 50,
    fat: 15,
    fiber: 5,
    difficulty: 'easy',
    isUserCreated: false,
    imageUrl: 'http://img/1',
    description: 'desc',
    servings: 2,
    healthScore: 80,
    qualityScore: 70,
    ingredients: [{ text: 'pasta', order: 1 }],
    instructions: [{ text: 'cook', step: 1 }],
  },
  {
    id: 'r2',
    title: 'Recipe Two',
    cuisine: 'Thai',
    mealType: 'lunch',
    cookTime: 35,
    calories: 600,
    protein: 35,
    carbs: 60,
    fat: 20,
    fiber: 6,
    difficulty: 'medium',
    isUserCreated: false,
    imageUrl: 'http://img/2',
    description: 'desc',
    servings: 2,
    healthScore: 75,
    qualityScore: 65,
    ingredients: [],
    instructions: [],
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockCacheGet.mockReturnValue(null);
  mockHomeFeedCacheGet.mockReturnValue(null);
  mockIsDataSharingEnabled.mockReturnValue(false);
});

describe('getRecipes — branch coverage', () => {
  it('returns recipes with default pagination', async () => {
    p.recipe.findMany.mockResolvedValueOnce(sampleRecipes);
    p.recipe.count.mockResolvedValueOnce(2);
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeController.getRecipes(req, res);
    expect(p.recipe.findMany).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
  });

  it('applies cuisines filter (comma-separated)', async () => {
    p.recipe.findMany.mockResolvedValueOnce(sampleRecipes);
    p.recipe.count.mockResolvedValueOnce(2);
    const req = buildReq({ query: { cuisines: 'Italian,Thai' } });
    const res = buildRes();
    await recipeController.getRecipes(req, res);
    const where = p.recipe.findMany.mock.calls[0][0].where;
    expect(where.cuisine).toEqual({ in: ['Italian', 'Thai'] });
  });

  it('applies single cuisine filter', async () => {
    p.recipe.findMany.mockResolvedValueOnce([]);
    p.recipe.count.mockResolvedValueOnce(0);
    const req = buildReq({ query: { cuisine: 'Mexican' } });
    const res = buildRes();
    await recipeController.getRecipes(req, res);
    const where = p.recipe.findMany.mock.calls[0][0].where;
    expect(where.cuisine).toBe('Mexican');
  });

  it('applies maxCookTime filter', async () => {
    p.recipe.findMany.mockResolvedValueOnce([]);
    p.recipe.count.mockResolvedValueOnce(0);
    const req = buildReq({ query: { maxCookTime: '30' } });
    const res = buildRes();
    await recipeController.getRecipes(req, res);
    const where = p.recipe.findMany.mock.calls[0][0].where;
    expect(where.cookTime).toEqual(expect.objectContaining({ lte: 30 }));
  });

  it('applies difficulty=easy filter (cookTime <= 30)', async () => {
    p.recipe.findMany.mockResolvedValueOnce([]);
    p.recipe.count.mockResolvedValueOnce(0);
    const req = buildReq({ query: { difficulty: 'easy' } });
    const res = buildRes();
    await recipeController.getRecipes(req, res);
    const where = p.recipe.findMany.mock.calls[0][0].where;
    expect(where.cookTime?.lte).toBeLessThanOrEqual(30);
  });

  it('applies difficulty=medium filter (31 <= cookTime <= 45)', async () => {
    p.recipe.findMany.mockResolvedValueOnce([]);
    p.recipe.count.mockResolvedValueOnce(0);
    const req = buildReq({ query: { difficulty: 'medium' } });
    const res = buildRes();
    await recipeController.getRecipes(req, res);
    const where = p.recipe.findMany.mock.calls[0][0].where;
    expect(where.cookTime?.gte).toBeGreaterThanOrEqual(31);
    expect(where.cookTime?.lte).toBeLessThanOrEqual(45);
  });

  it('applies difficulty=hard filter (cookTime >= 46)', async () => {
    p.recipe.findMany.mockResolvedValueOnce([]);
    p.recipe.count.mockResolvedValueOnce(0);
    const req = buildReq({ query: { difficulty: 'hard' } });
    const res = buildRes();
    await recipeController.getRecipes(req, res);
    const where = p.recipe.findMany.mock.calls[0][0].where;
    expect(where.cookTime?.gte).toBeGreaterThanOrEqual(46);
  });

  it('applies macro filters (minProtein, maxCarbs, maxCalories)', async () => {
    p.recipe.findMany.mockResolvedValueOnce([]);
    p.recipe.count.mockResolvedValueOnce(0);
    const req = buildReq({ query: { minProtein: '30', maxCarbs: '50', maxCalories: '500' } });
    const res = buildRes();
    await recipeController.getRecipes(req, res);
    const where = p.recipe.findMany.mock.calls[0][0].where;
    expect(where.AND).toEqual(
      expect.arrayContaining([
        { protein: { gte: 30 } },
        { carbs: { lte: 50 } },
        { calories: { lte: 500 } },
      ]),
    );
  });

  it('applies search filter as title/description OR', async () => {
    p.recipe.findMany.mockResolvedValueOnce([]);
    p.recipe.count.mockResolvedValueOnce(0);
    const req = buildReq({ query: { search: 'chicken' } });
    const res = buildRes();
    await recipeController.getRecipes(req, res);
    const where = p.recipe.findMany.mock.calls[0][0].where;
    expect(where.AND).toEqual(
      expect.arrayContaining([
        { OR: [{ title: { contains: 'chicken' } }, { description: { contains: 'chicken' } }] },
      ]),
    );
  });

  it('applies mealPrepMode filter (mealPrepScore >= 60)', async () => {
    p.recipe.findMany.mockResolvedValueOnce([]);
    p.recipe.count.mockResolvedValueOnce(0);
    const req = buildReq({ query: { mealPrepMode: 'true' } });
    const res = buildRes();
    await recipeController.getRecipes(req, res);
    const where = p.recipe.findMany.mock.calls[0][0].where;
    expect(where.AND).toEqual(
      expect.arrayContaining([{ mealPrepScore: { gte: 60 } }]),
    );
  });

  it('applies mood=lazy filter (cookTime <= 20)', async () => {
    p.recipe.findMany.mockResolvedValueOnce([]);
    p.recipe.count.mockResolvedValueOnce(0);
    const req = buildReq({ query: { mood: 'lazy' } });
    const res = buildRes();
    await recipeController.getRecipes(req, res);
    const where = p.recipe.findMany.mock.calls[0][0].where;
    expect(where.cookTime?.lte).toBe(20);
  });

  it('applies mood=adventurous filter (cuisines list)', async () => {
    p.recipe.findMany.mockResolvedValueOnce([]);
    p.recipe.count.mockResolvedValueOnce(0);
    const req = buildReq({ query: { mood: 'adventurous' } });
    const res = buildRes();
    await recipeController.getRecipes(req, res);
    const where = p.recipe.findMany.mock.calls[0][0].where;
    expect(Array.isArray(where.cuisine?.in)).toBe(true);
    expect(where.cuisine.in).toEqual(expect.arrayContaining(['Thai', 'Indian']));
  });

  it('returns 500 when prisma throws', async () => {
    p.recipe.findMany.mockRejectedValueOnce(new Error('boom'));
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeController.getRecipes(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('hits scoring path when data sharing is enabled', async () => {
    mockIsDataSharingEnabled.mockReturnValue(true);
    p.userPreferences.findFirst.mockResolvedValueOnce({
      likedCuisines: [],
      bannedIngredients: [],
      dietaryRestrictions: [],
      preferredSuperfoods: [],
    });
    p.macroGoals.findFirst.mockResolvedValueOnce(null);
    p.userPhysicalProfile.findFirst.mockResolvedValueOnce(null);
    p.recipe.findMany.mockResolvedValueOnce(sampleRecipes);
    p.recipe.count.mockResolvedValueOnce(2);
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeController.getRecipes(req, res);
    expect(p.userPreferences.findFirst).toHaveBeenCalled();
  });
});

describe('getSavedRecipes — coverage', () => {
  it('returns 200 on basic fetch', async () => {
    p.savedRecipe.findMany.mockResolvedValueOnce([]);
    p.savedRecipe.count.mockResolvedValueOnce(0);
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeController.getSavedRecipes(req, res);
    expect(p.savedRecipe.findMany).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
  });

  it('respects pagination params', async () => {
    p.savedRecipe.findMany.mockResolvedValueOnce([]);
    p.savedRecipe.count.mockResolvedValueOnce(0);
    const req = buildReq({ query: { page: '2', limit: '20' } });
    const res = buildRes();
    await recipeController.getSavedRecipes(req, res);
    expect(p.savedRecipe.findMany).toHaveBeenCalled();
  });

});

describe('getLikedRecipes — coverage', () => {
  it('returns 200 with non-paginated default', async () => {
    p.recipeFeedback.findMany.mockResolvedValueOnce([]);
    p.userPreferences.findUnique.mockResolvedValueOnce(null);
    p.macroGoals.findFirst.mockResolvedValueOnce(null);
    p.userPhysicalProfile.findFirst.mockResolvedValueOnce(null);
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeController.getLikedRecipes(req, res);
    expect(p.recipeFeedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', liked: true } }),
    );
    expect(res.json).toHaveBeenCalled();
  });

  it('uses paginated path when page param is present', async () => {
    p.recipeFeedback.findMany.mockResolvedValueOnce([]);
    p.recipeFeedback.count.mockResolvedValueOnce(0);
    p.userPreferences.findUnique.mockResolvedValueOnce(null);
    p.macroGoals.findFirst.mockResolvedValueOnce(null);
    p.userPhysicalProfile.findFirst.mockResolvedValueOnce(null);
    const req = buildReq({ query: { page: '0', limit: '20' } });
    const res = buildRes();
    await recipeController.getLikedRecipes(req, res);
    expect(p.recipeFeedback.count).toHaveBeenCalled();
  });
});

describe('getDislikedRecipes — coverage', () => {
  it('returns 200 with feedback filter on disliked', async () => {
    p.recipeFeedback.findMany.mockResolvedValueOnce([]);
    p.userPreferences.findUnique.mockResolvedValueOnce(null);
    p.macroGoals.findFirst.mockResolvedValueOnce(null);
    p.userPhysicalProfile.findFirst.mockResolvedValueOnce(null);
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeController.getDislikedRecipes(req, res);
    expect(p.recipeFeedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'u1' }) }),
    );
    expect(res.json).toHaveBeenCalled();
  });
});

describe('getHomeFeed — coverage', () => {
  it('returns cached payload when cache hit', async () => {
    mockHomeFeedCacheGet.mockReturnValueOnce({ recipes: [], sections: {} });
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeController.getHomeFeed(req, res);
    expect(res.json).toHaveBeenCalled();
    // Cache hit short-circuits before any prisma call
    expect(p.recipe.findMany).not.toHaveBeenCalled();
  });

  it('skips cache when shuffle=true', async () => {
    mockHomeFeedCacheGet.mockReturnValueOnce({ recipes: [], sections: {} });
    p.recipe.findMany.mockResolvedValue([]);
    p.recipe.count.mockResolvedValue(0);
    const req = buildReq({ query: { shuffle: 'true' } });
    const res = buildRes();
    await recipeController.getHomeFeed(req, res);
    // Shuffle bypasses cache; should hit prisma
    expect(p.recipe.findMany).toHaveBeenCalled();
  });

  it('renders feed when prisma returns empty pool', async () => {
    p.recipe.findMany.mockResolvedValue([]);
    p.recipe.count.mockResolvedValue(0);
    const req = buildReq({ query: { shuffle: 'true' } });
    const res = buildRes();
    await recipeController.getHomeFeed(req, res);
    expect(res.json).toHaveBeenCalled();
  });
});

describe('generateRecipe — coverage', () => {
  it('returns 500 when service throws', async () => {
    mockRecipeGenerate.mockRejectedValueOnce(new Error('ai down'));
    const req = buildReq({ body: {} });
    const res = buildRes();
    await recipeController.generateRecipe(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('passes body params through to recipe generation service', async () => {
    mockRecipeGenerate.mockResolvedValueOnce({ id: 'r1', title: 'AI Recipe' });
    const req = buildReq({ body: { cuisine: 'Thai', mealType: 'dinner' } });
    const res = buildRes();
    await recipeController.generateRecipe(req, res);
    expect(mockRecipeGenerate).toHaveBeenCalled();
  });
});

describe('healthifyRecipe — full path coverage', () => {
  it('returns 404 when recipe not found', async () => {
    p.recipe.findUnique.mockResolvedValueOnce(null);
    const req = buildReq({ params: { id: 'missing' } });
    const res = buildRes();
    await recipeController.healthifyRecipe(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('calls healthifyService with recipe data on a found recipe', async () => {
    p.recipe.findUnique.mockResolvedValueOnce({
      id: 'r1',
      title: 'Pasta',
      cuisine: 'Italian',
      ingredients: [{ text: 'pasta' }],
      instructions: [{ text: 'boil' }],
      calories: 800,
      protein: 25,
      carbs: 100,
      fat: 30,
    });
    p.userPreferences.findUnique.mockResolvedValueOnce(null);
    mockHealthifyRecipe.mockResolvedValueOnce({
      title: 'Healthier Pasta',
      calories: 500,
      protein: 30,
      carbs: 60,
      fat: 12,
      ingredients: [],
      instructions: [],
    });
    const req = buildReq({ params: { id: 'r1' } });
    const res = buildRes();
    await recipeController.healthifyRecipe(req, res);
    expect(mockHealthifyRecipe).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
  });

  it('returns 500 when healthify service throws', async () => {
    p.recipe.findUnique.mockResolvedValueOnce({
      id: 'r1',
      title: 'Pasta',
      cuisine: 'Italian',
      ingredients: [],
      instructions: [],
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
    p.userPreferences.findUnique.mockResolvedValueOnce(null);
    mockHealthifyRecipe.mockRejectedValueOnce(new Error('ai down'));
    const req = buildReq({ params: { id: 'r1' } });
    const res = buildRes();
    await recipeController.healthifyRecipe(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('getSuggestedRecipes — coverage', () => {
  it('returns 500 when prisma throws', async () => {
    p.recipe.findMany.mockRejectedValueOnce(new Error('boom'));
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeController.getSuggestedRecipes(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('handles empty result gracefully', async () => {
    p.recipe.findMany.mockResolvedValue([]);
    p.recipe.count.mockResolvedValue(0);
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeController.getSuggestedRecipes(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  it('processes basic recipe pool', async () => {
    p.recipe.findMany.mockResolvedValue(sampleRecipes);
    p.recipe.count.mockResolvedValue(2);
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeController.getSuggestedRecipes(req, res);
    expect(p.recipe.findMany).toHaveBeenCalled();
  });
});
