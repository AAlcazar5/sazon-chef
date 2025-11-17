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

// Basic routes - specific routes MUST come before parameterized routes
router.get('/', recipeController.getRecipes);
router.get('/suggested', recipeController.getSuggestedRecipes);
router.get('/random', recipeController.getRandomRecipe);
router.get('/saved', recipeController.getSavedRecipes);
router.get('/liked', recipeController.getLikedRecipes);
router.get('/disliked', recipeController.getDislikedRecipes);
router.get('/batch-cooking-recommendations', recipeController.getBatchCookingRecommendations);
router.post('/', recipeController.createRecipe);

// Collections - must come before /:id
router.get('/collections', recipeController.getCollections);
router.post('/collections', recipeController.createCollection);
router.put('/collections/:id', recipeController.updateCollection);
router.delete('/collections/:id', recipeController.deleteCollection);

// Recipe actions - specific routes before parameterized
router.post('/generate', recipeController.generateRecipe);

// External data enrichment - specific routes before parameterized
router.post('/enrich/batch', recipeController.batchEnrichRecipes);
router.get('/enrich/status', recipeController.getEnrichmentStatus);

// Parameterized routes - MUST come last
router.put('/:id', recipeController.updateRecipe);
router.delete('/:id', recipeController.deleteRecipe);
router.patch('/:id/move-to-collection', recipeController.moveSavedRecipe);
router.post('/:id/enrich', recipeController.enrichRecipe);
router.post('/:id/healthify', recipeController.healthifyRecipe);
router.post('/:id/save', recipeController.saveRecipe);
router.delete('/:id/save', recipeController.unsaveRecipe);
router.post('/:id/like', recipeController.likeRecipe);
router.post('/:id/dislike', recipeController.dislikeRecipe);
router.get('/:id', recipeController.getRecipe);

export const recipeRoutes = router;
