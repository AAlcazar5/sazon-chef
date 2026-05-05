// backend/src/modules/cookCompleteSignals/cookCompleteSignalsRoutes.ts
// ROADMAP 4.0 Tier J14 + J16 — combined cook-complete-signals routes.

import { Router } from 'express';
import { cookCompleteSignalsController } from './cookCompleteSignalsController';

export const cookCompleteSignalsRoutes = Router();
cookCompleteSignalsRoutes.get('/', cookCompleteSignalsController.get);
