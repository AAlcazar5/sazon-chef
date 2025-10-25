// backend/src/modules/recipe/recipeController.simple.ts
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

// Helper function to get user behavioral data
export async function getUserBehaviorData(userId: string) {
  try {
    return {
      likedRecipes: [],
      dislikedRecipes: [],
      savedRecipes: [],
      consumedRecipes: []
    };
  } catch (error) {
    console.error('Error getting user behavioral data:', error);
    return {
      likedRecipes: [],
      dislikedRecipes: [],
      savedRecipes: [],
      consumedRecipes: []
    };
  }
}

export const recipeController = {
  // Get all recipes
  async getRecipes(req: Request, res: Response) {
    try {
      console.log('🍳 GET /api/recipes called');
      const recipes = await prisma.recipe.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        }
      });

      console.log(`📊 Found ${recipes.length} recipes`);
      res.json(recipes);
    } catch (error: any) {
      console.error('❌ Get recipes error:', error);
      res.status(500).json({ error: 'Failed to fetch recipes' });
    }
  },

  // Get a single recipe
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
        console.log('❌ Recipe not found:', id);
        return res.status(404).json({ error: 'Recipe not found' });
      }

      console.log('✅ Recipe found:', recipe.title);
      res.json(recipe);
    } catch (error: any) {
      console.error('❌ Get recipe error:', error);
      res.status(500).json({ error: 'Failed to fetch recipe' });
    }
  },

  // Get suggested recipes
  async getSuggestedRecipes(req: Request, res: Response) {
    try {
      console.log('🎯 GET /api/recipes/suggested - METHOD CALLED');
      
      const recipes = await prisma.recipe.findMany({
        where: { isUserCreated: false },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        }
      });

      console.log(`✅ Returning ${recipes.length} recipes`);
      res.json(recipes);
    } catch (error: any) {
      console.error('❌ Error in getSuggestedRecipes:', error);
      res.status(500).json({ error: 'Failed to fetch suggested recipes' });
    }
  },

  // Get random recipe
  async getRandomRecipe(req: Request, res: Response) {
    try {
      console.log('🎲 GET /api/recipes/random - METHOD CALLED');
      
      const recipes = await prisma.recipe.findMany({
        where: { isUserCreated: false },
        take: 5,
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        }
      });

      if (recipes.length === 0) {
        return res.status(404).json({ error: 'No recipes found' });
      }

      const randomRecipe = recipes[Math.floor(Math.random() * recipes.length)];
      console.log(`✅ Returning random recipe: ${randomRecipe.title}`);
      res.json(randomRecipe);
    } catch (error: any) {
      console.error('❌ Error in getRandomRecipe:', error);
      res.status(500).json({ error: 'Failed to fetch random recipe' });
    }
  },

  // Get saved recipes
  async getSavedRecipes(req: Request, res: Response) {
    try {
      console.log('📚 GET /api/recipes/saved called');
      const userId = 'temp-user-id';
      
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

      console.log(`📚 Found ${savedRecipes.length} saved recipes`);
      res.json(savedRecipes.map((saved: any) => ({
        ...saved.recipe,
        savedDate: saved.savedDate.toISOString().split('T')[0]
      })));
    } catch (error: any) {
      console.error('❌ Get saved recipes error:', error);
      res.status(500).json({ error: 'Failed to fetch saved recipes' });
    }
  },

  // Save recipe
  async saveRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = 'temp-user-id';
      
      const existingSaved = await prisma.savedRecipe.findFirst({
        where: { userId, recipeId: id }
      });

      if (existingSaved) {
        return res.status(400).json({ error: 'Recipe already saved' });
      }

      await prisma.savedRecipe.create({
        data: { userId, recipeId: id }
      });

      console.log('✅ Recipe saved successfully');
      res.json({ message: 'Recipe saved successfully' });
    } catch (error: any) {
      console.error('❌ Save recipe error:', error);
      res.status(500).json({ error: 'Failed to save recipe' });
    }
  },

  // Unsave recipe
  async unsaveRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = 'temp-user-id';
      
      await prisma.savedRecipe.deleteMany({
        where: { userId, recipeId: id }
      });

      console.log('✅ Recipe unsaved successfully');
      res.json({ message: 'Recipe unsaved successfully' });
    } catch (error: any) {
      console.error('❌ Unsave recipe error:', error);
      res.status(500).json({ error: 'Failed to unsave recipe' });
    }
  },

  // Like recipe
  async likeRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = 'temp-user-id';
      
      await prisma.recipeFeedback.upsert({
        where: { userId_recipeId: { userId, recipeId: id } },
        update: { liked: true, disliked: false },
        create: { userId, recipeId: id, liked: true, disliked: false }
      });

      console.log('✅ Recipe liked successfully');
      res.json({ message: 'Recipe liked successfully' });
    } catch (error: any) {
      console.error('❌ Like recipe error:', error);
      res.status(500).json({ error: 'Failed to like recipe' });
    }
  },

  // Dislike recipe
  async dislikeRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = 'temp-user-id';
      
      await prisma.recipeFeedback.upsert({
        where: { userId_recipeId: { userId, recipeId: id } },
        update: { liked: false, disliked: true },
        create: { userId, recipeId: id, liked: false, disliked: true }
      });

      console.log('✅ Recipe disliked successfully');
      res.json({ message: 'Recipe disliked successfully' });
    } catch (error: any) {
      console.error('❌ Dislike recipe error:', error);
      res.status(500).json({ error: 'Failed to dislike recipe' });
    }
  }
};
