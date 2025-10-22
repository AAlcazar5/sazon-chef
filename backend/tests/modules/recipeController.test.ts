import { Request, Response } from 'express';
import { recipeController } from '../../src/modules/recipe/recipeController';
import { prisma } from '../../src/lib/prisma';

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
    savedRecipe: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn()
    },
    recipeFeedback: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    }
  }
}));

describe('Recipe Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      params: {},
      body: {},
      user: { id: 'test-user-id' }
    };
    
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('getRecipes', () => {
    test('should get recipes with pagination', async () => {
      const mockRecipes = [
        { id: '1', title: 'Recipe 1' },
        { id: '2', title: 'Recipe 2' }
      ];

      (prisma.recipe.findMany as jest.Mock).mockResolvedValue(mockRecipes);
      (prisma.recipe.count as jest.Mock).mockResolvedValue(2);

      mockReq.query = { page: '1', pageSize: '10' };

      await recipeController.getRecipes(mockReq as Request, mockRes as Response);

      expect(prisma.recipe.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        data: mockRecipes,
        total: 2,
        page: 1,
        pageSize: 10,
        totalPages: 1
      });
    });

    test('should filter by cuisine', async () => {
      const mockRecipes = [{ id: '1', title: 'Italian Recipe' }];

      (prisma.recipe.findMany as jest.Mock).mockResolvedValue(mockRecipes);
      (prisma.recipe.count as jest.Mock).mockResolvedValue(1);

      mockReq.query = { cuisine: 'Italian' };

      await recipeController.getRecipes(mockReq as Request, mockRes as Response);

      expect(prisma.recipe.findMany).toHaveBeenCalledWith({
        where: { cuisine: 'Italian' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        }
      });
    });

    test('should filter by max cook time', async () => {
      const mockRecipes = [{ id: '1', title: 'Quick Recipe' }];

      (prisma.recipe.findMany as jest.Mock).mockResolvedValue(mockRecipes);
      (prisma.recipe.count as jest.Mock).mockResolvedValue(1);

      mockReq.query = { maxCookTime: '30' };

      await recipeController.getRecipes(mockReq as Request, mockRes as Response);

      expect(prisma.recipe.findMany).toHaveBeenCalledWith({
        where: { cookTime: { lte: 30 } },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        }
      });
    });
  });

  describe('getRecipe', () => {
    test('should get single recipe by ID', async () => {
      const mockRecipe = { id: '1', title: 'Test Recipe' };

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

      expect(mockRes.json).toHaveBeenCalledWith(mockRecipe);
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

      const mockRecipe = { id: '1', ...recipeData };

      (prisma.recipe.create as jest.Mock).mockResolvedValue(mockRecipe);

      mockReq.body = recipeData;

      await recipeController.createRecipe(mockReq as Request, mockRes as Response);

      expect(prisma.recipe.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test Recipe',
          userId: 'test-user-id',
          isUserCreated: true,
          ingredients: {
            create: [
              { text: 'pasta', order: 0 },
              { text: 'sauce', order: 1 }
            ]
          },
          instructions: {
            create: [
              { text: 'Cook pasta', step: 1 },
              { text: 'Add sauce', step: 2 }
            ]
          }
        }),
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        }
      });

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Recipe created successfully',
        recipe: mockRecipe
      });
    });

    test('should reject recipe with missing required fields', async () => {
      mockReq.body = {
        title: 'Test Recipe'
        // Missing other required fields
      };

      await recipeController.createRecipe(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing required fields',
        details: 'title, description, cookTime, and cuisine are required'
      });
    });

    test('should reject recipe with missing macro nutrients', async () => {
      mockReq.body = {
        title: 'Test Recipe',
        description: 'Test Description',
        cookTime: 30,
        cuisine: 'Italian',
        ingredients: ['pasta'],
        instructions: ['Cook pasta']
        // Missing macro nutrients
      };

      await recipeController.createRecipe(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing macro nutrients',
        details: 'calories, protein, carbs, and fat are required'
      });
    });

    test('should reject recipe with invalid ingredients', async () => {
      mockReq.body = {
        title: 'Test Recipe',
        description: 'Test Description',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 500,
        protein: 25,
        carbs: 50,
        fat: 20,
        ingredients: [], // Empty ingredients
        instructions: ['Cook pasta']
      };

      await recipeController.createRecipe(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid ingredients',
        details: 'ingredients must be a non-empty array'
      });
    });

    test('should reject recipe with invalid instructions', async () => {
      mockReq.body = {
        title: 'Test Recipe',
        description: 'Test Description',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 500,
        protein: 25,
        carbs: 50,
        fat: 20,
        ingredients: ['pasta'],
        instructions: [] // Empty instructions
      };

      await recipeController.createRecipe(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid instructions',
        details: 'instructions must be a non-empty array'
      });
    });
  });

  describe('updateRecipe', () => {
    test('should update recipe if user owns it', async () => {
      const existingRecipe = {
        id: 'recipe-1',
        userId: 'test-user-id',
        title: 'Original Recipe'
      };

      const updatedRecipe = {
        ...existingRecipe,
        title: 'Updated Recipe'
      };

      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(existingRecipe);
      (prisma.recipe.update as jest.Mock).mockResolvedValue(updatedRecipe);

      mockReq.params = { id: 'recipe-1' };
      mockReq.body = { title: 'Updated Recipe' };

      await recipeController.updateRecipe(mockReq as Request, mockRes as Response);

      expect(prisma.recipe.update).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
        data: expect.objectContaining({
          title: 'Updated Recipe'
        }),
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Recipe updated successfully',
        recipe: updatedRecipe
      });
    });

    test('should reject update if user does not own recipe', async () => {
      const existingRecipe = {
        id: 'recipe-1',
        userId: 'other-user-id', // Different user
        title: 'Original Recipe'
      };

      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(existingRecipe);

      mockReq.params = { id: 'recipe-1' };
      mockReq.body = { title: 'Updated Recipe' };

      await recipeController.updateRecipe(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'You do not have permission to edit this recipe'
      });
    });

    test('should return 404 for non-existent recipe', async () => {
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(null);

      mockReq.params = { id: '999' };
      mockReq.body = { title: 'Updated Recipe' };

      await recipeController.updateRecipe(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Recipe not found'
      });
    });
  });

  describe('deleteRecipe', () => {
    test('should delete recipe if user owns it', async () => {
      const existingRecipe = {
        id: 'recipe-1',
        userId: 'test-user-id'
      };

      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(existingRecipe);
      (prisma.recipe.delete as jest.Mock).mockResolvedValue({});

      mockReq.params = { id: 'recipe-1' };

      await recipeController.deleteRecipe(mockReq as Request, mockRes as Response);

      expect(prisma.recipe.delete).toHaveBeenCalledWith({
        where: { id: 'recipe-1' }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Recipe deleted successfully'
      });
    });

    test('should reject deletion if user does not own recipe', async () => {
      const existingRecipe = {
        id: 'recipe-1',
        userId: 'other-user-id'
      };

      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(existingRecipe);

      mockReq.params = { id: 'recipe-1' };

      await recipeController.deleteRecipe(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'You do not have permission to delete this recipe'
      });
    });

    test('should return 404 for non-existent recipe', async () => {
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(null);

      mockReq.params = { id: '999' };

      await recipeController.deleteRecipe(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Recipe not found'
      });
    });
  });

  describe('saveRecipe', () => {
    test('should save recipe successfully', async () => {
      const mockRecipe = { id: '1', title: 'Test Recipe' };
      const mockSavedRecipe = {
        id: 'saved-1',
        recipeId: '1',
        userId: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        savedDate: new Date(),
        recipe: {
          ...mockRecipe,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };

      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockRecipe);
      (prisma.savedRecipe.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.savedRecipe.create as jest.Mock).mockResolvedValue(mockSavedRecipe);

      mockReq.params = { id: '1' };

      await recipeController.saveRecipe(mockReq as Request, mockRes as Response);

      expect(prisma.savedRecipe.create).toHaveBeenCalledWith({
        data: {
          recipeId: '1',
          userId: 'test-user-id'
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

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Recipe saved successfully',
        recipe: expect.objectContaining({
          id: '1',
          title: 'Test Recipe'
        })
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
      (prisma.savedRecipe.findUnique as jest.Mock).mockResolvedValue(existingSave);

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
      (prisma.savedRecipe.delete as jest.Mock).mockResolvedValue({});

      mockReq.params = { id: '1' };

      await recipeController.unsaveRecipe(mockReq as Request, mockRes as Response);

      expect(prisma.savedRecipe.delete).toHaveBeenCalledWith({
        where: {
          recipeId_userId: {
            recipeId: '1',
            userId: 'test-user-id'
          }
        }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Recipe removed from saved recipes'
      });
    });
  });

  describe('likeRecipe', () => {
    test('should like recipe successfully', async () => {
      const mockFeedback = { id: 'feedback-1', recipeId: '1', userId: 'test-user-id', liked: true };

      (prisma.recipeFeedback.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.recipeFeedback.create as jest.Mock).mockResolvedValue(mockFeedback);

      mockReq.params = { id: '1' };

      await recipeController.likeRecipe(mockReq as Request, mockRes as Response);

      expect(prisma.recipeFeedback.create).toHaveBeenCalledWith({
        data: {
          recipeId: '1',
          userId: 'test-user-id',
          liked: true
        }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Recipe liked'
      });
    });
  });

  describe('dislikeRecipe', () => {
    test('should dislike recipe successfully', async () => {
      const mockFeedback = { id: 'feedback-1', recipeId: '1', userId: 'test-user-id', disliked: true };

      (prisma.recipeFeedback.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.recipeFeedback.create as jest.Mock).mockResolvedValue(mockFeedback);

      mockReq.params = { id: '1' };

      await recipeController.dislikeRecipe(mockReq as Request, mockRes as Response);

      expect(prisma.recipeFeedback.create).toHaveBeenCalledWith({
        data: {
          recipeId: '1',
          userId: 'test-user-id',
          disliked: true
        }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Recipe disliked'
      });
    });
  });
});
