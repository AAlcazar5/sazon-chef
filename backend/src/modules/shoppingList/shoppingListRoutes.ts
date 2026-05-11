// backend/src/modules/shoppingList/shoppingListRoutes.ts

import { Router } from 'express';
import { shoppingListController } from './shoppingListController';
import { shoppingListLifecycleController } from './shoppingListLifecycleController';
import { shoppingListMergeController } from './shoppingListMergeController';
import { shoppingListGenerationController } from './shoppingListGenerationController';
import { userActionLimiter } from '@/middleware/rateLimiter';

const router = Router();
router.use(userActionLimiter);

// Group 10Q-ListMgmt: lifecycle management endpoints (must come before /:id routes)
router.post('/auto-archive-stale', shoppingListLifecycleController.autoArchiveStale);
router.post('/cleanup-orphans', shoppingListLifecycleController.cleanupOrphans);
router.post('/tier-archived', shoppingListLifecycleController.tierArchived);
router.post('/:id/set-active', shoppingListLifecycleController.setActive);
router.post('/:id/archive', shoppingListLifecycleController.archive);
router.post('/:id/complete', shoppingListLifecycleController.archiveOnCompletion);

// Generate shopping list from recipes (must come before /:id routes)
router.post('/generate-from-recipes', shoppingListGenerationController.generateFromRecipes);

// Voice-add: utterance → fuzzy recipe match or literal item add
router.post('/voice-add', shoppingListController.voiceAdd);

// Budget preview (must come before /:id routes)
router.post('/budget-preview', shoppingListGenerationController.getBudgetPreview);

// Generate shopping list from meal plan (must come before /:id routes)
router.post('/generate-from-meal-plan', shoppingListGenerationController.generateFromMealPlan);

// Purchase history routes (must come before /:id routes)
router.get('/purchase-history', shoppingListGenerationController.getPurchaseHistory);
router.get('/purchase-history/recent', shoppingListGenerationController.getRecentPurchases);
router.put('/purchase-history/:id/favorite', shoppingListGenerationController.togglePurchaseHistoryFavorite);

// Shopping list routes
router.get('/', shoppingListController.getShoppingLists);
router.post('/', shoppingListController.createShoppingList);
router.get('/:id', shoppingListController.getShoppingList);
router.put('/:id', shoppingListController.updateShoppingList);
router.delete('/:id', shoppingListController.deleteShoppingList);

// Restore an archived list as active
router.post('/:id/restore', shoppingListController.restoreList);

// Group 10Q-ListMgmt: terminal-state actions (extracted to shoppingListMergeController)
router.post('/active/merge-suggestion/dismiss', shoppingListMergeController.dismissMergeSuggestion);
router.get('/active/merge-suggestion', shoppingListMergeController.getMergeSuggestion);
router.post('/:id/done', shoppingListMergeController.markListDone);
router.post('/:id/clear', shoppingListMergeController.clearItems);
router.post('/:id/bulk-add', shoppingListMergeController.bulkAddItems);
router.post('/:id/archive-on-completion', shoppingListMergeController.archiveOnCompletion);

// Shopping list items
router.post('/:id/items', shoppingListController.addItem);
router.put('/:listId/items/batch', shoppingListController.batchUpdateItems);
router.put('/:listId/items/:itemId', shoppingListController.updateItem);
router.delete('/:listId/items/:itemId', shoppingListController.deleteItem);

export default router;

