// backend/src/modules/recipe/recipeController.simple.ts
import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { healthifyService } from '@/services/healthifyService';

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
      likedRecipes: likedRecipes.map((feedback: any) => ({
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
      dislikedRecipes: dislikedRecipes.map((feedback: any) => ({
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
      savedRecipes: savedRecipes.map((saved: any) => ({
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
      consumedRecipes: consumedRecipes.map((meal: any) => ({
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

  async generateRecipe(req: Request, res: Response) {
    try {
      const userId = 'temp-user-id';
      const body = req.body || {};
      const { preferredCuisines, maxCookTime, macroGoals } = body;

      const userPreferences = await prisma.userPreferences.findFirst({
        where: { userId },
        include: { likedCuisines: true }
      });
      const goals = await prisma.macroGoals.findFirst({ where: { userId } });

      const liked = (userPreferences?.likedCuisines || []).map((c: any) => c.name).filter(Boolean);
      const opts = {
        preferredCuisines: Array.isArray(preferredCuisines) && preferredCuisines.length ? preferredCuisines : liked,
        maxCookTime: typeof maxCookTime === 'number' ? maxCookTime : undefined,
        macroGoals: macroGoals || (goals ? { calories: goals.calories, protein: goals.protein, carbs: goals.carbs, fat: goals.fat } : undefined)
      } as any;

      const { recipeGenerationService } = require('@/services/recipeGenerationService');
      const generated = await recipeGenerationService.generateRecipe(opts);
      if (!generated) {
        return res.status(503).json({ error: 'Recipe generation unavailable' });
      }

      const created = await prisma.recipe.create({
        data: {
          title: generated.title,
          description: generated.description,
          cookTime: generated.cookTime,
          cuisine: generated.cuisine,
          calories: generated.calories,
          protein: generated.protein,
          carbs: generated.carbs,
          fat: generated.fat,
          imageUrl: generated.imageUrl || null,
          userId,
          isUserCreated: true,
          ingredients: {
            create: (generated.ingredients || []).map((ing: any, i: number) => ({ text: String(ing.text), order: i + 1 }))
          },
          instructions: {
            create: (generated.instructions || []).map((step: any, i: number) => ({ text: String(step.text), step: i + 1 }))
          }
        },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        }
      });

      res.status(201).json(created);
    } catch (error: any) {
      console.error('❌ Error generating recipe:', error);
      res.status(500).json({ error: 'Failed to generate recipe' });
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
      
      // GUIDELINE #2: Trigger Unsplash download event when recipe is viewed
      if (recipe.unsplashDownloadLocation) {
        const { imageService } = await import('../../services/imageService');
        imageService.triggerDownload(recipe.unsplashDownloadLocation).catch(err => {
          console.error('⚠️  Failed to trigger Unsplash download:', err);
        });
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
        difficulty,
        includeAI
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
        isUserCreated: false, // Only system recipes for now
      };
      
      // Include AI-generated recipes by default (they're already in the database)
      // The includeAI parameter is available for future use (e.g., to force fresh generation)
      // All recipes (database + AI) are included in suggestions
      
      // Filter by cuisines
      if (cuisines && typeof cuisines === 'string') {
        const cuisineArray = cuisines.split(',').map(c => c.trim());
        where.cuisine = {
          in: cuisineArray
        };
      }
      
      if (maxCookTime && !isNaN(Number(maxCookTime))) {
        where.cookTime = {
          lte: Number(maxCookTime)
        };
      }
      if (difficulty && typeof difficulty === 'string') {
        const diff = String(difficulty).toLowerCase();
        const cookTimeFilter: any = where.cookTime ? { ...where.cookTime } : {};
        if (diff === 'easy') {
          cookTimeFilter.lte = Math.min(cookTimeFilter.lte ?? Number.MAX_SAFE_INTEGER, 30);
        } else if (diff === 'medium') {
          cookTimeFilter.gte = Math.max(cookTimeFilter.gte ?? 0, 31);
          cookTimeFilter.lte = Math.min(cookTimeFilter.lte ?? Number.MAX_SAFE_INTEGER, 45);
        } else if (diff === 'hard') {
          cookTimeFilter.gte = Math.max(cookTimeFilter.gte ?? 0, 46);
        }
        if (Object.keys(cookTimeFilter).length > 0) where.cookTime = cookTimeFilter;
      }
      
      console.log('🔍 Querying database for recipes with filters...');
      console.log('🔍 Where clause:', JSON.stringify(where, null, 2));
      
      // Get offset/rotation parameter for pagination (to get different recipes on reload)
      const offset = parseInt(req.query.offset as string) || 0;
      const recipesPerPage = 50; // Get more recipes to score and sort for variety
      
      // Get filtered recipes from database
      const allRecipes = await prisma.recipe.findMany({
        where,
        take: recipesPerPage,
        skip: offset * 10, // Skip by batches of 10 to get different recipes
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
      let temporalContext = getCurrentTemporalContext();
      const seasonOverride = typeof req.query.season === 'string' ? (req.query.season as string).toLowerCase() : undefined;
      if (seasonOverride && ['spring','summer','fall','winter'].includes(seasonOverride)) {
        temporalContext = { ...temporalContext, season: seasonOverride };
      }
      
      // Analyze user's temporal patterns from meal history
      const userTemporalPatterns = analyzeUserTemporalPatterns(userBehavior.consumedRecipes);
      
      // Import scoring functions
      const { calculateRecipeScore } = require('@/utils/scoring');
      const { calculateBehavioralScore } = require('@/utils/behavioralScoring');
      const { calculateEnhancedScore } = require('@/utils/enhancedScoring');
      const { calculateDiscriminatoryScore, getUserPreferencesForScoring } = require('../../utils/discriminatoryScoring');
      const { calculateExternalScore, calculateHybridScore } = require('@/utils/externalScoring');
      
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
      const likedCuisineSet = new Set((userPreferences?.likedCuisines || []).map((c: any) => (c.name || '').toLowerCase()));
      
      // Calculate scores for each recipe
      const recipesWithScores = allRecipes.map((recipe: any) => {
        try {
          // Calculate behavioral score
          const behavioralScore = calculateBehavioralScore(recipe, userBehavior);
          
          // Calculate temporal score
          const temporalScore = calculateTemporalScore(recipe, temporalContext, userTemporalPatterns);
          
          // Calculate enhanced score
          const enhancedScore = calculateEnhancedScore(recipe, cookTimeContext, userKitchenProfile);
          
          // Calculate discriminatory score (preference-based scoring)
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
          
          // Calculate external score (Phase 5 - quality and popularity from Spoonacular)
          const externalScore = calculateExternalScore(recipe);
          
          // Calculate overall score with all factors
          const baseScore = calculateRecipeScore(recipe, userPreferences, macroGoals, behavioralScore.total, temporalScore.total);
          
          // Internal score combines all internal algorithms
          const internalScore = Math.round(
            discriminatoryScore.total * 0.7 + 
            baseScore.total * 0.3
          );
          
          // Final hybrid score blends internal and external data
          const finalScore = calculateHybridScore(
            internalScore,
            externalScore.total,
            externalScore.hasExternalData
          );
          const isLikedCuisine = likedCuisineSet.has((recipe.cuisine || '').toLowerCase());
          const cuisineBoost = isLikedCuisine ? 12 : 0;
          const hasImage = !!recipe.imageUrl;
          const ingredientCount = Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0;
          const instructionCount = Array.isArray(recipe.instructions) ? recipe.instructions.length : 0;
          let qualityBoost = 0;
          if (hasImage) qualityBoost += 2;
          if (ingredientCount >= 5) qualityBoost += 1;
          if (instructionCount >= 4) qualityBoost += 2;
          const finalScoreWeighted = Math.min(100, finalScore + cuisineBoost + qualityBoost);
          
          return {
        ...recipe,
        score: {
              total: finalScoreWeighted,
              matchPercentage: finalScoreWeighted,
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
              externalScore: externalScore.total,
              externalBreakdown: externalScore.breakdown,
              hasExternalData: externalScore.hasExternalData,
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

        recipesWithScores.sort((a: any, b: any) => b.score.total - a.score.total);
        const limit = 10;
        const perCuisineCap = 3;
        const selected: any[] = [];
        const cuisineCounts = new Map<string, number>();
        const seenIds = new Set<string>(); // Track seen recipe IDs to prevent duplicates
        
        // Add some randomization: shuffle the top 30 scored recipes before selecting
        // This ensures variety on reload while still prioritizing high-scored recipes
        const shuffledRecipes = [...recipesWithScores]
          .sort((a, b) => (b.score?.total || 0) - (a.score?.total || 0))
          .slice(0, 30) // Take top 30
          .sort(() => Math.random() - 0.5); // Shuffle them
        
        for (const r of shuffledRecipes) {
          // Skip if we've already added this recipe
          if (seenIds.has(r.id)) {
            console.log(`🔁 Skipping duplicate recipe: ${r.title} (ID: ${r.id})`);
            continue;
          }
          
          const c = (r.cuisine || 'Unknown');
          const count = cuisineCounts.get(c) || 0;
          if (count < perCuisineCap) {
            selected.push(r);
            cuisineCounts.set(c, count + 1);
            seenIds.add(r.id); // Mark this recipe ID as seen
            if (selected.length >= limit) break;
          }
        }
        // If we still need more recipes, add remaining ones from shuffled list (ensuring no duplicates)
        if (selected.length < limit) {
          for (const r of shuffledRecipes) {
            if (!seenIds.has(r.id)) {
              selected.push(r);
              seenIds.add(r.id);
              if (selected.length >= limit) break;
            }
          }
        }
        const topRecipes = selected.slice(0, limit);

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
      const { collectionId } = req.query as { collectionId?: string };
      
      // Support multiple collection IDs via comma-separated list
      const collectionIds = collectionId
        ? (collectionId as string).split(',').filter(Boolean)
        : [];

      let savedRecipes;
      
      if (collectionIds.length > 0) {
        // Filter by collections using join table
        const savedRecipeIds = await (prisma as any).recipeCollection.findMany({
          where: { collectionId: { in: collectionIds } },
          select: { savedRecipeId: true }
        });
        
        const uniqueSavedRecipeIds = [...new Set(savedRecipeIds.map((rc: any) => String(rc.savedRecipeId)))] as string[];
        
        savedRecipes = await (prisma as any).savedRecipe.findMany({
          where: { 
            userId,
            id: { in: uniqueSavedRecipeIds }
          },
        include: {
          recipe: {
            include: {
              ingredients: { orderBy: { order: 'asc' } },
              instructions: { orderBy: { step: 'asc' } }
            }
            },
            recipeCollections: {
              include: { collection: true }
          }
        },
        orderBy: { savedDate: 'desc' }
      });
      } else {
        // Get all saved recipes (All collection)
        savedRecipes = await (prisma as any).savedRecipe.findMany({
        where: { userId },
        include: {
          recipe: {
            include: {
              ingredients: { orderBy: { order: 'asc' } },
              instructions: { orderBy: { step: 'asc' } }
            }
            },
            recipeCollections: {
              include: { collection: true }
          }
        },
        orderBy: { savedDate: 'desc' }
      });
      }

      console.log(`📚 Found ${savedRecipes.length} saved recipes`);
      res.json(savedRecipes.map((saved: any) => ({
        ...saved.recipe,
        savedDate: saved.savedDate.toISOString().split('T')[0],
        collections: (saved.recipeCollections || []).map((rc: any) => rc.collection)
      })));
    } catch (error: any) {
      console.error('❌ Get saved recipes error:', error);
      res.status(500).json({ error: 'Failed to fetch saved recipes' });
    }
  },

  // Get liked recipes
  async getLikedRecipes(req: Request, res: Response) {
    try {
      console.log('👍 GET /api/recipes/liked called');
      const userId = 'temp-user-id';
      const { collectionId } = req.query;
      
      // Get all liked recipes
      const feedbackEntries = await prisma.recipeFeedback.findMany({
        where: { 
          userId,
          liked: true
        },
        include: {
          recipe: {
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log(`👍 Found ${feedbackEntries.length} liked recipes`);
      
      let recipes = feedbackEntries.map((entry: any) => ({
        ...entry.recipe,
        savedDate: entry.createdAt.toISOString().split('T')[0],
        likedDate: entry.createdAt.toISOString().split('T')[0],
        isLiked: true
      }));

      // Filter by collection if specified
      if (collectionId) {
        const collectionIds = typeof collectionId === 'string' 
          ? collectionId.split(',').map(id => id.trim())
          : Array.isArray(collectionId)
          ? collectionId.map(id => String(id).trim())
          : [String(collectionId).trim()];
        
        console.log(`📁 Filtering liked recipes by collections: ${collectionIds.join(', ')}`);
        
        // Get recipe IDs that are in the specified collections
        const savedRecipesInCollections = await (prisma as any).recipeCollection.findMany({
        where: {
            collectionId: { in: collectionIds },
            savedRecipe: {
            userId
          }
          },
          include: {
            savedRecipe: true
          }
        });

        const recipeIdsInCollections = new Set(
          savedRecipesInCollections.map((rc: any) => rc.savedRecipe.recipeId)
        );

        // Filter to only recipes that are both liked AND in the specified collections
        recipes = recipes.filter((recipe: any) => recipeIdsInCollections.has(recipe.id));
        
        console.log(`📁 Found ${recipes.length} liked recipes in specified collections`);
      }

      res.json(recipes);
    } catch (error: any) {
      console.error('❌ Get liked recipes error:', error);
      res.status(500).json({ error: 'Failed to fetch liked recipes' });
    }
  },

  // Get disliked recipes
  async getDislikedRecipes(req: Request, res: Response) {
    try {
      console.log('👎 GET /api/recipes/disliked called');
      const userId = 'temp-user-id';
      const { collectionId } = req.query;
      
      // Get all disliked recipes
      const feedbackEntries = await prisma.recipeFeedback.findMany({
        where: { 
          userId,
          disliked: true
        },
        include: {
          recipe: {
            include: {
              ingredients: { orderBy: { order: 'asc' } },
              instructions: { orderBy: { step: 'asc' } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log(`👎 Found ${feedbackEntries.length} disliked recipes`);
      
      let recipes = feedbackEntries.map((entry: any) => ({
        ...entry.recipe,
        dislikedDate: entry.createdAt.toISOString().split('T')[0],
        isDisliked: true
      }));

      // Filter by collection if specified
      if (collectionId) {
        const collectionIds = typeof collectionId === 'string' 
          ? collectionId.split(',').map(id => id.trim())
          : Array.isArray(collectionId)
          ? collectionId.map(id => String(id).trim())
          : [String(collectionId).trim()];
        
        console.log(`📁 Filtering disliked recipes by collections: ${collectionIds.join(', ')}`);
        
        // Get recipe IDs that are in the specified collections
        const savedRecipesInCollections = await (prisma as any).recipeCollection.findMany({
          where: {
            collectionId: { in: collectionIds },
            savedRecipe: {
              userId
            }
          },
          include: {
            savedRecipe: true
          }
        });

        const recipeIdsInCollections = new Set(
          savedRecipesInCollections.map((rc: any) => rc.savedRecipe.recipeId)
        );

        // Filter to only recipes that are both disliked AND in the specified collections
        recipes = recipes.filter((recipe: any) => recipeIdsInCollections.has(recipe.id));
        
        console.log(`📁 Found ${recipes.length} disliked recipes in specified collections`);
      }

      res.json(recipes);
    } catch (error: any) {
      console.error('❌ Get disliked recipes error:', error);
      res.status(500).json({ error: 'Failed to fetch disliked recipes' });
    }
  },

  // Save recipe
  async saveRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = 'temp-user-id';
      const { collectionIds } = req.body as { collectionIds?: string[] };
      
      console.log('💾 Save recipe request:', { recipeId: id, collectionIds });
      
      // Verify recipe exists
      const recipe = await prisma.recipe.findUnique({
        where: { id }
      });
      
      if (!recipe) {
        console.error('❌ Recipe not found:', id);
        return res.status(404).json({ error: 'Recipe not found' });
      }
      
      // Get or create SavedRecipe
      let savedRecipe = await prisma.savedRecipe.findFirst({
        where: { userId, recipeId: id }
      });

      if (savedRecipe) {
        console.log('⚠️  Recipe already saved:', savedRecipe.id);
        return res.status(409).json({ error: 'Recipe already saved' });
      }

      // Create SavedRecipe
      savedRecipe = await prisma.savedRecipe.create({
        data: { userId, recipeId: id }
      });
      console.log('✅ SavedRecipe created:', savedRecipe.id);

      // Add to selected collections (multi-collection support)
      if (collectionIds && Array.isArray(collectionIds) && collectionIds.length > 0) {
        console.log('📁 Adding to collections:', collectionIds);
        
        // Validate that collections exist
        const existingCollections = await (prisma as any).collection.findMany({
        where: {
            id: { in: collectionIds },
            userId
          },
          select: { id: true }
        });
        
        const validCollectionIds = existingCollections.map((c: any) => c.id);
        const invalidIds = collectionIds.filter(id => !validCollectionIds.includes(id));
        
        if (invalidIds.length > 0) {
          console.warn('⚠️  Invalid collection IDs:', invalidIds);
        }
        
        if (validCollectionIds.length > 0) {
          // Access recipeCollection model (camelCase from Prisma client)
          // Create each association individually to handle duplicates gracefully
          const created = [];
          for (const collectionId of validCollectionIds) {
            try {
              await (prisma as any).recipeCollection.create({
                data: {
                  savedRecipeId: savedRecipe!.id,
                  collectionId,
                  addedAt: new Date()
                }
              });
              created.push(collectionId);
            } catch (error: any) {
              // Skip duplicates (unique constraint violation)
              if (error.code === 'P2002') {
                console.log(`⏭️  Skipping duplicate: recipe ${savedRecipe!.id} -> collection ${collectionId}`);
              } else {
                throw error;
              }
            }
          }
          console.log('✅ Added to collections:', created);
        }
      }

      console.log('✅ Recipe saved successfully');
      res.json({ message: 'Recipe saved successfully' });
    } catch (error: any) {
      console.error('❌ Save recipe error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta
      });
      res.status(500).json({ 
        error: 'Failed to save recipe',
        message: error.message,
        details: error.meta
      });
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

  // Collections: list
  async getCollections(req: Request, res: Response) {
    try {
      const userId = 'temp-user-id';
      const collections = await (prisma as any).collection.findMany({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }]
      });
      res.json({ success: true, data: collections });
    } catch (error: any) {
      console.error('❌ Get collections error:', error);
      res.status(500).json({ error: 'Failed to fetch collections' });
    }
  },

  // Collections: create
  async createCollection(req: Request, res: Response) {
    try {
      const userId = 'temp-user-id';
      const { name } = req.body as { name: string };
      if (!name) return res.status(400).json({ error: 'Name is required' });
      const collection = await (prisma as any).collection.create({ data: { userId, name, isDefault: false } });
      res.json({ success: true, data: collection });
    } catch (error: any) {
      console.error('❌ Create collection error:', error);
      // Handle unique constraint on (userId, name)
      if (error?.code === 'P2002') {
        return res.status(409).json({ error: 'Collection already exists' });
      }
      res.status(500).json({ error: 'Failed to create collection' });
    }
  },

  // Collections: update
  async updateCollection(req: Request, res: Response) {
    try {
      const userId = 'temp-user-id';
      const { id } = req.params;
      const { name } = req.body as { name?: string };
      const updated = await (prisma as any).collection.update({ where: { id }, data: { name } });
      res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('❌ Update collection error:', error);
      res.status(500).json({ error: 'Failed to update collection' });
    }
  },

  // Collections: delete (remove all recipe-collection associations)
  async deleteCollection(req: Request, res: Response) {
    try {
      const userId = 'temp-user-id';
      const { id } = req.params;
      const collection = await (prisma as any).collection.findUnique({ where: { id } });
      if (!collection) return res.status(404).json({ error: 'Collection not found' });
      
      // Delete all RecipeCollection entries for this collection
      await (prisma as any).recipeCollection.deleteMany({
        where: { collectionId: id }
      });
      
      await (prisma as any).collection.delete({ where: { id } });
      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ Delete collection error:', error);
      res.status(500).json({ error: 'Failed to delete collection' });
    }
  },

  // Add/remove recipe from collections (multi-collection support)
  async moveSavedRecipe(req: Request, res: Response) {
    try {
      const userId = 'temp-user-id';
      const { id } = req.params; // recipeId
      const { collectionIds } = req.body as { collectionIds: string[] };
      const saved = await prisma.savedRecipe.findFirst({ where: { userId, recipeId: id } });
      if (!saved) return res.status(404).json({ error: 'Saved recipe not found' });
      
      // Remove all existing associations
      await (prisma as any).recipeCollection.deleteMany({
        where: { savedRecipeId: saved.id }
      });
      
      // Add to new collections
      if (collectionIds && Array.isArray(collectionIds) && collectionIds.length > 0) {
        // Create each association individually to handle duplicates gracefully
        for (const collectionId of collectionIds) {
          try {
            await (prisma as any).recipeCollection.create({
              data: {
                savedRecipeId: saved.id,
                collectionId,
                addedAt: new Date()
              }
            });
          } catch (error: any) {
            // Skip duplicates (unique constraint violation)
            if (error.code !== 'P2002') {
              throw error;
            }
          }
        }
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ Move saved recipe error:', error);
      res.status(500).json({ error: 'Failed to move recipe to collection' });
    }
  },

  // Create user recipe
  async createRecipe(req: Request, res: Response) {
    try {
      const userId = 'temp-user-id';
      const data = req.body || {};

      // Normalize ingredients to text + order
      const ingredientsInput: any[] = Array.isArray(data.ingredients) ? data.ingredients : [];
      const ingredientsCreate = ingredientsInput.map((ing: any, index: number) => {
        if (typeof ing === 'string') return { text: ing, order: index + 1 };
        if (ing && typeof ing === 'object') {
          if ('text' in ing) return { text: String(ing.text), order: index + 1 };
          const amount = ing.amount ? String(ing.amount) : '';
          const unit = ing.unit ? String(ing.unit) : '';
          const name = ing.name ? String(ing.name) : '';
          const combined = `${amount}${unit ? ' ' + unit : ''} ${name}`.trim();
          return { text: combined, order: index + 1 };
        }
        return { text: String(ing), order: index + 1 };
      });

      // Normalize instructions to text + step
      const instructionsInput: any[] = Array.isArray(data.instructions) ? data.instructions : [];
      const instructionsNormalized = instructionsInput.map((inst: any, index: number) => {
        if (typeof inst === 'string') return { step: index + 1, text: inst };
        if (inst && typeof inst === 'object') {
          const text = 'text' in inst ? inst.text : ('instruction' in inst ? inst.instruction : String(inst));
          const step = Number(inst.step) || index + 1;
          return { step, text: String(text) };
        }
        return { step: index + 1, text: String(inst) };
      });

      const created = await prisma.recipe.create({
        data: {
          userId,
          isUserCreated: true,
          source: 'user-created',
          title: String(data.title || 'Untitled Recipe'),
          description: String(data.description || ''),
          cookTime: Number(data.cookTime || 0),
          cuisine: String(data.cuisine || 'General'),
          difficulty: String(data.difficulty || 'medium'),
          servings: Number(data.servings || 1),
          calories: Number(data.calories || 0),
          protein: Number(data.protein || 0),
          carbs: Number(data.carbs || 0),
          fat: Number(data.fat || 0),
          fiber: data.fiber != null ? Number(data.fiber) : null,
          imageUrl: data.imageUrl ? String(data.imageUrl) : null,
          ingredients: { create: ingredientsCreate },
        },
        include: { ingredients: true }
      });

      // Create instructions after to avoid nested create constraints
      const createdInstructions = await Promise.all(
        instructionsNormalized.map((inst) => prisma.recipeInstruction.create({ data: { ...inst, recipeId: created.id } }))
      );

      // Auto-save user-created recipe to cookbook (uncategorized)
      const savedRecipe = await prisma.savedRecipe.create({
        data: { 
          userId, 
          recipeId: created.id,
          savedDate: new Date() // Explicitly set savedDate
        }
      });
      console.log('✅ Auto-saved user-created recipe to cookbook:', savedRecipe.id);

      // Add to selected collections (multi-collection support)
      const { collectionIds } = data as { collectionIds?: string[] };
      if (collectionIds && Array.isArray(collectionIds) && collectionIds.length > 0) {
        // Create each association individually to handle duplicates gracefully
        for (const collectionId of collectionIds) {
          try {
            await (prisma as any).recipeCollection.create({
              data: {
                savedRecipeId: savedRecipe.id,
                collectionId,
                addedAt: new Date()
              }
            });
          } catch (error: any) {
            // Skip duplicates (unique constraint violation)
            if (error.code !== 'P2002') {
              throw error;
            }
          }
        }
      }

      const full = await prisma.recipe.findUnique({
        where: { id: created.id },
        include: { ingredients: true, instructions: true }
      });

      res.json({ success: true, data: full });
    } catch (error: any) {
      console.error('❌ Create recipe error:', error);
      res.status(500).json({ error: 'Failed to create recipe' });
    }
  },

  // Update user recipe
  async updateRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body || {};

      // Update core fields
      await prisma.recipe.update({
        where: { id },
        data: {
          title: data.title != null ? String(data.title) : undefined,
          description: data.description != null ? String(data.description) : undefined,
          cookTime: data.cookTime != null ? Number(data.cookTime) : undefined,
          cuisine: data.cuisine != null ? String(data.cuisine) : undefined,
          difficulty: data.difficulty != null ? String(data.difficulty) : undefined,
          servings: data.servings != null ? Number(data.servings) : undefined,
          calories: data.calories != null ? Number(data.calories) : undefined,
          protein: data.protein != null ? Number(data.protein) : undefined,
          carbs: data.carbs != null ? Number(data.carbs) : undefined,
          fat: data.fat != null ? Number(data.fat) : undefined,
          fiber: data.fiber != null ? Number(data.fiber) : undefined,
          imageUrl: data.imageUrl != null ? String(data.imageUrl) : undefined,
        }
      });

      // Optionally replace ingredients
      if (Array.isArray(data.ingredients)) {
        await prisma.recipeIngredient.deleteMany({ where: { recipeId: id } });
        const ingredientsCreate = data.ingredients.map((ing: any, index: number) => {
          if (typeof ing === 'string') return { text: ing, order: index + 1, recipeId: id };
          if (ing && typeof ing === 'object') {
            if ('text' in ing) return { text: String(ing.text), order: index + 1, recipeId: id };
            const amount = ing.amount ? String(ing.amount) : '';
            const unit = ing.unit ? String(ing.unit) : '';
            const name = ing.name ? String(ing.name) : '';
            const combined = `${amount}${unit ? ' ' + unit : ''} ${name}`.trim();
            return { text: combined, order: index + 1, recipeId: id };
          }
          return { text: String(ing), order: index + 1, recipeId: id };
        });
        await prisma.recipeIngredient.createMany({ data: ingredientsCreate });
      }

      // Optionally replace instructions
      if (Array.isArray(data.instructions)) {
        await prisma.recipeInstruction.deleteMany({ where: { recipeId: id } });
        const instructionsCreate = data.instructions.map((inst: any, index: number) => {
          if (typeof inst === 'string') return { step: index + 1, text: inst, recipeId: id };
          if (inst && typeof inst === 'object') {
            const text = 'text' in inst ? inst.text : ('instruction' in inst ? inst.instruction : String(inst));
            const step = Number(inst.step) || index + 1;
            return { step, text: String(text), recipeId: id };
          }
          return { step: index + 1, text: String(inst), recipeId: id };
        });
        await prisma.recipeInstruction.createMany({ data: instructionsCreate });
      }

      const full = await prisma.recipe.findUnique({
        where: { id },
        include: { ingredients: true, instructions: true }
      });

      res.json({ success: true, data: full });
    } catch (error: any) {
      console.error('❌ Update recipe error:', error);
      res.status(500).json({ error: 'Failed to update recipe' });
    }
  },

  // Delete recipe
  async deleteRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.recipeInstruction.deleteMany({ where: { recipeId: id } });
      await prisma.recipeIngredient.deleteMany({ where: { recipeId: id } });
      await prisma.savedRecipe.deleteMany({ where: { recipeId: id } });
      await prisma.recipe.delete({ where: { id } });
      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ Delete recipe error:', error);
      res.status(500).json({ error: 'Failed to delete recipe' });
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
  },

  // Enrich a single recipe with external data from Spoonacular
  async enrichRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      console.log(`🔍 Enriching recipe: ${id}`);
      
      const recipe = await prisma.recipe.findUnique({ 
        where: { id }
      });
      
      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
      
      const { spoonacularService } = require('@/services/spoonacularService');
      const { aiEnrichmentService } = require('@/services/aiEnrichmentService');

      console.log(`📊 Fetching external data for: "${recipe.title}"`);
      let externalData = null as any;
      if (spoonacularService.isConfigured()) {
        externalData = await spoonacularService.enrichRecipeData(recipe.title);
      }
      if (!externalData && aiEnrichmentService.isConfigured()) {
        externalData = await aiEnrichmentService.enrichRecipeData(recipe);
      }
      
      if (!externalData) {
        const hasImage = !!recipe.imageUrl;
        const ingredientCount = Array.isArray((recipe as any).ingredients) ? (recipe as any).ingredients.length : 0;
        const instructionCount = Array.isArray((recipe as any).instructions) ? (recipe as any).instructions.length : 0;
        const q = Math.min(100, Math.max(0, 50 + (hasImage ? 10 : 0) + (ingredientCount >= 5 ? 5 : 0) + (instructionCount >= 4 ? 5 : 0)));
        const pop = Math.min(100, Math.max(0, 40 + (hasImage ? 10 : 0)));
        const health = Math.min(100, Math.max(0, 80 - Math.max(0, recipe.calories - 450) / 4 + Math.max(0, recipe.protein - 20) * 1.2 - Math.max(0, recipe.fat - 15) * 1));
        externalData = {
          externalId: `local:${recipe.id}`,
          externalSource: 'local',
          qualityScore: Math.round(q),
          popularityScore: Math.round(pop),
          healthScore: Math.round(health),
          aggregateLikes: 0,
          spoonacularScore: null,
          pricePerServing: 3.5,
          sourceUrl: null,
          sourceName: 'Local'
        };
      }

      // Update recipe with external data
      const updatedRecipe = await prisma.recipe.update({
        where: { id },
        data: {
          externalId: externalData.externalId,
          externalSource: externalData.externalSource,
          qualityScore: externalData.qualityScore,
          popularityScore: externalData.popularityScore,
          healthScore: externalData.healthScore,
          aggregateLikes: externalData.aggregateLikes,
          spoonacularScore: externalData.spoonacularScore,
          pricePerServing: externalData.pricePerServing,
          sourceUrl: externalData.sourceUrl,
          sourceName: externalData.sourceName,
          lastEnriched: new Date()
        }
      });

      console.log('✅ Recipe enriched successfully');
      res.json({
        message: 'Recipe enriched successfully',
        recipe: updatedRecipe,
        externalData
      });
    } catch (error: any) {
      console.error('❌ Error enriching recipe:', error);
      res.status(500).json({ error: 'Failed to enrich recipe', details: error.message });
    }
  },

  // Batch enrich all recipes (or a subset)
  async batchEnrichRecipes(req: Request, res: Response) {
    try {
      const { limit = 10, onlyUnenriched = true } = req.query;
      console.log(`🔄 Starting batch enrichment (limit: ${limit}, onlyUnenriched: ${onlyUnenriched})`);
      
      const { spoonacularService } = require('@/services/spoonacularService');
      const { aiEnrichmentService } = require('@/services/aiEnrichmentService');

      // Build query filter
      const where: any = { isUserCreated: false };
      if (onlyUnenriched === 'true' || onlyUnenriched === true) {
        where.externalId = null;
      }

      const recipes = await prisma.recipe.findMany({
        where,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' }
      });

      console.log(`📊 Found ${recipes.length} recipes to enrich`);

      const results = {
        total: recipes.length,
        enriched: 0,
        failed: 0,
        skipped: 0,
        details: [] as any[]
      };

      for (const recipe of recipes) {
        try {
          console.log(`🔍 Processing: "${recipe.title}"`);
          
          let externalData = null as any;
          if (spoonacularService.isConfigured()) {
            externalData = await spoonacularService.enrichRecipeData(recipe.title);
          }
          if (!externalData && aiEnrichmentService.isConfigured()) {
            externalData = await aiEnrichmentService.enrichRecipeData(recipe);
          }
          
          if (externalData) {
            await prisma.recipe.update({
              where: { id: recipe.id },
              data: {
                externalId: externalData.externalId,
                externalSource: externalData.externalSource,
                qualityScore: externalData.qualityScore,
                popularityScore: externalData.popularityScore,
                healthScore: externalData.healthScore,
                aggregateLikes: externalData.aggregateLikes,
                spoonacularScore: externalData.spoonacularScore,
                pricePerServing: externalData.pricePerServing,
                sourceUrl: externalData.sourceUrl,
                sourceName: externalData.sourceName,
                lastEnriched: new Date()
              }
            });
            
            results.enriched++;
            results.details.push({
              recipeId: recipe.id,
              title: recipe.title,
              status: 'enriched',
              externalData
            });
            
            console.log(`✅ Enriched: "${recipe.title}"`);
    } else {
            const hasImage = !!recipe.imageUrl;
            const ingredientCount = Array.isArray((recipe as any).ingredients) ? (recipe as any).ingredients.length : 0;
            const instructionCount = Array.isArray((recipe as any).instructions) ? (recipe as any).instructions.length : 0;
            const q = Math.min(100, Math.max(0, 50 + (hasImage ? 10 : 0) + (ingredientCount >= 5 ? 5 : 0) + (instructionCount >= 4 ? 5 : 0)));
            const pop = Math.min(100, Math.max(0, 40 + (hasImage ? 10 : 0)));
            const health = Math.min(100, Math.max(0, 80 - Math.max(0, recipe.calories - 450) / 4 + Math.max(0, recipe.protein - 20) * 1.2 - Math.max(0, recipe.fat - 15) * 1));
            const synthetic = {
              externalId: `local:${recipe.id}`,
              externalSource: 'local',
              qualityScore: Math.round(q),
              popularityScore: Math.round(pop),
              healthScore: Math.round(health),
              aggregateLikes: 0,
              spoonacularScore: null,
              pricePerServing: 3.5,
              sourceUrl: null,
              sourceName: 'Local'
            };
            await prisma.recipe.update({
              where: { id: recipe.id },
        data: {
                externalId: synthetic.externalId,
                externalSource: synthetic.externalSource,
                qualityScore: synthetic.qualityScore,
                popularityScore: synthetic.popularityScore,
                healthScore: synthetic.healthScore,
                aggregateLikes: synthetic.aggregateLikes,
                spoonacularScore: synthetic.spoonacularScore,
                pricePerServing: synthetic.pricePerServing,
                sourceUrl: synthetic.sourceUrl,
                sourceName: synthetic.sourceName,
                lastEnriched: new Date()
              }
            });
            results.enriched++;
            results.details.push({
              recipeId: recipe.id,
              title: recipe.title,
              status: 'local_fallback'
            });
            console.log(`✅ Locally enriched: "${recipe.title}"`);
          }
          
          // Delay to respect API rate limits (150 requests per minute for free tier)
          await new Promise(resolve => setTimeout(resolve, 400));
          
        } catch (error: any) {
          results.failed++;
          results.details.push({
            recipeId: recipe.id,
            title: recipe.title,
            status: 'failed',
            error: error.message
          });
          
          console.error(`❌ Failed to enrich "${recipe.title}":`, error.message);
        }
      }

      console.log(`✅ Batch enrichment complete:`, results);
      res.json({
        message: 'Batch enrichment complete',
        results
      });
    } catch (error: any) {
      console.error('❌ Error in batch enrichment:', error);
      res.status(500).json({ error: 'Failed to batch enrich recipes', details: error.message });
    }
  },

  // Get enrichment status
  async getEnrichmentStatus(req: Request, res: Response) {
    try {
      const totalRecipes = await prisma.recipe.count({
        where: { isUserCreated: false }
      });
      
      const enrichedRecipes = await prisma.recipe.count({
        where: { 
          isUserCreated: false,
          externalId: { not: null }
        }
      });

      const recentlyEnriched = await prisma.recipe.findMany({
        where: {
          isUserCreated: false,
          externalId: { not: null }
        },
        orderBy: { lastEnriched: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          externalSource: true,
          qualityScore: true,
          popularityScore: true,
          healthScore: true,
          lastEnriched: true
        }
      });

      res.json({
        total: totalRecipes,
        enriched: enrichedRecipes,
        unenriched: totalRecipes - enrichedRecipes,
        enrichmentPercentage: totalRecipes > 0 ? Math.round((enrichedRecipes / totalRecipes) * 100) : 0,
        recentlyEnriched
      });
    } catch (error: any) {
      console.error('❌ Error getting enrichment status:', error);
      res.status(500).json({ error: 'Failed to get enrichment status' });
    }
  },

  // Healthify recipe - transform to healthier version
  async healthifyRecipe(req: Request, res: Response) {
    try {
      console.log('💚 POST /api/recipes/:id/healthify called');
      const { id } = req.params;
      const userId = 'temp-user-id'; // TODO: Replace with actual auth
      
      // Fetch the original recipe
      const recipe = await prisma.recipe.findUnique({ 
        where: { id },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } },
        },
      });
      
      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
      
      // Fetch user preferences for healthify optimization
      const [preferences, macroGoals, physicalProfile] = await Promise.all([
        prisma.userPreferences.findUnique({
          where: { userId },
          include: {
            dietaryRestrictions: true,
            bannedIngredients: true,
          },
        }),
        prisma.macroGoals.findUnique({
          where: { userId },
        }),
        prisma.userPhysicalProfile.findUnique({
          where: { userId },
        }),
      ]);

      // Prepare healthify parameters
      const healthifyParams = {
        originalRecipe: {
          title: recipe.title,
          description: recipe.description || '',
          ingredients: recipe.ingredients.map(ing => ({ text: ing.text })),
          instructions: recipe.instructions.map(inst => ({ text: inst.text })),
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          cookTime: recipe.cookTime,
          cuisine: recipe.cuisine,
        },
        userMacroGoals: macroGoals
          ? {
              calories: macroGoals.calories,
              protein: macroGoals.protein,
              carbs: macroGoals.carbs,
              fat: macroGoals.fat,
            }
          : undefined,
        dietaryRestrictions: preferences?.dietaryRestrictions?.map((dr: any) => dr.name) || [],
        bannedIngredients: preferences?.bannedIngredients?.map((bi: any) => bi.name) || [],
        fitnessGoal: physicalProfile?.fitnessGoal || undefined,
      };

      // Generate healthified recipe
      const healthifiedRecipe = await healthifyService.healthifyRecipe(healthifyParams);

      console.log('✅ Recipe healthified successfully:', healthifiedRecipe.title);

      res.json({
        success: true,
        recipe: healthifiedRecipe,
      });
    } catch (error: any) {
      console.error('❌ Healthify recipe error:', error);
      
      // Check if it's a quota/billing error
      const isQuotaError = error.code === 'insufficient_quota' || 
                          error.status === 429 ||
                          error.message?.includes('quota') ||
                          error.message?.includes('billing');
      
      const statusCode = isQuotaError ? 429 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: isQuotaError ? 'Quota exceeded' : 'Failed to healthify recipe',
        message: error.message,
        code: error.code || (isQuotaError ? 'insufficient_quota' : 'HEALTHIFY_ERROR'),
      });
    }
  },
};
