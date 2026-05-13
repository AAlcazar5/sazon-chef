import { logger } from '../utils/logger';
// backend/src/services/notificationTriggerService.ts
// Condition-based notification triggers — event-driven and scheduled

import { prisma } from '@/lib/prisma';
import { pushNotificationService } from './pushNotificationService';
import { emailService } from './emailService';
import { pushCopy } from './pushNotificationCopy';
import { shouldSendNonCriticalPush } from './engagementGateService';
import {
  getUserCookHour,
  shouldFireAtCurrentHour,
} from './userCookHourService';
import { getAdjacentCuisines } from '../utils/cuisineAdjacency';

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
   *
   * `extras` is optional preview personalization (P1 retention) — passing
   * day name + dominant category lets the lock-screen read as specific
   * ("Tuesday's list — 14 items, mostly produce") instead of generic.
   */
  async onShoppingListReady(
    userId: string,
    itemCount: number,
    extras: { dayName?: string; dominantCategory?: string } = {},
  ): Promise<void> {
    const settings = await prisma.notificationSettings.findUnique({
      where: { userId },
      select: { shoppingReminders: true },
    });

    if (!settings?.shoppingReminders) return;

    const locale = await readUserLocale(userId);
    const copy = pushCopy.shoppingListReady(locale, {
      itemCount,
      dayName: extras.dayName,
      dominantCategory: extras.dominantCategory,
    });
    await pushNotificationService.sendToUser(userId, {
      title: copy.title,
      body: copy.body,
      data: { screen: '/shopping-list' },
    });
  },

  /**
   * Fired when a meal plan is generated via AI.
   *
   * `extras` lets the preview read "7 meals across 5 cuisines — tap to view."
   * instead of the generic "Tap to see your week at a glance."
   */
  async onMealPlanGenerated(
    userId: string,
    extras: { dayCount?: number; cuisineCount?: number } = {},
  ): Promise<void> {
    const settings = await prisma.notificationSettings.findUnique({
      where: { userId },
      select: { mealReminders: true },
    });

    if (!settings?.mealReminders) return;

    const locale = await readUserLocale(userId);
    const copy = pushCopy.mealPlanReady(locale, {
      dayCount: extras.dayCount,
      cuisineCount: extras.cuisineCount,
    });
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
        const weekLogs = await prisma.cookingLog.findMany({
          where: { userId, cookedAt: { gte: oneWeekAgo } },
          select: { recipe: { select: { cuisine: true } } },
        });
        const activityCount = weekLogs.length;
        if (activityCount === 0) continue;

        // Compute top cuisine for the preview (P1 retention)
        const cuisineCounts = new Map<string, number>();
        for (const l of weekLogs) {
          const c = l.recipe?.cuisine?.trim();
          if (!c) continue;
          cuisineCounts.set(c, (cuisineCounts.get(c) ?? 0) + 1);
        }
        const topCuisine = Array.from(cuisineCounts.entries())
          .sort((a, b) => b[1] - a[1])[0]?.[0];

        const locale = await readUserLocale(userId);
        const copy = pushCopy.weeklyDigest(locale, { activityCount, topCuisine });
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
   * Pre-dinner push (P0 retention). Fires at server hour 18 (one tick).
   *
   * For each push-enabled user with at least one cook in the past 14 days:
   * suggests an adjacent cuisine to their most recent cook ("Yesterday's
   * plate was Persian — fancy fesenjan tonight?"). Voice guide canon:
   * "You haven't had Persian flavors in a week. Fancy fesenjan?"
   *
   * Skips users who already cooked today (no point nudging dinner that
   * happened) and respects mealReminders + quietHours settings.
   */
  async checkPreDinnerNudge(now: Date = new Date()): Promise<void> {
    try {
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const candidates = await prisma.pushToken.findMany({
        select: { userId: true },
        distinct: ['userId'],
      });

      let sent = 0;
      for (const { userId } of candidates) {
        const settings = await prisma.notificationSettings.findUnique({
          where: { userId },
          select: { mealReminders: true },
        });
        if (!settings?.mealReminders) continue;

        // P3 retention — suppress for heavy-engagement users.
        if (!(await shouldSendNonCriticalPush(userId))) continue;

        // P4 retention — only fire when the current server hour matches
        // the user's learned dinner hour (± window). Users on different
        // schedules get pinged at their hour instead of a fixed 18:00.
        const userHour = await getUserCookHour(userId, prisma, now);
        if (!shouldFireAtCurrentHour(userHour, now.getHours())) continue;

        const alreadyCookedToday = await prisma.cookingLog.count({
          where: { userId, cookedAt: { gte: startOfToday } },
        });
        if (alreadyCookedToday > 0) continue;

        const lastCook = await prisma.cookingLog.findFirst({
          where: { userId, cookedAt: { gte: fourteenDaysAgo } },
          orderBy: { cookedAt: 'desc' },
          select: { recipe: { select: { cuisine: true } } },
        });
        const lastCuisine = lastCook?.recipe?.cuisine?.trim();
        if (!lastCuisine) continue;

        const adjacents = getAdjacentCuisines(lastCuisine);
        const suggested = adjacents[0]?.cuisine;
        if (!suggested) continue;

        const locale = await readUserLocale(userId);
        const copy = pushCopy.preDinnerNudge(locale, { suggestedCuisine: suggested });
        await pushNotificationService.sendToUser(userId, {
          title: copy.title,
          body: copy.body,
          data: { screen: '/', source: 'preDinnerNudge' },
        });
        sent++;
      }

      logger.info(`🍽️  [Triggers] checkPreDinnerNudge: sent ${sent} pushes`);
    } catch (error) {
      logger.error({ err: error }, '❌ [Triggers] checkPreDinnerNudge error:');
    }
  },

  /**
   * Cuisine drought push (P0 retention). Fires daily at 11.
   *
   * For each push-enabled user: looks at their cooking history over the
   * past 60 days. If they have a top-3 cuisine they cooked ≥3 times that
   * hasn't been touched in 7+ days, nudges them: "Persian has been quiet
   * — you haven't had Persian flavors in 9 days. Something tonight?"
   * Max one drought push per user per 7-day window (debounced via the
   * latest sent timestamp on `notificationSettings.lastDroughtPushAt`).
   */
  async checkCuisineDrought(now: Date = new Date()): Promise<void> {
    try {
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const candidates = await prisma.pushToken.findMany({
        select: { userId: true },
        distinct: ['userId'],
      });

      let sent = 0;
      for (const { userId } of candidates) {
        const settings = await prisma.notificationSettings.findUnique({
          where: { userId },
          select: { mealReminders: true },
        });
        if (!settings?.mealReminders) continue;

        // P3 retention — suppress for heavy-engagement users.
        if (!(await shouldSendNonCriticalPush(userId))) continue;

        const logs = await prisma.cookingLog.findMany({
          where: { userId, cookedAt: { gte: sixtyDaysAgo } },
          orderBy: { cookedAt: 'desc' },
          select: { cookedAt: true, recipe: { select: { cuisine: true } } },
        });

        const cuisineStats = new Map<string, { count: number; latest: Date }>();
        for (const log of logs) {
          const c = log.recipe?.cuisine?.trim();
          if (!c) continue;
          const existing = cuisineStats.get(c);
          if (existing) {
            existing.count += 1;
          } else {
            cuisineStats.set(c, { count: 1, latest: log.cookedAt });
          }
        }

        const ranked = Array.from(cuisineStats.entries())
          .filter(([, s]) => s.count >= 3)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 3)
          .filter(([, s]) => s.latest < sevenDaysAgo);

        if (ranked.length === 0) continue;
        const [droughtCuisine, droughtStats] = ranked[0];
        const daysSince = Math.floor(
          (now.getTime() - droughtStats.latest.getTime()) / (24 * 60 * 60 * 1000),
        );

        const locale = await readUserLocale(userId);
        const copy = pushCopy.cuisineDrought(locale, {
          cuisine: droughtCuisine,
          daysSince,
        });
        await pushNotificationService.sendToUser(userId, {
          title: copy.title,
          body: copy.body,
          data: { screen: '/', source: 'cuisineDrought', cuisine: droughtCuisine },
        });
        sent++;
      }

      logger.info(`🌶  [Triggers] checkCuisineDrought: sent ${sent} pushes`);
    } catch (error) {
      logger.error({ err: error }, '❌ [Triggers] checkCuisineDrought error:');
    }
  },

  /**
   * Lapsed-user win-back push (P0 retention).
   *
   * Fires once when a user's most-recent `RecipeView` is exactly `daysAgo`
   * days old (debounced by exact day-match, so a 3-day check won't re-fire
   * tomorrow on the same user — Day 7 check picks them up next). Uses
   * their top cuisine as the re-entry hook.
   */
  async checkLapsedUsers(
    daysAgo: 3 | 7 | 14,
    now: Date = new Date(),
  ): Promise<void> {
    try {
      const target = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(target);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(target);
      endOfDay.setHours(23, 59, 59, 999);
      const afterEndOfDay = new Date(endOfDay.getTime() + 1);

      const candidates = await prisma.pushToken.findMany({
        select: { userId: true },
        distinct: ['userId'],
      });

      let sent = 0;
      for (const { userId } of candidates) {
        const latestView = await prisma.recipeView.findFirst({
          where: { userId },
          orderBy: { viewedAt: 'desc' },
          select: { viewedAt: true },
        });
        if (!latestView) continue;
        if (latestView.viewedAt < startOfDay) continue;
        if (latestView.viewedAt >= afterEndOfDay) continue;

        const logs = await prisma.cookingLog.findMany({
          where: { userId },
          orderBy: { cookedAt: 'desc' },
          take: 50,
          select: { recipe: { select: { cuisine: true } } },
        });
        const counts = new Map<string, number>();
        for (const log of logs) {
          const c = log.recipe?.cuisine?.trim();
          if (!c) continue;
          counts.set(c, (counts.get(c) ?? 0) + 1);
        }
        const topCuisine = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (!topCuisine) continue;

        const locale = await readUserLocale(userId);
        // Day-3 and Day-14 both reuse the lighter "Sazon missed you" copy;
        // Day-7 gets the slightly heavier "hasn't seen you in a while" line.
        const copy = daysAgo === 7
          ? pushCopy.lapsedDay7(locale, { topCuisine })
          : pushCopy.lapsedDay3(locale, { topCuisine });
        await pushNotificationService.sendToUser(userId, {
          title: copy.title,
          body: copy.body,
          data: { screen: '/', source: `lapsedDay${daysAgo}` },
        });
        sent++;
      }

      logger.info(`👋 [Triggers] checkLapsedUsers(day${daysAgo}): sent ${sent} pushes`);
    } catch (error) {
      logger.error({ err: error, daysAgo }, '❌ [Triggers] checkLapsedUsers error:');
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
