// ROADMAP 4.0 N12 — Today surface routes.
// ROADMAP 4.0 N2.2 — Today coverage tier endpoint.

import { Router } from 'express';
import {
  getActivationSurface,
  getCoverageTier,
} from './todayActivationController';

const router = Router();

router.get('/activation', getActivationSurface);
router.get('/coverage', getCoverageTier);

export default router;
