// backend/src/modules/shoppingListShare/shoppingListShareRoutes.ts
// Group 10Q: share deep-link routes

import { Router } from 'express';
import { shoppingListShareController } from './shoppingListShareController';
import { authenticateToken } from '../auth/authMiddleware';

export function createShoppingListShareRoutes(): Router {
  const router = Router();

  // GET /import/:token is public by design — the unguessable token is the
  // credential, used in share URLs sent to people who may not be Sazon users.
  router.get('/import/:token', shoppingListShareController.importShare);

  // Creating a share requires authentication.
  router.post('/:id/share', authenticateToken, shoppingListShareController.createShare);

  return router;
}

export default createShoppingListShareRoutes();
