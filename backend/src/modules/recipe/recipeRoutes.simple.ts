// backend/src/modules/recipe/recipeRoutes.simple.ts
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

// Basic routes
router.get('/', recipeController.getRecipes);
router.get('/suggested', recipeController.getSuggestedRecipes);
router.get('/random', recipeController.getRandomRecipe);
router.get('/saved', recipeController.getSavedRecipes);
router.get('/:id', recipeController.getRecipe);

// Recipe actions
router.post('/:id/save', recipeController.saveRecipe);
router.delete('/:id/save', recipeController.unsaveRecipe);
router.post('/:id/like', recipeController.likeRecipe);
router.post('/:id/dislike', recipeController.dislikeRecipe);

export const recipeRoutes = router;
