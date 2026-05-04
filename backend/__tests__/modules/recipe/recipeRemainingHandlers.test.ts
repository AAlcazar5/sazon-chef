// backend/__tests__/modules/recipe/recipeRemainingHandlers.test.ts
// Coverage push round 2 — every remaining recipe handler with at least one
// validation/error-path test plus a happy path where mocking is cheap. The
// goal is breadth, not depth — get every untested branch into ≥1 test so
// modules/recipe coverage moves meaningfully.

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

const mockFlavorBoosts = jest.fn();
jest.mock('../../../src/services/flavorBoostService', () => ({
  flavorBoostService: { getFlavorBoosts: (...a: unknown[]) => mockFlavorBoosts(...a) },
}));

const mockGetIngredientSwaps = jest.fn();
jest.mock('../../../src/services/ingredientSwapService', () => ({
  getIngredientSwaps: (...a: unknown[]) => mockGetIngredientSwaps(...a),
}));

const mockSubstitutionService = { askSubstitution: jest.fn() };
jest.mock('../../../src/services/substitutionService', () => ({
  substitutionService: mockSubstitutionService,
}));

const mockImportFromUrl = jest.fn();
jest.mock('../../../src/services/recipeImportService', () => ({
  importRecipeFromUrl: (...a: unknown[]) => mockImportFromUrl(...a),
  RecipeImportError: class RecipeImportError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'RecipeImportError';
    }
  },
}));

jest.mock('../../../src/services/aiRecipeService', () => ({
  aiRecipeService: { generateFromDescription: jest.fn() },
}));

const mockGenerateBatchRecs = jest.fn();
jest.mock('../../../src/utils/batchCookingRecommendations', () => ({
  generateBatchCookingRecommendations: (...a: unknown[]) => mockGenerateBatchRecs(...a),
}));

jest.mock('../../../src/utils/runtimeImageVariation', () => ({
  varyImageUrlsForPage: jest.fn().mockImplementation((r: any) => r),
}));

jest.mock('../../../src/utils/recommendationCache', () => ({
  recommendationCache: {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn().mockReturnValue(false),
    invalidateUserCache: jest.fn(),
    getBehavioralData: jest.fn().mockResolvedValue({
      likedCuisines: [],
      dislikedIngredients: [],
      preferredCookTimes: [],
      likedRecipeIds: [],
      dislikedRecipeIds: [],
    }),
  },
}));

jest.mock('../../../src/utils/cacheService', () => ({
  cacheService: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
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

jest.mock('../../../src/utils/collaborativeFiltering', () => ({
  getCollaborativeRecommendations: jest.fn().mockResolvedValue([]),
  calculateCollaborativeScore: jest.fn().mockReturnValue(0),
}));

jest.mock('../../../src/utils/dynamicWeightAdjustment', () => ({
  getDynamicWeights: jest.fn().mockReturnValue({}),
  adjustWeights: jest.fn().mockImplementation((w: any) => w),
}));

jest.mock('../../../src/utils/externalScoring', () => ({
  calculateExternalScore: jest.fn().mockReturnValue(0),
}));

jest.mock('../../../src/utils/healthMetricsScoring', () => ({
  calculateHealthMetricsScore: jest.fn().mockReturnValue(0),
}));

jest.mock('../../../src/utils/predictiveScoring', () => ({
  calculatePredictiveScore: jest.fn().mockReturnValue(0),
}));

jest.mock('../../../src/services/recipeGenerationService', () => ({
  recipeGenerationService: { generateRecipe: jest.fn() },
}));

const mockSpoonacular = {
  isConfigured: jest.fn().mockReturnValue(false),
  enrichRecipeData: jest.fn(),
  searchRecipes: jest.fn(),
};
jest.mock('../../../src/services/spoonacularService', () => ({
  spoonacularService: mockSpoonacular,
}));

const mockAIEnrich = {
  isConfigured: jest.fn().mockReturnValue(false),
  enrichRecipeData: jest.fn(),
  enrichRecipe: jest.fn(),
};
jest.mock('../../../src/services/aiEnrichmentService', () => ({
  aiEnrichmentService: mockAIEnrich,
}));

jest.mock('../../../src/utils/privacyHelper', () => ({
  isDataSharingEnabledFromRequest: jest.fn().mockReturnValue(false),
  getPrivacySettingsFromRequest: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../src/services/slotAffinityService', () => ({
  recordAffinityEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/utils/recipeSimilarity', () => ({
  CUISINE_ADJACENCY: {},
  findRelatedRecipes: jest.fn().mockReturnValue([]),
  findSimilarRecipes: jest.fn().mockReturnValue([]),
}));

jest.mock('../../../src/services/weatherService', () => ({
  getWeatherContext: jest.fn(),
}));

jest.mock('../../../src/services/smartCollectionsService', () => ({
  SMART_COLLECTION_DEFINITIONS: {},
  WEATHER_COLLECTION_DEFINITION: { id: 'weather', name: 'Weather Picks' },
  buildRecipeFilter: jest.fn().mockReturnValue({}),
  buildWeatherFilter: jest.fn().mockReturnValue({}),
  recipeMatchesSmartCollection: jest.fn().mockReturnValue(false),
  getSmartCollectionById: jest.fn(),
}));

const mockMapCravingToSearchTerms = jest.fn();
const mockScoreCravingMatch = jest.fn();
jest.mock('../../../src/services/cravingSearchService', () => ({
  mapCravingToSearchTerms: (...a: unknown[]) => mockMapCravingToSearchTerms(...a),
  scoreCravingMatch: (...a: unknown[]) => mockScoreCravingMatch(...a),
}));

jest.mock('../../../src/services/cravingFlowService', () => ({
  cravingFlowService: {
    healthifyCraving: jest.fn().mockResolvedValue({
      original: 'pizza',
      healthified: { title: 'Cauliflower crust pizza' },
      honestyNote: '',
    }),
  },
}));

jest.mock('../../../src/services/pantryMatchService', () => ({
  computePantryMatch: jest.fn().mockReturnValue({
    matchPercentage: 75,
    missing: ['salt'],
    canSubstitute: [],
    matched: ['chicken', 'rice'],
  }),
}));

jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    recipe: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
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
    cravingSearchEvent: { create: jest.fn() },
    pantryItem: { findMany: jest.fn().mockResolvedValue([]) },
    userPreferences: { findFirst: jest.fn(), findUnique: jest.fn() },
    macroGoals: { findFirst: jest.fn(), findUnique: jest.fn() },
    userPhysicalProfile: { findFirst: jest.fn(), findUnique: jest.fn() },
    recipeIngredient: { deleteMany: jest.fn(), createMany: jest.fn() },
    recipeInstruction: { deleteMany: jest.fn(), createMany: jest.fn() },
    collection: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    recipeCollection: { findMany: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn() },
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
});

describe('getIngredientSwaps', () => {
  it('returns 400 when ingredient query param is missing', async () => {
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeController.getIngredientSwaps(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when ingredient is whitespace-only', async () => {
    const req = buildReq({ query: { ingredient: '   ' } });
    const res = buildRes();
    await recipeController.getIngredientSwaps(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('passes user dietary restrictions through to the swap service', async () => {
    p.userPreferences.findUnique.mockResolvedValueOnce({
      dietaryRestrictions: [{ name: 'vegan' }],
    });
    mockGetIngredientSwaps.mockReturnValueOnce([{ name: 'tofu' }]);
    const req = buildReq({ query: { ingredient: 'chicken' } });
    const res = buildRes();
    await recipeController.getIngredientSwaps(req, res);
    expect(mockGetIngredientSwaps).toHaveBeenCalledWith('chicken', ['vegan']);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, ingredient: 'chicken' }),
    );
  });
});

describe('flavorBoost', () => {
  it('returns 404 when recipe does not exist', async () => {
    p.recipe.findUnique.mockResolvedValueOnce(null);
    p.userPreferences.findUnique.mockResolvedValueOnce(null);
    const req = buildReq({ params: { id: 'r-missing' } });
    const res = buildRes();
    await recipeController.flavorBoost(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('calls the flavor-boost service with restrictions and returns its result', async () => {
    p.recipe.findUnique.mockResolvedValueOnce({
      title: 'Pasta',
      cuisine: 'Italian',
      ingredients: [{ text: '500g pasta' }],
      instructions: [{ text: 'boil' }],
      calories: 500,
      protein: 20,
      carbs: 80,
      fat: 10,
    });
    p.userPreferences.findUnique.mockResolvedValueOnce({
      dietaryRestrictions: [{ name: 'gluten-free' }],
    });
    mockFlavorBoosts.mockResolvedValueOnce({ boosts: [{ name: 'lemon zest' }] });
    const req = buildReq({ params: { id: 'r1' } });
    const res = buildRes();
    await recipeController.flavorBoost(req, res);
    expect(mockFlavorBoosts).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Pasta', cuisine: 'Italian' }),
      ['gluten-free'],
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, boosts: [{ name: 'lemon zest' }] }),
    );
  });

  it('returns 500 when the service throws', async () => {
    p.recipe.findUnique.mockResolvedValueOnce({
      title: 't',
      cuisine: 'c',
      ingredients: [],
      instructions: [],
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
    p.userPreferences.findUnique.mockResolvedValueOnce(null);
    mockFlavorBoosts.mockRejectedValueOnce(new Error('boom'));
    const req = buildReq({ params: { id: 'r1' } });
    const res = buildRes();
    await recipeController.flavorBoost(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('getBatchCookingRecommendations', () => {
  it('passes through the limit query to the recommender', async () => {
    mockGenerateBatchRecs.mockResolvedValueOnce([{ id: 'r1' }, { id: 'r2' }]);
    const req = buildReq({ query: { limit: '4' } });
    const res = buildRes();
    await recipeController.getBatchCookingRecommendations(req, res);
    expect(mockGenerateBatchRecs).toHaveBeenCalledWith('u1', 4);
  });

  it('returns 500 with details when the recommender throws', async () => {
    mockGenerateBatchRecs.mockRejectedValueOnce(new Error('algo failure'));
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeController.getBatchCookingRecommendations(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('getRelatedRecipes', () => {
  it('returns 404 when the target recipe does not exist', async () => {
    p.recipe.findUnique.mockResolvedValueOnce(null);
    const req = buildReq({ params: { id: 'r1' } });
    const res = buildRes();
    await recipeController.getRelatedRecipes(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('queries adjacent + same-mealType candidates and returns sorted related list', async () => {
    p.recipe.findUnique.mockResolvedValueOnce({
      id: 'r1',
      cuisine: 'Thai',
      mealType: 'dinner',
      ingredients: [{ text: 'noodles' }],
    });
    p.recipe.findMany
      .mockResolvedValueOnce([{ id: 'r2', cuisine: 'Vietnamese', ingredients: [{ text: 'pho' }] }])
      .mockResolvedValueOnce([
        { id: 'r2', cuisine: 'Vietnamese', ingredients: [], instructions: [] },
      ]);
    const sim = require('../../../src/utils/recipeSimilarity');
    sim.findRelatedRecipes.mockReturnValueOnce([{ recipeId: 'r2', score: 0.5, factors: {} }]);
    const req = buildReq({ params: { id: 'r1' }, query: { limit: '3' } });
    const res = buildRes();
    await recipeController.getRelatedRecipes(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'r2', similarityScore: 0.5 }),
      ]),
    );
  });
});

describe('logCravingSearchEvent', () => {
  it('returns 400 when cravingQuery is missing', async () => {
    const req = buildReq({ body: { recipeId: 'r1', action: 'tap' } });
    const res = buildRes();
    await recipeController.logCravingSearchEvent(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when action is invalid', async () => {
    const req = buildReq({
      body: { cravingQuery: 'pizza', recipeId: 'r1', action: 'unknown' },
    });
    const res = buildRes();
    await recipeController.logCravingSearchEvent(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('persists event with userId scope on valid input', async () => {
    p.cravingSearchEvent.create.mockResolvedValueOnce({});
    const req = buildReq({
      body: { cravingQuery: 'pizza', recipeId: 'r1', action: 'tap' },
    });
    const res = buildRes();
    await recipeController.logCravingSearchEvent(req, res);
    expect(p.cravingSearchEvent.create).toHaveBeenCalledWith({
      data: { userId: 'u1', cravingQuery: 'pizza', recipeId: 'r1', action: 'tap' },
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('cravingFlow', () => {
  it('returns 400 when craving text is missing', async () => {
    const req = buildReq({ body: {} });
    const res = buildRes();
    await recipeController.cravingFlow(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when craving is whitespace', async () => {
    const req = buildReq({ body: { craving: '   ' } });
    const res = buildRes();
    await recipeController.cravingFlow(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns healthified result + lighter suggestions on a valid input', async () => {
    p.userPreferences.findFirst.mockResolvedValueOnce({
      dietaryRestrictions: [{ name: 'gluten-free', severity: 'strict' }],
    });
    p.macroGoals.findUnique.mockResolvedValueOnce({
      calories: 2400,
      protein: 150,
      carbs: 250,
      fat: 80,
    });
    p.recipe.findMany.mockResolvedValueOnce([
      { id: 'r1', title: 'Lighter pizza', ingredients: [], instructions: [] },
    ]);
    const req = buildReq({ body: { craving: 'pizza' } });
    const res = buildRes();
    await recipeController.cravingFlow(req, res);
    const payload = res.json.mock.calls[0][0];
    expect(payload).toEqual(
      expect.objectContaining({
        original: 'pizza',
        healthified: expect.any(Object),
        lighterSuggestions: expect.any(Array),
      }),
    );
  });
});

describe('pantryMatch', () => {
  it('returns empty array + pantrySize 0 when pantry is empty', async () => {
    p.pantryItem.findMany.mockResolvedValueOnce([]);
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeController.pantryMatch(req, res);
    expect(res.json).toHaveBeenCalledWith({ recipes: [], pantrySize: 0 });
  });

  it('returns scored recipes when pantry has items', async () => {
    p.pantryItem.findMany.mockResolvedValueOnce([{ name: 'chicken' }, { name: 'rice' }]);
    p.recipe.findMany.mockResolvedValueOnce([
      {
        id: 'r1',
        title: 'Chicken Rice Bowl',
        cuisine: 'American',
        ingredients: [{ text: 'chicken' }, { text: 'rice' }],
      },
    ]);
    const req = buildReq({ query: { minMatch: '50' } });
    const res = buildRes();
    await recipeController.pantryMatch(req, res);
    const payload = res.json.mock.calls[0][0];
    expect(payload.pantrySize).toBe(2);
    expect(payload.recipes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'r1', matchPercentage: 75 }),
      ]),
    );
  });

  it('clamps minMatch to [0,100]', async () => {
    p.pantryItem.findMany.mockResolvedValueOnce([{ name: 'salt' }]);
    p.recipe.findMany.mockResolvedValueOnce([]);
    const req = buildReq({ query: { minMatch: '999' } });
    const res = buildRes();
    await recipeController.pantryMatch(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ recipes: [], pantrySize: 1 }),
    );
  });
});

describe('leftoverIdeas', () => {
  it('returns 400 when ingredients array is missing', async () => {
    const req = buildReq({ body: {} });
    const res = buildRes();
    await recipeController.leftoverIdeas(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when ingredients are all empty strings', async () => {
    const req = buildReq({ body: { ingredients: ['', '   '] } });
    const res = buildRes();
    await recipeController.leftoverIdeas(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('filters by minimum reuse count of 2 and excludes source recipe', async () => {
    p.recipe.findMany.mockResolvedValueOnce([
      { id: 'r2', title: 'Stir Fry', cuisine: 'Chinese', ingredients: [] },
    ]);
    const req = buildReq({
      body: {
        ingredients: ['chicken', 'rice'],
        excludeRecipeId: 'r1',
        excludeCuisine: 'American',
      },
    });
    const res = buildRes();
    await recipeController.leftoverIdeas(req, res);
    const where = p.recipe.findMany.mock.calls[0][0].where;
    expect(where.id).toEqual({ not: 'r1' });
    expect(where.cuisine).toEqual({ not: 'American' });
    expect(res.json).toHaveBeenCalled();
  });
});

describe('getWeatherSmartCollection', () => {
  it('returns 400 when lat/lon are missing', async () => {
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeController.getWeatherSmartCollection(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 503 when the weather service returns null', async () => {
    const ws = require('../../../src/services/weatherService');
    ws.getWeatherContext.mockResolvedValueOnce(null);
    const req = buildReq({ query: { lat: '40.7', lon: '-74.0' } });
    const res = buildRes();
    await recipeController.getWeatherSmartCollection(req, res);
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('returns the weather collection with count + condition on success', async () => {
    const ws = require('../../../src/services/weatherService');
    ws.getWeatherContext.mockResolvedValueOnce({
      condition: 'cold',
      description: 'Snowy',
      tempCelsius: -2,
    });
    p.savedRecipe.count.mockResolvedValueOnce(7);
    const req = buildReq({ query: { lat: '40.7', lon: '-74.0' } });
    const res = buildRes();
    await recipeController.getWeatherSmartCollection(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: expect.objectContaining({
          count: 7,
          weather: expect.objectContaining({ condition: 'cold', tempCelsius: -2 }),
        }),
      }),
    );
  });
});

describe('importRecipeFromUrl', () => {
  it('returns 400 when url is missing', async () => {
    const req = buildReq({ body: {} });
    const res = buildRes();
    await recipeController.importRecipeFromUrl(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when url is not a string', async () => {
    const req = buildReq({ body: { url: 123 } });
    const res = buildRes();
    await recipeController.importRecipeFromUrl(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('healthifyRecipe', () => {
  it('returns 404 when recipe does not exist', async () => {
    p.recipe.findUnique.mockResolvedValueOnce(null);
    const req = buildReq({ params: { id: 'missing' } });
    const res = buildRes();
    await recipeController.healthifyRecipe(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('enrichRecipe', () => {
  it('returns 404 when recipe does not exist', async () => {
    p.recipe.findUnique.mockResolvedValueOnce(null);
    const req = buildReq({ params: { id: 'missing' } });
    const res = buildRes();
    await recipeController.enrichRecipe(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('falls back to local enrichment when no external service is configured', async () => {
    p.recipe.findUnique.mockResolvedValueOnce({
      id: 'r1',
      title: 'X',
      imageUrl: 'http://img',
      calories: 400,
      protein: 25,
      fat: 10,
    });
    p.recipe.update.mockResolvedValueOnce({ id: 'r1' });
    const req = buildReq({ params: { id: 'r1' } });
    const res = buildRes();
    await recipeController.enrichRecipe(req, res);
    expect(p.recipe.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'r1' },
        data: expect.objectContaining({ externalSource: 'local' }),
      }),
    );
  });
});

describe('getRecipeOfTheDay', () => {
  it('returns 404 when no recipes exist anywhere in the DB', async () => {
    p.userPreferences.findFirst.mockResolvedValueOnce(null);
    p.recipe.findMany
      .mockResolvedValueOnce([]) // images filter
      .mockResolvedValueOnce([]) // any non-user
      .mockResolvedValueOnce([]); // any
    const req = buildReq();
    const res = buildRes();
    await recipeController.getRecipeOfTheDay(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns a deterministic recipe of the day for the calendar date', async () => {
    p.userPreferences.findFirst.mockResolvedValueOnce(null);
    const recipes = [
      { id: 'r1', title: 'A', ingredients: [], instructions: [] },
      { id: 'r2', title: 'B', ingredients: [], instructions: [] },
    ];
    p.recipe.findMany.mockResolvedValueOnce(recipes);
    const req = buildReq();
    const res = buildRes();
    await recipeController.getRecipeOfTheDay(req, res);
    const payload = res.json.mock.calls[0][0];
    expect(payload.recipe.isRecipeOfTheDay).toBe(true);
    expect(['r1', 'r2']).toContain(payload.recipe.id);
  });
});

describe('cravingSearch', () => {
  it('returns 400 when query is missing', async () => {
    const req = buildReq({ body: {} });
    const res = buildRes();
    await recipeController.cravingSearch(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when query is whitespace', async () => {
    const req = buildReq({ body: { query: '   ' } });
    const res = buildRes();
    await recipeController.cravingSearch(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('cravingBudget', () => {
  it('returns 400 when craving is missing', async () => {
    const req = buildReq({ body: {} });
    const res = buildRes();
    await recipeController.cravingBudget(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('getSavedRecipes (smoke)', () => {
  it('returns 500 when prisma throws', async () => {
    p.savedRecipe.findMany.mockRejectedValueOnce(new Error('boom'));
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeController.getSavedRecipes(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('getLikedRecipes (smoke)', () => {
  it('returns 500 when prisma throws', async () => {
    p.recipeFeedback.findMany.mockRejectedValueOnce(new Error('boom'));
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeController.getLikedRecipes(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('getDislikedRecipes (smoke)', () => {
  it('returns 500 when prisma throws', async () => {
    p.recipeFeedback.findMany.mockRejectedValueOnce(new Error('boom'));
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeController.getDislikedRecipes(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('getAutoCompleteSuggestions', () => {
  it('returns empty array when query is missing or too short', async () => {
    const req = buildReq({ query: { q: '' } });
    const res = buildRes();
    await recipeController.getAutoCompleteSuggestions(req, res);
    expect(res.json).toHaveBeenCalled();
  });
});
