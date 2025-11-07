// backend/src/modules/shoppingList/shoppingAppRoutes.ts

import { Router } from 'express';
import { shoppingAppController } from './shoppingAppController';

const router = Router();

// Shopping app integration routes
router.get('/supported', shoppingAppController.getSupportedApps);
router.get('/integrations', shoppingAppController.getIntegrations);
router.post('/connect', shoppingAppController.connectApp);
router.delete('/connect/:appName', shoppingAppController.disconnectApp);
router.post('/sync/:appName', shoppingAppController.syncToExternalApp);
router.post('/sync-bidirectional/:appName', shoppingAppController.syncBidirectional);
router.post('/sync-recipe/:appName', shoppingAppController.syncRecipe);

export default router;

