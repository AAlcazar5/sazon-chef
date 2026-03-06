// backend/src/modules/stripe/stripeController.ts
// Stripe checkout + portal + subscription status endpoints

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { stripeService } from '@/services/stripeService';

// Deep-link / web fallback URLs for Checkout redirects
const APP_SCHEME = process.env.APP_SCHEME || 'sazonchef';

export const stripeController = {
  /**
   * GET /api/stripe/subscription
   * Returns the current user's subscription status and tier.
   */
  async getSubscription(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          subscriptionStatus: true,
          subscriptionTier: true,
          trialEndsAt: true,
          currentPeriodEnd: true,
        },
      });

      return res.json({
        status: user.subscriptionStatus,
        tier: user.subscriptionTier,
        trialEndsAt: user.trialEndsAt,
        currentPeriodEnd: user.currentPeriodEnd,
        isPremium: user.subscriptionTier === 'premium',
      });
    } catch (err: any) {
      console.error('getSubscription error:', err);
      return res.status(500).json({ error: 'Failed to get subscription status' });
    }
  },

  /**
   * POST /api/stripe/checkout
   * Body: { interval: 'month' | 'year' }
   * Returns a Stripe Checkout session URL.
   */
  async createCheckout(req: Request, res: Response) {
    try {
      if (!stripeService.isConfigured()) {
        return res.status(503).json({ error: 'Stripe is not configured' });
      }

      const userId = req.user!.id;
      const { interval = 'month' } = req.body;

      if (interval !== 'month' && interval !== 'year') {
        return res.status(400).json({ error: 'interval must be month or year' });
      }

      const successUrl = `${APP_SCHEME}://premium/success`;
      const cancelUrl = `${APP_SCHEME}://premium/cancel`;

      const session = await stripeService.createCheckoutSession(
        userId,
        interval,
        successUrl,
        cancelUrl,
      );

      return res.json({ url: session.url, sessionId: session.id });
    } catch (err: any) {
      console.error('createCheckout error:', err);
      return res.status(500).json({ error: 'Failed to create checkout session' });
    }
  },

  /**
   * POST /api/stripe/portal
   * Returns a Stripe Customer Portal session URL.
   */
  async createPortal(req: Request, res: Response) {
    try {
      if (!stripeService.isConfigured()) {
        return res.status(503).json({ error: 'Stripe is not configured' });
      }

      const userId = req.user!.id;
      const returnUrl = `${APP_SCHEME}://profile/subscription`;

      const session = await stripeService.createPortalSession(userId, returnUrl);
      return res.json({ url: session.url });
    } catch (err: any) {
      console.error('createPortal error:', err);
      return res.status(500).json({ error: 'Failed to create portal session' });
    }
  },
};
