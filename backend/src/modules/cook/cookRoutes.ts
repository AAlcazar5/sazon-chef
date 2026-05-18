// backend/src/modules/cook/cookRoutes.ts
//
// W-D Phase 1 / D-1. Mounted authed under /api/cook in app.ts.
import { Router } from 'express';
import { cookController } from './cookController';

const router = Router();

router.get('/log', cookController.getCookLog);
router.post('/event', cookController.logCookEvent); // D-6 — log a Claude-assisted cook

export { router as cookRoutes };
