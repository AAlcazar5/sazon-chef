// Phase 4 (10Y-D): Coach-specific Pro gate. Wraps requirePremium semantics but
// returns the Coach paywall payload shape the frontend expects.

import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/lib/prisma';
import { resolveCoachTier } from '@/services/coachService';
import { emit } from '@/services/coachAnalytics';

export type CoachProFeature =
  | 'attachments'
  | 'memory'
  | 'weekly_checkin'
  | 'write_tools'
  | 'export';

interface PaywallCopy {
  headline: string;
  cta: string;
}

const FEATURE_COPY: Record<CoachProFeature, PaywallCopy> = {
  attachments: {
    headline: 'Snap your fridge → get plate ideas. Pro Coach unlocks photos.',
    cta: 'Upgrade to Pro',
  },
  memory: {
    headline: 'Pro Coach remembers what worked. Free starts fresh every chat.',
    cta: 'Upgrade to Pro',
  },
  weekly_checkin: {
    headline: 'Pro Coach checks in every week and adapts. Unlock weekly check-ins.',
    cta: 'Upgrade to Pro',
  },
  write_tools: {
    headline: 'Pro Coach can plan, save, and shop for you. Free is read-only.',
    cta: 'Upgrade to Pro',
  },
  export: {
    headline: 'Save your coach chats. Export is Pro.',
    cta: 'Upgrade to Pro',
  },
};

export function requireCoachPro(feature: CoachProFeature) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true, subscriptionStatus: true },
    });
    const tier = resolveCoachTier(user);
    if (tier !== 'premium') {
      const paywall = FEATURE_COPY[feature];
      emit('coach_paywall_view', { userId, feature, source: 'middleware' });
      return res.status(403).json({
        error: 'PRO_FEATURE',
        feature,
        paywall,
      });
    }
    next();
  };
}

export const COACH_PAYWALL_COPY = FEATURE_COPY;
