import { logger } from '../utils/logger';
// backend/src/services/notificationScheduler.ts
// Simple interval-based scheduler for notification triggers.
// Runs hourly, dispatches condition-based triggers based on day/hour.
//
// Tier L M19 — observability: each trigger runs in its own try/catch with
// structured logging (job name, day, hour, duration_ms). One failing trigger
// no longer aborts the rest of the hourly tick. The exported `runHourlyTick`
// makes the scheduling decision testable in isolation.

import { notificationTriggerService } from './notificationTriggerService';
import { runOnce as runCoachWeeklyCheckin } from '@/jobs/coachWeeklyCheckinJob';

let intervalId: NodeJS.Timeout | null = null;

interface ScheduledJob {
  name: string;
  shouldRun: (day: number, hour: number) => boolean;
  run: (now: Date) => Promise<unknown>;
}

const JOBS: ScheduledJob[] = [
  {
    name: 'planReminders',
    // Thursday at 6pm
    shouldRun: (day, hour) => day === 4 && hour === 18,
    run: () => notificationTriggerService.checkPlanReminders(),
  },
  {
    name: 'expiryAlerts',
    // Daily at 9am
    shouldRun: (_day, hour) => hour === 9,
    run: () => notificationTriggerService.checkExpiryAlerts(),
  },
  {
    name: 'weeklyDigest',
    // Sunday at 9am
    shouldRun: (day, hour) => day === 0 && hour === 9,
    run: () => notificationTriggerService.checkWeeklyDigest(),
  },
  {
    name: 'coachWeeklyCheckin',
    // Sunday at 9am (Group 10Y Phase 6 / 10Y-C)
    shouldRun: (day, hour) => day === 0 && hour === 9,
    run: (now) => runCoachWeeklyCheckin(now),
  },
  {
    name: 'trialEnding',
    // Daily at 10am
    shouldRun: (_day, hour) => hour === 10,
    run: () => notificationTriggerService.checkTrialEnding(),
  },
  {
    name: 'day3Nudge',
    // Daily at 10am
    shouldRun: (_day, hour) => hour === 10,
    run: () => notificationTriggerService.checkDay3Nudge(),
  },
];

/**
 * Run a single hourly tick. Exported so tests can assert which jobs fire
 * for a given (day, hour) pair without spinning up a real interval.
 */
export async function runHourlyTick(now: Date = new Date()): Promise<void> {
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = now.getHours();

  for (const job of JOBS) {
    if (!job.shouldRun(day, hour)) continue;
    const startedAt = Date.now();
    try {
      await job.run(now);
      logger.info(
        { job: job.name, day, hour, durationMs: Date.now() - startedAt },
        'notificationScheduler.job.ok',
      );
    } catch (error) {
      logger.error(
        { err: error, job: job.name, day, hour, durationMs: Date.now() - startedAt },
        'notificationScheduler.job.failed',
      );
    }
  }
}

export function startNotificationScheduler(): void {
  if (intervalId) return; // Already running

  // Run every hour
  intervalId = setInterval(() => {
    runHourlyTick().catch((err) =>
      logger.error({ err }, 'notificationScheduler.tick.unexpected'),
    );
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
