// backend/src/modules/stripe/stripeWebhookHandler.ts
// Handles incoming Stripe webhook events with idempotency via StripeWebhookEvent log

import { Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { stripeService } from '@/services/stripeService';
import { emailService } from '@/services/emailService';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function handleStripeWebhook(req: Request, res: Response) {
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
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  // Idempotency — skip if already processed
  const existing = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId: event.id },
  });
  if (existing) {
    return res.status(200).json({ received: true, duplicate: true });
  }

  // Extract userId from metadata (set on subscription or session)
  const obj = event.data.object as any;
  const userId: string | undefined =
    obj.metadata?.userId ||
    obj.subscription_details?.metadata?.userId ||
    undefined;

  // Log the event for audit / replay
  await prisma.stripeWebhookEvent.create({
    data: {
      stripeEventId: event.id,
      type: event.type,
      userId: userId || null,
      data: JSON.stringify(event.data.object),
    },
  });

  // Process the event
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(obj, userId);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(obj, userId);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(obj, userId);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(obj, userId);
        break;

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(obj);
        break;

      default:
        // Unhandled event type — nothing to do
        break;
    }
  } catch (err) {
    console.error(`Error processing Stripe event ${event.type}:`, err);
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

async function handlePaymentFailed(obj: any, userId: string | undefined) {
  const customerId = obj.customer as string;
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
      emailService.sendPaymentFailed(email).catch(console.error);
    }
  }
}

async function handlePaymentSucceeded(obj: any, userId: string | undefined) {
  const customerId = obj.customer as string;
  const uid = userId || (await getUserIdByStripeCustomer(customerId));
  if (!uid) return;

  // Re-fetch subscription to get accurate period end
  const subscriptionId = obj.subscription as string;
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
