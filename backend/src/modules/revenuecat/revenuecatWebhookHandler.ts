import { logger } from '../../utils/logger';
// backend/src/modules/revenuecat/revenuecatWebhookHandler.ts
// ROADMAP 4.0 E4 — RevenueCat webhook handler.
//
// Mirrors the Stripe webhook contract (`stripeWebhookHandler.ts`):
// - shared-secret auth via Authorization header
// - idempotent on event id (RevenueCatWebhookEvent uniq index)
// - writes the same `subscriptionStatus` / `subscriptionTier` /
//   `currentPeriodEnd` / `trialEndsAt` columns Stripe writes, so any
//   feature gate (`requirePremium`, `requireCoachPro`) works regardless of
//   which billing platform actually charged the user.
//
// Event types handled (per RevenueCat 2024+ payloads):
//   INITIAL_PURCHASE  → status active, tier premium
//   RENEWAL           → status active, refresh period_end
//   CANCELLATION      → cancelAtPeriodEnd=true (access continues until EXPIRATION)
//   EXPIRATION        → status canceled, tier free
//   TRIAL_STARTED     → status trialing, trialEndsAt set
//   TRIAL_CONVERTED   → status active, tier premium, trialEndsAt cleared
//   BILLING_ISSUE     → status past_due

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';

interface RevenueCatEventBody {
  api_version?: string;
  event: {
    id: string;
    type: string;
    app_user_id?: string;
    original_app_user_id?: string;
    product_id?: string;
    period_type?: string;
    purchased_at_ms?: number;
    expiration_at_ms?: number | null;
    environment?: 'SANDBOX' | 'PRODUCTION';
    [key: string]: unknown;
  };
}

const REVENUECAT_AUTH_HEADER = process.env.REVENUECAT_WEBHOOK_AUTH_HEADER;

const PREMIUM_PRODUCTS = (process.env.REVENUECAT_PREMIUM_PRODUCT_IDS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function inferTierForProduct(productId: string | undefined): 'free' | 'premium' {
  if (!productId) return 'premium';
  if (PREMIUM_PRODUCTS.length === 0) return 'premium';
  return PREMIUM_PRODUCTS.includes(productId) ? 'premium' : 'free';
}

function msToDate(ms: number | null | undefined): Date | null {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return null;
  return new Date(ms);
}

async function findUserId(event: RevenueCatEventBody['event']): Promise<string | null> {
  const candidates = [event.app_user_id, event.original_app_user_id].filter(Boolean) as string[];
  for (const candidate of candidates) {
    const byAppUser = await prisma.user.findUnique({ where: { revenueCatAppUserId: candidate } });
    if (byAppUser) return byAppUser.id;
    const byInternalId = await prisma.user.findUnique({ where: { id: candidate } });
    if (byInternalId) {
      if (!byInternalId.revenueCatAppUserId) {
        await prisma.user.update({
          where: { id: byInternalId.id },
          data: { revenueCatAppUserId: candidate },
        });
      }
      return byInternalId.id;
    }
  }
  return null;
}

export async function handleRevenueCatWebhook(req: Request, res: Response) {
  // ── Auth ───────────────────────────────────────────────────────────────
  if (!REVENUECAT_AUTH_HEADER) {
    return res.status(500).json({ error: 'RevenueCat webhook auth not configured' });
  }
  if (req.headers.authorization !== REVENUECAT_AUTH_HEADER) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body as RevenueCatEventBody;
  const event = body?.event;
  if (!event?.id || !event?.type) {
    return res.status(400).json({ error: 'Invalid RevenueCat event payload' });
  }

  // ── Idempotency ────────────────────────────────────────────────────────
  const existing = await prisma.revenueCatWebhookEvent.findUnique({
    where: { revenueCatEventId: event.id },
  });
  if (existing) {
    return res.status(200).json({ received: true, duplicate: true });
  }

  const userId = await findUserId(event);

  await prisma.revenueCatWebhookEvent.create({
    data: {
      revenueCatEventId: event.id,
      type: event.type,
      userId,
      data: JSON.stringify(event),
    },
  });

  if (!userId) {
    // Logged for audit; nothing to mutate without a user mapping.
    return res.status(200).json({ received: true, userMatched: false });
  }

  const tier = inferTierForProduct(event.product_id);
  const periodEnd = msToDate(event.expiration_at_ms);

  try {
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'NON_RENEWING_PURCHASE':
      case 'UNCANCELLATION':
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: 'active',
            subscriptionTier: tier,
            currentPeriodEnd: periodEnd ?? undefined,
            cancelAtPeriodEnd: false,
            trialEndsAt: null,
          },
        });
        break;

      case 'CANCELLATION':
        // RevenueCat CANCELLATION = user requested cancel; access continues
        // until EXPIRATION. Mirror Stripe's `cancel_at_period_end` flag.
        await prisma.user.update({
          where: { id: userId },
          data: {
            cancelAtPeriodEnd: true,
            currentPeriodEnd: periodEnd ?? undefined,
          },
        });
        break;

      case 'EXPIRATION':
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: 'canceled',
            subscriptionTier: 'free',
            currentPeriodEnd: null,
            trialEndsAt: null,
            cancelAtPeriodEnd: false,
          },
        });
        break;

      case 'TRIAL_STARTED':
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: 'trialing',
            subscriptionTier: tier,
            trialEndsAt: periodEnd ?? undefined,
          },
        });
        break;

      case 'TRIAL_CONVERTED':
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: 'active',
            subscriptionTier: tier,
            currentPeriodEnd: periodEnd ?? undefined,
            trialEndsAt: null,
          },
        });
        break;

      case 'BILLING_ISSUE':
        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionStatus: 'past_due' },
        });
        break;

      default:
        // PRODUCT_CHANGE / TEST / TRANSFER / etc — logged for audit, no mutation.
        break;
    }
  } catch (err) {
    logger.error({ err: err }, `Error processing RevenueCat event ${event.type}:`);
    // 200 anyway so RevenueCat doesn't infinite-retry processing errors.
  }

  return res.status(200).json({ received: true });
}
