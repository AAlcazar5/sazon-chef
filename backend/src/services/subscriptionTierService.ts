// backend/src/services/subscriptionTierService.ts
// ROADMAP 4.0 PRC1 — Sazon Membership tier definitions + feature gate matrix.
//
// Single source of truth for "what's free vs membership." Both Stripe and
// RevenueCat webhooks write the same `subscriptionTier` / `subscriptionStatus`
// columns (E4), so this service is platform-agnostic.
//
// Pricing positioning ("Sazon Membership", $60/yr default + $9/mo) lives in
// frontend copy. Backend only enforces the tier.

import { prisma } from '@/lib/prisma';

export type SubscriptionTier = 'free' | 'premium';
export type SubscriptionStatus = 'free' | 'trialing' | 'active' | 'past_due' | 'canceled';

/**
 * Discrete features the user can access. New gates always start gated to
 * `premium` and only relax to `free` if product explicitly approves.
 */
export type FeatureKey =
  | 'coachChat'                  // Sazon (Coach) tab — full conversational layer
  | 'coachMemory'                // Long-term memory / preferences carried turn-to-turn
  | 'coachPhotoAttach'           // Photo upload in Coach (snap-to-log)
  | 'adaptiveNutritionCoverage'  // Per-user nutrient gap targeting
  | 'culturalPrimers'            // First-cook cuisine primers
  | 'voiceCooking'               // Hands-free Kitchen mode
  | 'adaptiveNotifications'      // Personalized push timing + content
  | 'fullNutritionView'          // Cronometer-equivalent ~33-nutrient view (D14 'power-user')
  | 'buildAPlateUnlimited'       // Free tier capped at FREE_BUILD_A_PLATE_WEEKLY_LIMIT
  ;

/**
 * Rate limit applied to free users on Build-a-Plate. Premium has no cap.
 *
 * I3.1 (2026-05-08): raised 3 → 5/wk after the free-tier audit. Reasoning:
 * 3/wk caps the user before they hit two complete weeks (= one cooking
 * arc). 5/wk lets a typical 3-cook-nights-per-week user explore Build-a-
 * Plate without hitting the cap before forming a habit. Above-cap usage
 * still routes through the LLM layer's per-user cost telemetry (I3.3),
 * so a runaway free user is caught at the variable-cost layer, not via
 * a feature wall in the user's face. See backend/docs/pricing-philosophy.md.
 */
export const FREE_BUILD_A_PLATE_WEEKLY_LIMIT = 5;

/** Trial users get the same access as paid premium. */
const ACTIVE_PAID_STATUSES: ReadonlySet<SubscriptionStatus> = new Set(['active', 'trialing']);

/**
 * Feature matrix. `true` = tier can access; `false` = blocked.
 * Free is the wider list (Kitchen, full Build-a-Plate at the rate limit, all
 * core recipes); the keys below are the *premium-gated* ones, so any feature
 * not in this map is allowed for everyone.
 *
 * I3.1 (2026-05-08) — free-tier audit changes:
 *   - `coachChat` MOVED OUT — Sazon coach is the brand. Gating it kills
 *     the differentiator; rate-limit at the LLM layer instead (I3.3).
 *   - `coachMemory` MOVED OUT — coach without memory is a stranger;
 *     locking it behind a paywall is the MyFitnessPal "barcode-scan
 *     locked" antipattern (#1 user complaint in App Store reviews).
 *   - `coachPhotoAttach` STAYS — photo upload has real per-message
 *     vision-token cost; premium covers it.
 * See backend/docs/pricing-philosophy.md for the full audit.
 */
const PREMIUM_ONLY_FEATURES: ReadonlySet<FeatureKey> = new Set<FeatureKey>([
  'coachPhotoAttach',
  'adaptiveNutritionCoverage',
  'culturalPrimers',
  'voiceCooking',
  'adaptiveNotifications',
  'fullNutritionView',
  'buildAPlateUnlimited',
]);

export interface AccessDecision {
  allowed: boolean;
  reason: 'free_tier_grants' | 'premium_grants' | 'tier_too_low' | 'subscription_inactive' | 'rate_limited';
  /** Filled when reason === 'rate_limited'. */
  remaining?: number;
  /** Filled when reason === 'rate_limited'. ISO date for the next refresh. */
  resetsAt?: string;
}

interface UserSubscriptionFields {
  subscriptionTier: SubscriptionTier | string;
  subscriptionStatus: SubscriptionStatus | string;
}

/**
 * Pure tier check. Doesn't account for rate limits — caller layers those on
 * top via `evaluateAccess` for features that have them.
 */
export function hasFeatureAccess(
  user: UserSubscriptionFields,
  feature: FeatureKey,
): boolean {
  if (!PREMIUM_ONLY_FEATURES.has(feature)) return true;
  if (user.subscriptionTier !== 'premium') return false;
  return ACTIVE_PAID_STATUSES.has(user.subscriptionStatus as SubscriptionStatus);
}

function isPremiumActive(user: UserSubscriptionFields): boolean {
  return (
    user.subscriptionTier === 'premium' &&
    ACTIVE_PAID_STATUSES.has(user.subscriptionStatus as SubscriptionStatus)
  );
}

/** ISO Monday-of-this-week (UTC) — matches the rolling "this week" reset. */
function startOfWeekUtc(now: Date = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayOfWeek = d.getUTCDay(); // Sunday = 0
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function startOfNextWeekUtc(now: Date = new Date()): Date {
  const d = startOfWeekUtc(now);
  d.setUTCDate(d.getUTCDate() + 7);
  return d;
}

/**
 * Full access check including rate limits. Loads the user; queries the
 * relevant counter when the feature is rate-limited.
 *
 * For feature='buildAPlateUnlimited' this returns:
 *   - { allowed: true, reason: 'premium_grants' } for premium
 *   - { allowed: true, reason: 'free_tier_grants', remaining: N } when under cap
 *   - { allowed: false, reason: 'rate_limited', remaining: 0, resetsAt } at cap
 */
export async function evaluateAccess(
  userId: string,
  feature: FeatureKey,
): Promise<AccessDecision> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true, subscriptionStatus: true },
  });
  if (!user) {
    return { allowed: false, reason: 'subscription_inactive' };
  }

  // Premium short-circuits all gates.
  if (isPremiumActive(user)) {
    return { allowed: true, reason: 'premium_grants' };
  }

  // Premium-only features blocked for free.
  if (PREMIUM_ONLY_FEATURES.has(feature) && feature !== 'buildAPlateUnlimited') {
    return { allowed: false, reason: 'tier_too_low' };
  }

  // Build-a-Plate is "premium-only unlimited" — free users can use it up to
  // FREE_BUILD_A_PLATE_WEEKLY_LIMIT this week, then it gates.
  if (feature === 'buildAPlateUnlimited') {
    const since = startOfWeekUtc();
    const used = await prisma.composedPlate.count({
      where: { userId, createdAt: { gte: since } },
    });
    const remaining = Math.max(0, FREE_BUILD_A_PLATE_WEEKLY_LIMIT - used);
    if (remaining <= 0) {
      return {
        allowed: false,
        reason: 'rate_limited',
        remaining: 0,
        resetsAt: startOfNextWeekUtc().toISOString(),
      };
    }
    return {
      allowed: true,
      reason: 'free_tier_grants',
      remaining,
      resetsAt: startOfNextWeekUtc().toISOString(),
    };
  }

  // Anything else not in PREMIUM_ONLY_FEATURES is open.
  return { allowed: true, reason: 'free_tier_grants' };
}

export const __forTest = {
  PREMIUM_ONLY_FEATURES,
  ACTIVE_PAID_STATUSES,
  startOfWeekUtc,
  startOfNextWeekUtc,
};
