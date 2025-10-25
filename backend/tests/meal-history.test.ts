// backend/tests/meal-history.test.ts
import { Request, Response } from 'express';
import { mealHistoryController } from '../src/modules/mealHistory/mealHistoryController';

// Mock Prisma
const mockPrisma = {
  mealHistory: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn()
  },
  recipe: {
    findUnique: jest.fn()
  }
};

jest.mock('../src/lib/prisma', () => ({
  prisma: mockPrisma
}));

describe('Meal History Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockReq = {
      params: { id: 'meal-1' },
      body: {
        recipeId: 'recipe-1',
        date: '2024-01-01',
        feedback: 'delicious'
      },
      user: { id: 'user-1' }
    };
    
    mockRes = {
      json: mockJson,
      status: mockStatus
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMealHistory', () => {
    it('should return meal history for user', async () => {
      const mockMealHistory = [
        {
          id: 'meal-1',
          userId: 'user-1',
          recipeId: 'recipe-1',
          date: new Date('2024-01-01'),
          feedback: 'delicious',
          recipe: {
            id: 'recipe-1',
            title: 'Test Recipe',
            calories: 500,
            protein: 25,
            carbs: 40,
            fat: 20
          }
        }
      ];

      mockPrisma.mealHistory.findMany.mockResolvedValue(mockMealHistory);

      await mealHistoryController.getMealHistory(mockReq as Request, mockRes as Response);

      expect(mockPrisma.mealHistory.findMany).toHaveBeenCalledWith({
        where: { userId: 'temp-user-id' },
        include: {
          recipe: {
            include: {
              ingredients: { orderBy: { order: 'asc' } },
              instructions: { orderBy: { step: 'asc' } }
            }
          }
        },
        orderBy: { date: 'desc' }
      });

      expect(mockJson).toHaveBeenCalledWith(mockMealHistory);
    });

    it('should handle empty meal history', async () => {
      mockPrisma.mealHistory.findMany.mockResolvedValue([]);

      await mealHistoryController.getMealHistory(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith([]);
    });

    it('should handle database errors', async () => {
      mockPrisma.mealHistory.findMany.mockRejectedValue(new Error('Database error'));

      await mealHistoryController.getMealHistory(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to fetch meal history',
        details: 'Database error'
      });
    });
  });

  describe('addMealToHistory', () => {
    it('should add meal to history', async () => {
      const mockRecipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        calories: 500,
        protein: 25,
        carbs: 40,
        fat: 20
      };

      const mockMealHistory = {
        id: 'meal-1',
        userId: 'user-1',
        recipeId: 'recipe-1',
        date: new Date('2024-01-01'),
        feedback: 'delicious',
        recipe: mockRecipe
      };

      mockPrisma.recipe.findUnique.mockResolvedValue(mockRecipe);
      mockPrisma.mealHistory.create.mockResolvedValue(mockMealHistory);

      await mealHistoryController.addMealToHistory(mockReq as Request, mockRes as Response);

      expect(mockPrisma.recipe.findUnique).toHaveBeenCalledWith({
        where: { id: 'recipe-1' }
      });

      expect(mockPrisma.mealHistory.create).toHaveBeenCalledWith({
        data: {
          userId: 'temp-user-id',
          recipeId: 'recipe-1',
          date: new Date('2024-01-01'),
          feedback: 'delicious'
        },
        include: {
          recipe: {
            include: {
              ingredients: { orderBy: { order: 'asc' } },
              instructions: { orderBy: { step: 'asc' } }
            }
          }
        }
      });

      expect(mockJson).toHaveBeenCalledWith(mockMealHistory);
    });

    it('should handle recipe not found', async () => {
      mockPrisma.recipe.findUnique.mockResolvedValue(null);

      await mealHistoryController.addMealToHistory(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Recipe not found'
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.recipe.findUnique.mockResolvedValue({ id: 'recipe-1' });
      mockPrisma.mealHistory.create.mockRejectedValue(new Error('Database error'));

      await mealHistoryController.addMealToHistory(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to add meal to history',
        details: 'Database error'
      });
    });
  });

  describe('updateMealHistory', () => {
    it('should update meal history', async () => {
      const mockMealHistory = {
        id: 'meal-1',
        userId: 'user-1',
        recipeId: 'recipe-1',
        date: new Date('2024-01-01'),
        feedback: 'updated feedback'
      };

      mockPrisma.mealHistory.findFirst.mockResolvedValue(mockMealHistory);
      mockPrisma.mealHistory.update.mockResolvedValue(mockMealHistory);

      await mealHistoryController.updateMealHistory(mockReq as Request, mockRes as Response);

      expect(mockPrisma.mealHistory.findFirst).toHaveBeenCalledWith({
        where: { id: 'meal-1', userId: 'temp-user-id' }
      });

      expect(mockPrisma.mealHistory.update).toHaveBeenCalledWith({
        where: { id: 'meal-1' },
        data: {
          recipeId: 'recipe-1',
          date: new Date('2024-01-01'),
          feedback: 'delicious'
        },
        include: {
          recipe: {
            include: {
              ingredients: { orderBy: { order: 'asc' } },
              instructions: { orderBy: { step: 'asc' } }
            }
          }
        }
      });

      expect(mockJson).toHaveBeenCalledWith(mockMealHistory);
    });

    it('should handle meal not found', async () => {
      mockPrisma.mealHistory.findFirst.mockResolvedValue(null);

      await mealHistoryController.updateMealHistory(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Meal history not found'
      });
    });
  });

  describe('deleteMealHistory', () => {
    it('should delete meal history', async () => {
      const mockMealHistory = {
        id: 'meal-1',
        userId: 'user-1',
        recipeId: 'recipe-1'
      };

      mockPrisma.mealHistory.findFirst.mockResolvedValue(mockMealHistory);
      mockPrisma.mealHistory.delete.mockResolvedValue(mockMealHistory);

      await mealHistoryController.deleteMealHistory(mockReq as Request, mockRes as Response);

      expect(mockPrisma.mealHistory.findFirst).toHaveBeenCalledWith({
        where: { id: 'meal-1', userId: 'temp-user-id' }
      });

      expect(mockPrisma.mealHistory.delete).toHaveBeenCalledWith({
        where: { id: 'meal-1' }
      });

      expect(mockJson).toHaveBeenCalledWith({
        message: 'Meal history deleted successfully'
      });
    });

    it('should handle meal not found', async () => {
      mockPrisma.mealHistory.findFirst.mockResolvedValue(null);

      await mealHistoryController.deleteMealHistory(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Meal history not found'
      });
    });
  });

  describe('getMealHistoryAnalytics', () => {
    it('should return meal history analytics', async () => {
      const mockAnalytics = {
        totalMeals: 10,
        averageCalories: 450,
        favoriteCuisines: ['Italian', 'American'],
        mostConsumedRecipes: [
          { recipeId: 'recipe-1', count: 3, title: 'Pasta' }
        ],
        weeklyPattern: {
          monday: 2,
          tuesday: 1,
          wednesday: 3,
          thursday: 1,
          friday: 2,
          saturday: 1,
          sunday: 0
        }
      };

      mockPrisma.mealHistory.count.mockResolvedValue(10);
      mockPrisma.mealHistory.findMany.mockResolvedValue([
        { recipe: { calories: 400 } },
        { recipe: { calories: 500 } }
      ]);

      await mealHistoryController.getMealHistoryAnalytics(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });
});
