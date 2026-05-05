// backend/src/services/adaptiveNotificationService.ts
// ROADMAP 4.0 Tier C12 — Adaptive notification scheduling.
//
// Cadence-aware push notifications. Only fires within ±60 min of the user's
// typical cook hour. Max 3 per day. Content adapts to pantry expiry,
// remaining macros, planned-meal state, and cuisine variety.
//
// Lifestyle voice — copy is invitational ("salmon expires Friday — fancy a
// quick recipe?"), never punitive ("you missed your goal").
//
// Pure functions. The caller (cron / push job) is responsible for actually
// sending and persisting to AdaptiveNotificationLog.

export interface AdaptiveNotificationContext {
  userId: string;
  /** Current time in the user's local TZ. */
  now: Date;
  /** Hour 0-23 the user typically starts cooking. */
  typicalCookHour: number;
  /** Notifications already sent today. */
  recentSentCount: number;
  /** Items expiring within the next 2-3 days. */
  expiringPantryItems: Array<{ name: string; daysUntilExpiry: number }>;
  /** Remaining-macro deltas for today. Negative on a field = under. */
  remainingMacros: { calories: number; protein: number; fiber: number };
  /** True if the user has a meal planned for today (any meal slot). */
  hasPlannedMealForToday: boolean;
  /** Distinct cuisines cooked in the last 7 days. */
  cuisineVarietyLast7: number;
}

export type NotificationTemplate =
  | 'expiring-pantry'
  | 'no-plan-tonight'
  | 'fiber-gap'
  | 'low-variety';

const MAX_PER_DAY = 3;
const COOK_HOUR_WINDOW_MIN = 60;
const FIBER_GAP_THRESHOLD = -10; // remaining.fiber < -10g => bigger gap
const LOW_VARIETY_THRESHOLD = 2; // <3 cuisines in last 7d

function withinCookHourWindow(now: Date, typicalCookHour: number): boolean {
  const nowHour = now.getHours() + now.getMinutes() / 60;
  const lower = typicalCookHour - COOK_HOUR_WINDOW_MIN / 60;
  const upper = typicalCookHour + COOK_HOUR_WINDOW_MIN / 60;
  return nowHour >= lower && nowHour <= upper;
}

function hasActionableSignal(ctx: AdaptiveNotificationContext): boolean {
  if (ctx.expiringPantryItems.length > 0) return true;
  if (!ctx.hasPlannedMealForToday) return true;
  if (ctx.remainingMacros.fiber < FIBER_GAP_THRESHOLD) return true;
  if (ctx.cuisineVarietyLast7 < LOW_VARIETY_THRESHOLD + 1) return true;
  return false;
}

export function shouldFireNotification(ctx: AdaptiveNotificationContext): boolean {
  if (ctx.recentSentCount >= MAX_PER_DAY) return false;
  if (!withinCookHourWindow(ctx.now, ctx.typicalCookHour)) return false;
  if (!hasActionableSignal(ctx)) return false;
  return true;
}

export function pickBestTemplate(
  ctx: AdaptiveNotificationContext
): NotificationTemplate | null {
  if (ctx.expiringPantryItems.length > 0) return 'expiring-pantry';
  if (!ctx.hasPlannedMealForToday) return 'no-plan-tonight';
  if (ctx.remainingMacros.fiber < FIBER_GAP_THRESHOLD) return 'fiber-gap';
  if (ctx.cuisineVarietyLast7 <= LOW_VARIETY_THRESHOLD) return 'low-variety';
  return null;
}

export interface NotificationCopy {
  title: string;
  body: string;
}

export function buildNotificationCopy(
  template: NotificationTemplate,
  ctx: AdaptiveNotificationContext
): NotificationCopy {
  switch (template) {
    case 'expiring-pantry': {
      const item = ctx.expiringPantryItems[0];
      const others = ctx.expiringPantryItems.length - 1;
      const trailing = others > 0 ? ` (and ${others} more)` : '';
      return {
        title: `${item.name} expires soon`,
        body: `Your ${item.name}${trailing} is about to go off — fancy a quick recipe to use it tonight?`,
      };
    }
    case 'no-plan-tonight': {
      return {
        title: 'Nothing planned tonight',
        body: "What sounds good for tonight's cook? I can pull a quick plate together with what's in your kitchen.",
      };
    }
    case 'fiber-gap': {
      return {
        title: 'A leafy night?',
        body: 'Your week has been light on fiber. Want to try something with lentils, kale, or oats tonight?',
      };
    }
    case 'low-variety': {
      return {
        title: 'Adventure tonight?',
        body: "You've stayed close to home this week. Fancy something different — maybe a new cuisine?",
      };
    }
    default:
      throw new Error(`buildNotificationCopy: unknown template "${template}"`);
  }
}
