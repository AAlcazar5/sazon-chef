// backend/src/modules/aiRecipe/aiRecipeRoutes.ts
import { Router } from 'express';
import { aiRecipeController } from './aiRecipeController';
import { aiLimiter } from '../../middleware/rateLimiter';

const router = Router();

// Every generation route here calls the LLM. Rate-limit at the router so
// new routes inherit the same cost protection without ad-hoc wiring.
router.use(aiLimiter);

// Generate a single AI recipe
router.get('/generate', aiRecipeController.generateRecipe.bind(aiRecipeController));

// Generate daily meal plan
router.get('/daily-plan', aiRecipeController.generateDailyPlan.bind(aiRecipeController));

// Calculate remaining macros from existing meals
router.post('/remaining-macros', aiRecipeController.calculateRemainingMacros.bind(aiRecipeController));

// Get AI-generated recipes from database
router.get('/', aiRecipeController.getAIRecipes.bind(aiRecipeController));

export default router;

