import { Router } from 'express';
import {
  getDailySuggestion,
  getWeeklyPlan,
  generateMealPlan,
  getMealHistory,
  addRecipeToMeal,
  quickLogMeal,
  updateMealCompletion,
  updateMealNotes,
  getMealSwapSuggestions,
  getWeeklyNutritionSummary
} from './mealPlanController';
import {
  getMealPlanCostAnalysis,
  optimizeMealPlan,
  getCheaperAlternatives
} from './mealPlanCostController';
import {
  getTemplates,
  createTemplate,
  applyTemplate,
  deleteTemplate
} from './mealPlanTemplateController';
import { duplicateMeals } from './mealPlanDuplicateController';
import {
  getRecurringMeals,
  createRecurringMeal,
  updateRecurringMeal,
  deleteRecurringMeal,
  applyRecurringMeals
} from './mealPlanRecurringController';

const router = Router();

// Recurring meal routes (must come before /:id routes)
router.get('/recurring', getRecurringMeals);
router.post('/recurring', createRecurringMeal);
router.post('/recurring/apply', applyRecurringMeals);
router.put('/recurring/:id', updateRecurringMeal);
router.delete('/recurring/:id', deleteRecurringMeal);

// Template routes (must come before /:id routes)
router.get('/templates', getTemplates);
router.post('/templates', createTemplate);
router.post('/templates/:id/apply', applyTemplate);
router.delete('/templates/:id', deleteTemplate);

// Duplicate routes (must come before /:id routes)
router.post('/duplicate', duplicateMeals);

// Meal plan routes
router.get('/daily', getDailySuggestion);
router.get('/weekly', getWeeklyPlan);
router.post('/generate', generateMealPlan);
router.get('/history', getMealHistory);
router.post('/add-recipe', addRecipeToMeal);
router.post('/quick-log', quickLogMeal);

// Meal enhancement routes
router.put('/meals/:mealId/complete', updateMealCompletion);
router.put('/meals/:mealId/notes', updateMealNotes);
router.get('/meals/:mealId/swap-suggestions', getMealSwapSuggestions);
router.get('/weekly-nutrition', getWeeklyNutritionSummary);

// Cost optimization routes (must come before /:id routes)
router.get('/recipes/:recipeId/cheaper-alternatives', getCheaperAlternatives);
router.get('/:id/cost-analysis', getMealPlanCostAnalysis);
router.post('/:id/optimize-cost', optimizeMealPlan);

export default router;
export { router as mealPlanRoutes };
