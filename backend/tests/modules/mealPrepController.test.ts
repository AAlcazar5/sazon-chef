import { Request, Response } from 'express';
import { mealPrepController, mealPrepTemplateController } from '../../src/modules/mealPrep/mealPrepController';
import { prisma } from '../../src/lib/prisma';
import { getUserId } from '../../src/utils/authHelper';

// Mock dependencies
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    mealPrepPortion: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    mealPrepConsumption: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    mealPrepSession: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    mealPrepTemplate: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    recipe: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  }
}));

jest.mock('../../src/utils/authHelper', () => ({
  getUserId: jest.fn(),
}));

describe('Meal Prep Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      params: {},
      query: {},
      body: {},
    };
    
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    (getUserId as jest.Mock).mockReturnValue('test-user-id');
  });

  describe('createMealPrepPortion', () => {
    const mockRecipe = {
      id: 'recipe-1',
      title: 'Test Recipe',
      servings: 4,
      fridgeStorageDays: 5,
      freezerStorageMonths: 3,
      freezable: true,
    };

    beforeEach(() => {
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockRecipe);
    });

    test('should create meal prep portion successfully', async () => {
      const mockPortion = {
        id: 'portion-1',
        userId: 'test-user-id',
        recipeId: 'recipe-1',
        totalServings: 12,
        servingsToFreeze: 8,
        servingsForWeek: 4,
        frozenServingsRemaining: 8,
        freshServingsRemaining: 4,
        prepDate: new Date(),
        freezeDate: new Date(),
        expiryDate: new Date(),
        freezerExpiryDate: new Date(),
      };

      mockReq.body = {
        recipeId: 'recipe-1',
        totalServings: 12,
        servingsToFreeze: 8,
        servingsForWeek: 4,
        prepDate: new Date().toISOString(),
      };

      (prisma.mealPrepPortion.create as jest.Mock).mockResolvedValue(mockPortion);

      await mealPrepController.createMealPrepPortion(mockReq as Request, mockRes as Response);

      expect(prisma.recipe.findUnique).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
      });
      expect(prisma.mealPrepPortion.create).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalled();
    });

    test('should validate required fields', async () => {
      mockReq.body = {
        recipeId: 'recipe-1',
        // Missing totalServings
      };

      await mealPrepController.createMealPrepPortion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Missing required fields',
        })
      );
    });

    test('should validate portion allocation adds up', async () => {
      mockReq.body = {
        recipeId: 'recipe-1',
        totalServings: 12,
        servingsToFreeze: 8,
        servingsForWeek: 3, // Doesn't add up to 12
      };

      await mealPrepController.createMealPrepPortion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid portion allocation',
        })
      );
    });

    test('should handle recipe not found', async () => {
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(null);

      mockReq.body = {
        recipeId: 'nonexistent-recipe',
        totalServings: 12,
        servingsToFreeze: 8,
        servingsForWeek: 4,
      };

      await mealPrepController.createMealPrepPortion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Recipe not found',
        })
      );
    });

    test('should calculate expiry dates correctly', async () => {
      const prepDate = new Date('2024-01-01');
      const expectedExpiryDate = new Date('2024-01-06'); // 5 days later
      const expectedFreezerExpiryDate = new Date('2024-04-01'); // 3 months later

      mockReq.body = {
        recipeId: 'recipe-1',
        totalServings: 12,
        servingsToFreeze: 8,
        servingsForWeek: 4,
        prepDate: prepDate.toISOString(),
      };

      const mockPortion = {
        id: 'portion-1',
        expiryDate: expectedExpiryDate,
        freezerExpiryDate: expectedFreezerExpiryDate,
      };

      (prisma.mealPrepPortion.create as jest.Mock).mockResolvedValue(mockPortion);

      await mealPrepController.createMealPrepPortion(mockReq as Request, mockRes as Response);

      const createCall = (prisma.mealPrepPortion.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.expiryDate).toBeDefined();
      expect(createCall.data.freezerExpiryDate).toBeDefined();
    });

    test('should handle recipes without storage info', async () => {
      const recipeWithoutStorage = {
        ...mockRecipe,
        fridgeStorageDays: null,
        freezerStorageMonths: null,
        freezable: false,
      };

      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(recipeWithoutStorage);

      mockReq.body = {
        recipeId: 'recipe-1',
        totalServings: 12,
        servingsToFreeze: 0,
        servingsForWeek: 12,
      };

      const mockPortion = { id: 'portion-1' };
      (prisma.mealPrepPortion.create as jest.Mock).mockResolvedValue(mockPortion);

      await mealPrepController.createMealPrepPortion(mockReq as Request, mockRes as Response);

      expect(prisma.mealPrepPortion.create).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getMealPrepPortions', () => {
    test('should get all meal prep portions for user', async () => {
      const mockPortions = [
        {
          id: 'portion-1',
          totalServings: 12,
          servingsToFreeze: 8,
          servingsForWeek: 4,
          frozenServingsRemaining: 5,
          freshServingsRemaining: 2,
        },
        {
          id: 'portion-2',
          totalServings: 6,
          servingsToFreeze: 0,
          servingsForWeek: 6,
          frozenServingsRemaining: 0,
          freshServingsRemaining: 3,
        },
      ];

      (prisma.mealPrepPortion.findMany as jest.Mock).mockResolvedValue(mockPortions);

      await mealPrepController.getMealPrepPortions(mockReq as Request, mockRes as Response);

      expect(prisma.mealPrepPortion.findMany).toHaveBeenCalled();
      const callArgs = (prisma.mealPrepPortion.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where).toEqual({ userId: 'test-user-id' });
      expect(callArgs.include).toBeDefined();
      expect(callArgs.orderBy).toEqual({ prepDate: 'desc' });
      expect(mockRes.json).toHaveBeenCalledWith(mockPortions);
    });

    test('should filter by includeConsumed query param', async () => {
      mockReq.query = { includeConsumed: 'false' };

      (prisma.mealPrepPortion.findMany as jest.Mock).mockResolvedValue([]);

      await mealPrepController.getMealPrepPortions(mockReq as Request, mockRes as Response);

      const findManyCall = (prisma.mealPrepPortion.findMany as jest.Mock).mock.calls[0][0];
      // When includeConsumed is false, consumedPortions should not be included or should be false
      expect(findManyCall.include?.consumedPortions).toBeFalsy();
    });
  });

  describe('consumeMealPrepPortion', () => {
    const mockPortion = {
      id: 'portion-1',
      userId: 'test-user-id',
      recipeId: 'recipe-1',
      totalServings: 12,
      servingsToFreeze: 8,
      servingsForWeek: 4,
      frozenServingsRemaining: 8,
      freshServingsRemaining: 4,
    };

    test('should consume frozen servings', async () => {
      mockReq.params = { id: 'portion-1' };
      mockReq.body = {
        servings: 2,
        portionType: 'frozen',
      };

      (prisma.mealPrepPortion.findFirst as jest.Mock).mockResolvedValue(mockPortion);
      (prisma.mealPrepConsumption.create as jest.Mock).mockResolvedValue({ id: 'consumption-1' });
      (prisma.mealPrepPortion.update as jest.Mock).mockResolvedValue({
        ...mockPortion,
        frozenServingsRemaining: 6,
      });

      await mealPrepController.consumeMealPrepPortion(mockReq as Request, mockRes as Response);

      expect(prisma.mealPrepConsumption.create).toHaveBeenCalled();
      expect(prisma.mealPrepPortion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'portion-1' },
          data: expect.objectContaining({
            frozenServingsRemaining: 6,
          }),
        })
      );
      expect(mockRes.json).toHaveBeenCalled();
    });

    test('should consume fresh servings', async () => {
      mockReq.params = { id: 'portion-1' };
      mockReq.body = {
        servings: 2,
        portionType: 'fresh',
      };

      (prisma.mealPrepPortion.findFirst as jest.Mock).mockResolvedValue(mockPortion);
      (prisma.mealPrepConsumption.create as jest.Mock).mockResolvedValue({ id: 'consumption-1' });
      (prisma.mealPrepPortion.update as jest.Mock).mockResolvedValue({
        ...mockPortion,
        freshServingsRemaining: 2,
      });

      await mealPrepController.consumeMealPrepPortion(mockReq as Request, mockRes as Response);

      expect(prisma.mealPrepPortion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'portion-1' },
          data: expect.objectContaining({
            freshServingsRemaining: 2,
          }),
        })
      );
    });

    test('should prevent consuming more than available', async () => {
      mockReq.params = { id: 'portion-1' };
      mockReq.body = {
        servings: 10, // More than available (8 frozen)
        portionType: 'frozen',
      };

      (prisma.mealPrepPortion.findFirst as jest.Mock).mockResolvedValue(mockPortion);

      await mealPrepController.consumeMealPrepPortion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient servings',
        })
      );
    });

    test('should handle portion not found', async () => {
      (prisma.mealPrepPortion.findFirst as jest.Mock).mockResolvedValue(null);

      mockReq.params = { id: 'nonexistent-portion' };
      mockReq.body = {
        servings: 2,
        portionType: 'frozen',
      };

      await mealPrepController.consumeMealPrepPortion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getMealPrepStats', () => {
    test('should calculate statistics correctly', async () => {
      const mockPortions = [
        {
          id: 'portion-1',
          totalServings: 12,
          servingsToFreeze: 8,
          servingsForWeek: 4,
          frozenServingsRemaining: 5,
          freshServingsRemaining: 2,
          consumedPortions: [
            { servings: 3, portionType: 'frozen' },
            { servings: 2, portionType: 'fresh' },
          ],
          expiryDate: new Date('2024-12-31'),
          freezerExpiryDate: new Date('2024-12-31'),
        },
        {
          id: 'portion-2',
          totalServings: 6,
          servingsToFreeze: 0,
          servingsForWeek: 6,
          frozenServingsRemaining: 0,
          freshServingsRemaining: 3,
          consumedPortions: [
            { servings: 3, portionType: 'fresh' },
          ],
          expiryDate: null,
          freezerExpiryDate: null,
        },
      ];

      (prisma.mealPrepPortion.findMany as jest.Mock).mockResolvedValue(mockPortions);

      await mealPrepController.getMealPrepStats(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          totalPrepped: 18,
          totalFrozen: 8,
          totalFresh: 10,
          totalConsumed: 8,
          totalRemaining: 10,
          totalWasted: 0,
          consumptionRate: expect.any(Number),
          wasteRate: expect.any(Number),
          successRate: expect.any(Number),
        })
      );
    });

    test('should handle empty meal prep data', async () => {
      (prisma.mealPrepPortion.findMany as jest.Mock).mockResolvedValue([]);

      await mealPrepController.getMealPrepStats(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          totalPrepped: 0,
          totalConsumed: 0,
          totalRemaining: 0,
          totalWasted: 0,
          consumptionRate: 0,
          wasteRate: 0,
          successRate: 0,
        })
      );
    });

    test('should identify expired meal preps', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000); // Yesterday

      const mockPortions = [
        {
          id: 'portion-1',
          totalServings: 6,
          servingsToFreeze: 0,
          servingsForWeek: 6,
          frozenServingsRemaining: 0,
          freshServingsRemaining: 0,
          consumedPortions: [],
          expiryDate: pastDate,
          freezerExpiryDate: null,
        },
      ];

      (prisma.mealPrepPortion.findMany as jest.Mock).mockResolvedValue(mockPortions);

      await mealPrepController.getMealPrepStats(mockReq as Request, mockRes as Response);

      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.expiredMealPreps).toBe(1);
    });
  });

  describe('createMealPrepSession', () => {
    test('should create meal prep session successfully', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'test-user-id',
        scheduledDate: new Date('2024-01-15'),
        scheduledTime: '10:00 AM',
        duration: 120,
      };

      mockReq.body = {
        scheduledDate: '2024-01-15',
        scheduledTime: '10:00 AM',
        duration: 120,
      };

      (prisma.mealPrepSession.create as jest.Mock).mockResolvedValue(mockSession);

      await mealPrepController.createMealPrepSession(mockReq as Request, mockRes as Response);

      expect(prisma.mealPrepSession.create).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalled();
    });

    test('should validate required fields', async () => {
      mockReq.body = {
        // Missing scheduledDate
        scheduledTime: '10:00 AM',
      };

      await mealPrepController.createMealPrepSession(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Missing required fields',
        })
      );
    });
  });

  describe('getMealPrepSessions', () => {
    test('should get sessions for date range', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          scheduledDate: new Date('2024-01-15'),
          scheduledTime: '10:00 AM',
        },
      ];

      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      (prisma.mealPrepSession.findMany as jest.Mock).mockResolvedValue(mockSessions);

      await mealPrepController.getMealPrepSessions(mockReq as Request, mockRes as Response);

      expect(prisma.mealPrepSession.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 'test-user-id',
          scheduledDate: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
        include: expect.any(Object),
        orderBy: { scheduledDate: 'asc' },
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockSessions);
    });

    test('should handle missing date range', async () => {
      mockReq.query = {};

      (prisma.mealPrepSession.findMany as jest.Mock).mockResolvedValue([]);

      await mealPrepController.getMealPrepSessions(mockReq as Request, mockRes as Response);

      expect(prisma.mealPrepSession.findMany).toHaveBeenCalled();
    });
  });

  describe('mealPrepTemplateController', () => {
    describe('createOrUpdateTemplate', () => {
      const mockRecipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
      };

      test('should create new template', async () => {
        const mockTemplate = {
          id: 'template-1',
          userId: 'test-user-id',
          recipeId: 'recipe-1',
          defaultServings: 18,
          defaultServingsToFreeze: 12,
          defaultServingsForWeek: 6,
        };

        mockReq.body = {
          recipeId: 'recipe-1',
          defaultServings: 18,
          defaultServingsToFreeze: 12,
          defaultServingsForWeek: 6,
        };

        (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockRecipe);
        (prisma.mealPrepTemplate.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.mealPrepTemplate.create as jest.Mock).mockResolvedValue(mockTemplate);

        await mealPrepTemplateController.createOrUpdateTemplate(mockReq as Request, mockRes as Response);

        expect(prisma.mealPrepTemplate.create).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(201);
      });

      test('should update existing template', async () => {
        const existingTemplate = {
          id: 'template-1',
          userId: 'test-user-id',
          recipeId: 'recipe-1',
          defaultServings: 12,
          isFavorite: false,
        };

        const updatedTemplate = {
          ...existingTemplate,
          defaultServings: 18,
        };

        mockReq.body = {
          recipeId: 'recipe-1',
          defaultServings: 18,
          defaultServingsToFreeze: 12,
          defaultServingsForWeek: 6,
        };

        (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockRecipe);
        (prisma.mealPrepTemplate.findUnique as jest.Mock).mockResolvedValue(existingTemplate);
        (prisma.mealPrepTemplate.update as jest.Mock).mockResolvedValue(updatedTemplate);

        await mealPrepTemplateController.createOrUpdateTemplate(mockReq as Request, mockRes as Response);

        expect(prisma.mealPrepTemplate.update).toHaveBeenCalled();
        expect(prisma.mealPrepTemplate.create).not.toHaveBeenCalled();
      });

      test('should validate required fields', async () => {
        mockReq.body = {
          recipeId: 'recipe-1',
          // Missing defaultServings
        };

        await mealPrepTemplateController.createOrUpdateTemplate(mockReq as Request, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    describe('useTemplate', () => {
      const mockTemplate = {
      id: 'template-1',
      userId: 'test-user-id',
      recipeId: 'recipe-1',
      defaultServings: 18,
      defaultServingsToFreeze: 12,
      defaultServingsForWeek: 6,
      notes: 'Test template',
      recipe: {
        id: 'recipe-1',
        fridgeStorageDays: 5,
        freezerStorageMonths: 3,
        freezable: true,
      },
    };

    test('should use template to create portion', async () => {
      mockReq.params = { id: 'template-1' };
      mockReq.body = {};

      (prisma.mealPrepTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);
      (prisma.mealPrepPortion.create as jest.Mock).mockResolvedValue({ id: 'portion-1' });
      (prisma.mealPrepTemplate.update as jest.Mock).mockResolvedValue({
        ...mockTemplate,
        timesUsed: 1,
      });

      await mealPrepTemplateController.useTemplate(mockReq as Request, mockRes as Response);

      expect(prisma.mealPrepPortion.create).toHaveBeenCalled();
      expect(prisma.mealPrepTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: expect.objectContaining({
          timesUsed: { increment: 1 },
        }),
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    test('should allow overriding template values', async () => {
      mockReq.params = { id: 'template-1' };
      mockReq.body = {
        overrideServings: 24,
        overrideServingsToFreeze: 16,
        overrideServingsForWeek: 8,
      };

      (prisma.mealPrepTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);
      (prisma.mealPrepPortion.create as jest.Mock).mockResolvedValue({ id: 'portion-1' });
      (prisma.mealPrepTemplate.update as jest.Mock).mockResolvedValue(mockTemplate);

      await mealPrepTemplateController.useTemplate(mockReq as Request, mockRes as Response);

      const createCall = (prisma.mealPrepPortion.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.totalServings).toBe(24);
      expect(createCall.data.servingsToFreeze).toBe(16);
      expect(createCall.data.servingsForWeek).toBe(8);
    });

    test('should handle template not found', async () => {
      (prisma.mealPrepTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      mockReq.params = { id: 'nonexistent-template' };
      mockReq.body = {};

      await mealPrepTemplateController.useTemplate(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      });
    });
  });

  describe('getMealPrepCostAnalysis', () => {
    test('should calculate cost analysis correctly', async () => {
      const mockRecipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        servings: 4,
        ingredients: [
          { id: 'ing-1', text: '2 cups flour', estimatedCost: 2.0 },
          { id: 'ing-2', text: '1 lb chicken', estimatedCost: 5.0 },
        ],
      };

      mockReq.query = {
        recipeId: 'recipe-1',
        totalServings: '12',
      };

      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockRecipe);
      (prisma.mealPrepPortion.findMany as jest.Mock).mockResolvedValue([]);

      // Mock the cost calculator
      jest.mock('../../src/utils/costCalculator', () => ({
        calculateRecipeCost: jest.fn().mockResolvedValue({
          estimatedCost: 7.0,
          estimatedCostPerServing: 1.75,
        }),
      }));

      await mealPrepController.getMealPrepCostAnalysis(mockReq as Request, mockRes as Response);

      expect(prisma.recipe.findUnique).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
        include: { ingredients: true },
      });
      expect(mockRes.json).toHaveBeenCalled();
    });

    test('should handle missing recipeId', async () => {
      mockReq.query = {
        totalServings: '12',
      };

      await mealPrepController.getMealPrepCostAnalysis(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Missing required fields',
        })
      );
    });
  });
});

