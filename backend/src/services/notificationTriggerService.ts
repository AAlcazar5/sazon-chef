import { logger } from '../utils/logger';
// backend/src/services/notificationTriggerService.ts
// Condition-based notification triggers — event-driven and scheduled

import { prisma } from '@/lib/prisma';
import { pushNotificationService } from './pushNotificationService';
import { emailService } from './emailService';
import { pushCopy } from './pushNotificationCopy';

async function readUserLocale(userId: string): Promise<string | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { locale: true },
  });
  return u?.locale ?? null;
}

export const notificationTriggerService = {
  // ─── EVENT-DRIVEN TRIGGERS ──────────────────────────────────────────────────
  // Called inline from controllers (fire-and-forget with .catch(logger.error))

  /**
   * Fired when a shopping list is generated from a meal plan.
   */
  async onShoppingListReady(userId: string, itemCount: number): Promise<void> {
    const settings = await prisma.notificationSettings.findUnique({
      where: { userId },
      select: { shoppingReminders: true },
    });

    if (!settings?.shoppingReminders) return;

    const locale = await readUserLocale(userId);
    const copy = pushCopy.shoppingListReady(locale, { itemCount });
    await pushNotificationService.sendToUser(userId, {
      title: copy.title,
      body: copy.body,
      data: { screen: '/shopping-list' },
    });
  },

  /**
   * Fired when a meal plan is generated via AI.
   */
  async onMealPlanGenerated(userId: string): Promise<void> {
    const settings = await prisma.notificationSettings.findUnique({
      where: { userId },
      select: { mealReminders: true },
    });

    if (!settings?.mealReminders) return;

    const locale = await readUserLocale(userId);
    const copy = pushCopy.mealPlanReady(locale);
    await pushNotificationService.sendToUser(userId, {
      title: copy.title,
      body: copy.body,
      data: { screen: '/meal-plan' },
    });
  },

  // ─── SCHEDULED TRIGGERS ───────────────────────────────────────────────────
  // Called from notificationScheduler on an interval

  /**
   * Thursday evening: remind users who haven't planned next week.
   */
  async checkPlanReminders(): Promise<void> {
    try {
      // Find the start of next week (Monday)
      const now = new Date();
      const daysUntilMonday = ((8 - now.getDay()) % 7) || 7;
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(0, 0, 0, 0);

      const nextSunday = new Date(nextMonday);
      nextSunday.setDate(nextMonday.getDate() + 6);
      nextSunday.setHours(23, 59, 59, 999);

      // Find users with push tokens but no meal plan starting next week
      const usersWithTokens = await prisma.pushToken.findMany({
        select: { userId: true },
        distinct: ['userId'],
      });

      for (const { userId } of usersWithTokens) {
        // Check if user has mealReminders enabled
        const settings = await prisma.notificationSettings.findUnique({
          where: { userId },
          select: { mealReminders: true },
        });
        if (!settings?.mealReminders) continue;

        // Check if user already has a plan for next week
        const existingPlan = await prisma.mealPlan.findFirst({
          where: {
            userId,
            startDate: { gte: nextMonday },
            endDate: { lte: nextSunday },
          },
        });

        if (!existingPlan) {
          const locale = await readUserLocale(userId);
          const copy = pushCopy.planReminder(locale);
          await pushNotificationService.sendToUser(userId, {
            title: copy.title,
            body: copy.body,
            data: { screen: '/meal-plan' },
          });
        }
      }

      logger.info('📋 [Triggers] checkPlanReminders complete');
    } catch (error) {
      logger.error({ err: error }, '❌ [Triggers] checkPlanReminders error:');
    }
  },

  /**
   * Daily: check for pantry items or meal prep portions expiring within 2 days.
   */
  async checkExpiryAlerts(): Promise<void> {
    try {
      const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const now = new Date();

      // Check meal prep portions with approaching expiry
      const expiringPortions = await prisma.mealPrepPortion.findMany({
        where: {
          expiryDate: { gte: now, lte: twoDaysFromNow },
          freshServingsRemaining: { gt: 0 },
        },
        select: {
          userId: true,
          recipe: { select: { title: true } },
        },
      });

      // Group by user
      const userExpirations = new Map<string, string[]>();
      for (const portion of expiringPortions) {
        const titles = userExpirations.get(portion.userId) || [];
        titles.push(portion.recipe.title);
        userExpirations.set(portion.userId, titles);
      }

      for (const [userId, titles] of userExpirations) {
        const locale = await readUserLocale(userId);
        const copy = pushCopy.expiringSoon(locale, { titles });

        await pushNotificationService.sendToUser(userId, {
          title: copy.title,
          body: copy.body,
          data: { screen: '/meal-prep' },
        });
      }

      logger.info(`⏰ [Triggers] checkExpiryAlerts: ${userExpirations.size} users notified`);
    } catch (error) {
      logger.error({ err: error }, '❌ [Triggers] checkExpiryAlerts error:');
    }
  },

  /**
   * Sunday morning: weekly digest for active users.
   */
  async checkWeeklyDigest(): Promise<void> {
    try {
      // Find users with weeklyInsights enabled
      const settings = await prisma.notificationSettings.findMany({
        where: { weeklyInsights: true },
        select: { userId: true },
      });

      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      for (const { userId } of settings) {
        // Check if user was active this week (has cooking logs or meal history)
        const activityCount = await prisma.cookingLog.count({
          where: { userId, cookedAt: { gte: oneWeekAgo } },
        });

        if (activityCount === 0) continue;

        const locale = await readUserLocale(userId);
        const copy = pushCopy.weeklyDigest(locale, { activityCount });
        await pushNotificationService.sendToUser(userId, {
          title: copy.title,
          body: copy.body,
          data: { screen: '/profile' },
        });
      }

      logger.info('📊 [Triggers] checkWeeklyDigest complete');
    } catch (error) {
      logger.error({ err: error }, '❌ [Triggers] checkWeeklyDigest error:');
    }
  },

  /**
   * Trial ending: check users whose trial ends in 3 days and send warning email.
   */
  async checkTrialEnding(): Promise<void> {
    try {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      const startOfDay = new Date(threeDaysFromNow);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(threeDaysFromNow);
      endOfDay.setHours(23, 59, 59, 999);

      const users = await prisma.user.findMany({
        where: {
          trialEndsAt: { gte: startOfDay, lte: endOfDay },
          subscriptionStatus: { not: 'active' },
        },
        select: { id: true, email: true, name: true },
      });

      for (const user of users) {
        if (user.email) {
          await emailService.sendDay14TrialWarning(user.email, user.name || 'Chef');
        }
      }
      logger.info(`📬 [Triggers] checkTrialEnding: sent ${users.length} emails`);
    } catch (error) {
      logger.error({ err: error }, '❌ [Triggers] checkTrialEnding error:');
    }
  },

  /**
   * Day 3 nudge: send email to users who signed up 3 days ago and have no meal plans.
   */
  async checkDay3Nudge(): Promise<void> {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const startOfDay = new Date(threeDaysAgo);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(threeDaysAgo);
      endOfDay.setHours(23, 59, 59, 999);

      const users = await prisma.user.findMany({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          mealPlans: { none: {} },
        },
        select: { id: true, email: true, name: true },
      });

      for (const user of users) {
        if (user.email) {
          await emailService.sendDay3Nudge(user.email, user.name || 'Chef');
        }
      }
      logger.info(`📬 [Triggers] checkDay3Nudge: sent ${users.length} emails`);
    } catch (error) {
      logger.error({ err: error }, '❌ [Triggers] checkDay3Nudge error:');
    }
  },
};
