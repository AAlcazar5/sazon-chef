// backend/src/modules/shoppingList/shoppingListRoutes.ts

import { Router } from 'express';
import { shoppingListController } from './shoppingListController';

const router = Router();

// Generate shopping list from recipes (must come before /:id routes)
router.post('/generate-from-recipes', shoppingListController.generateFromRecipes);

// Generate shopping list from meal plan (must come before /:id routes)
router.post('/generate-from-meal-plan', shoppingListController.generateFromMealPlan);

// Shopping list routes
router.get('/', shoppingListController.getShoppingLists);
router.post('/', shoppingListController.createShoppingList);
router.get('/:id', shoppingListController.getShoppingList);
router.put('/:id', shoppingListController.updateShoppingList);
router.delete('/:id', shoppingListController.deleteShoppingList);

// Shopping list items
router.post('/:id/items', shoppingListController.addItem);
router.put('/:listId/items/:itemId', shoppingListController.updateItem);
router.delete('/:listId/items/:itemId', shoppingListController.deleteItem);

export default router;

