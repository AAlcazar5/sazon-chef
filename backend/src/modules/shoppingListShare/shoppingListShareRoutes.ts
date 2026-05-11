// backend/src/modules/shoppingListShare/shoppingListShareRoutes.ts
// Group 10Q: share deep-link routes

import { Router } from 'express';
import { shoppingListShareController } from './shoppingListShareController';
import { authenticateToken } from '../auth/authMiddleware';
import { strictPublicLimiter, userActionLimiter } from '@/middleware/rateLimiter';

export function createShoppingListShareRoutes(): Router {
  const router = Router();

  // GET /import/:token is public by design — the unguessable token is the
  // credential, used in share URLs sent to people who may not be Sazon users.
  // U6: strict per-IP limiter so token enumeration is throttled.
  router.get('/import/:token', strictPublicLimiter, shoppingListShareController.importShare);

  // Creating a share requires authentication.
  router.post('/:id/share', authenticateToken, userActionLimiter, shoppingListShareController.createShare);

  return router;
}

export default createShoppingListShareRoutes();
