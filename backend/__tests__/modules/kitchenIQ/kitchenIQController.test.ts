// Group 10S: Kitchen IQ controller — integration with mocked Prisma + auth.

const mockCookingLogFindMany = jest.fn();
const mockUserPreferencesFindUnique = jest.fn();
const mockUserPreferencesUpsert = jest.fn();
const mockRecipeIngredientFindMany = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    cookingLog: { findMany: (...args: unknown[]) => mockCookingLogFindMany(...args) },
    userPreferences: {
      findUnique: (...args: unknown[]) => mockUserPreferencesFindUnique(...args),
      upsert: (...args: unknown[]) => mockUserPreferencesUpsert(...args),
    },
    recipeIngredient: { findMany: (...args: unknown[]) => mockRecipeIngredientFindMany(...args) },
  },
}));

jest.mock('@/utils/authHelper', () => ({
  getUserId: () => 'user_test',
}));

import { Request, Response } from 'express';
import { kitchenIQController } from '../../../src/modules/kitchenIQ/kitchenIQController';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUserPreferencesUpsert.mockResolvedValue({});
});

describe('kitchenIQController.getProgress', () => {
  it('returns starter cards for a brand-new user with no cooking history', async () => {
    mockCookingLogFindMany.mockResolvedValue([]);
    mockUserPreferencesFindUnique.mockResolvedValue(null);
    mockRecipeIngredientFindMany.mockResolvedValue([]);

    const res = makeRes();
    await kitchenIQController.getProgress({} as Request, res);

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.totalCards).toBeGreaterThanOrEqual(30);
    expect(payload.unlockedIds).toContain('nut-protein');
    expect(payload.unlockedIds).toContain('con-volume-eating');
    expect(payload.newUnlocks).toContain('nut-protein');
  });

  it('returns more cards after 5 cooks across 3 cuisines', async () => {
    mockCookingLogFindMany.mockResolvedValue([
      { cookedAt: new Date(), recipe: { cuisine: 'Italian', difficulty: 'easy' } },
      { cookedAt: new Date(), recipe: { cuisine: 'Italian', difficulty: 'easy' } },
      { cookedAt: new Date(), recipe: { cuisine: 'Mexican', difficulty: 'easy' } },
      { cookedAt: new Date(), recipe: { cuisine: 'Mexican', difficulty: 'medium' } },
      { cookedAt: new Date(), recipe: { cuisine: 'Japanese', difficulty: 'medium' } },
    ]);
    mockUserPreferencesFindUnique.mockResolvedValue({ lastCheckedUnlocks: null });
    mockRecipeIngredientFindMany.mockResolvedValue([]);

    const res = makeRes();
    await kitchenIQController.getProgress({} as Request, res);

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.unlockedIds).toContain('nut-magnesium'); // 5+ cooks
    expect(payload.unlockedIds).toContain('nut-fiber'); // 5+ cooks
    expect(payload.unlockedIds).not.toContain('nut-iron'); // requires 15
  });

  it('newUnlocks excludes cards already in lastCheckedUnlocks', async () => {
    mockCookingLogFindMany.mockResolvedValue([]);
    mockUserPreferencesFindUnique.mockResolvedValue({
      lastCheckedUnlocks: JSON.stringify(['nut-protein', 'con-volume-eating']),
    });
    mockRecipeIngredientFindMany.mockResolvedValue([]);

    const res = makeRes();
    await kitchenIQController.getProgress({} as Request, res);

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.newUnlocks).not.toContain('nut-protein');
    expect(payload.newUnlocks).not.toContain('con-volume-eating');
    expect(payload.newUnlocks).toContain('con-reading-labels');
  });

  it('persists the full unlocked set to lastCheckedUnlocks via upsert', async () => {
    mockCookingLogFindMany.mockResolvedValue([]);
    mockUserPreferencesFindUnique.mockResolvedValue(null);
    mockRecipeIngredientFindMany.mockResolvedValue([]);

    await kitchenIQController.getProgress({} as Request, makeRes());

    expect(mockUserPreferencesUpsert).toHaveBeenCalledTimes(1);
    const call = mockUserPreferencesUpsert.mock.calls[0][0];
    expect(call.where).toEqual({ userId: 'user_test' });
    const persisted = JSON.parse(call.update.lastCheckedUnlocks);
    expect(Array.isArray(persisted)).toBe(true);
    expect(persisted).toContain('nut-protein');
  });

  it('ingredient_used unlocks fire when a cooked recipe contains the trigger ingredient', async () => {
    mockCookingLogFindMany.mockResolvedValue([]);
    mockUserPreferencesFindUnique.mockResolvedValue(null);
    mockRecipeIngredientFindMany.mockResolvedValue([
      { text: 'turmeric' },
      { text: 'olive oil' },
    ]);

    const res = makeRes();
    await kitchenIQController.getProgress({} as Request, res);

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.unlockedIds).toContain('ing-turmeric');
  });

  it('handles malformed lastCheckedUnlocks gracefully', async () => {
    mockCookingLogFindMany.mockResolvedValue([]);
    mockUserPreferencesFindUnique.mockResolvedValue({ lastCheckedUnlocks: 'not-valid-json{[}' });
    mockRecipeIngredientFindMany.mockResolvedValue([]);

    const res = makeRes();
    await kitchenIQController.getProgress({} as Request, res);

    expect(res.status).not.toHaveBeenCalledWith(500);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.unlockedIds).toContain('nut-protein');
  });

  it('returns 500 on database error', async () => {
    mockCookingLogFindMany.mockRejectedValueOnce(new Error('DB down'));
    const res = makeRes();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await kitchenIQController.getProgress({} as Request, res);

    expect(res.status).toHaveBeenCalledWith(500);
    consoleSpy.mockRestore();
  });
});
