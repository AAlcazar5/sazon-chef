// backend/src/services/userTierService.ts
//
// Path A — resolve a User's subscription tier into a UserTier string that
// AIProviderManager.routeToModel consumes.
//
// Today the DB has two real values for User.subscriptionTier: 'free' and
// 'premium'. The 'chef' tier is defined in the type union but gated behind
// the env flag CHEF_TIER_ENABLED — even premium users only get routed to
// chef when the flag is on (intended for canary testing pre-IAP wiring).
// When the third IAP product ships, drop the env flag and read the tier
// directly from the User row.

import { prisma } from '@/lib/prisma';
import type { UserTier } from './aiProviders/AIProvider';

const CHEF_TIER_ENABLED = process.env.CHEF_TIER_ENABLED === 'true';

/**
 * Pure mapper — exported for unit testing.
 */
export function mapTier(
  subscriptionTier: string | null | undefined,
  chefEnabled: boolean = CHEF_TIER_ENABLED,
): UserTier {
  const value = (subscriptionTier ?? 'free').trim().toLowerCase();
  if (value === 'chef' && chefEnabled) return 'chef';
  if (value === 'premium' || value === 'chef') return 'premium';
  return 'free';
}

/**
 * Read the tier from the User row. Returns 'free' when the userId is null
 * (anonymous flow), the user row is missing, or the DB query fails — fail
 * safe to the cheapest model.
 */
export async function resolveUserTier(userId: string | null): Promise<UserTier> {
  if (!userId) return 'free';
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });
    return mapTier(user?.subscriptionTier);
  } catch {
    return 'free';
  }
}
