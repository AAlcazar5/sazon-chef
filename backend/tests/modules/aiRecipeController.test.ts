import { Request, Response } from 'express';
import { AIRecipeController } from '../../src/modules/aiRecipe/aiRecipeController';
import { aiRecipeService } from '../../src/services/aiRecipeService';
import { prisma } from '../../src/lib/prisma';

// Mock dependencies
jest.mock('../../src/services/aiRecipeService');
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    userPreferences: {
      findUnique: jest.fn()
    },
    macroGoals: {
      findUnique: jest.fn()
    },
    userPhysicalProfile: {
      findUnique: jest.fn()
    }
  }
}));

describe('AIRecipeController', () => {
  let controller: AIRecipeController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AIRecipeController();

    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };

    mockRequest = {
      query: {},
      body: {}
    };
  });

  describe('generateRecipe', () => {
    const mockGeneratedRecipe = {
      id: 'recipe-123',
      title: 'Test Recipe',
      description: 'A test recipe',
      cuisine: 'Italian',
      cookTime: 30,
      difficulty: 'medium',
      servings: 1,
      calories: 500,
      protein: 30,
      carbs: 50,
      fat: 20,
      fiber: 5,
      imageUrl: 'https://example.com/image.jpg',
      source: 'ai-generated',
      ingredients: [],
      instructions: []
    };

    beforeEach(() => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        likedCuisines: [{ name: 'Italian' }],
        dietaryRestrictions: [],
        bannedIngredients: [],
        spiceLevel: 'medium',
        cookTimePreference: 30
      });

      (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue({
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 70
      });

      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue({
        gender: 'male',
        age: 30,
        activityLevel: 'active',
        fitnessGoal: 'maintain'
      });

      (aiRecipeService.generateRecipe as jest.Mock).mockResolvedValue(mockGeneratedRecipe);
      (aiRecipeService.saveGeneratedRecipe as jest.Mock).mockResolvedValue(mockGeneratedRecipe);
    });

    test('should fetch user preferences and generate recipe', async () => {
      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      expect(prisma.userPreferences.findUnique).toHaveBeenCalled();
      expect(prisma.macroGoals.findUnique).toHaveBeenCalled();
      expect(prisma.userPhysicalProfile.findUnique).toHaveBeenCalled();
      expect(aiRecipeService.generateRecipe).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          recipe: expect.objectContaining({
            title: 'Test Recipe'
          })
        })
      );
    });

    test('should randomize meal type if not provided', async () => {
      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      const generateCall = (aiRecipeService.generateRecipe as jest.Mock).mock.calls[0][0];
      expect(['breakfast', 'lunch', 'dinner', 'snack']).toContain(generateCall.mealType);
    });

    test('should use provided meal type', async () => {
      mockRequest.query = { mealType: 'breakfast' };

      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      const generateCall = (aiRecipeService.generateRecipe as jest.Mock).mock.calls[0][0];
      expect(generateCall.mealType).toBe('breakfast');
    });

    test('should randomize cuisine from user preferences', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        likedCuisines: [{ name: 'Italian' }, { name: 'Mexican' }, { name: 'Thai' }],
        dietaryRestrictions: [],
        bannedIngredients: [],
        spiceLevel: 'medium',
        cookTimePreference: 30
      });

      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      const generateCall = (aiRecipeService.generateRecipe as jest.Mock).mock.calls[0][0];
      expect(['Italian', 'Mexican', 'Thai']).toContain(generateCall.cuisineOverride);
    });

    test('should use provided cuisine override', async () => {
      mockRequest.query = { cuisine: 'French' };

      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      const generateCall = (aiRecipeService.generateRecipe as jest.Mock).mock.calls[0][0];
      expect(generateCall.cuisineOverride).toBe('French');
    });

    test('should distribute macros for meal type', async () => {
      mockRequest.query = { mealType: 'breakfast' };

      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      const generateCall = (aiRecipeService.generateRecipe as jest.Mock).mock.calls[0][0];
      
      // Breakfast should be 25% of daily macros
      expect(generateCall.macroGoals?.calories).toBe(500); // 2000 * 0.25
      expect(generateCall.macroGoals?.protein).toBe(38); // 150 * 0.25 rounded
    });

    test('should respect maxCookTime filter', async () => {
      mockRequest.query = { maxCookTime: '45' };

      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      const generateCall = (aiRecipeService.generateRecipe as jest.Mock).mock.calls[0][0];
      expect(generateCall.userPreferences?.cookTimePreference).toBe(45);
    });

    test('should handle missing user preferences gracefully', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      expect(aiRecipeService.generateRecipe).toHaveBeenCalled();
      const generateCall = (aiRecipeService.generateRecipe as jest.Mock).mock.calls[0][0];
      expect(generateCall.userPreferences).toBeUndefined();
      expect(generateCall.macroGoals).toBeUndefined();
    });

    test('should pass dietary restrictions and banned ingredients', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        likedCuisines: [],
        dietaryRestrictions: [{ name: 'Vegetarian' }, { name: 'Gluten-Free' }],
        bannedIngredients: [{ name: 'Peanuts' }],
        spiceLevel: 'medium',
        cookTimePreference: 30
      });

      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      const generateCall = (aiRecipeService.generateRecipe as jest.Mock).mock.calls[0][0];
      expect(generateCall.userPreferences?.dietaryRestrictions).toEqual(['Vegetarian', 'Gluten-Free']);
      expect(generateCall.userPreferences?.bannedIngredients).toEqual(['Peanuts']);
    });

    test('should save generated recipe to database', async () => {
      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      expect(aiRecipeService.saveGeneratedRecipe).toHaveBeenCalledWith(
        mockGeneratedRecipe,
        'temp-user-id'
      );
    });

    test('should handle errors gracefully', async () => {
      (aiRecipeService.generateRecipe as jest.Mock).mockRejectedValue(new Error('Generation failed'));

      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to generate recipe'
        })
      );
    });

    test('should log generation timing', async () => {
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();

      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('AI Recipe Generation: Request started')
      );
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('AI Recipe Generation: Completed in')
      );

      consoleLog.mockRestore();
    });
  });

  describe('generateDailyPlan', () => {
    const mockMealPlan = {
      breakfast: {
        id: 'recipe-1',
        title: 'Breakfast Recipe',
        calories: 500
      },
      lunch: {
        id: 'recipe-2',
        title: 'Lunch Recipe',
        calories: 600
      },
      dinner: {
        id: 'recipe-3',
        title: 'Dinner Recipe',
        calories: 700
      },
      snack: {
        id: 'recipe-4',
        title: 'Snack Recipe',
        calories: 200
      }
    };

    beforeEach(() => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        likedCuisines: [],
        dietaryRestrictions: [],
        bannedIngredients: [],
        spiceLevel: 'medium',
        cookTimePreference: 30
      });

      (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue({
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 70
      });

      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(null);

      (aiRecipeService.generateDailyMealPlan as jest.Mock).mockResolvedValue(mockMealPlan);
    });

    test('should generate daily meal plan', async () => {
      await controller.generateDailyPlan(mockRequest as Request, mockResponse as Response);

      expect(aiRecipeService.generateDailyMealPlan).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          meals: expect.objectContaining({
            breakfast: expect.objectContaining({ title: 'Breakfast Recipe' }),
            lunch: expect.objectContaining({ title: 'Lunch Recipe' }),
            dinner: expect.objectContaining({ title: 'Dinner Recipe' }),
            snack: expect.objectContaining({ title: 'Snack Recipe' })
          })
        })
      );
    });

    test('should handle errors in daily plan generation', async () => {
      (aiRecipeService.generateDailyMealPlan as jest.Mock).mockRejectedValue(
        new Error('Plan generation failed')
      );

      await controller.generateDailyPlan(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to generate daily meal plan'
        })
      );
    });
  });
});

