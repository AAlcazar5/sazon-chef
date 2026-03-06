// backend/tests/meal-history.test.ts
import { Request, Response } from 'express';
import { mealHistoryController } from '../src/modules/mealHistory/mealHistoryController';

// Mock Prisma - use factory function to avoid hoisting issues
jest.mock('../src/lib/prisma', () => ({
  prisma: {
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
  }
}));

// Import after mock
import { prisma } from '../src/lib/prisma';
const mockPrisma = prisma as any;

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
      query: {},
      user: { id: 'user-1', email: 'user1@example.com' }
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
          consumed: true,
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
        where: { userId: 'user-1' },
        include: {
          recipe: {
            include: {
              ingredients: { orderBy: { order: 'asc' } },
              instructions: { orderBy: { step: 'asc' } }
            }
          }
        },
        orderBy: { date: 'desc' },
        take: 50,
        skip: 0
      });

      // Response is { mealHistory, summary, pagination }
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          mealHistory: mockMealHistory,
          summary: expect.any(Object),
          pagination: expect.objectContaining({
            limit: 50,
            offset: 0,
            total: 1
          })
        })
      );
    });

    it('should handle empty meal history', async () => {
      mockPrisma.mealHistory.findMany.mockResolvedValue([]);

      await mealHistoryController.getMealHistory(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          mealHistory: [],
          summary: expect.any(Object),
          pagination: expect.objectContaining({ total: 0 })
        })
      );
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

      const mockMealEntry = {
        id: 'meal-1',
        userId: 'user-1',
        recipeId: 'recipe-1',
        date: new Date('2024-01-01'),
        consumed: true,
        feedback: 'delicious',
        recipe: mockRecipe
      };

      mockPrisma.recipe.findUnique.mockResolvedValue(mockRecipe);
      mockPrisma.mealHistory.create.mockResolvedValue(mockMealEntry);

      await mealHistoryController.addMealToHistory(mockReq as Request, mockRes as Response);

      expect(mockPrisma.recipe.findUnique).toHaveBeenCalledWith({
        where: { id: 'recipe-1' }
      });

      expect(mockPrisma.mealHistory.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          recipeId: 'recipe-1',
          date: new Date('2024-01-01'),
          consumed: true,
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

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Meal added to history successfully',
        mealEntry: mockMealEntry
      });
    });

    it('should handle recipe not found', async () => {
      mockPrisma.recipe.findUnique.mockResolvedValue(null);

      await mealHistoryController.addMealToHistory(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Recipe not found',
        message: 'The specified recipe does not exist'
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
      const mockExisting = {
        id: 'meal-1',
        userId: 'user-1',
        recipeId: 'recipe-1'
      };

      const mockUpdated = {
        id: 'meal-1',
        userId: 'user-1',
        recipeId: 'recipe-1',
        date: new Date('2024-01-01'),
        feedback: 'delicious'
      };

      mockReq.body = { feedback: 'delicious' };

      mockPrisma.mealHistory.findFirst.mockResolvedValue(mockExisting);
      mockPrisma.mealHistory.update.mockResolvedValue(mockUpdated);

      await mealHistoryController.updateMealHistory(mockReq as Request, mockRes as Response);

      expect(mockPrisma.mealHistory.findFirst).toHaveBeenCalledWith({
        where: { id: 'meal-1', userId: 'user-1' }
      });

      expect(mockPrisma.mealHistory.update).toHaveBeenCalledWith({
        where: { id: 'meal-1' },
        data: {
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

      expect(mockJson).toHaveBeenCalledWith({
        message: 'Meal history updated successfully',
        mealEntry: mockUpdated
      });
    });

    it('should handle meal not found', async () => {
      mockPrisma.mealHistory.findFirst.mockResolvedValue(null);

      await mealHistoryController.updateMealHistory(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Meal history entry not found',
        message: 'The specified meal history entry does not exist or does not belong to you'
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
        where: { id: 'meal-1', userId: 'user-1' }
      });

      expect(mockPrisma.mealHistory.delete).toHaveBeenCalledWith({
        where: { id: 'meal-1' }
      });

      expect(mockJson).toHaveBeenCalledWith({
        message: 'Meal history entry deleted successfully'
      });
    });

    it('should handle meal not found', async () => {
      mockPrisma.mealHistory.findFirst.mockResolvedValue(null);

      await mealHistoryController.deleteMealHistory(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Meal history entry not found',
        message: 'The specified meal history entry does not exist or does not belong to you'
      });
    });
  });

  describe('getMealHistoryAnalytics', () => {
    it('should return meal history analytics', async () => {
      mockReq.query = { period: '30', groupBy: 'day' };

      mockPrisma.mealHistory.findMany.mockResolvedValue([
        { consumed: true, date: new Date('2024-01-01'), recipe: { calories: 400, cuisine: 'Italian' }, feedback: 'liked' },
        { consumed: true, date: new Date('2024-01-01'), recipe: { calories: 500, cuisine: 'American' }, feedback: 'liked' }
      ]);

      await mealHistoryController.getMealHistoryAnalytics(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          period: '30 days',
          groupBy: 'day',
          analytics: expect.any(Object),
          generatedAt: expect.any(String)
        })
      );
    });
  });
});
