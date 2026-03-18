// backend/src/services/notificationTriggerService.ts
// Condition-based notification triggers — event-driven and scheduled

import { prisma } from '@/lib/prisma';
import { pushNotificationService } from './pushNotificationService';
import { emailService } from './emailService';

export const notificationTriggerService = {
  // ─── EVENT-DRIVEN TRIGGERS ──────────────────────────────────────────────────
  // Called inline from controllers (fire-and-forget with .catch(console.error))

  /**
   * Fired when a shopping list is generated from a meal plan.
   */
  async onShoppingListReady(userId: string, itemCount: number): Promise<void> {
    const settings = await prisma.notificationSettings.findUnique({
      where: { userId },
      select: { shoppingReminders: true },
    });

    if (!settings?.shoppingReminders) return;

    await pushNotificationService.sendToUser(userId, {
      title: 'Your shopping list is ready',
      body: `${itemCount} item${itemCount !== 1 ? 's' : ''} — tap to view.`,
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

    await pushNotificationService.sendToUser(userId, {
      title: 'Your meal plan is ready!',
      body: 'Tap to see your week at a glance.',
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
          await pushNotificationService.sendToUser(userId, {
            title: 'Plan your week?',
            body: 'Want me to plan next week? Takes 10 seconds.',
            data: { screen: '/meal-plan' },
          });
        }
      }

      console.log('📋 [Triggers] checkPlanReminders complete');
    } catch (error) {
      console.error('❌ [Triggers] checkPlanReminders error:', error);
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
        const itemName = titles[0];
        const body = titles.length === 1
          ? `${itemName} expires soon — here are some quick recipes.`
          : `${titles.length} items expire soon — use them before they go!`;

        await pushNotificationService.sendToUser(userId, {
          title: 'Expiring soon',
          body,
          data: { screen: '/meal-prep' },
        });
      }

      console.log(`⏰ [Triggers] checkExpiryAlerts: ${userExpirations.size} users notified`);
    } catch (error) {
      console.error('❌ [Triggers] checkExpiryAlerts error:', error);
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

        await pushNotificationService.sendToUser(userId, {
          title: 'Your week at a glance',
          body: `You cooked ${activityCount} meal${activityCount !== 1 ? 's' : ''} this week! Tap for your summary.`,
          data: { screen: '/profile' },
        });
      }

      console.log('📊 [Triggers] checkWeeklyDigest complete');
    } catch (error) {
      console.error('❌ [Triggers] checkWeeklyDigest error:', error);
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
      console.log(`📬 [Triggers] checkTrialEnding: sent ${users.length} emails`);
    } catch (error) {
      console.error('❌ [Triggers] checkTrialEnding error:', error);
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
      console.log(`📬 [Triggers] checkDay3Nudge: sent ${users.length} emails`);
    } catch (error) {
      console.error('❌ [Triggers] checkDay3Nudge error:', error);
    }
  },
};
