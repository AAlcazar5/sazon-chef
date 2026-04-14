import { Request, Response } from 'express';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    mealPlan: { findFirst: jest.fn() },
    meal: { findMany: jest.fn() },
  },
}));

jest.mock('../../src/services/aiRecipeService', () => ({
  aiRecipeService: {},
}));

import { prisma } from '../../src/lib/prisma';
import { getMealPlanVarietyScore } from '../../src/modules/mealPlan/mealPlanVarietyController';

function makeReq(params: Record<string, string> = {}): Partial<Request> {
  return {
    params,
    user: { id: 'user-1', email: 't@e.com' } as any,
  };
}

function makeRes(): Partial<Response> & { _status: number; _body: any } {
  const res: any = {
    _status: 200,
    _body: null,
    status(code: number) { this._status = code; return this; },
    json(body: any) { this._body = body; return this; },
  };
  return res;
}

const makeMealRow = (
  id: string,
  day: number,
  mealType: string,
  title: string,
  cuisine: string,
  ingredients: string[],
) => ({
  id,
  date: new Date(2026, 3, day, 12, 0, 0),
  mealType,
  recipe: {
    title,
    cuisine,
    ingredients: ingredients.map((text, order) => ({ text, order })),
  },
});

describe('GET /api/meal-plan/:id/variety-score', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when meal plan does not belong to user', async () => {
    (prisma.mealPlan.findFirst as jest.Mock).mockResolvedValue(null);

    const req = makeReq({ id: 'plan-1' });
    const res = makeRes();
    await getMealPlanVarietyScore(req as Request, res as unknown as Response);

    expect(res._status).toBe(404);
    expect(res._body.error).toBe('Meal plan not found');
  });

  it('returns boring-week nudge when variety is low', async () => {
    (prisma.mealPlan.findFirst as jest.Mock).mockResolvedValue({ id: 'plan-1', userId: 'user-1' });
    (prisma.meal.findMany as jest.Mock).mockResolvedValue([
      makeMealRow('m1', 13, 'lunch', 'Chicken Rice', 'American', ['chicken breast', 'rice']),
      makeMealRow('m2', 14, 'lunch', 'Chicken Rice', 'American', ['chicken thigh', 'rice']),
      makeMealRow('m3', 15, 'lunch', 'Chicken Rice', 'American', ['chicken breast', 'rice']),
      makeMealRow('m4', 16, 'lunch', 'Chicken Rice', 'American', ['chicken breast', 'rice']),
      makeMealRow('m5', 17, 'lunch', 'Chicken Rice', 'American', ['chicken breast', 'rice']),
    ]);

    const req = makeReq({ id: 'plan-1' });
    const res = makeRes();
    await getMealPlanVarietyScore(req as Request, res as unknown as Response);

    expect(res._status).toBe(200);
    expect(res._body.success).toBe(true);
    expect(res._body.varietyScore.isBoringWeek).toBe(true);
    expect(res._body.nudgeMessage).toBeTruthy();
    expect(res._body.repetitiveMealIds.length).toBeGreaterThan(0);
  });

  it('returns null nudge for a varied plan', async () => {
    (prisma.mealPlan.findFirst as jest.Mock).mockResolvedValue({ id: 'plan-1', userId: 'user-1' });
    (prisma.meal.findMany as jest.Mock).mockResolvedValue([
      makeMealRow('m1', 13, 'lunch', 'Italian Chicken Pasta', 'Italian', ['chicken breast', 'pasta']),
      makeMealRow('m2', 14, 'lunch', 'Salmon Tacos', 'Mexican', ['salmon fillet', 'tortilla']),
      makeMealRow('m3', 15, 'lunch', 'Tofu Pad Thai', 'Thai', ['firm tofu', 'rice noodles']),
      makeMealRow('m4', 16, 'lunch', 'Beef Gyros', 'Mediterranean', ['beef sirloin', 'pita']),
      makeMealRow('m5', 17, 'lunch', 'Lentil Dal', 'Indian', ['lentils', 'rice']),
    ]);

    const req = makeReq({ id: 'plan-1' });
    const res = makeRes();
    await getMealPlanVarietyScore(req as Request, res as unknown as Response);

    expect(res._status).toBe(200);
    expect(res._body.varietyScore.isBoringWeek).toBe(false);
    expect(res._body.nudgeMessage).toBeNull();
    expect(res._body.repetitiveMealIds).toEqual([]);
  });
});
