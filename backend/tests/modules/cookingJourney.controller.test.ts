import { Request, Response } from 'express';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    cookingLog: { findMany: jest.fn() },
    userPreferences: { findUnique: jest.fn(), upsert: jest.fn() },
    meal: { findMany: jest.fn() },
  },
}));

const defaultPrefs = { seededCuisines: null };

import { prisma } from '../../src/lib/prisma';
import { userController } from '../../src/modules/user/userController';

describe('Group 10I: cooking journey controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {}, user: { id: 'user-1', email: 't@e.com' } } as any;
    res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
  });

  test('GET /cooking-stats aggregates logs and returns stats', async () => {
    (prisma.cookingLog.findMany as jest.Mock).mockResolvedValue([
      { cookedAt: new Date('2026-04-10T10:00:00Z'), recipe: { cuisine: 'Italian', difficulty: 'easy' } },
      { cookedAt: new Date('2026-04-11T10:00:00Z'), recipe: { cuisine: 'Thai', difficulty: 'medium' } },
    ]);
    (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(defaultPrefs);

    await userController.getCookingStats(req as Request, res as Response);

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.recipesCookedAllTime).toBe(2);
    expect(body.cuisinesExplored).toEqual(['Italian', 'Thai']);
    expect(body.seededCuisines).toEqual([]);
  });

  test('GET /cooking-stats merges seededCuisines from prefs', async () => {
    (prisma.cookingLog.findMany as jest.Mock).mockResolvedValue([
      { cookedAt: new Date('2026-04-10T10:00:00Z'), recipe: { cuisine: 'Italian', difficulty: 'easy' } },
    ]);
    (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
      seededCuisines: JSON.stringify(['Thai', 'Ethiopian']),
    });

    await userController.getCookingStats(req as Request, res as Response);

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.cuisinesExplored).toEqual(['Ethiopian', 'Italian', 'Thai']);
    expect(body.seededCuisines).toEqual(['Thai', 'Ethiopian']);
  });

  test('GET /cooking-stats handles malformed seededCuisines JSON', async () => {
    (prisma.cookingLog.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({ seededCuisines: 'not-json' });
    await userController.getCookingStats(req as Request, res as Response);
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.seededCuisines).toEqual([]);
  });

  test('GET /cooking-stats returns 500 on db error', async () => {
    (prisma.cookingLog.findMany as jest.Mock).mockRejectedValue(new Error('boom'));
    (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(defaultPrefs);
    await userController.getCookingStats(req as Request, res as Response);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  describe('PUT /cooking-journey/seed', () => {
    test('rejects non-array seededCuisines', async () => {
      req.body = { seededCuisines: 'not-array' };
      await userController.seedCookingJourney(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('rejects invalid skill level', async () => {
      req.body = { cookingSkillLevel: 'super_chef' };
      await userController.seedCookingJourney(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('upserts seededCuisines + skill level, dedups, trims', async () => {
      (prisma.userPreferences.upsert as jest.Mock).mockResolvedValue({
        seededCuisines: JSON.stringify(['Italian', 'Thai']),
        cookingSkillLevel: 'home_cook',
      });
      req.body = {
        seededCuisines: ['Italian', '  Thai  ', 'Italian', ''],
        cookingSkillLevel: 'home_cook',
      };

      await userController.seedCookingJourney(req as Request, res as Response);

      const call = (prisma.userPreferences.upsert as jest.Mock).mock.calls[0][0];
      expect(JSON.parse(call.update.seededCuisines)).toEqual(['Italian', 'Thai']);
      expect(call.update.cookingSkillLevel).toBe('home_cook');
      expect(res.json).toHaveBeenCalledWith({
        seededCuisines: ['Italian', 'Thai'],
        cookingSkillLevel: 'home_cook',
      });
    });

    test('allows updating only skill level without touching cuisines', async () => {
      (prisma.userPreferences.upsert as jest.Mock).mockResolvedValue({
        seededCuisines: null,
        cookingSkillLevel: 'confident',
      });
      req.body = { cookingSkillLevel: 'confident' };

      await userController.seedCookingJourney(req as Request, res as Response);

      const call = (prisma.userPreferences.upsert as jest.Mock).mock.calls[0][0];
      expect(call.update.seededCuisines).toBeUndefined();
      expect(call.update.cookingSkillLevel).toBe('confident');
    });
  });

  test('GET /skill-progress joins cooking logs with meal taste ratings', async () => {
    (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({ cookingSkillLevel: 'beginner' });
    (prisma.cookingLog.findMany as jest.Mock).mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        recipeId: `r${i}`,
        cookedAt: new Date(),
        recipe: { difficulty: 'easy' },
      })),
    );
    (prisma.meal.findMany as jest.Mock).mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({ recipeId: `r${i}`, tasteRating: 4 })),
    );

    await userController.getSkillProgress(req as Request, res as Response);

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.readyToLevelUp).toBe(true);
    expect(body.effectiveLevel).toBe('home_cook');
  });

  test('GET /skill-progress defaults to beginner when prefs missing', async () => {
    (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.cookingLog.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.meal.findMany as jest.Mock).mockResolvedValue([]);

    await userController.getSkillProgress(req as Request, res as Response);
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.currentLevel).toBe('beginner');
    expect(body.readyToLevelUp).toBe(false);
  });

  test('POST /skill-progress/accept validates newLevel', async () => {
    req.body = { newLevel: 'super_chef' };
    await userController.acceptSkillLevelUp(req as Request, res as Response);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('POST /skill-progress/accept updates userPreferences', async () => {
    (prisma.userPreferences.upsert as jest.Mock).mockResolvedValue({ cookingSkillLevel: 'home_cook' });
    req.body = { newLevel: 'home_cook' };
    await userController.acceptSkillLevelUp(req as Request, res as Response);
    expect(prisma.userPreferences.upsert).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ cookingSkillLevel: 'home_cook' });
  });
});
