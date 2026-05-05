import { logger } from '../utils/logger';
// backend/src/services/notificationScheduler.ts
// Simple interval-based scheduler for notification triggers.
// Runs hourly, dispatches condition-based triggers based on day/hour.

import { notificationTriggerService } from './notificationTriggerService';
import { runOnce as runCoachWeeklyCheckin } from '@/jobs/coachWeeklyCheckinJob';

let intervalId: NodeJS.Timeout | null = null;

export function startNotificationScheduler(): void {
  if (intervalId) return; // Already running

  // Run every hour
  intervalId = setInterval(async () => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday

    try {
      // Thursday at 6pm: plan reminder
      if (day === 4 && hour === 18) {
        await notificationTriggerService.checkPlanReminders();
      }

      // Daily at 9am: expiry alerts
      if (hour === 9) {
        await notificationTriggerService.checkExpiryAlerts();
      }

      // Sunday at 9am: weekly digest
      if (day === 0 && hour === 9) {
        await notificationTriggerService.checkWeeklyDigest();
        // Group 10Y Phase 6 (10Y-C): Pro coach weekly check-in.
        try {
          await runCoachWeeklyCheckin(now);
        } catch (error) {
          logger.error({ err: error }, '❌ [NotificationScheduler] coachWeeklyCheckin failed:');
        }
      }

      // Daily at 10am: trial ending + day 3 nudge lifecycle emails
      if (hour === 10) {
        await notificationTriggerService.checkTrialEnding();
        await notificationTriggerService.checkDay3Nudge();
      }
    } catch (error) {
      logger.error({ err: error }, '❌ [NotificationScheduler] Error:');
    }
  }, 60 * 60 * 1000); // 1 hour

  logger.info('📬 [NotificationScheduler] Started (hourly interval)');
}

export function stopNotificationScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('📬 [NotificationScheduler] Stopped');
  }
}
