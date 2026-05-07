// ROADMAP 4.0 IG6.1 — Ingredient events routes.

import { Router } from 'express';
import { recordSwapTap } from './ingredientEventsController';

const router = Router();

router.post('/swap', recordSwapTap);

export default router;
