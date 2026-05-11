// ROADMAP 4.0 N12 — Today surface routes.
// ROADMAP 4.0 N2.2 — Today coverage tier endpoint.
// ROADMAP 4.0 I2.4 — Reverse-discovery surface ("your market has...").

import { Router } from 'express';
import {
  getActivationSurface,
  getCoverageTier,
} from './todayActivationController';
import { getReverseDiscovery } from './reverseDiscoveryController';
import { shortPrivateCache } from '../../middleware/cacheControl';

const router = Router();

// U8: short-lived per-user cache. Today's plate, activation surface, and
// reverse-discovery are heavy reads that re-render on every app-open even
// when nothing changed in the underlying user state.
router.get('/activation', shortPrivateCache, getActivationSurface);
router.get('/coverage', shortPrivateCache, getCoverageTier);
router.get('/reverse-discovery', shortPrivateCache, getReverseDiscovery);

export default router;
