// backend/tests/modules/profileAdvanced.test.ts
// Tests for Group 5: Profile Advanced features
// - Delete account (cascade deletion)
// - Dietary restriction severity
// - Cooking skill level & time budgets
// - Enhanced notification settings

import { Request, Response } from 'express';
import { authController } from '../../src/modules/auth/authController';
import { userController } from '../../src/modules/user/userController';
import { prisma } from '../../src/lib/prisma';

// Mock encryption utility
jest.mock('../../src/utils/encryption', () => ({
  encrypt: jest.fn((text: string) => `encrypted_${text}`),
  decrypt: jest.fn((text: string) => text.replace(/^encrypted_/, '')),
  isEncrypted: jest.fn((text: string) => text.startsWith('encrypted_')),
}));

// Mock Prisma
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    userPreferences: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    notificationSettings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

// Mock authHelper
jest.mock('../../src/utils/authHelper', () => ({
  getUserId: jest.fn(() => 'test-user-id'),
}));

describe('Profile Advanced (Group 5)', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      body: {},
      params: {},
      user: { id: 'test-user-id', email: 'test@example.com' },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  // ─── Delete Account ───────────────────────────────────────────────

  describe('deleteAccount', () => {
    it('should delete user and return success', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'test-user-id' });
      (prisma.user.delete as jest.Mock).mockResolvedValue({ id: 'test-user-id' });

      await authController.deleteAccount(mockReq as Request, mockRes as Response);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        select: { id: true },
      });
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
      });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;

      await authController.deleteAccount(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('should return 404 if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await authController.deleteAccount(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'test-user-id' });
      (prisma.user.delete as jest.Mock).mockRejectedValue(new Error('DB error'));

      await authController.deleteAccount(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── Dietary Severity ─────────────────────────────────────────────

  describe('updatePreferences - dietary severity', () => {
    it('should accept dietary restrictions with severity levels', async () => {
      const restrictions = [
        { name: 'gluten-free', severity: 'strict' },
        { name: 'dairy-free', severity: 'prefer_avoid' },
      ];

      mockReq.body = {
        dietaryRestrictions: restrictions,
        cookTimePreference: 30,
      };

      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        id: 'pref-id',
        bannedIngredients: [],
        likedCuisines: [],
        dietaryRestrictions: [],
      });

      (prisma.userPreferences.upsert as jest.Mock).mockResolvedValue({
        id: 'pref-id',
        cookTimePreference: 30,
        dietaryRestrictions: restrictions,
        bannedIngredients: [],
        likedCuisines: [],
        preferredSuperfoods: [],
      });

      await userController.updatePreferences(mockReq as Request, mockRes as Response);

      const upsertCall = (prisma.userPreferences.upsert as jest.Mock).mock.calls[0][0];
      // Verify severity is passed through to the create data
      const createdRestrictions = upsertCall.update.dietaryRestrictions.create;
      expect(createdRestrictions).toEqual([
        { name: 'gluten-free', severity: 'strict' },
        { name: 'dairy-free', severity: 'prefer_avoid' },
      ]);
    });

    it('should default to strict severity for string-only restrictions', async () => {
      mockReq.body = {
        dietaryRestrictions: ['vegan', 'nut-free'],
        cookTimePreference: 30,
      };

      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        id: 'pref-id',
        bannedIngredients: [],
        likedCuisines: [],
        dietaryRestrictions: [],
      });

      (prisma.userPreferences.upsert as jest.Mock).mockResolvedValue({
        id: 'pref-id',
        dietaryRestrictions: [
          { name: 'vegan', severity: 'strict' },
          { name: 'nut-free', severity: 'strict' },
        ],
        bannedIngredients: [],
        likedCuisines: [],
        preferredSuperfoods: [],
      });

      await userController.updatePreferences(mockReq as Request, mockRes as Response);

      const upsertCall = (prisma.userPreferences.upsert as jest.Mock).mock.calls[0][0];
      const createdRestrictions = upsertCall.update.dietaryRestrictions.create;
      expect(createdRestrictions).toEqual([
        { name: 'vegan', severity: 'strict' },
        { name: 'nut-free', severity: 'strict' },
      ]);
    });
  });

  // ─── Cooking Skill Level & Time Budgets ────────────────────────────

  describe('updatePreferences - cooking skill & time budgets', () => {
    it('should save cooking skill level and time budgets', async () => {
      mockReq.body = {
        cookingSkillLevel: 'home_cook',
        weekdayCookTime: 20,
        weekendCookTime: 60,
        cookTimePreference: 30,
      };

      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        id: 'pref-id',
        bannedIngredients: [],
        likedCuisines: [],
        dietaryRestrictions: [],
      });

      (prisma.userPreferences.upsert as jest.Mock).mockResolvedValue({
        id: 'pref-id',
        cookingSkillLevel: 'home_cook',
        weekdayCookTime: 20,
        weekendCookTime: 60,
        cookTimePreference: 30,
        bannedIngredients: [],
        likedCuisines: [],
        dietaryRestrictions: [],
        preferredSuperfoods: [],
      });

      await userController.updatePreferences(mockReq as Request, mockRes as Response);

      const upsertCall = (prisma.userPreferences.upsert as jest.Mock).mock.calls[0][0];
      expect(upsertCall.update.cookingSkillLevel).toBe('home_cook');
      expect(upsertCall.update.weekdayCookTime).toBe(20);
      expect(upsertCall.update.weekendCookTime).toBe(60);
    });
  });

  // ─── Notification Settings ─────────────────────────────────────────

  describe('getNotifications - enhanced fields', () => {
    it('should return default values when no settings exist', async () => {
      (prisma.notificationSettings.findUnique as jest.Mock).mockResolvedValue(null);

      await userController.getNotifications(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          shoppingReminders: true,
          weeklyInsights: true,
          quietHoursStart: null,
          quietHoursEnd: null,
          weekendsOff: false,
        })
      );
    });

    it('should return stored notification settings with new fields', async () => {
      (prisma.notificationSettings.findUnique as jest.Mock).mockResolvedValue({
        mealReminders: true,
        mealReminderTimes: '08:00,12:00',
        newRecipes: false,
        goalUpdates: true,
        goalUpdateDay: 'Friday',
        goalUpdateTime: '10:00',
        shoppingReminders: false,
        weeklyInsights: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        weekendsOff: true,
      });

      await userController.getNotifications(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          shoppingReminders: false,
          weeklyInsights: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
          weekendsOff: true,
        })
      );
    });
  });

  describe('updateNotifications - enhanced fields', () => {
    it('should save quiet hours and weekend settings', async () => {
      mockReq.body = {
        mealReminders: true,
        mealReminderTimes: ['08:00'],
        newRecipes: true,
        goalUpdates: false,
        shoppingReminders: true,
        weeklyInsights: false,
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00',
        weekendsOff: true,
      };

      (prisma.notificationSettings.upsert as jest.Mock).mockResolvedValue({
        ...mockReq.body,
        mealReminderTimes: '08:00',
        goalUpdateDay: 'Monday',
        goalUpdateTime: '09:00',
      });

      await userController.updateNotifications(mockReq as Request, mockRes as Response);

      const upsertCall = (prisma.notificationSettings.upsert as jest.Mock).mock.calls[0][0];
      expect(upsertCall.update.quietHoursStart).toBe('23:00');
      expect(upsertCall.update.quietHoursEnd).toBe('07:00');
      expect(upsertCall.update.weekendsOff).toBe(true);
      expect(upsertCall.update.weeklyInsights).toBe(false);
    });
  });
});
