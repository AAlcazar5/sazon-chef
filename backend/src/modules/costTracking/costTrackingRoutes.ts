// backend/src/modules/costTracking/costTrackingRoutes.ts

import { Router } from 'express';
import { costTrackingController } from './costTrackingController';
import {
  compareIngredient,
  getRecipeSavings,
  compareMultiple,
  getBestStore,
} from './priceComparisonController';

const router = Router();

// Recipe cost routes
router.get('/recipes/:id/cost', costTrackingController.getRecipeCost);
router.put('/recipes/:id/cost', costTrackingController.updateRecipeCost);
router.get('/recipes/:id/savings', getRecipeSavings);

// Ingredient cost routes
router.get('/ingredients', costTrackingController.getIngredientCosts);
router.post('/ingredients', costTrackingController.upsertIngredientCost);
router.delete('/ingredients/:id', costTrackingController.deleteIngredientCost);
router.get('/ingredients/:ingredientName/compare', compareIngredient);
router.post('/ingredients/compare', compareMultiple);

// Shopping list optimization
router.post('/shopping-list/best-store', getBestStore);

// Budget settings
router.get('/budget', costTrackingController.getBudget);
router.put('/budget', costTrackingController.updateBudget);

export default router;

