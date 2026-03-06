// backend/src/services/stripeService.ts
// Stripe payment and subscription management service

import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

// Initialise Stripe lazily so the app starts fine without a key in dev
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  // Read from env at call time (not module load) so tests can set env vars
  const key = process.env.STRIPE_SECRET_KEY || '';
  if (!_stripe) {
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(key, { apiVersion: '2026-02-25.clover' });
  }
  return _stripe;
}

export const stripeService = {
  /** Whether Stripe is configured (skip in dev/test if not set) */
  isConfigured(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  },

  /**
   * Get or create a Stripe customer for a user.
   * Stores stripeCustomerId on the user row for future lookups.
   */
  async getOrCreateCustomer(userId: string): Promise<string> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const stripe = getStripe();
    const customer = await stripe.customers.create({
      metadata: { userId },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  },

  /**
   * Create a Stripe Checkout session for a premium subscription.
   * interval: 'month' | 'year'
   */
  async createCheckoutSession(
    userId: string,
    interval: 'month' | 'year',
    successUrl: string,
    cancelUrl: string,
  ): Promise<Stripe.Checkout.Session> {
    const stripe = getStripe();
    const customerId = await stripeService.getOrCreateCustomer(userId);

    const priceId =
      interval === 'year'
        ? (process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID || '')
        : (process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || '');

    if (!priceId) {
      throw new Error(`Price ID for interval '${interval}' is not configured`);
    }

    return stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { userId },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId },
    });
  },

  /**
   * Create a Stripe Customer Portal session so users can manage their subscription.
   */
  async createPortalSession(
    userId: string,
    returnUrl: string,
  ): Promise<Stripe.BillingPortal.Session> {
    const stripe = getStripe();
    const customerId = await stripeService.getOrCreateCustomer(userId);

    return stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  },

  /**
   * Retrieve a subscription by ID.
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return getStripe().subscriptions.retrieve(subscriptionId);
  },

  /**
   * Map a Stripe subscription status + period_end to the User fields.
   * Returns the data object to pass into prisma.user.update.
   */
  subscriptionToUserData(
    subscription: Stripe.Subscription,
  ): {
    subscriptionStatus: string;
    subscriptionTier: string;
    currentPeriodEnd: Date;
    trialEndsAt: Date | null;
  } {
    const status = subscription.status; // active | trialing | past_due | canceled | ...
    const tier =
      status === 'active' || status === 'trialing' ? 'premium' : 'free';
    const currentPeriodEnd = new Date(
      (subscription as any).current_period_end * 1000,
    );
    const trialEnd =
      (subscription as any).trial_end
        ? new Date((subscription as any).trial_end * 1000)
        : null;

    return {
      subscriptionStatus: status,
      subscriptionTier: tier,
      currentPeriodEnd,
      trialEndsAt: trialEnd,
    };
  },

  /**
   * Cancel a user's active (or trialing) subscription immediately.
   * Returns the cancelled subscription ID.
   */
  async cancelSubscription(userId: string): Promise<string> {
    const stripe = getStripe();
    const customerId = await stripeService.getOrCreateCustomer(userId);

    // Check active first, then trialing
    for (const status of ['active', 'trialing'] as const) {
      const list = await stripe.subscriptions.list({ customer: customerId, status, limit: 1 });
      if (list.data.length > 0) {
        const cancelled = await stripe.subscriptions.cancel(list.data[0].id);
        return cancelled.id;
      }
    }

    throw new Error('No active subscription found for this user');
  },

  /**
   * Pause a user's subscription for 30 days via pause_collection.
   * Returns the paused subscription ID.
   */
  async pauseSubscription(userId: string): Promise<string> {
    const stripe = getStripe();
    const customerId = await stripeService.getOrCreateCustomer(userId);

    const list = await stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 1 });
    if (list.data.length === 0) {
      throw new Error('No active subscription found to pause');
    }

    const resumesAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    const paused = await stripe.subscriptions.update(list.data[0].id, {
      pause_collection: { behavior: 'void', resumes_at: resumesAt },
    });

    return paused.id;
  },

  /**
   * Construct and verify a Stripe webhook event.
   */
  constructWebhookEvent(
    payload: Buffer,
    sig: string,
    secret: string,
  ): Stripe.Event {
    return getStripe().webhooks.constructEvent(payload, sig, secret);
  },
};
