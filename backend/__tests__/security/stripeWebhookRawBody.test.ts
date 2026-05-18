// Stripe webhook signature verification needs the untouched raw request
// body. The global express.json() is registered before the /api/stripe
// route mount, so without an explicit skip it consumes the stream and the
// route-level express.raw() sees a parsed object → constructWebhookEvent
// throws on every real Stripe event (subscriptions silently never provision).
// isStripeWebhookPath gates the skip; it must match ONLY that exact path.

import { isStripeWebhookPath } from '../../src/utils/stripeWebhookPath';

describe('isStripeWebhookPath', () => {
  it('matches the exact Stripe webhook path', () => {
    expect(isStripeWebhookPath('/api/stripe/webhook')).toBe(true);
    expect(isStripeWebhookPath('/api/stripe/webhook/')).toBe(true);
  });

  it('does NOT match other Stripe routes (json must still parse them)', () => {
    expect(isStripeWebhookPath('/api/stripe/checkout')).toBe(false);
    expect(isStripeWebhookPath('/api/stripe/portal')).toBe(false);
    expect(isStripeWebhookPath('/api/stripe/cancel')).toBe(false);
    expect(isStripeWebhookPath('/api/stripe')).toBe(false);
  });

  it('does NOT match look-alike or unrelated paths', () => {
    expect(isStripeWebhookPath('/api/stripe/webhookx')).toBe(false);
    expect(isStripeWebhookPath('/api/webhooks/revenuecat')).toBe(false);
    expect(isStripeWebhookPath('/api/stripe/webhook/extra')).toBe(false);
    expect(isStripeWebhookPath('/')).toBe(false);
    expect(isStripeWebhookPath('')).toBe(false);
  });
});
