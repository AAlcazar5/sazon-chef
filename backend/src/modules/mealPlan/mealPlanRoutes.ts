import { Router } from 'express';
import {
  getDailySuggestion,
  getWeeklyPlan,
  generateMealPlan,
  getMealHistory,
  addRecipeToMeal
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

// Cost optimization routes (must come before /:id routes)
router.get('/recipes/:recipeId/cheaper-alternatives', getCheaperAlternatives);
router.get('/:id/cost-analysis', getMealPlanCostAnalysis);
router.post('/:id/optimize-cost', optimizeMealPlan);

export default router;
