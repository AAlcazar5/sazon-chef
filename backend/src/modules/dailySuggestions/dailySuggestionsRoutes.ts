// backend/src/modules/dailySuggestions/dailySuggestionsRoutes.ts
import { Router } from 'express';
import { dailySuggestionsController } from './dailySuggestionsController';

const router = Router();

// Get daily meal suggestions
router.get('/', dailySuggestionsController.getDailySuggestions);

// Get suggestions for a specific meal type
router.get('/meal/:mealType', dailySuggestionsController.getMealSuggestions);

export { router as dailySuggestionsRoutes };
