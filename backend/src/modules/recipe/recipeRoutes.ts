import { logger } from '../../utils/logger';
// backend/src/modules/recipe/recipeRoutes.simple.ts
import { Router } from 'express';
import { recipeController } from './recipeController';
import { newToYouController } from './newToYouController';
import { aiLimiter } from '../../middleware/rateLimiter';

const router = Router();

// Debug route to test if routes are working
router.get('/debug/test', (req, res) => {
  logger.info('✅ /api/recipes/debug/test route hit');
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
router.post('/filter-yields', recipeController.getFilterYields); // FX3.2 — per-filter yield deltas for "Relax this filter" rows
router.get('/home/almost-made-it', recipeController.getAlmostMadeIt); // HX5.1 — next-5 candidates past the cut
router.post('/hero/reroll', recipeController.heroReroll); // HX2.1 — next-ranked candidate from the same retrieval
router.get('/recipe-of-the-day', recipeController.getRecipeOfTheDay); // Home Page 2.0
router.get('/new-to-you', newToYouController.getNewToYou); // 11.5: personalized adjacency feed
router.get('/browse-by-family', newToYouController.getBrowseByFamily); // 11.5: cuisine-family ranking by user affinity
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

// Bulk operations - before parameterized routes
router.delete('/bulk-unsave', recipeController.bulkUnsaveRecipes);
router.patch('/bulk-move-collection', recipeController.bulkMoveToCollection);

// Recipe actions - specific routes before parameterized
// AI-cost-bearing: per-IP hourly limiter on top of the global apiLimiter.
router.post('/generate', aiLimiter, recipeController.generateRecipe);
router.post('/import-url', aiLimiter, recipeController.importRecipeFromUrl);
router.post('/generate-from-description', aiLimiter, recipeController.generateFromDescription);

// External data enrichment - specific routes before parameterized
router.post('/enrich/batch', recipeController.batchEnrichRecipes);
router.get('/enrich/status', recipeController.getEnrichmentStatus);

// Cookbook Quick Wins - specific routes before parameterized
router.get('/recently-viewed', recipeController.getRecentlyViewed);

// Cookbook export
router.get('/export', recipeController.exportCookbook);

// Search 2.0 - auto-complete and popular searches
router.get('/autocomplete', recipeController.getAutoCompleteSuggestions);
router.get('/popular-searches', recipeController.getPopularSearches);

// 10D: "I'm Craving..." Search — AI-cost-bearing
router.post('/craving-search', aiLimiter, recipeController.cravingSearch);
router.post('/craving-search/event', recipeController.logCravingSearchEvent);

// 10G-C: "I want to eat X tonight" flow — AI-cost-bearing
router.post('/craving-flow', aiLimiter, recipeController.cravingFlow);

// 10P: Craving + Weekly Budget Integration — AI-cost-bearing
router.post('/craving-budget', aiLimiter, recipeController.cravingBudget);

// 10H: "What can I make right now?" — pantry-based recipe matching + leftover transformer
router.get('/pantry-match', recipeController.pantryMatch);
router.post('/leftover-ideas', aiLimiter, recipeController.leftoverIdeas);

// 10E: Ingredient substitution engine
router.get('/ingredient-swaps', recipeController.getIngredientSwaps);

// Smart collections - specific routes before parameterized
router.get('/smart-collections', recipeController.getSmartCollections);
router.get('/smart-collections/weather-today', recipeController.getWeatherSmartCollection);
router.get('/smart-collections/:id', recipeController.getSmartCollectionRecipes);

// Parameterized routes - MUST come last
router.put('/:id', recipeController.updateRecipe);
router.delete('/:id', recipeController.deleteRecipe);
router.patch('/:id/move-to-collection', recipeController.moveSavedRecipe);
router.post('/:id/enrich', recipeController.enrichRecipe);
// AI-cost-bearing: per-IP hourly limiter
router.post('/:id/healthify', aiLimiter, recipeController.healthifyRecipe);
router.post('/:id/flavor-boost', aiLimiter, recipeController.flavorBoost);
router.post('/:id/ask-substitution', aiLimiter, recipeController.askSubstitution);
router.post('/:id/fork', recipeController.forkRecipe);
router.post('/:id/save', recipeController.saveRecipe);
router.delete('/:id/save', recipeController.unsaveRecipe);
router.post('/:id/like', recipeController.likeRecipe);
router.post('/:id/dislike', recipeController.dislikeRecipe);
router.get('/:id/related', recipeController.getRelatedRecipes); // 10N: cuisine adjacency discovery
router.get('/:id/similar', recipeController.getSimilarRecipes); // Must come before /:id
router.get('/:id/saved-meta', recipeController.getSavedMeta);
router.put('/:id/saved-meta', recipeController.updateSavedMeta);
router.post('/:id/view', recipeController.recordView);
router.post('/:id/cook', recipeController.recordCook);
router.get('/:id/cooking-history', recipeController.getCookingHistory);
router.get('/:id/similar', recipeController.getSimilarRecipes); // RD2.2 — anchor-recipe similarity
router.get('/:id/cooked-next', recipeController.getCookedNext); // RD5.1 — cohort cookedNext
router.get('/:id/friend-cohort', recipeController.getFriendCohort); // HX2.3 — hero friend cohort overlay
router.get('/leftover-bridge', recipeController.getLeftoverBridge); // RD4.1 — leftover-bridge nudge
router.get('/:id', recipeController.getRecipe);

export const recipeRoutes = router;
