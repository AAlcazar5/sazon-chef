// backend/src/modules/minVersion/minVersionRoutes.ts
// ROADMAP 4.0 U3 — Force-upgrade gate.

import { Router } from 'express';
import { minVersionController } from './minVersionController';

export const minVersionRoutes = Router();
minVersionRoutes.get('/min-version', minVersionController.get);
