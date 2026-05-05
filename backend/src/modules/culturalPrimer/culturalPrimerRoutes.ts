// backend/src/modules/culturalPrimer/culturalPrimerRoutes.ts
// ROADMAP 4.0 Tier C10 — Cultural primer routes.

import { Router } from 'express';
import { culturalPrimerController } from './culturalPrimerController';

export const culturalPrimerRoutes = Router();
culturalPrimerRoutes.get('/check', culturalPrimerController.check);
