// ROADMAP 4.0 TB2.2 — Tonight proposal route.

import { Router } from 'express';
import { tonightController } from './tonightController';

export const tonightRoutes = Router();
tonightRoutes.post('/proposal', tonightController.proposal);
