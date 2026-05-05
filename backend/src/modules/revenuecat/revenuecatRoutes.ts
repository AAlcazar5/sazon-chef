// backend/src/modules/revenuecat/revenuecatRoutes.ts
// ROADMAP 4.0 E4 — RevenueCat webhook route. JSON body (RevenueCat sends JSON),
// auth via shared secret in the Authorization header (set in RC dashboard).

import { Router } from 'express';
import express from 'express';
import { handleRevenueCatWebhook } from './revenuecatWebhookHandler';

const router = Router();

router.post(
  '/webhook',
  express.json({ limit: '256kb' }),
  handleRevenueCatWebhook,
);

export { router as revenuecatRoutes };
