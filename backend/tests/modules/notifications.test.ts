// backend/tests/modules/notifications.test.ts
// Tests for Group 6: Push notification token management, triggers, and quiet hours

import { Request, Response } from 'express';
import { notificationsController } from '../../src/modules/notifications/notificationsController';
import { pushNotificationService } from '../../src/services/pushNotificationService';
import { notificationTriggerService } from '../../src/services/notificationTriggerService';
import { prisma } from '../../src/lib/prisma';

// Mock Prisma
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    pushToken: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    notificationSettings: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    mealPlan: {
      findFirst: jest.fn(),
    },
    mealPrepPortion: {
      findMany: jest.fn(),
    },
    cookingLog: {
      count: jest.fn(),
    },
  },
}));

// Mock authHelper
jest.mock('../../src/utils/authHelper', () => ({
  getUserId: jest.fn(() => 'test-user-id'),
}));

// Mock expo-server-sdk
jest.mock('expo-server-sdk', () => {
  const mockExpo = {
    chunkPushNotifications: jest.fn((messages: any[]) => [messages]),
    sendPushNotificationsAsync: jest.fn().mockResolvedValue([{ status: 'ok' }]),
  };
  const ExpoClass = jest.fn(() => mockExpo);
  (ExpoClass as any).isExpoPushToken = jest.fn(() => true);
  return { __esModule: true, default: ExpoClass };
});

describe('Notifications (Group 6)', () => {
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

  // ─── Token Registration ─────────────────────────────────────────────

  describe('registerToken', () => {
    it('should upsert a push token successfully', async () => {
      mockReq.body = { token: 'ExponentPushToken[abc123]', platform: 'ios' };
      (prisma.pushToken.upsert as jest.Mock).mockResolvedValue({
        id: 'token-id',
        userId: 'test-user-id',
        token: 'ExponentPushToken[abc123]',
        platform: 'ios',
      });

      await notificationsController.registerToken(mockReq as Request, mockRes as Response);

      expect(prisma.pushToken.upsert).toHaveBeenCalledWith({
        where: { token: 'ExponentPushToken[abc123]' },
        update: expect.objectContaining({ userId: 'test-user-id', platform: 'ios' }),
        create: expect.objectContaining({
          userId: 'test-user-id',
          token: 'ExponentPushToken[abc123]',
          platform: 'ios',
        }),
      });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 500 on database error', async () => {
      mockReq.body = { token: 'ExponentPushToken[abc123]', platform: 'ios' };
      (prisma.pushToken.upsert as jest.Mock).mockRejectedValue(new Error('DB error'));

      await notificationsController.registerToken(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── Token Unregistration ───────────────────────────────────────────

  describe('unregisterToken', () => {
    it('should delete a push token', async () => {
      mockReq.body = { token: 'ExponentPushToken[abc123]' };
      (prisma.pushToken.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await notificationsController.unregisterToken(mockReq as Request, mockRes as Response);

      expect(prisma.pushToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'ExponentPushToken[abc123]' },
      });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 400 if no token provided', async () => {
      mockReq.body = {};

      await notificationsController.unregisterToken(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── Quiet Hours Logic ──────────────────────────────────────────────

  describe('pushNotificationService.isQuietHours', () => {
    it('should return false when no settings exist', async () => {
      (prisma.notificationSettings.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await pushNotificationService.isQuietHours('test-user-id');
      expect(result).toBe(false);
    });

    it('should return true when weekendsOff and it is a weekend', async () => {
      (prisma.notificationSettings.findUnique as jest.Mock).mockResolvedValue({
        quietHoursStart: null,
        quietHoursEnd: null,
        weekendsOff: true,
      });

      // Mock a Saturday
      const realDate = Date;
      const mockDate = new Date('2026-03-07T12:00:00'); // Saturday
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const result = await pushNotificationService.isQuietHours('test-user-id');

      global.Date = realDate;
      expect(result).toBe(true);
    });

    it('should return false when weekendsOff but it is a weekday', async () => {
      (prisma.notificationSettings.findUnique as jest.Mock).mockResolvedValue({
        quietHoursStart: null,
        quietHoursEnd: null,
        weekendsOff: true,
      });

      // Mock a Wednesday
      const realDate = Date;
      const mockDate = new Date('2026-03-04T12:00:00'); // Wednesday
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const result = await pushNotificationService.isQuietHours('test-user-id');

      global.Date = realDate;
      expect(result).toBe(false);
    });
  });

  // ─── Trigger Service ────────────────────────────────────────────────

  describe('notificationTriggerService', () => {
    describe('onShoppingListReady', () => {
      it('should send notification when shoppingReminders enabled', async () => {
        (prisma.notificationSettings.findUnique as jest.Mock).mockResolvedValue({
          shoppingReminders: true,
        });
        (prisma.pushToken.findMany as jest.Mock).mockResolvedValue([
          { token: 'ExponentPushToken[abc123]' },
        ]);
        (prisma.notificationSettings.findUnique as jest.Mock)
          .mockResolvedValueOnce({ shoppingReminders: true })
          .mockResolvedValueOnce({ quietHoursStart: null, quietHoursEnd: null, weekendsOff: false });

        await notificationTriggerService.onShoppingListReady('test-user-id', 12);

        // Should have called findMany for tokens
        expect(prisma.pushToken.findMany).toHaveBeenCalled();
      });

      it('should skip when shoppingReminders disabled', async () => {
        (prisma.notificationSettings.findUnique as jest.Mock).mockResolvedValue({
          shoppingReminders: false,
        });

        await notificationTriggerService.onShoppingListReady('test-user-id', 12);

        // Should not attempt to send
        expect(prisma.pushToken.findMany).not.toHaveBeenCalled();
      });

      it('should skip when no notification settings exist', async () => {
        (prisma.notificationSettings.findUnique as jest.Mock).mockResolvedValue(null);

        await notificationTriggerService.onShoppingListReady('test-user-id', 12);

        expect(prisma.pushToken.findMany).not.toHaveBeenCalled();
      });
    });

    describe('checkWeeklyDigest', () => {
      it('should send digest for active users on Sunday', async () => {
        (prisma.notificationSettings.findMany as jest.Mock).mockResolvedValue([
          { userId: 'user-1' },
        ]);
        (prisma.cookingLog.count as jest.Mock).mockResolvedValue(5);
        (prisma.pushToken.findMany as jest.Mock).mockResolvedValue([
          { token: 'ExponentPushToken[user1token]' },
        ]);
        (prisma.notificationSettings.findUnique as jest.Mock).mockResolvedValue({
          quietHoursStart: null,
          quietHoursEnd: null,
          weekendsOff: false,
        });

        // Mock Sunday
        const realDate = Date;
        const mockSunday = new Date('2026-03-08T09:00:00'); // Sunday
        jest.spyOn(global, 'Date').mockImplementation((...args: any[]) => {
          if (args.length === 0) return mockSunday;
          return new realDate(...(args as [any]));
        });
        (global.Date as any).now = () => mockSunday.getTime();

        await notificationTriggerService.checkWeeklyDigest();

        global.Date = realDate;

        expect(prisma.notificationSettings.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: { weeklyInsights: true } })
        );
        expect(prisma.cookingLog.count).toHaveBeenCalled();
      });

      it('should skip inactive users', async () => {
        (prisma.notificationSettings.findMany as jest.Mock).mockResolvedValue([
          { userId: 'user-1' },
        ]);
        (prisma.cookingLog.count as jest.Mock).mockResolvedValue(0);

        // Mock Sunday
        const realDate = Date;
        const mockSunday = new Date('2026-03-08T09:00:00');
        jest.spyOn(global, 'Date').mockImplementation((...args: any[]) => {
          if (args.length === 0) return mockSunday;
          return new realDate(...(args as [any]));
        });
        (global.Date as any).now = () => mockSunday.getTime();

        await notificationTriggerService.checkWeeklyDigest();

        global.Date = realDate;

        // Should NOT attempt to send (no push token lookup)
        expect(prisma.pushToken.findMany).not.toHaveBeenCalled();
      });
    });
  });
});
