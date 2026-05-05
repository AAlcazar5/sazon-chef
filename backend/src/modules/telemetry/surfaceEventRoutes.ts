// backend/src/modules/telemetry/surfaceEventRoutes.ts
// ROADMAP 4.0 Tier B3 — surface event sink route.

import { Router } from 'express';
import { surfaceEventController } from './surfaceEventController';

export const surfaceEventRoutes = Router();
surfaceEventRoutes.post('/', surfaceEventController.record);
