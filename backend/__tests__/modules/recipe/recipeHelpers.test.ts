// backend/__tests__/modules/recipe/recipeHelpers.test.ts
// Coverage push round 6 — exported helpers + final edge branches.
// Targets the getUserBehaviorData helper (lines 48-172, ~120 lines that
// only run when callbacks aren't mocked) plus a few remaining hot edges
// in handlers.

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
    // Critical: this implementation invokes the fetch callback so that
    // getUserBehaviorData actually runs.
    getBehavioralData: jest.fn().mockImplementation(async (_uid: string, fetchFn: () => Promise<any>) => {
      return await fetchFn();
    }),
  },
}));

jest.mock('../../../src/utils/cacheService', () => ({
  cacheService: { get: jest.fn().mockReturnValue(null), set: jest.fn(), del: jest.fn() },
}));

jest.mock('../../../src/utils/scoring', () => ({
  calculateRecipeScore: jest.fn().mockReturnValue({ total: 70, breakdown: {} }),
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
  calculateDiscriminatoryScore: jest.fn().mockReturnValue({ total: 60, breakdown: {} }),
  getUserPreferencesForScoring: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../../src/utils/healthGoalScoring', () => ({
  calculateHealthGoalMatch: jest.fn().mockReturnValue({ total: 70, breakdown: {} }),
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

jest.mock('../../../src/services/recipeGenerationService', () => ({
  recipeGenerationService: { generateRecipe: jest.fn() },
}));

jest.mock('../../../src/utils/privacyHelper', () => ({
  isDataSharingEnabledFromRequest: jest.fn().mockReturnValue(true),
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
    healthifyCraving: jest.fn().mockResolvedValue({ original: '', healthified: {}, honestyNote: '' }),
  },
}));

jest.mock('../../../src/services/pantryMatchService', () => ({
  computePantryMatch: jest.fn().mockReturnValue({ matchPercentage: 0, missing: [], canSubstitute: [], matched: [] }),
}));

jest.mock('../../../src/services/weatherService', () => ({ getWeatherContext: jest.fn() }));

jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    recipe: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    savedRecipe: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    recipeFeedback: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    mealHistory: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    userPreferences: { findFirst: jest.fn(), findUnique: jest.fn() },
    macroGoals: { findFirst: jest.fn(), findUnique: jest.fn() },
    userPhysicalProfile: { findFirst: jest.fn(), findUnique: jest.fn() },
    cookingLog: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    pantryItem: { findMany: jest.fn().mockResolvedValue([]) },
    collection: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    recipeCollection: { findMany: jest.fn().mockResolvedValue([]), createMany: jest.fn(), deleteMany: jest.fn() },
    recipeIngredient: { deleteMany: jest.fn(), createMany: jest.fn(), findMany: jest.fn() },
    recipeInstruction: { deleteMany: jest.fn(), createMany: jest.fn(), create: jest.fn() },
    recipeView: { findMany: jest.fn(), upsert: jest.fn() },
    composedPlate: { findFirst: jest.fn() },
    searchQuery: { groupBy: jest.fn() },
    cravingSearchEvent: { create: jest.fn() },
  },
}));

import { recipeController } from '../../../src/modules/recipe/recipeController';
import { getUserBehaviorData } from '../../../src/modules/recipe/recipeController';
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

const recipeWithIngredients = (overrides: Record<string, unknown> = {}) => ({
  cuisine: 'Italian',
  cookTime: 25,
  calories: 500,
  protein: 30,
  carbs: 50,
  fat: 15,
  ingredients: [
    { text: 'pasta', order: 1 },
    { text: 'tomato', order: 2 },
  ],
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  p.userPreferences.findFirst.mockResolvedValue(null);
  p.macroGoals.findFirst.mockResolvedValue(null);
  p.userPhysicalProfile.findFirst.mockResolvedValue(null);
});

describe('getUserBehaviorData helper', () => {
  it('returns shaped behavioral data from prisma feedback + saved + mealHistory', async () => {
    p.recipeFeedback.findMany
      .mockResolvedValueOnce([
        {
          recipeId: 'r-liked',
          createdAt: new Date('2026-01-01'),
          recipe: recipeWithIngredients(),
        },
      ])
      .mockResolvedValueOnce([
        {
          recipeId: 'r-disliked',
          createdAt: new Date('2026-01-02'),
          dislikeReason: 'too spicy',
          recipe: recipeWithIngredients({ cuisine: 'Thai' }),
        },
      ]);
    p.savedRecipe.findMany.mockResolvedValueOnce([
      {
        recipeId: 'r-saved',
        savedDate: new Date('2026-01-03'),
        recipe: recipeWithIngredients({ cuisine: 'Mexican' }),
      },
    ]);
    p.mealHistory.findMany.mockResolvedValueOnce([
      {
        recipeId: 'r-consumed',
        date: new Date('2026-01-04'),
        recipe: recipeWithIngredients({ cuisine: 'Japanese' }),
      },
    ]);

    const result = await getUserBehaviorData('u1');

    expect(result.likedRecipes).toEqual([
      expect.objectContaining({
        recipeId: 'r-liked',
        cuisine: 'Italian',
        cookTime: 25,
      }),
    ]);
    expect(result.dislikedRecipes).toEqual([
      expect.objectContaining({
        recipeId: 'r-disliked',
        dislikeReason: 'too spicy',
      }),
    ]);
    expect(result.savedRecipes).toEqual([
      expect.objectContaining({ recipeId: 'r-saved', cuisine: 'Mexican' }),
    ]);
    expect(result.consumedRecipes).toEqual([
      expect.objectContaining({ recipeId: 'r-consumed', cuisine: 'Japanese' }),
    ]);
  });

  it('returns empty arrays when prisma returns no data', async () => {
    const result = await getUserBehaviorData('u1');
    expect(result.likedRecipes).toEqual([]);
    expect(result.dislikedRecipes).toEqual([]);
    expect(result.savedRecipes).toEqual([]);
    expect(result.consumedRecipes).toEqual([]);
  });

  it('caps each query at 100 most recent entries', async () => {
    await getUserBehaviorData('u1');
    expect(p.recipeFeedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
    expect(p.savedRecipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
    expect(p.mealHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });

  it('handles missing dislikeReason gracefully (undefined)', async () => {
    p.recipeFeedback.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          recipeId: 'r1',
          createdAt: new Date(),
          dislikeReason: null,
          recipe: recipeWithIngredients(),
        },
      ]);
    const result = await getUserBehaviorData('u1');
    expect(result.dislikedRecipes[0].dislikeReason).toBeUndefined();
  });
});

describe('getRecipes — invokes getUserBehaviorData when data sharing enabled', () => {
  it('runs the behavioral data path end-to-end', async () => {
    p.userPreferences.findFirst.mockResolvedValueOnce({
      likedCuisines: [],
      bannedIngredients: [],
      dietaryRestrictions: [],
      preferredSuperfoods: [],
    });
    // Empty data path — exercises the full call chain without scoring noise
    p.recipe.findMany.mockResolvedValue([]);
    p.recipe.count.mockResolvedValue(0);
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeController.getRecipes(req, res);
    // recipeFeedback.findMany is called by getUserBehaviorData (twice — liked + disliked)
    expect(p.recipeFeedback.findMany).toHaveBeenCalled();
  });
});

describe('getSuggestedRecipes — non-search path with data sharing', () => {
  it('exercises the data-sharing-enabled path', async () => {
    p.userPreferences.findFirst.mockResolvedValueOnce({
      likedCuisines: [],
      bannedIngredients: [],
      dietaryRestrictions: [],
      preferredSuperfoods: [],
    });
    p.recipe.findMany.mockResolvedValue([]);
    p.recipe.count.mockResolvedValue(0);
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeController.getSuggestedRecipes(req, res);
    expect(res.json).toHaveBeenCalled();
  });
});

describe('getHomeFeed — invokes getUserBehaviorData when data sharing enabled', () => {
  it('runs the behavioral data path on shuffle request', async () => {
    p.userPreferences.findFirst.mockResolvedValueOnce({
      likedCuisines: [],
      bannedIngredients: [],
      dietaryRestrictions: [],
      preferredSuperfoods: [],
    });
    p.recipe.findMany.mockResolvedValue([]);
    p.recipe.count.mockResolvedValue(0);
    const req = buildReq({ query: { shuffle: 'true' } });
    const res = buildRes();
    await recipeController.getHomeFeed(req, res);
    expect(res.json).toHaveBeenCalled();
  });
});
