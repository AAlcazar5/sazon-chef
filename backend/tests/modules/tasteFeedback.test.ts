// backend/tests/modules/tasteFeedback.test.ts
import { Request, Response } from 'express';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    meal: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    recipeFeedback: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  }
}));

import { prisma } from '../../src/lib/prisma';
import { submitTasteFeedback } from '../../src/modules/mealPlan/tasteFeedbackController';

describe('Taste Feedback Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      params: { mealId: 'meal-1' },
      body: {},
      user: { id: 'user-1', email: 'test@example.com' },
    };
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  test('returns 400 when tasteRating is missing', async () => {
    mockReq.body = { flavorTags: ['Great texture'] };

    await submitTasteFeedback(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('tasteRating') })
    );
  });

  test('returns 400 when tasteRating is out of range', async () => {
    mockReq.body = { tasteRating: 6, flavorTags: [] };

    await submitTasteFeedback(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when tasteRating is 0', async () => {
    mockReq.body = { tasteRating: 0 };

    await submitTasteFeedback(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 404 when meal not found or not owned by user', async () => {
    mockReq.body = { tasteRating: 4, flavorTags: ['Perfect spice'] };
    (prisma.meal.findFirst as jest.Mock).mockResolvedValue(null);

    await submitTasteFeedback(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(404);
  });

  test('saves tasteRating and flavorTags on valid request', async () => {
    const existingMeal = {
      id: 'meal-1',
      recipeId: 'recipe-1',
      mealPlan: { userId: 'user-1' },
    };
    mockReq.body = { tasteRating: 5, flavorTags: ['Perfect spice', 'Would make again'] };
    (prisma.meal.findFirst as jest.Mock).mockResolvedValue(existingMeal);
    (prisma.meal.update as jest.Mock).mockResolvedValue({
      ...existingMeal,
      tasteRating: 5,
      flavorTags: JSON.stringify(['Perfect spice', 'Would make again']),
    });
    (prisma.recipeFeedback.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.recipeFeedback.create as jest.Mock).mockResolvedValue({});

    await submitTasteFeedback(mockReq as Request, mockRes as Response);

    expect(prisma.meal.update).toHaveBeenCalledWith({
      where: { id: 'meal-1' },
      data: {
        tasteRating: 5,
        flavorTags: JSON.stringify(['Perfect spice', 'Would make again']),
      },
    });
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ tasteRating: 5 })
    );
  });

  test('flavorTags defaults to empty array when not provided', async () => {
    const existingMeal = {
      id: 'meal-1',
      recipeId: 'recipe-1',
      mealPlan: { userId: 'user-1' },
    };
    mockReq.body = { tasteRating: 3 };
    (prisma.meal.findFirst as jest.Mock).mockResolvedValue(existingMeal);
    (prisma.meal.update as jest.Mock).mockResolvedValue({
      ...existingMeal,
      tasteRating: 3,
      flavorTags: '[]',
    });
    (prisma.recipeFeedback.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.recipeFeedback.create as jest.Mock).mockResolvedValue({});

    await submitTasteFeedback(mockReq as Request, mockRes as Response);

    const updateCall = (prisma.meal.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.flavorTags).toBe('[]');
  });

  test('updates existing RecipeFeedback if present', async () => {
    const existingMeal = {
      id: 'meal-1',
      recipeId: 'recipe-1',
      mealPlan: { userId: 'user-1' },
    };
    const existingFeedback = { id: 'fb-1', recipeId: 'recipe-1', userId: 'user-1', liked: true };
    mockReq.body = { tasteRating: 4, flavorTags: ['Great texture'] };
    (prisma.meal.findFirst as jest.Mock).mockResolvedValue(existingMeal);
    (prisma.meal.update as jest.Mock).mockResolvedValue({
      ...existingMeal,
      tasteRating: 4,
      flavorTags: JSON.stringify(['Great texture']),
    });
    (prisma.recipeFeedback.findFirst as jest.Mock).mockResolvedValue(existingFeedback);
    (prisma.recipeFeedback.update as jest.Mock).mockResolvedValue({});

    await submitTasteFeedback(mockReq as Request, mockRes as Response);

    expect(prisma.recipeFeedback.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'fb-1' },
      })
    );
    expect(prisma.recipeFeedback.create).not.toHaveBeenCalled();
  });

  test('creates RecipeFeedback with liked=true when tasteRating >= 4', async () => {
    const existingMeal = {
      id: 'meal-1',
      recipeId: 'recipe-1',
      mealPlan: { userId: 'user-1' },
    };
    mockReq.body = { tasteRating: 4, flavorTags: [] };
    (prisma.meal.findFirst as jest.Mock).mockResolvedValue(existingMeal);
    (prisma.meal.update as jest.Mock).mockResolvedValue({
      ...existingMeal,
      tasteRating: 4,
      flavorTags: '[]',
    });
    (prisma.recipeFeedback.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.recipeFeedback.create as jest.Mock).mockResolvedValue({});

    await submitTasteFeedback(mockReq as Request, mockRes as Response);

    expect(prisma.recipeFeedback.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recipeId: 'recipe-1',
        userId: 'user-1',
        liked: true,
        consumed: true,
      }),
    });
  });

  test('skips RecipeFeedback when meal has no recipeId (custom meal)', async () => {
    const existingMeal = {
      id: 'meal-1',
      recipeId: null,
      mealPlan: { userId: 'user-1' },
    };
    mockReq.body = { tasteRating: 2, flavorTags: ['Too bland'] };
    (prisma.meal.findFirst as jest.Mock).mockResolvedValue(existingMeal);
    (prisma.meal.update as jest.Mock).mockResolvedValue({
      ...existingMeal,
      tasteRating: 2,
      flavorTags: JSON.stringify(['Too bland']),
    });

    await submitTasteFeedback(mockReq as Request, mockRes as Response);

    expect(prisma.recipeFeedback.findFirst).not.toHaveBeenCalled();
    expect(prisma.recipeFeedback.create).not.toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalled();
  });
});
