// backend/src/utils/stripeWebhookPath.ts
//
// Stripe verifies webhook signatures against the exact raw request body.
// The global express.json() in app.ts is registered before the /api/stripe
// route mount, so without an explicit skip it consumes the stream and the
// route-level express.raw() sees a parsed object — every real Stripe event
// then fails signature verification (subscriptions silently never provision).
//
// Standalone (no app-graph imports) so the predicate is unit-testable
// without booting Prisma / services.

const STRIPE_WEBHOOK_PATH = '/api/stripe/webhook';

/** True only for the exact Stripe webhook path (trailing slash tolerated). */
export function isStripeWebhookPath(url: string): boolean {
  const path = (url.split('?')[0] || '').replace(/\/+$/, '');
  return path === STRIPE_WEBHOOK_PATH;
}
