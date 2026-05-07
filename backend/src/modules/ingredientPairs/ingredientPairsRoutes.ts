// ROADMAP 4.0 IG2.2 — Ingredient pairs routes.

import { Router } from 'express';
import { getIngredientPairs } from './ingredientPairsController';

const router = Router();

router.get('/pairs', getIngredientPairs);

export default router;
