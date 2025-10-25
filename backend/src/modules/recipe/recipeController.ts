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
    console.log('🔍 Fetching user behavioral data for:', userId);
    
    // Get liked recipes
    const likedRecipes = await prisma.recipeFeedback.findMany({
      where: { userId, liked: true },
      include: { 
        recipe: {
          include: {
            ingredients: { orderBy: { order: 'asc' } }
          }
        }
      }
    });
    
    // Get disliked recipes
    const dislikedRecipes = await prisma.recipeFeedback.findMany({
      where: { userId, disliked: true },
      include: { 
        recipe: {
          include: {
            ingredients: { orderBy: { order: 'asc' } }
          }
        }
      }
    });
    
    // Get saved recipes
    const savedRecipes = await prisma.savedRecipe.findMany({
      where: { userId },
      include: { 
        recipe: {
          include: {
            ingredients: { orderBy: { order: 'asc' } }
          }
        }
      }
    });
    
    // Get consumed recipes (meal history)
    const consumedRecipes = await prisma.mealHistory.findMany({
      where: { userId, consumed: true },
      include: { 
        recipe: {
          include: {
            ingredients: { orderBy: { order: 'asc' } }
          }
        }
      }
    });
    
    console.log(`📊 Behavioral data found: ${likedRecipes.length} liked, ${dislikedRecipes.length} disliked, ${savedRecipes.length} saved, ${consumedRecipes.length} consumed`);
    
    return {
      likedRecipes: likedRecipes.map(feedback => ({
        recipeId: feedback.recipeId,
        cuisine: feedback.recipe.cuisine,
        cookTime: feedback.recipe.cookTime,
        calories: feedback.recipe.calories,
        protein: feedback.recipe.protein,
        carbs: feedback.recipe.carbs,
        fat: feedback.recipe.fat,
        ingredients: feedback.recipe.ingredients,
        createdAt: feedback.createdAt
      })),
      dislikedRecipes: dislikedRecipes.map(feedback => ({
        recipeId: feedback.recipeId,
        cuisine: feedback.recipe.cuisine,
        cookTime: feedback.recipe.cookTime,
        calories: feedback.recipe.calories,
        protein: feedback.recipe.protein,
        carbs: feedback.recipe.carbs,
        fat: feedback.recipe.fat,
        ingredients: feedback.recipe.ingredients,
        createdAt: feedback.createdAt
      })),
      savedRecipes: savedRecipes.map(saved => ({
        recipeId: saved.recipeId,
        cuisine: saved.recipe.cuisine,
        cookTime: saved.recipe.cookTime,
        calories: saved.recipe.calories,
        protein: saved.recipe.protein,
        carbs: saved.recipe.carbs,
        fat: saved.recipe.fat,
        ingredients: saved.recipe.ingredients,
        savedDate: saved.savedDate
      })),
      consumedRecipes: consumedRecipes.map(meal => ({
        recipeId: meal.recipeId,
        cuisine: meal.recipe.cuisine,
        cookTime: meal.recipe.cookTime,
        calories: meal.recipe.calories,
        protein: meal.recipe.protein,
        carbs: meal.recipe.carbs,
        fat: meal.recipe.fat,
        ingredients: meal.recipe.ingredients,
        date: meal.date
      }))
    };
  } catch (error) {
    console.error('❌ Error getting user behavioral data:', error);
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
      const userId = 'temp-user-id'; // TODO: Replace with actual user ID from auth
      
      // Extract filter parameters from query
      const { 
        cuisines, 
        dietaryRestrictions, 
        maxCookTime, 
        difficulty 
      } = req.query;
      
      console.log('🔍 Filter parameters:', { cuisines, dietaryRestrictions, maxCookTime, difficulty });

      // Get user preferences and macro goals for scoring
      const [userPreferences, macroGoals] = await Promise.all([
        prisma.userPreferences.findFirst({
          where: { userId },
          include: {
            bannedIngredients: true,
            likedCuisines: true,
            dietaryRestrictions: true
          }
        }),
        prisma.macroGoals.findFirst({
          where: { userId }
        })
      ]);
      
      console.log('👤 User preferences found:', !!userPreferences);
      console.log('🎯 Macro goals found:', !!macroGoals);
      
      // Build where clause for filtering
      const where: any = {
        isUserCreated: false // Only system recipes for now
      };
      
      // Filter by cuisines
      if (cuisines && typeof cuisines === 'string') {
        const cuisineArray = cuisines.split(',').map(c => c.trim());
        where.cuisine = {
          in: cuisineArray
        };
      }
      
      // Filter by cook time
      if (maxCookTime && !isNaN(Number(maxCookTime))) {
        where.cookTime = {
          lte: Number(maxCookTime)
        };
      }
      
      console.log('🔍 Querying database for recipes with filters...');
      console.log('🔍 Where clause:', JSON.stringify(where, null, 2));
      
      // Get filtered recipes from database
      const allRecipes = await prisma.recipe.findMany({
        where,
        take: 20, // Get more recipes to score and sort
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

      // Get user behavioral data for scoring (once for all recipes)
      const userBehavior = await getUserBehaviorData(userId);
      
      // Get current temporal context
      const { getCurrentTemporalContext, calculateTemporalScore, analyzeUserTemporalPatterns } = require('@/utils/temporalScoring');
      const temporalContext = getCurrentTemporalContext();
      
      // Analyze user's temporal patterns from meal history
      const userTemporalPatterns = analyzeUserTemporalPatterns(userBehavior.consumedRecipes);
      
      // Import scoring functions
      const { calculateRecipeScore } = require('@/utils/scoring');
      const { calculateBehavioralScore } = require('@/utils/behavioralScoring');
      const { calculateEnhancedScore } = require('@/utils/enhancedScoring');
      const { calculateDiscriminatoryScore, getUserPreferencesForScoring } = require('../../utils/discriminatoryScoring');
      
      // Create enhanced scoring context
      const cookTimeContext = {
        availableTime: 30, // Default 30 minutes
        timeOfDay: (temporalContext.mealPeriod === 'breakfast' ? 'morning' : 
                   temporalContext.mealPeriod === 'lunch' ? 'afternoon' : 
                   temporalContext.mealPeriod === 'dinner' ? 'evening' : 'night') as 'morning' | 'afternoon' | 'evening' | 'night',
        dayOfWeek: (temporalContext.isWeekend ? 'weekend' : 'weekday') as 'weekday' | 'weekend',
        urgency: 'medium' as const
      };
      
      const userKitchenProfile = {
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

      // Get user preferences for discriminatory scoring
      const userPrefsForScoring = await getUserPreferencesForScoring(userId);
      console.log('🔍 User preferences for scoring:', userPrefsForScoring);
      
      // Calculate scores for each recipe
      const recipesWithScores = allRecipes.map((recipe: any) => {
        try {
          // Calculate behavioral score
          const behavioralScore = calculateBehavioralScore(recipe, userBehavior);
          
          // Calculate temporal score
          const temporalScore = calculateTemporalScore(recipe, temporalContext, userTemporalPatterns);
          
          // Calculate enhanced score
          const enhancedScore = calculateEnhancedScore(recipe, cookTimeContext, userKitchenProfile);
          
          // Calculate discriminatory score (NEW - preference-based scoring)
          let discriminatoryScore;
          try {
            discriminatoryScore = userPrefsForScoring ? 
              calculateDiscriminatoryScore(recipe, userPrefsForScoring) : 
              { total: 50, breakdown: { cuisineMatch: 50, ingredientPenalty: 0, cookTimeMatch: 50, dietaryMatch: 50, spiceMatch: 50 } };
            console.log(`🎯 Discriminatory score for ${recipe.title}:`, discriminatoryScore.total);
          } catch (error) {
            console.error('❌ Error calculating discriminatory score:', error);
            discriminatoryScore = { total: 50, breakdown: { cuisineMatch: 50, ingredientPenalty: 0, cookTimeMatch: 50, dietaryMatch: 50, spiceMatch: 50 } };
          }
          
          // Calculate overall score with discriminatory scoring as primary factor
          const baseScore = calculateRecipeScore(recipe, userPreferences, macroGoals, behavioralScore.total, temporalScore.total);
          
          // Combine base score with discriminatory score (70% discriminatory, 30% base)
          const finalScore = Math.round(
            discriminatoryScore.total * 0.7 + 
            baseScore.total * 0.3
          );
          
          return {
            ...recipe,
            score: {
              total: finalScore,
              matchPercentage: finalScore,
              macroScore: baseScore.macroScore,
              tasteScore: baseScore.tasteScore,
              behavioralScore: behavioralScore.total,
              behavioralBreakdown: {
                cuisinePreference: behavioralScore.cuisinePreference,
                cookTimePreference: behavioralScore.cookTimePreference,
                macroPreference: behavioralScore.macroPreference,
                ingredientPreference: behavioralScore.ingredientPreference,
                recencyBonus: behavioralScore.recencyBonus
              },
              temporalScore: temporalScore.total,
              temporalBreakdown: {
                timeOfDayScore: temporalScore.timeOfDayScore,
                dayOfWeekScore: temporalScore.dayOfWeekScore,
                seasonalScore: temporalScore.seasonalScore,
                mealPeriodScore: temporalScore.mealPeriodScore
              },
              enhancedScore: enhancedScore.total,
              enhancedBreakdown: {
                cookTimeMatch: enhancedScore.cookTimeScore,
                convenienceFactor: enhancedScore.convenienceScore,
                timeEfficiency: enhancedScore.breakdown.timeEfficiency
              },
              discriminatoryScore: discriminatoryScore.total,
              discriminatoryBreakdown: discriminatoryScore.breakdown,
              temporalContext: {
                currentHour: temporalContext.currentHour,
                currentDay: temporalContext.currentDay,
                mealPeriod: temporalContext.mealPeriod,
                season: temporalContext.season,
                isWeekend: temporalContext.isWeekend
              }
            }
          };
        } catch (error) {
          console.error('❌ Error calculating score for recipe:', recipe.title, error);
          // Return recipe with basic score if scoring fails
          return {
        ...recipe,
        score: {
              total: 50, // Default 50% match
              macroScore: 50,
              tasteScore: 50,
              matchPercentage: 50,
              behavioralScore: 0,
              temporalScore: 0,
              enhancedScore: 0,
              discriminatoryScore: 50,
              error: 'Scoring failed'
            }
          };
        }
      });

        // Sort recipes by score (highest first)
        recipesWithScores.sort((a, b) => b.score.total - a.score.total);
        
        // Take top 10 recipes
        const topRecipes = recipesWithScores.slice(0, 10);

        console.log(`✅ Returning ${topRecipes.length} recipes with real scores`);
        console.log(`🏆 Top recipe: "${topRecipes[0]?.title}" (${topRecipes[0]?.score?.total}% match)`);
        
        res.json(topRecipes);
    } catch (error: any) {
      console.error('❌ Error in getSuggestedRecipes:', error);
      console.error('❌ Error details:', error.message);
        res.status(500).json({ error: 'Failed to fetch suggested recipes', details: error.message });
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
      
      const existing = await prisma.recipeFeedback.findFirst({
        where: { userId, recipeId: id }
      });

      if (existing) {
        await prisma.recipeFeedback.update({
          where: { id: existing.id },
          data: { liked: true, disliked: false }
        });
      } else {
        await prisma.recipeFeedback.create({
          data: { userId, recipeId: id, liked: true, disliked: false }
        });
      }

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
      
      const existing = await prisma.recipeFeedback.findFirst({
        where: { userId, recipeId: id }
      });

      if (existing) {
        await prisma.recipeFeedback.update({
          where: { id: existing.id },
          data: { liked: false, disliked: true }
        });
      } else {
        await prisma.recipeFeedback.create({
          data: { userId, recipeId: id, liked: false, disliked: true }
        });
      }

      console.log('✅ Recipe disliked successfully');
      res.json({ message: 'Recipe disliked successfully' });
    } catch (error: any) {
      console.error('❌ Dislike recipe error:', error);
      res.status(500).json({ error: 'Failed to dislike recipe' });
    }
  }
};
