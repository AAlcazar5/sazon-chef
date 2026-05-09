// backend/src/middleware/fetchUserSubscription.ts
// K10: shared subscription-state lookup used by requirePremium + requireCoachPro.
// Both middlewares previously duplicated this Prisma query verbatim.

import { prisma } from '@/lib/prisma';

export interface UserSubscription {
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
}

export async function fetchUserSubscription(
  userId: string,
): Promise<UserSubscription | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true, subscriptionStatus: true },
  });
}
