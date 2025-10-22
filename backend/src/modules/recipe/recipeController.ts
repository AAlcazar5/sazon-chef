// backend/src/modules/recipe/recipeController.ts
import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}

export const recipeController = {
  // Get all recipes with optional filtering
  async getRecipes(req: Request, res: Response) {
    try {
      console.log('🍳 GET /api/recipes called');
      const { cuisine, maxCookTime, page = '1', pageSize = '10' } = req.query;
      
      const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
      const take = parseInt(pageSize as string);
      
      const where: any = {};
      
      if (cuisine) {
        where.cuisine = cuisine as string;
      }
      
      if (maxCookTime) {
        where.cookTime = {
          lte: parseInt(maxCookTime as string)
        };
      }
      
      const [recipes, total] = await Promise.all([
        prisma.recipe.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: {
            ingredients: { orderBy: { order: 'asc' } },
            instructions: { orderBy: { step: 'asc' } }
          }
        }),
        prisma.recipe.count({ where })
      ]);
      
      console.log(`✅ GET /api/recipes returning ${recipes.length} recipes`);
      res.json({
        data: recipes,
        total,
        page: parseInt(page as string),
        pageSize: take,
        totalPages: Math.ceil(total / take)
      });
    } catch (error) {
      console.error('❌ Get recipes error:', error);
      res.status(500).json({ error: 'Failed to fetch recipes' });
    }
  },

  // Get single recipe by ID
  async getRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      console.log(`🍳 GET /api/recipes/${id} called`);
      
      const recipe = await prisma.recipe.findUnique({
        where: { id },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        }
      });
      
      if (!recipe) {
        console.log(`❌ Recipe ${id} not found`);
        return res.status(404).json({ error: 'Recipe not found' });
      }
      
      console.log(`✅ GET /api/recipes/${id} returning recipe: ${recipe.title}`);
      res.json(recipe);
    } catch (error) {
      console.error('❌ Get recipe error:', error);
      res.status(500).json({ error: 'Failed to fetch recipe' });
    }
  },

  // Get suggested recipes for a user - NOW WITH REAL DATA
  async getSuggestedRecipes(req: Request, res: Response) {
    console.log('🎯 GET /api/recipes/suggested - METHOD CALLED');
    
    try {
      console.log('🔍 Querying database for recipes...');
      
      // Get real recipes from database
      const allRecipes = await prisma.recipe.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        }
      });

      console.log(`📊 Found ${allRecipes.length} recipes in database`);

      // If no recipes found, return empty array
      if (allRecipes.length === 0) {
        console.log('❌ No recipes found in database');
        return res.json([]);
      }

      console.log(`📝 First recipe title: "${allRecipes[0].title}"`);

      // Add default scores to recipes
      const recipesWithScores = allRecipes.map((recipe: any) => ({
        ...recipe,
        score: {
          total: 75,
          macroScore: 70,
          tasteScore: 80,
          matchPercentage: 75,
          breakdown: {
            macroMatch: 70,
            tasteMatch: 80,
            cookTimeMatch: 75,
            ingredientMatch: 80
          }
        }
      }));

      console.log(`✅ Returning ${recipesWithScores.length} real recipes with scores`);
      res.json(recipesWithScores);

    } catch (error: any) {
      console.error('❌ Error in getSuggestedRecipes:', error);
      console.error('❌ Error details:', error.message);
      res.status(500).json({ 
        error: 'Failed to fetch suggested recipes',
        details: error.message 
      });
    }
  },

  // Get saved recipes for a user (includes both bookmarked and user-created recipes)
  async getSavedRecipes(req: Request, res: Response) {
    try {
      console.log('📚 GET /api/recipes/saved called');
      
      // TODO: AUTH - Replace with actual user ID from authentication middleware
      const userId = req.user?.id || 'temp-user-id';
      console.log('👤 User ID:', userId);
      
      // Fetch bookmarked recipes
      const savedRecipes = await prisma.savedRecipe.findMany({
        where: { userId },
        include: {
          recipe: {
            include: {
              ingredients: { orderBy: { order: 'asc' } },
              instructions: { orderBy: { step: 'asc' } }
            }
          }
        },
        orderBy: { savedDate: 'desc' }
      });

      // Fetch user-created recipes
      const userCreatedRecipes = await prisma.recipe.findMany({
        where: { 
          userId,
          isUserCreated: true 
        },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log(`📚 Found ${savedRecipes.length} saved recipes and ${userCreatedRecipes.length} user-created recipes`);
      
      // Transform bookmarked recipes
      const savedRecipesFormatted = savedRecipes.map((saved: any) => ({
        ...saved.recipe,
        savedDate: saved.savedDate.toISOString().split('T')[0],
        isUserCreated: saved.recipe.isUserCreated || false
      }));

      // Transform user-created recipes
      const userCreatedRecipesFormatted = userCreatedRecipes.map((recipe: any) => ({
        ...recipe,
        savedDate: recipe.createdAt.toISOString().split('T')[0], // Use creation date as saved date
        isUserCreated: true
      }));

      // Combine both lists, removing duplicates (in case a user saved their own recipe)
      const allRecipes = [...userCreatedRecipesFormatted, ...savedRecipesFormatted];
      const uniqueRecipes = Array.from(
        new Map(allRecipes.map(recipe => [recipe.id, recipe])).values()
      );

      // Sort by date (most recent first)
      uniqueRecipes.sort((a, b) => 
        new Date(b.savedDate).getTime() - new Date(a.savedDate).getTime()
      );
      
      console.log(`📚 Returning ${uniqueRecipes.length} total recipes for cookbook`);
      res.json(uniqueRecipes);
    } catch (error) {
      console.error('❌ Get saved recipes error:', error);
      res.status(500).json({ error: 'Failed to fetch saved recipes' });
    }
  },

  // Save a recipe for a user
  async saveRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      console.log('💾 POST /api/recipes/${id}/save called');
      
      // TODO: AUTH - Replace with actual user ID from authentication middleware
      const userId = req.user?.id || 'temp-user-id';
      console.log('👤 User ID:', userId);
      
      // Check if recipe exists
      const recipe = await prisma.recipe.findUnique({
        where: { id },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        }
      });
      
      if (!recipe) {
        console.log('❌ Recipe not found:', id);
        return res.status(404).json({ error: 'Recipe not found' });
      }
      
      // Check if already saved
      const existingSave = await prisma.savedRecipe.findUnique({
        where: {
          recipeId_userId: {
            recipeId: id,
            userId
          }
        }
      });
      
      if (existingSave) {
        console.log('⚠️ Recipe already saved:', id);
        return res.status(409).json({ error: 'Recipe already saved' });
      }
      
      // Save recipe
      const savedRecipe = await prisma.savedRecipe.create({
        data: {
          recipeId: id,
          userId
        },
        include: {
          recipe: {
            include: {
              ingredients: { orderBy: { order: 'asc' } },
              instructions: { orderBy: { step: 'asc' } }
            }
          }
        }
      });

      console.log('✅ Recipe saved successfully:', id);
      
      res.json({
        message: 'Recipe saved successfully',
        recipe: {
          ...savedRecipe.recipe,
          savedDate: savedRecipe.savedDate.toISOString().split('T')[0]
        }
      });
    } catch (error) {
      console.error('❌ Save recipe error:', error);
      res.status(500).json({ error: 'Failed to save recipe' });
    }
  },

  // Unsave a recipe
  async unsaveRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      console.log('🗑️ DELETE /api/recipes/${id}/save called');
      
      // TODO: AUTH - Replace with actual user ID from authentication middleware
      const userId = req.user?.id || 'temp-user-id';
      console.log('👤 User ID:', userId);
      
      await prisma.savedRecipe.delete({
        where: {
          recipeId_userId: {
            recipeId: id,
            userId
          }
        }
      });

      console.log('✅ Recipe unsaved successfully:', id);
      
      res.json({ message: 'Recipe removed from saved recipes' });
    } catch (error) {
      console.error('❌ Unsave recipe error:', error);
      res.status(500).json({ error: 'Failed to remove recipe from saved recipes' });
    }
  },

  // Like a recipe
  async likeRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      console.log('👍 POST /api/recipes/${id}/like called');
      
      // TODO: AUTH - Replace with actual user ID from authentication middleware
      const userId = req.user?.id || 'temp-user-id';
      console.log('👤 User ID:', userId);
      
      await recipeController.handleRecipeFeedback(id, userId, { liked: true });
      
      console.log('✅ Recipe liked:', id);
      
      res.json({ message: 'Recipe liked' });
    } catch (error) {
      console.error('❌ Like recipe error:', error);
      res.status(500).json({ error: 'Failed to like recipe' });
    }
  },

  // Dislike a recipe
  async dislikeRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      console.log('👎 POST /api/recipes/${id}/dislike called');
      
      // TODO: AUTH - Replace with actual user ID from authentication middleware
      const userId = req.user?.id || 'temp-user-id';
      console.log('👤 User ID:', userId);
      
      await recipeController.handleRecipeFeedback(id, userId, { disliked: true });
      
      console.log('✅ Recipe disliked:', id);
      
      res.json({ message: 'Recipe disliked' });
    } catch (error) {
      console.error('❌ Dislike recipe error:', error);
      res.status(500).json({ error: 'Failed to dislike recipe' });
    }
  },

  // Helper method for handling recipe feedback
  async handleRecipeFeedback(recipeId: string, userId: string, feedback: { liked?: boolean; disliked?: boolean; saved?: boolean; consumed?: boolean }) {
    console.log('📝 Handling recipe feedback:', { recipeId, userId, feedback });
    
    const existingFeedback = await prisma.recipeFeedback.findUnique({
      where: {
        recipeId_userId: {
          recipeId,
          userId
        }
      }
    });
    
    if (existingFeedback) {
      // Update existing feedback
      console.log('🔄 Updating existing feedback');
      return await prisma.recipeFeedback.update({
        where: {
          recipeId_userId: {
            recipeId,
            userId
          }
        },
        data: feedback
      });
    } else {
      // Create new feedback
      console.log('🆕 Creating new feedback');
      return await prisma.recipeFeedback.create({
        data: {
          recipeId,
          userId,
          ...feedback
        }
      });
    }
  },

  // Get recipe score breakdown
  async getRecipeScore(req: Request, res: Response) {
    try {
      const { id } = req.params;
      console.log('📊 GET /api/recipes/${id}/score called');
      
      const recipe = await prisma.recipe.findUnique({ 
        where: { id },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        }
      });
      
      if (!recipe) {
        console.log('❌ Recipe not found for scoring:', id);
        return res.status(404).json({ error: 'Recipe not found' });
      }
      
      // Return default score for now
      const defaultScore = {
        total: 75,
        macroScore: 70,
        tasteScore: 80,
        matchPercentage: 75,
        breakdown: {
          macroMatch: 70,
          tasteMatch: 80,
          cookTimeMatch: 75,
          ingredientMatch: 80
        }
      };
      
      console.log('✅ Returning default score for recipe:', recipe.title);
      
      res.json(defaultScore);
    } catch (error) {
      console.error('❌ Get recipe score error:', error);
      res.status(500).json({ error: 'Failed to calculate recipe score' });
    }
  },

  // Get user's created recipes
  async getUserRecipes(req: Request, res: Response) {
    try {
      console.log('👤 GET /api/recipes/my-recipes called');
      
      // TODO: AUTH - Replace with actual user ID from authentication middleware
      const userId = req.user?.id || 'temp-user-id';
      console.log('👤 User ID:', userId);
      
      const userRecipes = await prisma.recipe.findMany({
        where: { 
          userId,
          isUserCreated: true 
        },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log(`✅ Found ${userRecipes.length} user-created recipes`);
      res.json(userRecipes);
    } catch (error) {
      console.error('❌ Get user recipes error:', error);
      res.status(500).json({ error: 'Failed to fetch user recipes' });
    }
  },

  // Create a new recipe
  async createRecipe(req: Request, res: Response) {
    try {
      console.log('✨ POST /api/recipes called');
      
      // TODO: AUTH - Replace with actual user ID from authentication middleware
      const userId = req.user?.id || 'temp-user-id';
      console.log('👤 User ID:', userId);
      
      const {
        title,
        description,
        cookTime,
        cuisine,
        imageUrl,
        calories,
        protein,
        carbs,
        fat,
        fiber,
        sugar,
        ingredients,
        instructions
      } = req.body;

      // Validation
      if (!title || !description || !cookTime || !cuisine) {
        console.log('❌ Validation failed: Missing required fields');
        return res.status(400).json({ 
          error: 'Missing required fields',
          details: 'title, description, cookTime, and cuisine are required'
        });
      }

      if (!calories || !protein || !carbs || !fat) {
        console.log('❌ Validation failed: Missing macro nutrients');
        return res.status(400).json({ 
          error: 'Missing macro nutrients',
          details: 'calories, protein, carbs, and fat are required'
        });
      }

      if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        console.log('❌ Validation failed: Invalid ingredients');
        return res.status(400).json({ 
          error: 'Invalid ingredients',
          details: 'ingredients must be a non-empty array'
        });
      }

      if (!instructions || !Array.isArray(instructions) || instructions.length === 0) {
        console.log('❌ Validation failed: Invalid instructions');
        return res.status(400).json({ 
          error: 'Invalid instructions',
          details: 'instructions must be a non-empty array'
        });
      }

      // Create recipe with nested ingredients and instructions
      const recipe = await prisma.recipe.create({
        data: {
          title,
          description,
          cookTime: parseInt(cookTime),
          cuisine,
          imageUrl: imageUrl || null,
          calories: parseInt(calories),
          protein: parseInt(protein),
          carbs: parseInt(carbs),
          fat: parseInt(fat),
          fiber: fiber ? parseInt(fiber) : null,
          sugar: sugar ? parseInt(sugar) : null,
          userId,
          isUserCreated: true,
          ingredients: {
            create: ingredients.map((text: string, index: number) => ({
              text,
              order: index
            }))
          },
          instructions: {
            create: instructions.map((text: string, index: number) => ({
              text,
              step: index + 1
            }))
          }
        },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        }
      });

      console.log('✅ Recipe created successfully:', recipe.id);
      res.status(201).json({ 
        message: 'Recipe created successfully',
        recipe 
      });
    } catch (error: any) {
      console.error('❌ Create recipe error:', error);
      res.status(500).json({ 
        error: 'Failed to create recipe',
        details: error.message 
      });
    }
  },

  // Update a recipe
  async updateRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      console.log(`📝 PUT /api/recipes/${id} called`);
      
      // TODO: AUTH - Replace with actual user ID from authentication middleware
      const userId = req.user?.id || 'temp-user-id';
      console.log('👤 User ID:', userId);
      
      // Check if recipe exists and belongs to user
      const existingRecipe = await prisma.recipe.findUnique({
        where: { id }
      });

      if (!existingRecipe) {
        console.log('❌ Recipe not found:', id);
        return res.status(404).json({ error: 'Recipe not found' });
      }

      if (existingRecipe.userId !== userId) {
        console.log('❌ Unauthorized: Recipe does not belong to user');
        return res.status(403).json({ error: 'You do not have permission to edit this recipe' });
      }

      const {
        title,
        description,
        cookTime,
        cuisine,
        imageUrl,
        calories,
        protein,
        carbs,
        fat,
        fiber,
        sugar,
        ingredients,
        instructions
      } = req.body;

      // Update recipe - delete old ingredients/instructions and create new ones
      const updatedRecipe = await prisma.recipe.update({
        where: { id },
        data: {
          title: title || existingRecipe.title,
          description: description || existingRecipe.description,
          cookTime: cookTime ? parseInt(cookTime) : existingRecipe.cookTime,
          cuisine: cuisine || existingRecipe.cuisine,
          imageUrl: imageUrl !== undefined ? imageUrl : existingRecipe.imageUrl,
          calories: calories ? parseInt(calories) : existingRecipe.calories,
          protein: protein ? parseInt(protein) : existingRecipe.protein,
          carbs: carbs ? parseInt(carbs) : existingRecipe.carbs,
          fat: fat ? parseInt(fat) : existingRecipe.fat,
          fiber: fiber !== undefined ? (fiber ? parseInt(fiber) : null) : existingRecipe.fiber,
          sugar: sugar !== undefined ? (sugar ? parseInt(sugar) : null) : existingRecipe.sugar,
          // Delete and recreate ingredients if provided
          ...(ingredients && {
            ingredients: {
              deleteMany: {},
              create: ingredients.map((text: string, index: number) => ({
                text,
                order: index
              }))
            }
          }),
          // Delete and recreate instructions if provided
          ...(instructions && {
            instructions: {
              deleteMany: {},
              create: instructions.map((text: string, index: number) => ({
                text,
                step: index + 1
              }))
            }
          })
        },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        }
      });

      console.log('✅ Recipe updated successfully:', id);
      res.json({ 
        message: 'Recipe updated successfully',
        recipe: updatedRecipe 
      });
    } catch (error: any) {
      console.error('❌ Update recipe error:', error);
      res.status(500).json({ 
        error: 'Failed to update recipe',
        details: error.message 
      });
    }
  },

  // Delete a recipe
  async deleteRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      console.log(`🗑️ DELETE /api/recipes/${id} called`);
      
      // TODO: AUTH - Replace with actual user ID from authentication middleware
      const userId = req.user?.id || 'temp-user-id';
      console.log('👤 User ID:', userId);
      
      // Check if recipe exists and belongs to user
      const existingRecipe = await prisma.recipe.findUnique({
        where: { id }
      });

      if (!existingRecipe) {
        console.log('❌ Recipe not found:', id);
        return res.status(404).json({ error: 'Recipe not found' });
      }

      if (existingRecipe.userId !== userId) {
        console.log('❌ Unauthorized: Recipe does not belong to user');
        return res.status(403).json({ error: 'You do not have permission to delete this recipe' });
      }

      // Delete recipe (cascade will handle ingredients and instructions)
      await prisma.recipe.delete({
        where: { id }
      });

      console.log('✅ Recipe deleted successfully:', id);
      res.json({ message: 'Recipe deleted successfully' });
    } catch (error: any) {
      console.error('❌ Delete recipe error:', error);
      res.status(500).json({ 
        error: 'Failed to delete recipe',
        details: error.message 
      });
    }
  }
};