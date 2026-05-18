// backend/src/modules/cook/cookRoutes.ts
//
// W-D Phase 1 / D-1. Mounted authed under /api/cook in app.ts.
import { Router } from 'express';
import { cookController } from './cookController';

const router = Router();

router.get('/log', cookController.getCookLog);

export { router as cookRoutes };
