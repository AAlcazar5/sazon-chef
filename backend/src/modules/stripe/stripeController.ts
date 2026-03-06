// backend/src/modules/stripe/stripeController.ts
// Stripe checkout + portal + subscription status endpoints

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { stripeService } from '@/services/stripeService';
import { emailService } from '@/services/emailService';

const VALID_CANCEL_REASONS = ['too_expensive', 'not_using', 'missing_feature', 'other'] as const;
type CancelReason = typeof VALID_CANCEL_REASONS[number];

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
   * POST /api/stripe/cancel
   * Body: { reason: CancelReason, feedback?: string, action: 'cancel' | 'pause' }
   * Records survey response and cancels or pauses the Stripe subscription.
   */
  async cancelSubscription(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { reason, feedback, action = 'cancel' } = req.body;

      if (!VALID_CANCEL_REASONS.includes(reason as CancelReason)) {
        return res.status(400).json({
          error: 'Invalid reason. Must be one of: too_expensive, not_using, missing_feature, other',
        });
      }

      if (action !== 'cancel' && action !== 'pause') {
        return res.status(400).json({ error: 'action must be cancel or pause' });
      }

      // Record survey response first (before calling Stripe)
      await (prisma as any).cancellationSurvey.create({
        data: { userId, reason, feedback: feedback || null, action },
      });

      if (!stripeService.isConfigured()) {
        // In dev/test without Stripe, just update DB directly
        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionStatus: action === 'pause' ? 'paused' : 'canceled', subscriptionTier: 'free' },
        });
        return res.json(action === 'pause' ? { paused: true } : { cancelled: true });
      }

      if (action === 'pause') {
        await stripeService.pauseSubscription(userId);
        return res.json({ paused: true });
      }

      // Cancel
      await stripeService.cancelSubscription(userId);

      // Send cancellation email (fire-and-forget)
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailEncrypted: true } });
      if (user?.email && !user.emailEncrypted) {
        emailService.sendSubscriptionChange(user.email, 'cancelled').catch(() => {});
      }

      return res.json({ cancelled: true });
    } catch (err: any) {
      console.error('cancelSubscription error:', err);
      return res.status(500).json({ error: err.message || 'Failed to cancel subscription' });
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
