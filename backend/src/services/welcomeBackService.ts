// ROADMAP 4.0 A7.4 — "Welcome back" first-login peak moment.
//
// First time a returning user logs back in (per device), show a one-line
// peak surface in lifestyle voice:
//
//   "Welcome back. Your last cook was 4 days ago — fancy a Persian Friday?"
//
// Hides if the user cooked within 2 days (no peak when nothing notable).
// Prose generation routes through sazonVoiceService (N3.2). Caller passes
// the device's `lastSeenAt` so the service can decide; the AsyncStorage
// timestamp lives client-side.

import { prisma } from '../lib/prisma';
import { compose } from './sazonVoiceService';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SUPPRESS_WHEN_COOKED_WITHIN_DAYS = 2;

export interface WelcomeBackPeak {
  /** Lifestyle-voice line ready to render verbatim. */
  message: string;
  /** Cuisine of the user's most recent cook (or null). */
  cuisine: string | null;
  /** Days since the user's most recent cook (or null when no cooks). */
  daysSinceLastCook: number | null;
}

export interface PickWelcomeBackPeakInput {
  userId: string;
  /** Reference time for cadence math. Defaults to `new Date()`. */
  now?: Date;
}

interface CookRow {
  cookedAt: Date;
  recipe: { cuisine: string | null } | null;
}

const DAY_OF_WEEK_ADJ: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

function buildMessage(
  cuisine: string | null,
  daysSinceLastCook: number | null,
  now: Date,
): string {
  if (daysSinceLastCook == null) {
    // No prior cook — silence the peak (caller renders nothing).
    return '';
  }
  const dayName = DAY_OF_WEEK_ADJ[now.getDay()] ?? '';
  if (cuisine && cuisine.trim().length > 0) {
    return compose(
      `Welcome back. Your last cook was ${daysSinceLastCook} days ago — fancy a ${cuisine} ${dayName}?`,
      { surface: 'card' },
    ).line;
  }
  return compose(
    `Welcome back. It's been ${daysSinceLastCook} days — what's the move tonight?`,
    { surface: 'card' },
  ).line;
}

/**
 * Pick the welcome-back peak content. Returns null when:
 *   - user has cooked within `SUPPRESS_WHEN_COOKED_WITHIN_DAYS` (2 days)
 *   - userId is empty
 *
 * Caller (frontend hook) is responsible for the per-session and per-device
 * gating via AsyncStorage `@sazon/auth/last_seen_at`.
 */
export async function pickWelcomeBackPeak(
  input: PickWelcomeBackPeakInput,
): Promise<WelcomeBackPeak | null> {
  if (!input.userId) return null;
  const now = input.now ?? new Date();

  const lastCook = (await (prisma as any).cookingLog.findFirst({
    where: { userId: input.userId },
    orderBy: { cookedAt: 'desc' },
    include: { recipe: { select: { cuisine: true } } },
  })) as CookRow | null;

  // No cooks yet — no peak (the activation surface N12 owns that path).
  if (!lastCook) return null;

  const days = Math.floor(
    (now.getTime() - lastCook.cookedAt.getTime()) / MS_PER_DAY,
  );
  if (days < SUPPRESS_WHEN_COOKED_WITHIN_DAYS) return null;

  const cuisine = lastCook.recipe?.cuisine?.trim() || null;
  const message = buildMessage(cuisine, days, now);
  if (!message) return null;

  return {
    message,
    cuisine,
    daysSinceLastCook: days,
  };
}

export const __INTERNALS = {
  SUPPRESS_WHEN_COOKED_WITHIN_DAYS,
};
