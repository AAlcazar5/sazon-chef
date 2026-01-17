import { Router } from 'express';
import {
  getDailySuggestion,
  getWeeklyPlan,
  generateMealPlan,
  getMealHistory,
  addRecipeToMeal,
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

const router = Router();

// Meal plan routes
router.get('/daily', getDailySuggestion);
router.get('/weekly', getWeeklyPlan);
router.post('/generate', generateMealPlan);
router.get('/history', getMealHistory);
router.post('/add-recipe', addRecipeToMeal);

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
