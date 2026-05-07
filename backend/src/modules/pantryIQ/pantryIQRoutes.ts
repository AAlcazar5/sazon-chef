// ROADMAP 4.0 IG10.1 — Pantry IQ routes.

import { Router } from 'express';
import { getPantryIQ } from './pantryIQController';

const router = Router();

router.get('/', getPantryIQ);

export default router;
