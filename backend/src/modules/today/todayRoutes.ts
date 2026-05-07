// ROADMAP 4.0 N12 — Today surface routes.

import { Router } from 'express';
import { getActivationSurface } from './todayActivationController';

const router = Router();

router.get('/activation', getActivationSurface);

export default router;
