// backend/tests/modules/weeklyBudget.test.ts
// Tests GET /api/meal-plan/weekly-budget — adjusted daily targets based on prior days' actuals.
import { Request, Response } from 'express';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    mealPlan: { findMany: jest.fn() },
    macroGoals: { findUnique: jest.fn() },
  },
}));

jest.mock('../../src/services/aiRecipeService', () => ({
  aiRecipeService: {},
}));

import { prisma } from '../../src/lib/prisma';
import { getWeeklyBudget } from '../../src/modules/mealPlan/mealPlanController';

function makeReq(query: Record<string, string> = {}): Partial<Request> {
  return { query, user: { id: 'user-1', email: 't@e.com' } as any };
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

/** Build a meal with recipe macros. Date args: year, monthIdx, day (local TZ). */
function meal(
  year: number, monthIdx: number, day: number,
  isCompleted: boolean, cals: number, protein: number,
) {
  return {
    date: new Date(year, monthIdx, day, 12, 0, 0),
    isCompleted,
    recipe: { calories: cals, protein, carbs: 0, fat: 0 },
  };
}

describe('GET /api/meal-plan/weekly-budget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Pin "now" to Wednesday 2026-04-15 12:00 local (week starts Mon 2026-04-13).
    jest.useFakeTimers({ now: new Date(2026, 3, 15, 12, 0, 0) });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns null shape when user has no macro goals', async () => {
    (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.mealPlan.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeReq();
    const res = makeRes();
    await getWeeklyBudget(req as Request, res as Response);

    expect(res._status).toBe(200);
    expect(res._body.targets).toBeNull();
    expect(res._body.remaining).toBeNull();
  });

  test('computes adjusted target when Monday+Tuesday were under budget', async () => {
    // Goal: 2000 cal/day, 150g protein/day → weekly 14000 / 1050.
    (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      calories: 2000,
      protein: 150,
      carbs: 250,
      fat: 70,
    });

    // Mon completed: 1700 cal, 120 protein. Tue completed: 1800 cal, 130 protein.
    // Wed (today) — no completed meals yet.
    // Prior consumed = 3500 cal, 250 protein across 2 days.
    // Remaining = 14000-3500 = 10500 cal across 5 days (Wed-Sun) = 2100/day.
    (prisma.mealPlan.findMany as jest.Mock).mockResolvedValue([{
      meals: [
        meal(2026, 3, 13, true, 1700, 120), // Mon
        meal(2026, 3, 14, true, 1800, 130), // Tue
      ],
    }]);

    const req = makeReq();
    const res = makeRes();
    await getWeeklyBudget(req as Request, res as Response);

    expect(res._status).toBe(200);
    expect(res._body.targets).toEqual(expect.objectContaining({
      dailyCalories: 2000,
      dailyProtein: 150,
      weeklyCalories: 14000,
      weeklyProtein: 1050,
    }));
    expect(res._body.consumed).toEqual(expect.objectContaining({
      calories: 3500,
      protein: 250,
    }));
    expect(res._body.remaining.calories).toBe(10500);
    expect(res._body.remaining.protein).toBe(800);
    expect(res._body.daysRemaining).toBe(5);
    expect(res._body.adjusted.todayCalories).toBe(2100);
    expect(res._body.adjusted.todayProtein).toBe(160);
    expect(res._body.adjusted.deltaCalories).toBe(100);
    expect(res._body.adjusted.deltaProtein).toBe(10);
  });

  test('adjusted target drops below daily when prior days were over budget', async () => {
    (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user-1', calories: 2000, protein: 150, carbs: 250, fat: 70,
    });

    // Mon + Tue completed 2500 each → 5000 total over 2 days.
    // Remaining = 14000-5000 = 9000 across 5 days = 1800/day (200 below daily).
    (prisma.mealPlan.findMany as jest.Mock).mockResolvedValue([{
      meals: [
        meal(2026, 3, 13, true, 2500, 150),
        meal(2026, 3, 14, true, 2500, 150),
      ],
    }]);

    const req = makeReq();
    const res = makeRes();
    await getWeeklyBudget(req as Request, res as Response);

    expect(res._body.adjusted.todayCalories).toBe(1800);
    expect(res._body.adjusted.deltaCalories).toBe(-200);
  });

  test('ignores incomplete meals when computing consumed', async () => {
    (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user-1', calories: 2000, protein: 150, carbs: 250, fat: 70,
    });
    (prisma.mealPlan.findMany as jest.Mock).mockResolvedValue([{
      meals: [
        meal(2026, 3, 13, false, 3000, 200), // NOT completed
        meal(2026, 3, 14, true, 1500, 100),
      ],
    }]);

    const req = makeReq();
    const res = makeRes();
    await getWeeklyBudget(req as Request, res as Response);

    expect(res._body.consumed.calories).toBe(1500);
    expect(res._body.consumed.protein).toBe(100);
  });

  test('clamps adjusted target at 0 when already over weekly budget', async () => {
    (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user-1', calories: 2000, protein: 150, carbs: 250, fat: 70,
    });
    // Mon+Tue: 8000 cal each = 16000 → blew past 14000 weekly.
    (prisma.mealPlan.findMany as jest.Mock).mockResolvedValue([{
      meals: [
        meal(2026, 3, 13, true, 8000, 400),
        meal(2026, 3, 14, true, 8000, 400),
      ],
    }]);

    const req = makeReq();
    const res = makeRes();
    await getWeeklyBudget(req as Request, res as Response);

    expect(res._body.remaining.calories).toBe(0);
    expect(res._body.adjusted.todayCalories).toBe(0);
  });

  test('returns daysRemaining=7 when today is the first day of the week', async () => {
    jest.setSystemTime(new Date(2026, 3, 13, 12, 0, 0)); // Monday 2026-04-13

    (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user-1', calories: 2000, protein: 150, carbs: 250, fat: 70,
    });
    (prisma.mealPlan.findMany as jest.Mock).mockResolvedValue([{ meals: [] }]);

    const req = makeReq();
    const res = makeRes();
    await getWeeklyBudget(req as Request, res as Response);

    expect(res._body.daysRemaining).toBe(7);
    expect(res._body.adjusted.todayCalories).toBe(2000);
  });
});
