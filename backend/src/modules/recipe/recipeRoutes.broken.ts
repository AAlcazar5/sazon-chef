// backend/src/modules/recipe/recipeRoutes.ts
import { Router } from 'express';
import { recipeController } from './recipeController';

const router = Router();

// Debug route to test if routes are working
router.get('/debug/test', (req, res) => {
  console.log('✅ /api/recipes/debug/test route hit');
  res.json({ 
    message: 'Debug route working', 
    timestamp: new Date().toISOString(),
    route: '/api/recipes/debug/test'
  });
});

// IMPORTANT: Fixed routes must come BEFORE parameterized routes
// Public routes
router.get('/', recipeController.getRecipes);

// FIXED: Specific routes must come before parameterized routes
router.get('/suggested', recipeController.getSuggestedRecipes);
router.get('/random', recipeController.getRandomRecipe);
router.get('/saved', recipeController.getSavedRecipes);
router.get('/my-recipes', recipeController.getUserRecipes);

// Recipe CRUD operations (must come before parameterized routes)
router.post('/', recipeController.createRecipe);

// Parameterized routes come AFTER specific routes
router.get('/:id', recipeController.getRecipe);
router.get('/:id/score', recipeController.getRecipeScore);
router.put('/:id', recipeController.updateRecipe);
router.delete('/:id', recipeController.deleteRecipe);

// Recipe actions (require user context)
router.post('/:id/save', recipeController.saveRecipe);
router.delete('/:id/save', recipeController.unsaveRecipe);
router.post('/:id/like', recipeController.likeRecipe);
router.post('/:id/dislike', recipeController.dislikeRecipe);

// Cache management routes
router.post('/clear-cache', recipeController.clearCache);
router.get('/cache-stats', recipeController.getCacheStats);

export const recipeRoutes = router;