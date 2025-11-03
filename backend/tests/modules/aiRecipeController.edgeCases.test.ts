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

describe('AIRecipeController - Edge Cases', () => {
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

  describe('generateRecipe - Edge Cases', () => {
    test('should handle null user preferences', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(null);

      (aiRecipeService.generateRecipe as jest.Mock).mockResolvedValue({
        id: 'recipe-123',
        title: 'Test Recipe',
        calories: 500
      });
      (aiRecipeService.saveGeneratedRecipe as jest.Mock).mockResolvedValue({
        id: 'recipe-123',
        title: 'Test Recipe'
      });

      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      expect(aiRecipeService.generateRecipe).toHaveBeenCalledWith(
        expect.objectContaining({
          userPreferences: undefined,
          macroGoals: undefined,
          physicalProfile: undefined
        })
      );
    });

    test('should handle empty liked cuisines array', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        likedCuisines: [],
        dietaryRestrictions: [],
        bannedIngredients: [],
        spiceLevel: 'medium',
        cookTimePreference: 30
      });
      (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(null);

      (aiRecipeService.generateRecipe as jest.Mock).mockResolvedValue({
        id: 'recipe-123',
        title: 'Test Recipe'
      });
      (aiRecipeService.saveGeneratedRecipe as jest.Mock).mockResolvedValue({
        id: 'recipe-123'
      });

      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      // Should still generate recipe, maybe using all cuisines
      expect(aiRecipeService.generateRecipe).toHaveBeenCalled();
    });

    test('should handle single liked cuisine', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        likedCuisines: [{ name: 'Italian' }],
        dietaryRestrictions: [],
        bannedIngredients: [],
        spiceLevel: 'medium',
        cookTimePreference: 30
      });
      (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(null);

      (aiRecipeService.generateRecipe as jest.Mock).mockResolvedValue({
        id: 'recipe-123',
        title: 'Test Recipe'
      });
      (aiRecipeService.saveGeneratedRecipe as jest.Mock).mockResolvedValue({
        id: 'recipe-123'
      });

      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      const call = (aiRecipeService.generateRecipe as jest.Mock).mock.calls[0][0];
      expect(call.cuisineOverride).toBe('Italian');
    });

    test('should handle zero macro goals', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      });
      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(null);

      (aiRecipeService.generateRecipe as jest.Mock).mockResolvedValue({
        id: 'recipe-123',
        title: 'Test Recipe',
        calories: 0
      });
      (aiRecipeService.saveGeneratedRecipe as jest.Mock).mockResolvedValue({
        id: 'recipe-123'
      });

      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      const call = (aiRecipeService.generateRecipe as jest.Mock).mock.calls[0][0];
      expect(call.macroGoals?.calories).toBe(0);
    });

    test('should handle very large macro goals', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue({
        calories: 10000,
        protein: 500,
        carbs: 1000,
        fat: 400
      });
      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(null);

      (aiRecipeService.generateRecipe as jest.Mock).mockResolvedValue({
        id: 'recipe-123',
        title: 'Test Recipe',
        calories: 2500 // 25% of 10000 for breakfast
      });
      (aiRecipeService.saveGeneratedRecipe as jest.Mock).mockResolvedValue({
        id: 'recipe-123'
      });

      mockRequest.query = { mealType: 'breakfast' };

      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      const call = (aiRecipeService.generateRecipe as jest.Mock).mock.calls[0][0];
      expect(call.macroGoals?.calories).toBe(2500); // 25% of 10000
    });

    test('should handle invalid mealType in query', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(null);

      mockRequest.query = { mealType: 'invalid_meal_type' };

      (aiRecipeService.generateRecipe as jest.Mock).mockResolvedValue({
        id: 'recipe-123',
        title: 'Test Recipe'
      });
      (aiRecipeService.saveGeneratedRecipe as jest.Mock).mockResolvedValue({
        id: 'recipe-123'
      });

      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      // Should use invalid type as-is or default to random
      expect(aiRecipeService.generateRecipe).toHaveBeenCalled();
    });

    test('should handle non-numeric maxCookTime', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        likedCuisines: [],
        dietaryRestrictions: [],
        bannedIngredients: [],
        spiceLevel: 'medium',
        cookTimePreference: 30
      });

      mockRequest.query = { maxCookTime: 'not-a-number' };

      (aiRecipeService.generateRecipe as jest.Mock).mockResolvedValue({
        id: 'recipe-123',
        title: 'Test Recipe'
      });
      (aiRecipeService.saveGeneratedRecipe as jest.Mock).mockResolvedValue({
        id: 'recipe-123'
      });

      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      const call = (aiRecipeService.generateRecipe as jest.Mock).mock.calls[0][0];
      // Should use default cookTimePreference (30) since parseInt('not-a-number') = NaN
      expect(call.userPreferences?.cookTimePreference).toBe(30);
    });

    test('should handle negative maxCookTime', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        likedCuisines: [],
        dietaryRestrictions: [],
        bannedIngredients: [],
        spiceLevel: 'medium',
        cookTimePreference: 30
      });

      mockRequest.query = { maxCookTime: '-10' };

      (aiRecipeService.generateRecipe as jest.Mock).mockResolvedValue({
        id: 'recipe-123',
        title: 'Test Recipe'
      });
      (aiRecipeService.saveGeneratedRecipe as jest.Mock).mockResolvedValue({
        id: 'recipe-123'
      });

      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      const call = (aiRecipeService.generateRecipe as jest.Mock).mock.calls[0][0];
      expect(call.userPreferences?.cookTimePreference).toBe(-10); // Passes through
    });

    test('should handle database query errors', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection lost')
      );

      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });

    test('should handle service generation errors', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(null);

      (aiRecipeService.generateRecipe as jest.Mock).mockRejectedValue(
        new Error('OpenAI API rate limit exceeded')
      );

      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to generate recipe'
        })
      );
    });

    test('should handle save errors after successful generation', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(null);

      (aiRecipeService.generateRecipe as jest.Mock).mockResolvedValue({
        id: 'recipe-123',
        title: 'Test Recipe'
      });
      (aiRecipeService.saveGeneratedRecipe as jest.Mock).mockRejectedValue(
        new Error('Database save failed')
      );

      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    test('should handle all meal types in randomization', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(null);

      (aiRecipeService.generateRecipe as jest.Mock).mockResolvedValue({
        id: 'recipe-123',
        title: 'Test Recipe'
      });
      (aiRecipeService.saveGeneratedRecipe as jest.Mock).mockResolvedValue({
        id: 'recipe-123'
      });

      const mealTypesSeen = new Set<string>();

      // Call multiple times to test randomization
      for (let i = 0; i < 20; i++) {
        (aiRecipeService.generateRecipe as jest.Mock).mockClear();
        await controller.generateRecipe(mockRequest as Request, mockResponse as Response);
        const call = (aiRecipeService.generateRecipe as jest.Mock).mock.calls[0][0];
        mealTypesSeen.add(call.mealType);
      }

      // Should see variety in meal types (not always the same)
      expect(mealTypesSeen.size).toBeGreaterThan(1);
    });

    test('should handle very long cuisine name', async () => {
      const longCuisineName = 'A'.repeat(200);
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        likedCuisines: [{ name: longCuisineName }],
        dietaryRestrictions: [],
        bannedIngredients: [],
        spiceLevel: 'medium',
        cookTimePreference: 30
      });

      mockRequest.query = {};

      (aiRecipeService.generateRecipe as jest.Mock).mockResolvedValue({
        id: 'recipe-123',
        title: 'Test Recipe'
      });
      (aiRecipeService.saveGeneratedRecipe as jest.Mock).mockResolvedValue({
        id: 'recipe-123'
      });

      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      const call = (aiRecipeService.generateRecipe as jest.Mock).mock.calls[0][0];
      expect(call.cuisineOverride).toBe(longCuisineName);
    });
  });

  describe('generateDailyPlan - Edge Cases', () => {
    test('should handle missing macro goals', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(null);

      (aiRecipeService.generateDailyMealPlan as jest.Mock).mockResolvedValue({
        breakfast: { id: '1', title: 'Breakfast' },
        lunch: { id: '2', title: 'Lunch' },
        dinner: { id: '3', title: 'Dinner' },
        snack: { id: '4', title: 'Snack' }
      });

      await controller.generateDailyPlan(mockRequest as Request, mockResponse as Response);

      const call = (aiRecipeService.generateDailyMealPlan as jest.Mock).mock.calls[0][0];
      expect(call.macroGoals).toBeUndefined();
    });

    test('should handle partial meal plan generation failure', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue({
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 70
      });
      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(null);

      (aiRecipeService.generateDailyMealPlan as jest.Mock).mockRejectedValue(
        new Error('Failed to generate lunch')
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

    test('should handle zero macro goals in daily plan', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      });
      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(null);

      (aiRecipeService.generateDailyMealPlan as jest.Mock).mockRejectedValue(
        new Error('Cannot generate recipes with zero macros')
      );

      await controller.generateDailyPlan(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    test('should handle concurrent daily plan requests', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue({
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 70
      });
      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(null);

      (aiRecipeService.generateDailyMealPlan as jest.Mock).mockResolvedValue({
        breakfast: { id: '1', title: 'Breakfast' },
        lunch: { id: '2', title: 'Lunch' },
        dinner: { id: '3', title: 'Dinner' },
        snack: { id: '4', title: 'Snack' }
      });

      // Simulate concurrent requests
      const requests = Array(5).fill(null).map(() =>
        controller.generateDailyPlan(mockRequest as Request, mockResponse as Response)
      );

      await Promise.all(requests);

      // Should handle all requests (5 calls to generateDailyMealPlan)
      expect(aiRecipeService.generateDailyMealPlan).toHaveBeenCalledTimes(5);
    });
  });

  describe('Timing and Performance Edge Cases', () => {
    test('should log timing for very slow generation', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(null);

      // Simulate slow generation
      (aiRecipeService.generateRecipe as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          id: 'recipe-123',
          title: 'Test Recipe'
        }), 100))
      );
      (aiRecipeService.saveGeneratedRecipe as jest.Mock).mockResolvedValue({
        id: 'recipe-123'
      });

      const consoleLog = jest.spyOn(console, 'log').mockImplementation();

      await controller.generateRecipe(mockRequest as Request, mockResponse as Response);

      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('AI Recipe Generation: Completed in')
      );

      const timingLog = consoleLog.mock.calls.find(call =>
        call[0]?.toString().includes('Completed in')
      );
      expect(timingLog).toBeDefined();

      consoleLog.mockRestore();
    });
  });
});

