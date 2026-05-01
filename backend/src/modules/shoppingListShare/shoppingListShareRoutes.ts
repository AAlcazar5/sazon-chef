// backend/src/modules/shoppingListShare/shoppingListShareRoutes.ts
// Group 10Q: share deep-link routes

import { Router } from 'express';
import { shoppingListShareController } from './shoppingListShareController';

export function createShoppingListShareRoutes(): Router {
  const router = Router();

  // Import must come before /:id to avoid conflict with GET /:id
  router.get('/import/:token', shoppingListShareController.importShare);
  router.post('/:id/share', shoppingListShareController.createShare);

  return router;
}

export default createShoppingListShareRoutes();
