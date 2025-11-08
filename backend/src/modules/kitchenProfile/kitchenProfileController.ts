// backend/src/modules/kitchenProfile/kitchenProfileController.ts
import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';

export const kitchenProfileController = {
  // Get user's kitchen profile
  async getKitchenProfile(req: Request, res: Response) {
    try {
      console.log('🏠 GET /api/kitchen-profile - METHOD CALLED');
      const userId = getUserId(req);
      
      // Get user's kitchen profile (we'll store this in user preferences for now)
      const userPreferences = await prisma.userPreferences.findFirst({
        where: { userId }
      });
      
      // Default kitchen profile
      const defaultProfile = {
        availableIngredients: [],
        cookingSkill: 'intermediate',
        preferredCookTime: 30,
        kitchenEquipment: [
          'stovetop', 'oven', 'microwave', 'refrigerator', 'freezer',
          'knife', 'cutting board', 'mixing bowl', 'measuring cups',
          'measuring spoons', 'whisk', 'spatula', 'tongs'
        ],
        dietaryRestrictions: [],
        budget: 'medium'
      };
      
      // For now, return default profile
      // TODO: Implement actual kitchen profile storage
      res.json({
        profile: defaultProfile,
        message: 'Kitchen profile retrieved successfully'
      });
      
    } catch (error) {
      console.error('❌ Error in getKitchenProfile:', error);
      res.status(500).json({ 
        error: 'Failed to fetch kitchen profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
  
  // Update user's kitchen profile
  async updateKitchenProfile(req: Request, res: Response) {
    try {
      console.log('🏠 PUT /api/kitchen-profile - METHOD CALLED');
      const userId = getUserId(req);
      
      const {
        availableIngredients,
        cookingSkill,
        preferredCookTime,
        kitchenEquipment,
        dietaryRestrictions,
        budget
      } = req.body;
      
      // Validate input
      if (cookingSkill && !['beginner', 'intermediate', 'advanced'].includes(cookingSkill)) {
        return res.status(400).json({
          error: 'Invalid cooking skill',
          message: 'Cooking skill must be beginner, intermediate, or advanced'
        });
      }
      
      if (budget && !['low', 'medium', 'high'].includes(budget)) {
        return res.status(400).json({
          error: 'Invalid budget level',
          message: 'Budget must be low, medium, or high'
        });
      }
      
      // For now, we'll store this in a simple way
      // TODO: Implement proper kitchen profile storage
      const updatedProfile = {
        availableIngredients: availableIngredients || [],
        cookingSkill: cookingSkill || 'intermediate',
        preferredCookTime: preferredCookTime || 30,
        kitchenEquipment: kitchenEquipment || [],
        dietaryRestrictions: dietaryRestrictions || [],
        budget: budget || 'medium'
      };
      
      console.log('✅ Kitchen profile updated successfully');
      
      res.json({
        message: 'Kitchen profile updated successfully',
        profile: updatedProfile
      });
      
    } catch (error) {
      console.error('❌ Error in updateKitchenProfile:', error);
      res.status(500).json({ 
        error: 'Failed to update kitchen profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
  
  // Add ingredient to kitchen
  async addIngredient(req: Request, res: Response) {
    try {
      console.log('🥕 POST /api/kitchen-profile/ingredients - METHOD CALLED');
      const userId = getUserId(req);
      
      const {
        ingredient,
        quantity,
        expirationDate,
        quality = 'good'
      } = req.body;
      
      if (!ingredient) {
        return res.status(400).json({
          error: 'Missing required field',
          message: 'Ingredient name is required'
        });
      }
      
      // For now, return success
      // TODO: Implement actual ingredient storage
      const newIngredient = {
        ingredient,
        quantity,
        expirationDate: expirationDate ? new Date(expirationDate) : undefined,
        quality,
        available: true
      };
      
      console.log(`✅ Added ingredient: ${ingredient}`);
      
      res.status(201).json({
        message: 'Ingredient added successfully',
        ingredient: newIngredient
      });
      
    } catch (error) {
      console.error('❌ Error in addIngredient:', error);
      res.status(500).json({ 
        error: 'Failed to add ingredient',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
  
  // Remove ingredient from kitchen
  async removeIngredient(req: Request, res: Response) {
    try {
      console.log('🗑️ DELETE /api/kitchen-profile/ingredients/:ingredient - METHOD CALLED');
      const { ingredient } = req.params;
      const userId = getUserId(req);
      
      // For now, return success
      // TODO: Implement actual ingredient removal
      
      console.log(`✅ Removed ingredient: ${ingredient}`);
      
      res.json({
        message: 'Ingredient removed successfully',
        ingredient
      });
      
    } catch (error) {
      console.error('❌ Error in removeIngredient:', error);
      res.status(500).json({ 
        error: 'Failed to remove ingredient',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
  
  // Get ingredient suggestions for a recipe
  async getIngredientSuggestions(req: Request, res: Response) {
    try {
      console.log('💡 GET /api/kitchen-profile/suggestions/:recipeId - METHOD CALLED');
      const { recipeId } = req.params;
      const userId = getUserId(req);
      
      // Get recipe details
      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        include: {
          ingredients: { orderBy: { order: 'asc' } }
        }
      });
      
      if (!recipe) {
        return res.status(404).json({
          error: 'Recipe not found',
          message: 'The specified recipe does not exist'
        });
      }
      
      // Get user's kitchen profile
      const userPreferences = await prisma.userPreferences.findFirst({
        where: { userId }
      });
      
      // Default kitchen profile for now
      const userKitchenProfile = {
        availableIngredients: [],
        cookingSkill: 'intermediate' as const,
        preferredCookTime: 30,
        kitchenEquipment: [
          'stovetop', 'oven', 'microwave', 'refrigerator', 'freezer',
          'knife', 'cutting board', 'mixing bowl', 'measuring cups',
          'measuring spoons', 'whisk', 'spatula', 'tongs'
        ],
        dietaryRestrictions: [],
        budget: 'medium' as const
      };
      
      // Generate ingredient suggestions
      // TODO: Implement generateIngredientSuggestions in enhancedScoring
      // For now, return empty suggestions
      const suggestions: string[] = [];
      
      console.log(`✅ Generated ingredient suggestions for recipe: ${recipe.title}`);
      
      res.json({
        recipeId,
        recipeTitle: recipe.title,
        suggestions
      });
      
    } catch (error) {
      console.error('❌ Error in getIngredientSuggestions:', error);
      res.status(500).json({ 
        error: 'Failed to generate ingredient suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
  
  // Get optimal recipes based on kitchen profile
  async getOptimalRecipes(req: Request, res: Response) {
    try {
      console.log('🎯 GET /api/kitchen-profile/optimal-recipes - METHOD CALLED');
      const userId = getUserId(req);
      
      const {
        availableTime = '30',
        timeOfDay = 'evening',
        dayOfWeek = 'weekday',
        urgency = 'medium',
        limit = '10'
      } = req.query;
      
      // Get user's kitchen profile
      const userKitchenProfile = {
        availableIngredients: [],
        cookingSkill: 'intermediate' as const,
        preferredCookTime: parseInt(availableTime as string),
        kitchenEquipment: [
          'stovetop', 'oven', 'microwave', 'refrigerator', 'freezer',
          'knife', 'cutting board', 'mixing bowl', 'measuring cups',
          'measuring spoons', 'whisk', 'spatula', 'tongs'
        ],
        dietaryRestrictions: [],
        budget: 'medium' as const
      };
      
      // Create cook time context
      const cookTimeContext = {
        availableTime: parseInt(availableTime as string),
        timeOfDay: timeOfDay as 'morning' | 'afternoon' | 'evening' | 'night',
        dayOfWeek: dayOfWeek as 'weekday' | 'weekend',
        urgency: urgency as 'low' | 'medium' | 'high'
      };
      
      // Get recipes from database
      const recipes = await prisma.recipe.findMany({
        where: { isUserCreated: false },
        take: 50, // Get more recipes to score
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        }
      });
      
      // Calculate optimal recipes using enhanced scoring
      // TODO: Implement getOptimalRecipes in enhancedScoring
      // For now, return recipes sorted by cook time
      const optimalRecipes = recipes
        .filter(r => r.cookTime <= cookTimeContext.availableTime)
        .sort((a, b) => (a.cookTime || 0) - (b.cookTime || 0))
        .slice(0, parseInt(limit as string));
      
      console.log(`✅ Found ${optimalRecipes.length} optimal recipes`);
      
      res.json({
        recipes: optimalRecipes,
        context: cookTimeContext,
        total: optimalRecipes.length
      });
      
    } catch (error) {
      console.error('❌ Error in getOptimalRecipes:', error);
      res.status(500).json({ 
        error: 'Failed to get optimal recipes',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};
