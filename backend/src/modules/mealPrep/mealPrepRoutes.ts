// backend/src/modules/mealPrep/mealPrepRoutes.ts
import { Router } from 'express';
import { mealPrepController, mealPrepTemplateController } from './mealPrepController';

const router = Router();

// Meal prep portion routes
router.post('/portions', mealPrepController.createMealPrepPortion);
router.get('/portions', mealPrepController.getMealPrepPortions);
router.get('/portions/:id', mealPrepController.getMealPrepPortion);
router.post('/portions/:id/consume', mealPrepController.consumeMealPrepPortion);

// Meal prep session routes
router.post('/sessions', mealPrepController.createMealPrepSession);
router.get('/sessions', mealPrepController.getMealPrepSessions);
router.put('/sessions/:id', mealPrepController.updateMealPrepSession);
router.delete('/sessions/:id', mealPrepController.deleteMealPrepSession);

// Statistics
router.get('/stats', mealPrepController.getMealPrepStats);

// Cost analysis
router.get('/cost-analysis', mealPrepController.getMealPrepCostAnalysis);

// Thawing reminders
router.get('/thawing-reminders', mealPrepController.getThawingReminders);
router.post('/thawing-reminders', mealPrepController.scheduleThawingReminder);

// Meal prep templates
router.post('/templates', mealPrepTemplateController.createOrUpdateTemplate);
router.get('/templates', mealPrepTemplateController.getTemplates);
// IMPORTANT: More specific routes must come before parameterized routes
router.get('/templates/recipe/:recipeId', mealPrepTemplateController.getTemplateByRecipe);
router.delete('/templates/:id', mealPrepTemplateController.deleteTemplate);
router.post('/templates/:id/use', mealPrepTemplateController.useTemplate);

export const mealPrepRoutes = router;

