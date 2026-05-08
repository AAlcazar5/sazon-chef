// ROADMAP 4.0 N12 — Today surface routes.
// ROADMAP 4.0 N2.2 — Today coverage tier endpoint.
// ROADMAP 4.0 I2.4 — Reverse-discovery surface ("your market has...").

import { Router } from 'express';
import {
  getActivationSurface,
  getCoverageTier,
} from './todayActivationController';
import { getReverseDiscovery } from './reverseDiscoveryController';

const router = Router();

router.get('/activation', getActivationSurface);
router.get('/coverage', getCoverageTier);
router.get('/reverse-discovery', getReverseDiscovery);

export default router;
