// backend/src/modules/ingredientAvailability/ingredientAvailabilityRoutes.ts

import { Router } from 'express';
import {
  checkIngredient,
  analyzeRecipe,
  filterRecipes,
} from './ingredientAvailabilityController';

const router = Router();

router.get('/:ingredientName', checkIngredient);
router.get('/recipes/:recipeId', analyzeRecipe);
router.post('/filter-recipes', filterRecipes);

export default router;

