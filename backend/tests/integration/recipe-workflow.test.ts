// Recipe workflow integration tests (controller-level)
// Tests multi-step workflows that span across controllers

import { Request, Response } from 'express';

// Mock AIProviderManager to prevent crash from healthifyService
jest.mock('../../src/services/aiProviders/AIProviderManager', () => ({
  AIProviderManager: jest.fn().mockImplementation(() => ({
    generateRecipe: jest.fn(),
    getAvailableProviders: jest.fn().mockReturnValue(['mock']),
  }))
}));

jest.mock('../../src/services/healthifyService', () => ({
  healthifyService: { healthifyRecipe: jest.fn() }
}));

jest.mock('../../src/services/recipeImportService', () => ({
  importRecipeFromUrl: jest.fn(),
  RecipeImportError: class extends Error { constructor(m: string) { super(m); } }
}));

jest.mock('../../src/utils/batchCookingRecommendations', () => ({
  generateBatchCookingRecommendations: jest.fn()
}));
jest.mock('../../src/utils/runtimeImageVariation', () => ({
  varyImageUrlsForPage: jest.fn().mockImplementation((r: any) => r)
}));
jest.mock('../../src/utils/recommendationCache', () => ({
  recommendationCache: {
    get: jest.fn(), set: jest.fn(),
    has: jest.fn().mockReturnValue(false),
    invalidateUserCache: jest.fn(),
    getBehavioralData: jest.fn().mockResolvedValue({
      likedCuisines: [], dislikedIngredients: [], preferredCookTimes: [],
      likedRecipeIds: [], dislikedRecipeIds: []
    })
  }
}));
jest.mock('../../src/utils/cacheService', () => ({
  cacheService: { get: jest.fn(), set: jest.fn(), del: jest.fn() }
}));
jest.mock('../../src/utils/scoring', () => ({
  calculateRecipeScore: jest.fn().mockReturnValue(75),
  calculateMacroScore: jest.fn().mockReturnValue(70),
  calculateTasteScore: jest.fn().mockReturnValue(60)
}));
jest.mock('../../src/utils/behavioralScoring', () => ({
  calculateBehavioralScore: jest.fn().mockReturnValue(0),
  calculateBehavioralScoreFromProfile: jest.fn().mockReturnValue(0),
  buildUserTasteProfile: jest.fn().mockReturnValue({
    preferredCuisines: [], avoidedIngredients: [], preferredIngredients: [],
    preferredCookTimes: [], preferredDifficulty: 'medium'
  })
}));
jest.mock('../../src/utils/enhancedScoring', () => ({
  calculateEnhancedScore: jest.fn().mockReturnValue(0)
}));
jest.mock('../../src/utils/discriminatoryScoring', () => ({
  calculateDiscriminatoryScore: jest.fn().mockReturnValue(50)
}));
jest.mock('../../src/utils/healthGoalScoring', () => ({
  calculateHealthGoalScore: jest.fn().mockReturnValue(50),
  calculateHealthGoalMatch: jest.fn().mockReturnValue(50)
}));
jest.mock('../../src/utils/healthGrade', () => ({
  calculateHealthGrade: jest.fn().mockReturnValue({
    grade: 'B', score: 70,
    breakdown: { macroBalance: 70, ingredientQuality: 70 }
  })
}));
jest.mock('../../src/utils/nutritionalAnalysis', () => ({
  performNutritionalAnalysis: jest.fn().mockReturnValue({
    micronutrients: {}, omega3: {}, antioxidants: {},
    nutritionalDensityScore: 50, keyNutrients: [], nutrientGaps: []
  })
}));
jest.mock('../../src/utils/temporalScoring', () => ({
  calculateTemporalScore: jest.fn().mockReturnValue(0),
  getTimeAwareDefaults: jest.fn().mockReturnValue({}),
  getCurrentTemporalContext: jest.fn().mockReturnValue({
    timeOfDay: 'afternoon', dayOfWeek: 'wednesday', isWeekend: false,
    season: 'spring', mealType: 'lunch'
  }),
  analyzeUserTemporalPatterns: jest.fn().mockReturnValue({
    preferredMealTimes: {}, cookingFrequency: 'moderate', weekendPreference: 'same'
  })
}));
jest.mock('../../src/utils/privacyHelper', () => ({
  isDataSharingEnabledFromRequest: jest.fn().mockReturnValue(false),
  getPrivacySettingsFromRequest: jest.fn().mockReturnValue({
    analyticsEnabled: true, dataSharingEnabled: false, locationServicesEnabled: false
  })
}));
jest.mock('../../src/utils/recipeOptimizationHelpers', () => ({
  getRecipeOptimizationConfig: jest.fn().mockReturnValue({}),
  applyRecipeOptimizations: jest.fn().mockImplementation((r: any) => r),
  calculateOptimizationScore: jest.fn().mockReturnValue(0)
}));
jest.mock('../../src/utils/collaborativeFiltering', () => ({
  getCollaborativeRecommendations: jest.fn().mockResolvedValue([]),
  calculateCollaborativeScore: jest.fn().mockReturnValue(0)
}));
jest.mock('../../src/utils/dynamicWeightAdjustment', () => ({
  getDynamicWeights: jest.fn().mockReturnValue({ macro: 0.3, taste: 0.3, behavioral: 0.2, temporal: 0.1, enhanced: 0.1 }),
  adjustWeights: jest.fn().mockImplementation((w: any) => w)
}));
jest.mock('../../src/utils/externalScoring', () => ({
  calculateExternalScore: jest.fn().mockReturnValue(0)
}));
jest.mock('../../src/utils/healthMetricsScoring', () => ({
  calculateHealthMetricsScore: jest.fn().mockReturnValue(0)
}));
jest.mock('../../src/utils/predictiveScoring', () => ({
  calculatePredictiveScore: jest.fn().mockReturnValue(0)
}));
jest.mock('../../src/services/recipeGenerationService', () => ({
  recipeGenerationService: { generateRecipe: jest.fn() }
}));
jest.mock('../../src/services/spoonacularService', () => ({
  spoonacularService: { searchRecipes: jest.fn() }
}));
jest.mock('../../src/services/aiEnrichmentService', () => ({
  aiEnrichmentService: { enrichRecipe: jest.fn() }
}));

// Mock encryption for user controller
jest.mock('../../src/utils/encryption', () => ({
  encrypt: (val: string) => `encrypted_${val}`,
  decrypt: (val: string) => val.startsWith('encrypted_') ? val.replace('encrypted_', '') : val,
}));

// Mock Prisma
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    recipe: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    recipeIngredient: {
      deleteMany: jest.fn(),
      createMany: jest.fn()
    },
    recipeInstruction: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn()
    },
    savedRecipe: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn()
    },
    recipeFeedback: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn()
    },
    userPreferences: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn()
    },
    macroGoals: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn()
    },
    userPhysicalProfile: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn()
    }
  }
}));

import { recipeController } from '../../src/modules/recipe/recipeController';
import { prisma } from '../../src/lib/prisma';

describe('Recipe Workflow Integration', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockReq = {
      params: {},
      body: {},
      query: {},
      headers: {},
      user: { id: 'test-user-id', email: 'test@example.com' }
    };

    mockRes = {
      json: mockJson,
      status: mockStatus,
      setHeader: jest.fn(),
      set: jest.fn()
    };
  });

  describe('Recipe CRUD Operations', () => {
    test('should complete full recipe lifecycle: create → get → save → like → delete', async () => {
      const mockCreatedRecipe = {
        id: 'recipe-1',
        title: 'Integration Test Recipe',
        description: 'Test Description',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 500,
        protein: 25,
        carbs: 50,
        fat: 20,
        userId: 'test-user-id',
        isUserCreated: true,
        ingredients: [
          { text: 'pasta', order: 1 },
          { text: 'sauce', order: 2 }
        ],
        instructions: [
          { step: 1, text: 'Cook pasta' },
          { step: 2, text: 'Add sauce' }
        ]
      };

      // Step 1: Create recipe
      (prisma.recipe.create as jest.Mock).mockResolvedValue(mockCreatedRecipe);
      (prisma.recipeInstruction.create as jest.Mock).mockResolvedValue({});
      (prisma.savedRecipe.create as jest.Mock).mockResolvedValue({});
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockCreatedRecipe);

      mockReq.body = {
        title: 'Integration Test Recipe',
        description: 'Test Description',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 500,
        protein: 25,
        carbs: 50,
        fat: 20,
        ingredients: ['pasta', 'sauce'],
        instructions: ['Cook pasta', 'Add sauce']
      };

      await recipeController.createRecipe(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ title: 'Integration Test Recipe' })
        })
      );

      // Step 2: Get recipe by ID
      jest.clearAllMocks();
      mockRes = { json: mockJson = jest.fn(), status: mockStatus = jest.fn().mockReturnValue({ json: mockJson }), setHeader: jest.fn(), set: jest.fn() };
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockCreatedRecipe);
      mockReq.params = { id: 'recipe-1' };

      await recipeController.getRecipe(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'recipe-1',
          title: 'Integration Test Recipe'
        })
      );

      // Step 3: Save recipe to cookbook
      jest.clearAllMocks();
      mockRes = { json: mockJson = jest.fn(), status: mockStatus = jest.fn().mockReturnValue({ json: mockJson }), setHeader: jest.fn(), set: jest.fn() };
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockCreatedRecipe);
      (prisma.savedRecipe.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.savedRecipe.create as jest.Mock).mockResolvedValue({
        id: 'saved-1', recipeId: 'recipe-1', userId: 'test-user-id'
      });

      await recipeController.saveRecipe(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({ message: 'Recipe saved successfully' });

      // Step 4: Like recipe
      jest.clearAllMocks();
      mockRes = { json: mockJson = jest.fn(), status: mockStatus = jest.fn().mockReturnValue({ json: mockJson }), setHeader: jest.fn(), set: jest.fn() };
      (prisma.recipeFeedback.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.recipeFeedback.create as jest.Mock).mockResolvedValue({
        id: 'fb-1', recipeId: 'recipe-1', userId: 'test-user-id', liked: true, disliked: false
      });

      await recipeController.likeRecipe(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({ message: 'Recipe liked successfully' });

      // Step 5: Delete recipe
      jest.clearAllMocks();
      mockRes = { json: mockJson = jest.fn(), status: mockStatus = jest.fn().mockReturnValue({ json: mockJson }), setHeader: jest.fn(), set: jest.fn() };
      (prisma.recipeInstruction.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.recipeIngredient.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.savedRecipe.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.recipe.delete as jest.Mock).mockResolvedValue({});

      await recipeController.deleteRecipe(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({ success: true });

      // Step 6: Verify deletion (recipe not found)
      jest.clearAllMocks();
      mockRes = { json: mockJson = jest.fn(), status: mockStatus = jest.fn().mockReturnValue({ json: mockJson }), setHeader: jest.fn(), set: jest.fn() };
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(null);

      await recipeController.getRecipe(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });

    test('should handle save-then-unsave workflow', async () => {
      const mockRecipe = { id: 'recipe-1', title: 'Test Recipe' };

      // Save recipe
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockRecipe);
      (prisma.savedRecipe.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.savedRecipe.create as jest.Mock).mockResolvedValue({
        id: 'saved-1', recipeId: 'recipe-1', userId: 'test-user-id'
      });

      mockReq.params = { id: 'recipe-1' };

      await recipeController.saveRecipe(mockReq as Request, mockRes as Response);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Recipe saved successfully' });

      // Try saving again — should get 409
      jest.clearAllMocks();
      mockRes = { json: mockJson = jest.fn(), status: mockStatus = jest.fn().mockReturnValue({ json: mockJson }), setHeader: jest.fn(), set: jest.fn() };
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockRecipe);
      (prisma.savedRecipe.findFirst as jest.Mock).mockResolvedValue({ id: 'saved-1' });

      await recipeController.saveRecipe(mockReq as Request, mockRes as Response);
      expect(mockStatus).toHaveBeenCalledWith(409);

      // Unsave
      jest.clearAllMocks();
      mockRes = { json: mockJson = jest.fn(), status: mockStatus = jest.fn().mockReturnValue({ json: mockJson }), setHeader: jest.fn(), set: jest.fn() };
      (prisma.savedRecipe.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await recipeController.unsaveRecipe(mockReq as Request, mockRes as Response);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Recipe unsaved successfully' });
    });

    test('should handle like-then-dislike toggle', async () => {
      mockReq.params = { id: 'recipe-1' };

      // Like recipe (new feedback)
      (prisma.recipeFeedback.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.recipeFeedback.create as jest.Mock).mockResolvedValue({
        id: 'fb-1', liked: true, disliked: false
      });

      await recipeController.likeRecipe(mockReq as Request, mockRes as Response);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Recipe liked successfully' });

      // Dislike same recipe (update existing feedback)
      jest.clearAllMocks();
      mockRes = { json: mockJson = jest.fn(), status: mockStatus = jest.fn().mockReturnValue({ json: mockJson }), setHeader: jest.fn(), set: jest.fn() };
      (prisma.recipeFeedback.findFirst as jest.Mock).mockResolvedValue({
        id: 'fb-1', liked: true, disliked: false
      });
      (prisma.recipeFeedback.update as jest.Mock).mockResolvedValue({
        id: 'fb-1', liked: false, disliked: true
      });

      await recipeController.dislikeRecipe(mockReq as Request, mockRes as Response);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Recipe disliked successfully' });

      // Verify update was called with correct flags
      expect(prisma.recipeFeedback.update).toHaveBeenCalledWith({
        where: { id: 'fb-1' },
        data: { liked: false, disliked: true }
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors on recipe fetch', async () => {
      (prisma.recipe.findUnique as jest.Mock).mockRejectedValue(new Error('Database connection failed'));
      mockReq.params = { id: 'recipe-1' };

      await recipeController.getRecipe(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });

    test('should handle invalid recipe ID (not found)', async () => {
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(null);
      mockReq.params = { id: 'invalid-id' };

      await recipeController.getRecipe(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Recipe not found' });
    });

    test('should handle save of non-existent recipe', async () => {
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(null);
      mockReq.params = { id: 'nonexistent' };

      await recipeController.saveRecipe(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Recipe not found' });
    });
  });
});
