// P0 retention triggers — pre-dinner nudge, cuisine drought, lapsed-user.
//
// Each test mocks Prisma + the push service so we assert the trigger's
// selection logic (which users qualify) and payload shape (which cuisine
// + locale-aware copy) without spinning up a real DB.

jest.mock('@/lib/prisma', () => {
  const mock = {
    pushToken: { findMany: jest.fn(), count: jest.fn() },
    notificationSettings: { findUnique: jest.fn() },
    cookingLog: { count: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    recipeView: { findFirst: jest.fn(), count: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn() },
  };
  return { prisma: mock };
});

jest.mock('../../src/services/pushNotificationService', () => ({
  pushNotificationService: {
    sendToUser: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../src/services/emailService', () => ({
  emailService: {
    sendDay14TrialWarning: jest.fn(),
    sendDay3Nudge: jest.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import { pushNotificationService } from '../../src/services/pushNotificationService';
import { notificationTriggerService } from '../../src/services/notificationTriggerService';

const mockedPrisma = prisma as unknown as {
  pushToken: { findMany: jest.Mock; count: jest.Mock };
  notificationSettings: { findUnique: jest.Mock };
  cookingLog: { count: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock };
  recipeView: { findFirst: jest.Mock; count: jest.Mock };
  user: { findUnique: jest.Mock; findMany: jest.Mock };
};
const mockedSend = pushNotificationService.sendToUser as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockedPrisma.user.findUnique.mockResolvedValue({ locale: 'en' });
  mockedPrisma.notificationSettings.findUnique.mockResolvedValue({
    mealReminders: true,
  });
  // P3 retention — default low engagement so the gate stays open in tests
  // that don't care about it. Heavy-user tests override this.
  mockedPrisma.recipeView.count.mockResolvedValue(0);
  // P4 retention — default empty cook history so the cook-hour learner
  // returns the 18:00 default. Tests that assert hour-matching override.
  mockedPrisma.cookingLog.findMany.mockResolvedValue([]);
});

describe('checkPreDinnerNudge', () => {
  it('sends a push using an adjacent cuisine to last cook', async () => {
    mockedPrisma.pushToken.findMany.mockResolvedValue([{ userId: 'u1' }]);
    mockedPrisma.cookingLog.count.mockResolvedValue(0);
    mockedPrisma.cookingLog.findFirst.mockResolvedValue({
      recipe: { cuisine: 'Persian' },
    });

    // P4 — deterministic 18:00 now so cook-hour-default match passes
    const at18 = new Date(); at18.setHours(18, 0, 0, 0);
    await notificationTriggerService.checkPreDinnerNudge(at18);

    expect(mockedSend).toHaveBeenCalledTimes(1);
    const [userId, payload] = mockedSend.mock.calls[0];
    expect(userId).toBe('u1');
    expect(payload.title).toBe("What's cooking?");
    // Adjacency engine returns *some* adjacent cuisine for Persian — verify body
    // references a cuisine other than the literal last one.
    expect(payload.body.toLowerCase()).not.toContain('persian');
    expect(payload.data.source).toBe('preDinnerNudge');
  });

  it('skips users who already cooked today', async () => {
    mockedPrisma.pushToken.findMany.mockResolvedValue([{ userId: 'u1' }]);
    mockedPrisma.cookingLog.count.mockResolvedValue(1);
    mockedPrisma.cookingLog.findFirst.mockResolvedValue({
      recipe: { cuisine: 'Persian' },
    });

    const at18 = new Date(); at18.setHours(18, 0, 0, 0);
    await notificationTriggerService.checkPreDinnerNudge(at18);

    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('skips users with mealReminders disabled', async () => {
    mockedPrisma.pushToken.findMany.mockResolvedValue([{ userId: 'u1' }]);
    mockedPrisma.notificationSettings.findUnique.mockResolvedValue({
      mealReminders: false,
    });

    const at18 = new Date(); at18.setHours(18, 0, 0, 0);
    await notificationTriggerService.checkPreDinnerNudge(at18);

    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('skips users with no recent cook history', async () => {
    mockedPrisma.pushToken.findMany.mockResolvedValue([{ userId: 'u1' }]);
    mockedPrisma.cookingLog.count.mockResolvedValue(0);
    mockedPrisma.cookingLog.findFirst.mockResolvedValue(null);

    const at18 = new Date(); at18.setHours(18, 0, 0, 0);
    await notificationTriggerService.checkPreDinnerNudge(at18);

    expect(mockedSend).not.toHaveBeenCalled();
  });
});

describe('checkCuisineDrought', () => {
  it('nudges on a top cuisine that has gone 7+ days quiet', async () => {
    const now = new Date('2026-05-13T11:00:00Z');
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    mockedPrisma.pushToken.findMany.mockResolvedValue([{ userId: 'u1' }]);
    mockedPrisma.cookingLog.findMany.mockResolvedValue([
      { cookedAt: eightDaysAgo, recipe: { cuisine: 'Persian' } },
      { cookedAt: eightDaysAgo, recipe: { cuisine: 'Persian' } },
      { cookedAt: eightDaysAgo, recipe: { cuisine: 'Persian' } },
      { cookedAt: twoDaysAgo, recipe: { cuisine: 'Italian' } },
    ]);

    await notificationTriggerService.checkCuisineDrought(now);

    expect(mockedSend).toHaveBeenCalledTimes(1);
    const [, payload] = mockedSend.mock.calls[0];
    expect(payload.title).toContain('Persian');
    expect(payload.body).toMatch(/\d+ days/);
    expect(payload.data.cuisine).toBe('Persian');
  });

  it('does NOT fire if no cuisine has 3+ cooks', async () => {
    const now = new Date('2026-05-13T11:00:00Z');
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

    mockedPrisma.pushToken.findMany.mockResolvedValue([{ userId: 'u1' }]);
    mockedPrisma.cookingLog.findMany.mockResolvedValue([
      { cookedAt: eightDaysAgo, recipe: { cuisine: 'Persian' } },
    ]);

    await notificationTriggerService.checkCuisineDrought(now);

    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('does NOT fire if the top cuisine was cooked within 7 days', async () => {
    const now = new Date('2026-05-13T11:00:00Z');
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    mockedPrisma.pushToken.findMany.mockResolvedValue([{ userId: 'u1' }]);
    mockedPrisma.cookingLog.findMany.mockResolvedValue([
      { cookedAt: twoDaysAgo, recipe: { cuisine: 'Persian' } },
      { cookedAt: twoDaysAgo, recipe: { cuisine: 'Persian' } },
      { cookedAt: twoDaysAgo, recipe: { cuisine: 'Persian' } },
    ]);

    await notificationTriggerService.checkCuisineDrought(now);

    expect(mockedSend).not.toHaveBeenCalled();
  });
});

describe('checkLapsedUsers', () => {
  it('fires day-3 push when latest RecipeView is exactly 3 days old', async () => {
    const now = new Date('2026-05-13T10:00:00Z');
    const exactlyThreeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    exactlyThreeDaysAgo.setHours(14, 0, 0, 0);

    mockedPrisma.pushToken.findMany.mockResolvedValue([{ userId: 'u1' }]);
    mockedPrisma.recipeView.findFirst.mockResolvedValue({
      viewedAt: exactlyThreeDaysAgo,
    });
    mockedPrisma.cookingLog.findMany.mockResolvedValue([
      { recipe: { cuisine: 'Italian' } },
      { recipe: { cuisine: 'Italian' } },
      { recipe: { cuisine: 'Persian' } },
    ]);

    await notificationTriggerService.checkLapsedUsers(3, now);

    expect(mockedSend).toHaveBeenCalledTimes(1);
    const [, payload] = mockedSend.mock.calls[0];
    expect(payload.title).toBe('Sazon missed you');
    expect(payload.body).toContain('Italian');
    expect(payload.data.source).toBe('lapsedDay3');
  });

  it('uses different copy at day 7', async () => {
    const now = new Date('2026-05-13T10:00:00Z');
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setHours(10, 0, 0, 0);

    mockedPrisma.pushToken.findMany.mockResolvedValue([{ userId: 'u1' }]);
    mockedPrisma.recipeView.findFirst.mockResolvedValue({ viewedAt: sevenDaysAgo });
    mockedPrisma.cookingLog.findMany.mockResolvedValue([
      { recipe: { cuisine: 'Thai' } },
    ]);

    await notificationTriggerService.checkLapsedUsers(7, now);

    expect(mockedSend).toHaveBeenCalledTimes(1);
    const [, payload] = mockedSend.mock.calls[0];
    expect(payload.title).toContain("hasn't seen you");
    expect(payload.body).toContain('Thai');
  });

  it('does NOT fire if the user has no cook history (no hook to use)', async () => {
    const now = new Date('2026-05-13T10:00:00Z');
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    mockedPrisma.pushToken.findMany.mockResolvedValue([{ userId: 'u1' }]);
    mockedPrisma.recipeView.findFirst.mockResolvedValue({ viewedAt: threeDaysAgo });
    mockedPrisma.cookingLog.findMany.mockResolvedValue([]);

    await notificationTriggerService.checkLapsedUsers(3, now);

    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('does NOT double-fire — exact-day-match debounce', async () => {
    const now = new Date('2026-05-13T10:00:00Z');
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    mockedPrisma.pushToken.findMany.mockResolvedValue([{ userId: 'u1' }]);
    // User was active 2 days ago — falls outside the day-3 window
    mockedPrisma.recipeView.findFirst.mockResolvedValue({ viewedAt: twoDaysAgo });

    await notificationTriggerService.checkLapsedUsers(3, now);

    expect(mockedSend).not.toHaveBeenCalled();
  });

  // P3 retention — Day-14 lapsed user
  it('supports Day-14 as a final win-back trigger', async () => {
    const now = new Date('2026-05-13T10:00:00Z');
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    fourteenDaysAgo.setHours(10, 0, 0, 0);

    mockedPrisma.pushToken.findMany.mockResolvedValue([{ userId: 'u1' }]);
    mockedPrisma.recipeView.findFirst.mockResolvedValue({ viewedAt: fourteenDaysAgo });
    mockedPrisma.cookingLog.findMany.mockResolvedValue([
      { recipe: { cuisine: 'Mexican' } },
    ]);

    await notificationTriggerService.checkLapsedUsers(14, now);

    expect(mockedSend).toHaveBeenCalledTimes(1);
    const [, payload] = mockedSend.mock.calls[0];
    expect(payload.body).toContain('Mexican');
    expect(payload.data.source).toBe('lapsedDay14');
  });
});

describe('P4 cook-hour gate — pre-dinner timing matches user routine', () => {
  it('suppresses pre-dinner push when current hour is far from learned cook hour', async () => {
    mockedPrisma.pushToken.findMany.mockResolvedValue([{ userId: 'u1' }]);
    mockedPrisma.recipeView.count.mockResolvedValue(0);
    const eve = (offsetDays: number): Date => {
      const d = new Date();
      d.setDate(d.getDate() - offsetDays);
      d.setHours(20, 0, 0, 0);
      return d;
    };
    mockedPrisma.cookingLog.findMany.mockResolvedValue([
      { cookedAt: eve(1) },
      { cookedAt: eve(2) },
      { cookedAt: eve(3) },
    ]);
    mockedPrisma.cookingLog.count.mockResolvedValue(0);
    mockedPrisma.cookingLog.findFirst.mockResolvedValue({
      recipe: { cuisine: 'Persian' },
    });

    // Learned hour 20, current hour 17 → diff 3 > window 1 → suppress
    const at17 = new Date(); at17.setHours(17, 0, 0, 0);
    await notificationTriggerService.checkPreDinnerNudge(at17);

    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('fires when current hour is within ±1 of learned cook hour', async () => {
    mockedPrisma.pushToken.findMany.mockResolvedValue([{ userId: 'u1' }]);
    mockedPrisma.recipeView.count.mockResolvedValue(0);
    const eve = (offsetDays: number): Date => {
      const d = new Date();
      d.setDate(d.getDate() - offsetDays);
      d.setHours(20, 0, 0, 0);
      return d;
    };
    mockedPrisma.cookingLog.findMany.mockResolvedValue([
      { cookedAt: eve(1) },
      { cookedAt: eve(2) },
      { cookedAt: eve(3) },
    ]);
    mockedPrisma.cookingLog.count.mockResolvedValue(0);
    mockedPrisma.cookingLog.findFirst.mockResolvedValue({
      recipe: { cuisine: 'Persian' },
    });

    const at19 = new Date(); at19.setHours(19, 0, 0, 0); // diff=1, within window
    await notificationTriggerService.checkPreDinnerNudge(at19);

    expect(mockedSend).toHaveBeenCalledTimes(1);
  });
});

describe('P3 engagement gate — pre-dinner + drought suppression', () => {
  it('suppresses the pre-dinner push for heavy users (≥21 views/wk)', async () => {
    mockedPrisma.pushToken.findMany.mockResolvedValue([{ userId: 'u1' }]);
    mockedPrisma.recipeView.count.mockResolvedValue(25); // above threshold
    mockedPrisma.cookingLog.count.mockResolvedValue(0);
    mockedPrisma.cookingLog.findFirst.mockResolvedValue({
      recipe: { cuisine: 'Persian' },
    });

    const at18 = new Date(); at18.setHours(18, 0, 0, 0);
    await notificationTriggerService.checkPreDinnerNudge(at18);

    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('still sends the pre-dinner push for low-engagement users', async () => {
    mockedPrisma.pushToken.findMany.mockResolvedValue([{ userId: 'u1' }]);
    mockedPrisma.recipeView.count.mockResolvedValue(2);
    mockedPrisma.cookingLog.count.mockResolvedValue(0);
    mockedPrisma.cookingLog.findFirst.mockResolvedValue({
      recipe: { cuisine: 'Persian' },
    });

    const at18 = new Date(); at18.setHours(18, 0, 0, 0);
    await notificationTriggerService.checkPreDinnerNudge(at18);

    expect(mockedSend).toHaveBeenCalledTimes(1);
  });

  it('suppresses the cuisine-drought push for heavy users', async () => {
    const now = new Date('2026-05-13T11:00:00Z');
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

    mockedPrisma.pushToken.findMany.mockResolvedValue([{ userId: 'u1' }]);
    mockedPrisma.recipeView.count.mockResolvedValue(30);
    mockedPrisma.cookingLog.findMany.mockResolvedValue([
      { cookedAt: eightDaysAgo, recipe: { cuisine: 'Persian' } },
      { cookedAt: eightDaysAgo, recipe: { cuisine: 'Persian' } },
      { cookedAt: eightDaysAgo, recipe: { cuisine: 'Persian' } },
    ]);

    await notificationTriggerService.checkCuisineDrought(now);

    expect(mockedSend).not.toHaveBeenCalled();
  });
});
