import { logger } from '../../utils/logger';
// backend/src/modules/stripe/stripeWebhookHandler.ts
// Handles incoming Stripe webhook events with idempotency via StripeWebhookEvent log.
//
// Tier L H9: every handler now receives a typed Stripe object (Stripe.Subscription /
// Stripe.Invoice / Stripe.Checkout.Session) discriminated by `event.type`. Stripe
// schema drift will surface at compile time instead of as silent runtime undefineds.

import { Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { stripeService } from '@/services/stripeService';
import { emailService } from '@/services/emailService';
import { captureException } from '@/utils/sentryCapture';

type SubscriptionWithMetadata = Stripe.Subscription;
type InvoiceWithMetadata = Stripe.Invoice & {
  // Older API shape: subscription_details lived on the invoice itself; newer
  // versions expose it under `parent.subscription_details`. We keep tolerance
  // for both since Stripe webhook payloads are version-pinned at the account
  // level and may pre-date the move.
  subscription_details?: { metadata?: Stripe.Metadata | null } | null;
  subscription?: string | Stripe.Subscription | null;
};

function getUserIdFromEvent(event: Stripe.Event): string | undefined {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as SubscriptionWithMetadata;
      return sub.metadata?.userId ?? undefined;
    }
    case 'invoice.payment_failed':
    case 'invoice.payment_succeeded': {
      const inv = event.data.object as InvoiceWithMetadata;
      return (
        inv.metadata?.userId ??
        inv.subscription_details?.metadata?.userId ??
        undefined
      );
    }
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      return session.metadata?.userId ?? undefined;
    }
    default:
      return undefined;
  }
}

export async function handleStripeWebhook(req: Request, res: Response) {
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  if (!STRIPE_WEBHOOK_SECRET) {
    logger.error(
      'STRIPE_WEBHOOK_SECRET env var is required. ' +
      'Without it, webhook signature verification cannot run and any forged ' +
      'request would be accepted as a real Stripe event.'
    );
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;
  try {
    event = stripeService.constructWebhookEvent(
      req.body as Buffer,
      sig as string,
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown';
    captureException(err, { tag: 'stripe.webhook.signatureVerification', extra: { message } });
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  // Idempotency — skip if already processed
  const existing = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId: event.id },
  });
  if (existing) {
    return res.status(200).json({ received: true, duplicate: true });
  }

  const userId = getUserIdFromEvent(event);

  // Log the event for audit / replay
  await prisma.stripeWebhookEvent.create({
    data: {
      stripeEventId: event.id,
      type: event.type,
      userId: userId || null,
      data: JSON.stringify(event.data.object),
    },
  });

  // Process the event — each branch narrows event.data.object to the
  // matching Stripe type so handlers receive correctly-typed payloads.
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription, userId);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, userId);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice, userId);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as InvoiceWithMetadata, userId);
        break;

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        // Unhandled event type — nothing to do
        break;
    }
  } catch (err) {
    captureException(err, {
      tag: 'stripe.webhook.processEvent',
      extra: { eventType: event.type, eventId: event.id, userId },
    });
    // Return 200 anyway so Stripe doesn't retry infinitely for processing errors
  }

  return res.status(200).json({ received: true });
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  userId: string | undefined,
) {
  const uid = userId || (await getUserIdByStripeCustomer(subscription.customer as string));
  if (!uid) return;

  const data = stripeService.subscriptionToUserData(subscription);
  await prisma.user.update({ where: { id: uid }, data });
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  userId: string | undefined,
) {
  const uid = userId || (await getUserIdByStripeCustomer(subscription.customer as string));
  if (!uid) return;

  await prisma.user.update({
    where: { id: uid },
    data: {
      subscriptionStatus: 'canceled',
      subscriptionTier: 'free',
      currentPeriodEnd: null,
      trialEndsAt: null,
    },
  });
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  userId: string | undefined,
) {
  const customerId = invoice.customer as string;
  const uid = userId || (await getUserIdByStripeCustomer(customerId));
  if (!uid) return;

  await prisma.user.update({
    where: { id: uid },
    data: { subscriptionStatus: 'past_due' },
  });

  // Get user email for notification
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (user) {
    const email = user.emailEncrypted
      ? (() => { try { const { decrypt } = require('@/utils/encryption'); return decrypt(user.email); } catch { return null; } })()
      : user.email;
    if (email) {
      emailService.sendPaymentFailed(email).catch((err: unknown) => logger.error({ err }, 'stripe.paymentFailedEmail.failed'));
    }
  }
}

async function handlePaymentSucceeded(
  invoice: InvoiceWithMetadata,
  userId: string | undefined,
) {
  const customerId = invoice.customer as string;
  const uid = userId || (await getUserIdByStripeCustomer(customerId));
  if (!uid) return;

  // Re-fetch subscription to get accurate period end. `invoice.subscription`
  // is `string | Stripe.Subscription | null` depending on how Stripe expanded
  // the relation in the inbound event.
  const subscriptionRef = invoice.subscription;
  const subscriptionId =
    typeof subscriptionRef === 'string'
      ? subscriptionRef
      : subscriptionRef?.id ?? null;

  if (subscriptionId) {
    const sub = await stripeService.getSubscription(subscriptionId);
    const data = stripeService.subscriptionToUserData(sub);
    await prisma.user.update({ where: { id: uid }, data });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const uid = session.metadata?.userId;
  if (!uid || !session.subscription) return;

  const sub = await stripeService.getSubscription(session.subscription as string);
  const data = stripeService.subscriptionToUserData(sub);
  await prisma.user.update({ where: { id: uid }, data });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getUserIdByStripeCustomer(customerId: string): Promise<string | null> {
  const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
  return user?.id || null;
}
