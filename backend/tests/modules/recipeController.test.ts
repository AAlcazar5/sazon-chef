import { Request, Response } from 'express';

// Mock AIProviderManager before anything imports healthifyService
jest.mock('../../src/services/aiProviders/AIProviderManager', () => ({
  AIProviderManager: jest.fn().mockImplementation(() => ({
    generateRecipe: jest.fn(),
    getAvailableProviders: jest.fn().mockReturnValue(['mock']),
  }))
}));

// Mock healthifyService
jest.mock('../../src/services/healthifyService', () => ({
  healthifyService: { healthifyRecipe: jest.fn() }
}));

// Mock recipeImportService
jest.mock('../../src/services/recipeImportService', () => ({
  importRecipeFromUrl: jest.fn(),
  RecipeImportError: class RecipeImportError extends Error {
    constructor(message: string) { super(message); this.name = 'RecipeImportError'; }
  }
}));

// Mock utility modules used by recipeController
jest.mock('../../src/utils/batchCookingRecommendations', () => ({
  generateBatchCookingRecommendations: jest.fn()
}));
jest.mock('../../src/utils/runtimeImageVariation', () => ({
  varyImageUrlsForPage: jest.fn().mockImplementation((recipes: any) => recipes)
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
jest.mock('../../src/utils/privacyHelper', () => ({
  isDataSharingEnabledFromRequest: jest.fn().mockReturnValue(false),
  getPrivacySettingsFromRequest: jest.fn().mockReturnValue({
    analyticsEnabled: true, dataSharingEnabled: false, locationServicesEnabled: false
  })
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
    userPreferences: {
      findFirst: jest.fn(),
      findUnique: jest.fn()
    },
    macroGoals: {
      findFirst: jest.fn(),
      findUnique: jest.fn()
    },
    userPhysicalProfile: {
      findFirst: jest.fn(),
      findUnique: jest.fn()
    }
  }
}));

import { recipeController } from '../../src/modules/recipe/recipeController';
import { prisma } from '../../src/lib/prisma';

describe('Recipe Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      params: {},
      body: {},
      query: {},
      headers: {},
      user: { id: 'test-user-id', email: 'test@example.com' }
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      set: jest.fn()
    };
  });

  describe('getRecipes', () => {
    beforeEach(() => {
      (prisma.recipe.count as jest.Mock).mockResolvedValue(2);
    });

    test('should get recipes with pagination', async () => {
      const mockRecipes = [
        { id: '1', title: 'Recipe 1', calories: 400, protein: 30, carbs: 40, fat: 15, ingredients: [] },
        { id: '2', title: 'Recipe 2', calories: 500, protein: 25, carbs: 50, fat: 20, ingredients: [] }
      ];

      (prisma.recipe.findMany as jest.Mock).mockResolvedValue(mockRecipes);

      mockReq.query = { page: '0', limit: '10' };

      await recipeController.getRecipes(mockReq as Request, mockRes as Response);

      expect(prisma.recipe.findMany).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          recipes: expect.any(Array),
          pagination: expect.objectContaining({
            page: 0,
            limit: 10,
            total: 2
          })
        })
      );
    });

    test('should filter by cuisine', async () => {
      (prisma.recipe.findMany as jest.Mock).mockResolvedValue([
        { id: '1', title: 'Italian Recipe', calories: 400, protein: 30, carbs: 40, fat: 15, ingredients: [] }
      ]);
      (prisma.recipe.count as jest.Mock).mockResolvedValue(1);

      mockReq.query = { cuisine: 'Italian' };

      await recipeController.getRecipes(mockReq as Request, mockRes as Response);

      // Check the where clause includes cuisine
      const findManyCall = (prisma.recipe.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.cuisine).toBe('Italian');
    });

    test('should filter by max cook time', async () => {
      (prisma.recipe.findMany as jest.Mock).mockResolvedValue([
        { id: '1', title: 'Quick Recipe', cookTime: 20, calories: 300, protein: 20, carbs: 30, fat: 10, ingredients: [] }
      ]);
      (prisma.recipe.count as jest.Mock).mockResolvedValue(1);

      mockReq.query = { maxCookTime: '30' };

      await recipeController.getRecipes(mockReq as Request, mockRes as Response);

      const findManyCall = (prisma.recipe.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.cookTime).toEqual({ lte: 30 });
    });
  });

  describe('getRecipe', () => {
    test('should get single recipe by ID', async () => {
      const mockRecipe = {
        id: '1', title: 'Test Recipe',
        calories: 400, protein: 30, carbs: 40, fat: 15,
        ingredients: [{ text: 'chicken', order: 1 }],
        instructions: [{ step: 1, text: 'Cook' }]
      };

      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockRecipe);

      mockReq.params = { id: '1' };

      await recipeController.getRecipe(mockReq as Request, mockRes as Response);

      expect(prisma.recipe.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        }
      });

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          title: 'Test Recipe',
          healthGrade: 'B'
        })
      );
    });

    test('should return 404 for non-existent recipe', async () => {
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(null);

      mockReq.params = { id: '999' };

      await recipeController.getRecipe(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Recipe not found' });
    });
  });

  describe('createRecipe', () => {
    test('should create recipe with valid data', async () => {
      const recipeData = {
        title: 'Test Recipe',
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

      const createdRecipe = {
        id: 'new-recipe-1',
        ...recipeData,
        userId: 'test-user-id',
        isUserCreated: true,
        ingredients: [
          { text: 'pasta', order: 1 },
          { text: 'sauce', order: 2 }
        ]
      };

      const fullRecipe = {
        ...createdRecipe,
        instructions: [
          { step: 1, text: 'Cook pasta' },
          { step: 2, text: 'Add sauce' }
        ]
      };

      (prisma.recipe.create as jest.Mock).mockResolvedValue(createdRecipe);
      (prisma.recipeInstruction.create as jest.Mock).mockResolvedValue({});
      (prisma.savedRecipe.create as jest.Mock).mockResolvedValue({});
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(fullRecipe);

      mockReq.body = recipeData;

      await recipeController.createRecipe(mockReq as Request, mockRes as Response);

      expect(prisma.recipe.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Test Recipe',
            userId: 'test-user-id',
            isUserCreated: true,
          }),
          include: expect.objectContaining({
            ingredients: true
          })
        })
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ title: 'Test Recipe' })
        })
      );
    });
  });

  describe('updateRecipe', () => {
    test('should update recipe', async () => {
      const updatedRecipe = {
        id: 'recipe-1',
        title: 'Updated Recipe',
        ingredients: [],
        instructions: []
      };

      (prisma.recipe.update as jest.Mock).mockResolvedValue({});
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(updatedRecipe);

      mockReq.params = { id: 'recipe-1' };
      mockReq.body = { title: 'Updated Recipe' };

      await recipeController.updateRecipe(mockReq as Request, mockRes as Response);

      expect(prisma.recipe.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'recipe-1' },
          data: expect.objectContaining({ title: 'Updated Recipe' })
        })
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ title: 'Updated Recipe' })
        })
      );
    });
  });

  describe('deleteRecipe', () => {
    test('should delete recipe with cascade', async () => {
      (prisma.recipeInstruction.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.recipeIngredient.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.savedRecipe.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.recipe.delete as jest.Mock).mockResolvedValue({});

      mockReq.params = { id: 'recipe-1' };

      await recipeController.deleteRecipe(mockReq as Request, mockRes as Response);

      // Should cascade deletes in order
      expect(prisma.recipeInstruction.deleteMany).toHaveBeenCalledWith({
        where: { recipeId: 'recipe-1' }
      });
      expect(prisma.recipeIngredient.deleteMany).toHaveBeenCalledWith({
        where: { recipeId: 'recipe-1' }
      });
      expect(prisma.savedRecipe.deleteMany).toHaveBeenCalledWith({
        where: { recipeId: 'recipe-1' }
      });
      expect(prisma.recipe.delete).toHaveBeenCalledWith({
        where: { id: 'recipe-1' }
      });

      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('saveRecipe', () => {
    test('should save recipe successfully', async () => {
      const mockRecipe = { id: '1', title: 'Test Recipe' };

      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockRecipe);
      (prisma.savedRecipe.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.savedRecipe.create as jest.Mock).mockResolvedValue({
        id: 'saved-1', recipeId: '1', userId: 'test-user-id'
      });

      mockReq.params = { id: '1' };

      await recipeController.saveRecipe(mockReq as Request, mockRes as Response);

      expect(prisma.savedRecipe.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          recipeId: '1',
          userId: 'test-user-id'
        })
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Recipe saved successfully'
      });
    });

    test('should return 404 for non-existent recipe', async () => {
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(null);

      mockReq.params = { id: '999' };

      await recipeController.saveRecipe(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Recipe not found'
      });
    });

    test('should return 409 if recipe already saved', async () => {
      const mockRecipe = { id: '1', title: 'Test Recipe' };
      const existingSave = { id: 'saved-1', recipeId: '1', userId: 'test-user-id' };

      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockRecipe);
      (prisma.savedRecipe.findFirst as jest.Mock).mockResolvedValue(existingSave);

      mockReq.params = { id: '1' };

      await recipeController.saveRecipe(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Recipe already saved'
      });
    });
  });

  describe('unsaveRecipe', () => {
    test('should unsave recipe successfully', async () => {
      (prisma.savedRecipe.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      mockReq.params = { id: '1' };

      await recipeController.unsaveRecipe(mockReq as Request, mockRes as Response);

      expect(prisma.savedRecipe.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          recipeId: '1'
        }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Recipe unsaved successfully'
      });
    });
  });

  describe('likeRecipe', () => {
    test('should like recipe successfully (new feedback)', async () => {
      (prisma.recipeFeedback.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.recipeFeedback.create as jest.Mock).mockResolvedValue({
        id: 'feedback-1', recipeId: '1', userId: 'test-user-id', liked: true, disliked: false
      });

      mockReq.params = { id: '1' };

      await recipeController.likeRecipe(mockReq as Request, mockRes as Response);

      expect(prisma.recipeFeedback.create).toHaveBeenCalledWith({
        data: {
          recipeId: '1',
          userId: 'test-user-id',
          liked: true,
          disliked: false
        }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Recipe liked successfully'
      });
    });

    test('should update existing feedback when liking', async () => {
      const existing = { id: 'feedback-1', recipeId: '1', userId: 'test-user-id', liked: false, disliked: true };
      (prisma.recipeFeedback.findFirst as jest.Mock).mockResolvedValue(existing);
      (prisma.recipeFeedback.update as jest.Mock).mockResolvedValue({
        ...existing, liked: true, disliked: false
      });

      mockReq.params = { id: '1' };

      await recipeController.likeRecipe(mockReq as Request, mockRes as Response);

      expect(prisma.recipeFeedback.update).toHaveBeenCalledWith({
        where: { id: 'feedback-1' },
        data: { liked: true, disliked: false }
      });
    });
  });

  describe('dislikeRecipe', () => {
    test('should dislike recipe successfully (new feedback)', async () => {
      (prisma.recipeFeedback.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.recipeFeedback.create as jest.Mock).mockResolvedValue({
        id: 'feedback-1', recipeId: '1', userId: 'test-user-id', liked: false, disliked: true
      });

      mockReq.params = { id: '1' };

      await recipeController.dislikeRecipe(mockReq as Request, mockRes as Response);

      expect(prisma.recipeFeedback.create).toHaveBeenCalledWith({
        data: {
          recipeId: '1',
          userId: 'test-user-id',
          liked: false,
          disliked: true
        }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Recipe disliked successfully'
      });
    });
  });
});
