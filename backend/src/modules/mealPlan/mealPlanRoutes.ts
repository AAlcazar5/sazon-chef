import { Router } from 'express';
import {
  getDailySuggestion,
  getWeeklyPlan,
  generateMealPlan,
  getMealHistory,
  addRecipeToMeal
} from './mealPlanController';

const router = Router();

// Meal plan routes
router.get('/daily', getDailySuggestion);
router.get('/weekly', getWeeklyPlan);
router.post('/generate', generateMealPlan);
router.get('/history', getMealHistory);
router.post('/add-recipe', addRecipeToMeal);

export default router;
