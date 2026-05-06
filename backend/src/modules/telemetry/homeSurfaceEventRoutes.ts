// backend/src/modules/telemetry/homeSurfaceEventRoutes.ts
// ROADMAP 4.0 HX7.1 — home-surface event sink route.

import { Router } from 'express';
import { homeSurfaceEventController } from './homeSurfaceEventController';

export const homeSurfaceEventRoutes = Router();
homeSurfaceEventRoutes.post('/', homeSurfaceEventController.record);
