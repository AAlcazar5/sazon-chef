// backend/tests/services/notificationScheduler.test.ts
//
// Tier L M19 — runHourlyTick fires the right jobs for each (day, hour)
// and one failing job doesn't abort siblings.

jest.mock('../../src/services/notificationTriggerService', () => ({
  notificationTriggerService: {
    checkPlanReminders: jest.fn().mockResolvedValue(undefined),
    checkExpiryAlerts: jest.fn().mockResolvedValue(undefined),
    checkWeeklyDigest: jest.fn().mockResolvedValue(undefined),
    checkTrialEnding: jest.fn().mockResolvedValue(undefined),
    checkDay3Nudge: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../src/jobs/coachWeeklyCheckinJob', () => ({
  runOnce: jest.fn().mockResolvedValue(undefined),
}));

import { runHourlyTick } from '../../src/services/notificationScheduler';
import { notificationTriggerService } from '../../src/services/notificationTriggerService';
import { runOnce as runCoachWeeklyCheckin } from '../../src/jobs/coachWeeklyCheckinJob';

beforeEach(() => {
  jest.clearAllMocks();
});

function dateAt(day: number, hour: number): Date {
  // Build a date with the desired weekday + hour. 2026-01-04 is a Sunday,
  // so add `day` days to get the right weekday.
  const d = new Date(2026, 0, 4 + day, hour, 0, 0);
  return d;
}

describe('runHourlyTick', () => {
  it('fires expiryAlerts daily at 9am', async () => {
    await runHourlyTick(dateAt(2 /* Tue */, 9));
    expect(notificationTriggerService.checkExpiryAlerts).toHaveBeenCalledTimes(1);
    expect(notificationTriggerService.checkPlanReminders).not.toHaveBeenCalled();
    expect(notificationTriggerService.checkWeeklyDigest).not.toHaveBeenCalled();
  });

  it('fires planReminders Thursday at 6pm only', async () => {
    await runHourlyTick(dateAt(4 /* Thu */, 18));
    expect(notificationTriggerService.checkPlanReminders).toHaveBeenCalledTimes(1);
    await runHourlyTick(dateAt(3 /* Wed */, 18));
    expect(notificationTriggerService.checkPlanReminders).toHaveBeenCalledTimes(1); // unchanged
  });

  it('fires weeklyDigest + coachWeeklyCheckin Sunday at 9am', async () => {
    await runHourlyTick(dateAt(0 /* Sun */, 9));
    expect(notificationTriggerService.checkWeeklyDigest).toHaveBeenCalledTimes(1);
    expect(runCoachWeeklyCheckin).toHaveBeenCalledTimes(1);
    expect(notificationTriggerService.checkExpiryAlerts).toHaveBeenCalledTimes(1); // 9am-daily
  });

  it('fires trialEnding + day3Nudge daily at 10am', async () => {
    await runHourlyTick(dateAt(2, 10));
    expect(notificationTriggerService.checkTrialEnding).toHaveBeenCalledTimes(1);
    expect(notificationTriggerService.checkDay3Nudge).toHaveBeenCalledTimes(1);
  });

  it('runs nothing for off-hours (e.g. Tuesday 3am)', async () => {
    await runHourlyTick(dateAt(2, 3));
    expect(notificationTriggerService.checkPlanReminders).not.toHaveBeenCalled();
    expect(notificationTriggerService.checkExpiryAlerts).not.toHaveBeenCalled();
    expect(notificationTriggerService.checkWeeklyDigest).not.toHaveBeenCalled();
    expect(notificationTriggerService.checkTrialEnding).not.toHaveBeenCalled();
    expect(notificationTriggerService.checkDay3Nudge).not.toHaveBeenCalled();
  });

  it('one failing job does not abort siblings (M19 isolation)', async () => {
    (notificationTriggerService.checkExpiryAlerts as jest.Mock).mockRejectedValueOnce(
      new Error('boom'),
    );
    // 9am Sunday: expiryAlerts (will throw), weeklyDigest, coachWeeklyCheckin
    await runHourlyTick(dateAt(0, 9));
    expect(notificationTriggerService.checkExpiryAlerts).toHaveBeenCalled();
    // siblings still ran despite the throw above
    expect(notificationTriggerService.checkWeeklyDigest).toHaveBeenCalled();
    expect(runCoachWeeklyCheckin).toHaveBeenCalled();
  });
});
