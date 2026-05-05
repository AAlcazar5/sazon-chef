// backend/src/modules/follows/followsRoutes.ts
// ROADMAP 4.0 F1.

import { Router } from 'express';
import { authenticateToken } from '@modules/auth/authMiddleware';
import { followsController } from './followsController';

const router = Router();

router.get('/feed', authenticateToken, followsController.feed);
router.get('/summary', authenticateToken, followsController.summary);
router.get('/:userId/status', authenticateToken, followsController.status);
router.post('/:userId', authenticateToken, followsController.follow);
router.delete('/:userId', authenticateToken, followsController.unfollow);

export { router as followsRoutes };
