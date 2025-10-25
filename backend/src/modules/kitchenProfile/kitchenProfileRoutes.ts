// backend/src/modules/kitchenProfile/kitchenProfileRoutes.ts
import { Router } from 'express';
import { kitchenProfileController } from './kitchenProfileController';

const router = Router();

// Get user's kitchen profile
router.get('/', kitchenProfileController.getKitchenProfile);

// Update user's kitchen profile
router.put('/', kitchenProfileController.updateKitchenProfile);

// Add ingredient to kitchen
router.post('/ingredients', kitchenProfileController.addIngredient);

// Remove ingredient from kitchen
router.delete('/ingredients/:ingredient', kitchenProfileController.removeIngredient);

// Get ingredient suggestions for a recipe
router.get('/suggestions/:recipeId', kitchenProfileController.getIngredientSuggestions);

// Get optimal recipes based on kitchen profile
router.get('/optimal-recipes', kitchenProfileController.getOptimalRecipes);

export { router as kitchenProfileRoutes };
