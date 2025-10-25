// backend/src/modules/mealHistory/mealHistoryRoutes.ts
import { Router } from 'express';
import { mealHistoryController } from './mealHistoryController';

const router = Router();

// Get user's meal history
router.get('/', mealHistoryController.getMealHistory);

// Add a meal to history
router.post('/', mealHistoryController.addMealToHistory);

// Get meal history analytics
router.get('/analytics', mealHistoryController.getMealHistoryAnalytics);

// Get meal history insights
router.get('/insights', mealHistoryController.getMealHistoryInsights);

// Update a meal history entry
router.put('/:id', mealHistoryController.updateMealHistory);

// Delete a meal history entry
router.delete('/:id', mealHistoryController.deleteMealHistory);

export { router as mealHistoryRoutes };
