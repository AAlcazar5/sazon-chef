// backend/src/modules/aiRecipe/aiRecipeRoutes.ts
import { Router } from 'express';
import { aiRecipeController } from './aiRecipeController';

const router = Router();

// Generate a single AI recipe
router.get('/generate', aiRecipeController.generateRecipe.bind(aiRecipeController));

// Generate daily meal plan
router.get('/daily-plan', aiRecipeController.generateDailyPlan.bind(aiRecipeController));

// Calculate remaining macros from existing meals
router.post('/remaining-macros', aiRecipeController.calculateRemainingMacros.bind(aiRecipeController));

// Get AI-generated recipes from database
router.get('/', aiRecipeController.getAIRecipes.bind(aiRecipeController));

export default router;

