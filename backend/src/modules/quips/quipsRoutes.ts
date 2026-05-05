// backend/src/modules/quips/quipsRoutes.ts
// ROADMAP 4.0 Tier J7 — Sazon daily quip routes.

import { Router } from 'express';
import { quipsController } from './quipsController';

export const quipsRoutes = Router();
quipsRoutes.get('/today', quipsController.today);
