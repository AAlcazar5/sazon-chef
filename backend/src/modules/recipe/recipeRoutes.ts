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
router.get('/optimized', recipeController.getRecipesOptimized); // NEW: Optimized endpoint for 10K+ recipes
router.get('/suggested', recipeController.getSuggestedRecipes);
router.get('/random', recipeController.getRandomRecipe);
router.get('/home-feed', recipeController.getHomeFeed); // Consolidated home page data
router.get('/recipe-of-the-day', recipeController.getRecipeOfTheDay); // Home Page 2.0
router.get('/saved', recipeController.getSavedRecipes);
router.get('/liked', recipeController.getLikedRecipes);
router.get('/disliked', recipeController.getDislikedRecipes);
router.get('/batch-cooking-recommendations', recipeController.getBatchCookingRecommendations);
router.post('/', recipeController.createRecipe);

// Collections - must come before /:id
router.get('/collections', recipeController.getCollections);
router.post('/collections', recipeController.createCollection);
router.post('/collections/merge', recipeController.mergeCollections);
router.put('/collections/reorder', recipeController.reorderCollections);
router.patch('/collections/:id/pin', recipeController.togglePinCollection);
router.post('/collections/:id/duplicate', recipeController.duplicateCollection);
router.put('/collections/:id', recipeController.updateCollection);
router.delete('/collections/:id', recipeController.deleteCollection);

// Recipe actions - specific routes before parameterized
router.post('/generate', recipeController.generateRecipe);

// External data enrichment - specific routes before parameterized
router.post('/enrich/batch', recipeController.batchEnrichRecipes);
router.get('/enrich/status', recipeController.getEnrichmentStatus);

// Cookbook Quick Wins - specific routes before parameterized
router.get('/recently-viewed', recipeController.getRecentlyViewed);

// Search 2.0 - auto-complete and popular searches
router.get('/autocomplete', recipeController.getAutoCompleteSuggestions);
router.get('/popular-searches', recipeController.getPopularSearches);

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
router.get('/:id/similar', recipeController.getSimilarRecipes); // Must come before /:id
router.put('/:id/saved-meta', recipeController.updateSavedMeta);
router.post('/:id/view', recipeController.recordView);
router.post('/:id/cook', recipeController.recordCook);
router.get('/:id/cooking-history', recipeController.getCookingHistory);
router.get('/:id', recipeController.getRecipe);

export const recipeRoutes = router;
