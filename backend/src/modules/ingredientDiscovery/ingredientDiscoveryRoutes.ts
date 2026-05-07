// ROADMAP 4.0 IG8.2 — Ingredient discovery routes.

import { Router } from 'express';
import { getWeeklyDiscovery } from './ingredientDiscoveryController';

const router = Router();

router.get('/weekly', getWeeklyDiscovery);

export default router;
