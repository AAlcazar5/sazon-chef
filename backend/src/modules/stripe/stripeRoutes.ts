// backend/src/modules/stripe/stripeRoutes.ts

import { Router } from 'express';
import express from 'express';
import { authenticateToken } from '@modules/auth/authMiddleware';
import { stripeController } from './stripeController';
import { handleStripeWebhook } from './stripeWebhookHandler';

const router = Router();

// ── Webhook (raw body required for signature verification) ────────────────────
// Must be mounted BEFORE express.json() parses the body; raw body is passed here.
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook,
);

// ── Authenticated routes ──────────────────────────────────────────────────────
router.get('/subscription', authenticateToken, stripeController.getSubscription);
router.post('/checkout', authenticateToken, stripeController.createCheckout);
router.post('/portal', authenticateToken, stripeController.createPortal);

export { router as stripeRoutes };
