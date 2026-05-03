// Group 10Y Phase 6 (10Y-C): user preference endpoint for weeklyCheckinOptIn.
// Pro-gated when toggling on, free-allowed when toggling off.

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';
import {
  COACH_PAYWALL_COPY,
  type CoachProFeature,
} from '@/middleware/requireCoachPro';
import { resolveCoachTier } from '@/services/coachService';
import { emit } from '@/services/coachAnalytics';

export const userPreferencesRoutes = Router();

const weeklyCheckinSchema = z.object({
  weeklyCheckinOptIn: z.boolean(),
});

userPreferencesRoutes.patch(
  '/preferences/weekly-checkin',
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = weeklyCheckinSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'INVALID_BODY' });
    }
    const { weeklyCheckinOptIn } = parsed.data;

    // Only the opt-IN path is gated. Opting out must always be allowed —
    // a downgraded user must be able to disable a feature they no longer have.
    if (weeklyCheckinOptIn === true) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionTier: true, subscriptionStatus: true },
      });
      const tier = resolveCoachTier(user);
      if (tier !== 'premium') {
        const feature: CoachProFeature = 'weekly_checkin';
        emit('coach_paywall_view', { userId, feature, source: 'preferences' });
        return res.status(403).json({
          error: 'PRO_FEATURE',
          feature,
          paywall: COACH_PAYWALL_COPY[feature],
        });
      }
    }

    const prefs = await prisma.userPreferences.upsert({
      where: { userId },
      update: { weeklyCheckinOptIn },
      create: {
        userId,
        cookTimePreference: 30,
        spiceLevel: 'medium',
        weeklyCheckinOptIn,
      },
    });

    return res.status(200).json({
      weeklyCheckinOptIn: prefs.weeklyCheckinOptIn,
    });
  },
);
