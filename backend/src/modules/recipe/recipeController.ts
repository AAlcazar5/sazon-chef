// backend/src/modules/recipe/recipeController.simple.ts
import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { healthifyService } from '@/services/healthifyService';
import { getUserId } from '@/utils/authHelper';
import { generateBatchCookingRecommendations } from '@/utils/batchCookingRecommendations';
import { varyImageUrlsForPage } from '@/utils/runtimeImageVariation';

// Note: Request.user type is declared in authMiddleware.ts
// This ensures consistency across the application

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

// Non-blocking search query recording for analytics
async function recordSearchQuery(userId: string, query: string, resultCount: number) {
  try {
    await prisma.searchQuery.create({
      data: { userId, query: query.trim().toLowerCase(), resultCount },
    });
  } catch (error) {
    // Non-blocking — don't fail the search if logging fails
    console.error('⚠️ Failed to record search query:', error);
  }
}

export const recipeController = {
  /**
   * OPTIMIZED: Get recipes with tiered scoring approach
   * Scales to 10,000+ recipes with <500ms response time
   * NEW ENDPOINT - Recommended for production use
   */
  async getRecipesOptimized(req: Request, res: Response) {
    try {
      console.log('⚡ GET /api/recipes/optimized called');
      const userId = getUserId(req);

      const page = Math.max(0, parseInt(req.query.page as string) || 0);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));

      // Optional filters
      const filters = {
        mealType: req.query.mealType as string | undefined,
        maxCookTime: req.query.maxCookTime ? parseInt(req.query.maxCookTime as string) : undefined,
        search: req.query.search as string | undefined,
      };

      // Import optimized helpers
      const {
        getUserPreferencesOptimized,
        getBehavioralDataOptimized,
        fetchRecipesOptimized,
        getCurrentTemporalContext,
      } = require('@/utils/recipeOptimizationHelpers');

      // Get user preferences (fast - from cache if available)
      const prefs = await getUserPreferencesOptimized(userId);

      if (!prefs) {
        return res.status(200).json({
          recipes: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          message: 'Complete onboarding to get personalized recommendations',
        });
      }

      // Fetch and score recipes using tiered approach
      const result = await fetchRecipesOptimized(prefs, {
        limit,
        page,
        filters,
      });

      // Debug: Check imageUrl presence
      const recipesWithImages = result.recipes.filter((r: any) => r.imageUrl);
      if (recipesWithImages.length < result.recipes.length) {
        console.log(`⚠️  ${result.recipes.length - recipesWithImages.length} recipes missing imageUrl out of ${result.recipes.length} total`);
      }

      // Apply runtime image variation for unique images per page
      result.recipes = varyImageUrlsForPage(result.recipes, page * limit);

      // Verify imageUrl is preserved after variation
      const variedWithImages = result.recipes.filter((r: any) => r.imageUrl);
      if (variedWithImages.length < recipesWithImages.length) {
        console.warn(`⚠️  Image variation may have removed imageUrl from ${recipesWithImages.length - variedWithImages.length} recipes`);
      }

      console.log(`✅ Returned ${result.recipes.length} optimized recipes (page ${page + 1}/${result.totalPages})`);

      res.json(result);
    } catch (error: any) {
      console.error('❌ Error in getRecipesOptimized:', error);
      res.status(500).json({
        error: 'Failed to fetch recipes',
        details: error.message,
      });
    }
  },

  // Get all recipes with pagination support
  async getRecipes(req: Request, res: Response) {
    try {
      console.log('🍳 GET /api/recipes called');
      const userId = getUserId(req);
      
      // Pagination parameters
      const page = Math.max(0, parseInt(req.query.page as string) || 0);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
      const offset = page * limit;
      
      // Optional filters - support same filters as getSuggestedRecipes
      const cuisine = req.query.cuisine as string;
      const cuisines = req.query.cuisines as string; // Comma-separated list
      const mealType = req.query.mealType as string;
      const search = req.query.search as string;
      const maxCookTime = req.query.maxCookTime as string;
      const difficulty = req.query.difficulty as string;
      const mealPrepMode = req.query.mealPrepMode as string;

      // Quick macro filters (Home Page 2.0)
      const minProtein = req.query.minProtein as string;
      const maxCarbs = req.query.maxCarbs as string;
      const maxCalories = req.query.maxCalories as string;

      // Discovery mode for pull-to-refresh (Home Page 2.0)
      const shuffle = req.query.shuffle as string;

      // Time-aware defaults (Home Page 2.0)
      const useTimeAwareDefaults = req.query.useTimeAwareDefaults as string;

      // Mood-based recommendations (Home Page 2.0)
      const mood = req.query.mood as string;
      
      // Build where clause
      const where: any = { isUserCreated: false };
      
      // Cuisine filter (support both single and multiple)
      if (cuisines && typeof cuisines === 'string') {
        const cuisineArray = cuisines.split(',').map(c => c.trim());
        where.cuisine = { in: cuisineArray };
      } else if (cuisine) {
        where.cuisine = cuisine;
      }
      
      // Meal type filter
      if (mealType) {
        where.mealType = mealType;
      }
      // If no mealType specified, show all meal types (including snacks and desserts)
      
      // Build AND conditions array to properly combine with search filter
      const andConditions: any[] = [];
      
      // Cook time filter
      if (maxCookTime && !isNaN(Number(maxCookTime))) {
        where.cookTime = { lte: Number(maxCookTime) };
      }
      
      // Difficulty filter (maps to cook time ranges)
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
      
      // Meal prep mode filter
      if (mealPrepMode === 'true' || mealPrepMode === '1') {
        andConditions.push({
          mealPrepScore: { gte: 60 }
        });
      }

      // Quick macro filters (Home Page 2.0)
      if (minProtein && !isNaN(Number(minProtein))) {
        andConditions.push({ protein: { gte: Number(minProtein) } });
      }
      if (maxCarbs && !isNaN(Number(maxCarbs))) {
        andConditions.push({ carbs: { lte: Number(maxCarbs) } });
      }
      if (maxCalories && !isNaN(Number(maxCalories))) {
        andConditions.push({ calories: { lte: Number(maxCalories) } });
      }

      // Time-aware defaults (Home Page 2.0) - auto-apply mealType based on time of day
      if (useTimeAwareDefaults === 'true' && !mealType) {
        const { getCurrentTemporalContext } = require('@/utils/temporalScoring');
        const temporalContext = getCurrentTemporalContext();
        // Map meal period to mealType filter
        const mealTypeMap: Record<string, string> = {
          'breakfast': 'breakfast',
          'lunch': 'lunch',
          'dinner': 'dinner',
          'snack': 'snack'
        };
        const suggestedMealType = mealTypeMap[temporalContext.mealPeriod];
        if (suggestedMealType) {
          where.mealType = suggestedMealType;
        }
      }

      // Mood-based recommendations (Home Page 2.0)
      if (mood) {
        const moodCriteria: Record<string, any> = {
          lazy: { maxCookTime: 20 },
          healthy: { maxCalories: 500, minProtein: 20, healthGrades: ['A', 'B'] },
          adventurous: { cuisines: ['Thai', 'Indian', 'Japanese', 'Korean', 'Vietnamese', 'Ethiopian', 'Moroccan', 'Greek', 'Turkish'] },
          indulgent: { /* No restrictions - comfort food */ },
          comfort: { cuisines: ['American', 'Italian', 'Mexican', 'French', 'Chinese'] },
          energetic: { minProtein: 30, maxCookTime: 30 },
        };

        const criteria = moodCriteria[mood];
        if (criteria) {
          // Apply cook time filter
          if (criteria.maxCookTime && !where.cookTime) {
            where.cookTime = { lte: criteria.maxCookTime };
          }
          // Apply calorie filter
          if (criteria.maxCalories) {
            andConditions.push({ calories: { lte: criteria.maxCalories } });
          }
          // Apply protein filter
          if (criteria.minProtein) {
            andConditions.push({ protein: { gte: criteria.minProtein } });
          }
          // Apply cuisine filter (only if not already filtered)
          if (criteria.cuisines && !where.cuisine) {
            where.cuisine = { in: criteria.cuisines };
          }
          console.log(`🎭 Mood filter applied: ${mood}`, criteria);
        }
      }

      // Search filter - combine with mealType filter using AND
      if (search) {
        andConditions.push({
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        });
      }
      
      // Apply all AND conditions if any exist
      if (andConditions.length > 0) {
        where.AND = andConditions;
      }
      
      // Check if data sharing is enabled for scoring
      const { isDataSharingEnabledFromRequest } = require('@/utils/privacyHelper');
      const dataSharingEnabled = isDataSharingEnabledFromRequest(req);
      
      // Get user preferences, macro goals, and physical profile for scoring (only if data sharing enabled)
      let userPreferences = null;
      let macroGoals = null;
      let physicalProfile = null;
      
      if (dataSharingEnabled) {
        [userPreferences, macroGoals, physicalProfile] = await Promise.all([
          prisma.userPreferences.findFirst({
            where: { userId },
            include: {
              bannedIngredients: true,
              likedCuisines: true,
              dietaryRestrictions: true,
              preferredSuperfoods: true
            }
          }),
          prisma.macroGoals.findFirst({
            where: { userId }
          }),
          prisma.userPhysicalProfile.findFirst({
            where: { userId }
          })
        ]);
      }
      
      // Get user behavioral data for scoring (only if data sharing enabled)
      let userBehavior = null;
      if (dataSharingEnabled) {
        userBehavior = await getUserBehaviorData(userId);
      } else {
        userBehavior = {
          likedRecipes: [],
          dislikedRecipes: [],
          savedRecipes: [],
          consumedRecipes: [],
          recentCuisines: [],
          recentIngredients: [],
          mealHistory: [],
        };
      }
      
      // Get current temporal context
      const { getCurrentTemporalContext, calculateTemporalScore, analyzeUserTemporalPatterns } = require('@/utils/temporalScoring');
      const temporalContext = getCurrentTemporalContext();
      const userTemporalPatterns = analyzeUserTemporalPatterns(userBehavior.consumedRecipes);
      
      // Import scoring functions
      const { calculateRecipeScore } = require('@/utils/scoring');
      const { calculateBehavioralScore } = require('@/utils/behavioralScoring');
      const { calculateEnhancedScore } = require('@/utils/enhancedScoring');
      const { calculateDiscriminatoryScore, getUserPreferencesForScoring } = require('../../utils/discriminatoryScoring');
      const { calculateHealthGoalMatch } = require('@/utils/healthGoalScoring');
      const { calculateHealthGrade } = require('@/utils/healthGrade');
      
      // Create enhanced scoring context
      const cookTimeContext = {
        availableTime: 30,
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
      const likedCuisineSet = new Set((userPreferences?.likedCuisines || []).map((c: any) => (c.name || '').toLowerCase()));
      
      // Use default weights
      const weights = {
        discriminatoryWeight: 0.60,
        baseScoreWeight: 0.25,
        healthGoalWeight: 0.15,
        behavioralWeight: 0.15,
        temporalWeight: 0.10,
        enhancedWeight: 0.10,
      };
      
      // Get total count
      const total = await prisma.recipe.count({ where });
      
      // Fetch all matching recipes (without pagination) so we can score and sort them
      // We'll apply pagination after sorting by match percentage
      const allRawRecipes = await prisma.recipe.findMany({
        where,
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        }
      });

      // Calculate scores for each recipe
      const allRecipesWithScores = await Promise.all(allRawRecipes.map(async (recipe: any) => {
        try {
          // Calculate behavioral score
          let behavioralScore;
          try {
            behavioralScore = calculateBehavioralScore(recipe, userBehavior);
          } catch (error) {
            console.warn('⚠️ Error calculating behavioral score:', error);
            behavioralScore = { total: 0 };
          }
          
          // Calculate temporal score
          let temporalScore;
          try {
            temporalScore = calculateTemporalScore(recipe, temporalContext, userTemporalPatterns);
          } catch (error) {
            console.warn('⚠️ Error calculating temporal score:', error);
            temporalScore = { total: 0 };
          }
          
          // Calculate enhanced score
          let enhancedScore;
          try {
            enhancedScore = calculateEnhancedScore(recipe, cookTimeContext, userKitchenProfile);
          } catch (error) {
            console.warn('⚠️ Error calculating enhanced score:', error);
            enhancedScore = { total: 0 };
          }
          
          // Calculate discriminatory score
          let discriminatoryScore;
          try {
            discriminatoryScore = userPrefsForScoring ? 
              calculateDiscriminatoryScore(recipe, userPrefsForScoring) : 
              { total: 50, breakdown: { cuisineMatch: 50, ingredientPenalty: 0, cookTimeMatch: 50, dietaryMatch: 50, spiceMatch: 50 } };
          } catch (error) {
            console.warn('⚠️ Error calculating discriminatory score:', error);
            discriminatoryScore = { total: 50, breakdown: { cuisineMatch: 50, ingredientPenalty: 0, cookTimeMatch: 50, dietaryMatch: 50, spiceMatch: 50 } };
          }
          
          // Calculate health goal match score
          let healthGoalScore;
          try {
            healthGoalScore = calculateHealthGoalMatch(
              recipe,
              physicalProfile?.fitnessGoal as any || null,
              macroGoals ? {
                calories: macroGoals.calories,
                protein: macroGoals.protein,
                carbs: macroGoals.carbs,
                fat: macroGoals.fat
              } : null
            );
          } catch (error) {
            console.warn('⚠️ Error calculating health goal score:', error);
            healthGoalScore = { total: 50 };
          }
          
          // Calculate health grade
          let healthGrade;
          try {
            healthGrade = calculateHealthGrade(recipe);
          } catch (error) {
            console.warn('⚠️ Error calculating health grade:', error);
            healthGrade = { grade: 'C', score: 50 };
          }
          
          // Calculate base recipe score
          let baseScore;
          try {
            baseScore = calculateRecipeScore(recipe, userPreferences, macroGoals, behavioralScore.total, temporalScore.total);
          } catch (error) {
            console.warn('⚠️ Error calculating base score:', error);
            baseScore = { total: 50, macroScore: 50, tasteScore: 50 };
          }
          
          // Calculate final weighted score
          const internalScore = Math.round(
            discriminatoryScore.total * weights.discriminatoryWeight + 
            baseScore.total * weights.baseScoreWeight +
            healthGoalScore.total * weights.healthGoalWeight
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
          
          const finalScore = Math.round(Math.min(100, internalScore + cuisineBoost + qualityBoost));
          
          return {
            ...recipe,
            score: {
              total: finalScore,
              matchPercentage: finalScore,
              macroScore: baseScore.macroScore,
              tasteScore: baseScore.tasteScore,
              behavioralScore: behavioralScore.total,
              temporalScore: temporalScore.total,
              enhancedScore: enhancedScore.total,
              discriminatoryScore: discriminatoryScore.total,
              healthGoalScore: healthGoalScore.total,
              healthGrade: healthGrade.grade,
              healthGradeScore: healthGrade.score,
            }
          };
        } catch (error) {
          console.error('❌ Error calculating score for recipe:', recipe.title, error);
          return {
            ...recipe,
            score: {
              total: 50,
              matchPercentage: 50,
              macroScore: 50,
              tasteScore: 50,
              behavioralScore: 0,
              temporalScore: 0,
              enhancedScore: 0,
              discriminatoryScore: 50,
              healthGoalScore: 50,
              healthGrade: 'C',
              healthGradeScore: 50,
            }
          };
        }
      }));

      // Sort recipes by match percentage (best match first)
      allRecipesWithScores.sort((a: any, b: any) => {
        const scoreA = a.score?.matchPercentage || a.score?.total || 0;
        const scoreB = b.score?.matchPercentage || b.score?.total || 0;
        return scoreB - scoreA; // Descending order (highest score first)
      });

      // Shuffle mode for pull-to-discover (Home Page 2.0)
      // Applies weighted randomization while still respecting scores
      if (shuffle === 'true') {
        // Fisher-Yates shuffle with weighted bias towards higher scores
        for (let i = allRecipesWithScores.length - 1; i > 0; i--) {
          // Bias towards keeping higher-scored items near the top
          const biasedRandom = Math.pow(Math.random(), 0.7); // 0.7 gives moderate shuffle
          const j = Math.floor(biasedRandom * (i + 1));
          [allRecipesWithScores[i], allRecipesWithScores[j]] = [allRecipesWithScores[j], allRecipesWithScores[i]];
        }
        console.log('🔀 Applied shuffle for discovery mode');
      }

      // Apply pagination after sorting
      const recipes = allRecipesWithScores.slice(offset, offset + limit);

      // Debug: Check imageUrl presence before variation
      const recipesWithImages = recipes.filter((r: any) => r.imageUrl);
      const recipesWithoutImages = recipes.filter((r: any) => !r.imageUrl);
      if (recipesWithoutImages.length > 0) {
        console.log(`⚠️  ${recipesWithoutImages.length} recipes missing imageUrl out of ${recipes.length} total`);
      }

      // Apply runtime image variation for unique images per page
      const recipesWithVariedImages = varyImageUrlsForPage(recipes, offset);

      // Debug: Check imageUrl presence after variation
      const variedWithImages = recipesWithVariedImages.filter((r: any) => r.imageUrl);
      if (variedWithImages.length < recipesWithImages.length) {
        console.warn(`⚠️  Image variation may have removed imageUrl from ${recipesWithImages.length - variedWithImages.length} recipes`);
      }

      // Debug: Log sample imageUrls to verify they're valid
      if (variedWithImages.length > 0) {
        const sampleRecipe = variedWithImages[0];
        console.log(`🖼️  Sample imageUrl: ${sampleRecipe.imageUrl?.substring(0, 100)}...`);
      }

      console.log(`📊 Found ${recipes.length} of ${total} total recipes (page ${page + 1}, limit ${limit}), sorted by match percentage`);

      // Track search query for analytics (non-blocking)
      if (search && typeof search === 'string' && search.trim().length > 0) {
        recordSearchQuery(userId, search, recipes.length).catch(() => {});
      }

      res.json({
        recipes: recipesWithVariedImages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: offset + recipes.length < total,
          hasPrevPage: page > 0
        }
      });
    } catch (error: any) {
      console.error('❌ Get recipes error:', error);
      console.error('❌ Error stack:', error.stack);
      res.status(500).json({ 
        error: 'Failed to fetch recipes', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  /**
   * Get Recipe of the Day (Home Page 2.0)
   * Returns a high-quality recipe that changes daily
   * Uses date-based seeding for consistent selection throughout the day
   */
  async getRecipeOfTheDay(req: Request, res: Response) {
    try {
      console.log('🌟 GET /api/recipes/recipe-of-the-day called');
      const userId = getUserId(req);

      // Get today's date as a seed for consistent daily selection
      const today = new Date();
      const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

      // Get user preferences for personalization (optional)
      const userPreferences = await prisma.userPreferences.findFirst({
        where: { userId },
        include: {
          likedCuisines: true,
          dietaryRestrictions: true
        }
      });

      // Try to get recipes with images first (preferred)
      let recipes = await prisma.recipe.findMany({
        where: {
          isUserCreated: false,
          imageUrl: { not: null },
        },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        },
        orderBy: [
          { healthScore: 'desc' },
          { qualityScore: 'desc' }
        ],
        take: 100
      });

      // Fallback: If no recipes with images, get any non-user-created recipes
      if (recipes.length === 0) {
        console.log('🌟 No recipes with images found, falling back to any recipes');
        recipes = await prisma.recipe.findMany({
          where: {
            isUserCreated: false,
          },
          include: {
            ingredients: { orderBy: { order: 'asc' } },
            instructions: { orderBy: { step: 'asc' } }
          },
          orderBy: { createdAt: 'desc' },
          take: 100
        });
      }

      // Final fallback: Get any recipe at all
      if (recipes.length === 0) {
        console.log('🌟 No non-user recipes found, getting any available recipe');
        recipes = await prisma.recipe.findMany({
          include: {
            ingredients: { orderBy: { order: 'asc' } },
            instructions: { orderBy: { step: 'asc' } }
          },
          take: 100
        });
      }

      if (recipes.length === 0) {
        console.log('🌟 No recipes found in database at all');
        return res.status(404).json({ error: 'No recipes available in database' });
      }

      // Use date seed to consistently select the same recipe for the whole day
      const selectedIndex = dateSeed % recipes.length;
      const recipeOfTheDay = recipes[selectedIndex];

      // Calculate health grade (with fallback if utility not available)
      let healthGrade = { grade: 'B', score: 70 }; // Default fallback
      try {
        const healthGradeUtil = require('../../utils/healthGrade');
        if (healthGradeUtil?.calculateHealthGrade) {
          healthGrade = healthGradeUtil.calculateHealthGrade(recipeOfTheDay);
        }
      } catch (e) {
        console.log('🌟 Health grade utility not available, using default');
      }

      // Add scoring info
      const enrichedRecipe = {
        ...recipeOfTheDay,
        healthGrade: healthGrade?.grade || 'B',
        isRecipeOfTheDay: true,
        selectedDate: today.toISOString().split('T')[0]
      };

      console.log(`🌟 Recipe of the Day: "${recipeOfTheDay.title}" (index ${selectedIndex}/${recipes.length}, from ${recipes.length} candidates)`);

      res.json({
        recipe: enrichedRecipe,
        message: 'Recipe of the Day'
      });
    } catch (error: any) {
      console.error('❌ Error getting Recipe of the Day:', error);
      res.status(500).json({
        error: 'Failed to get Recipe of the Day',
        details: error.message
      });
    }
  },

  async generateRecipe(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
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
      
      // Calculate health grade for the recipe
      const { calculateHealthGrade } = require('@/utils/healthGrade');
      const healthGrade = calculateHealthGrade(recipe);
      
      // Calculate nutritional analysis (Phase 6, Group 12)
      const { performNutritionalAnalysis } = require('@/utils/nutritionalAnalysis');
      const nutritionalAnalysis = performNutritionalAnalysis(recipe);
      
      console.log('✅ Recipe found:', recipe.title);
      res.json({
        ...recipe,
        healthGrade: healthGrade.grade,
        healthGradeScore: healthGrade.score,
        healthGradeBreakdown: healthGrade.breakdown,
        nutritionalAnalysis: {
          micronutrients: nutritionalAnalysis.micronutrients,
          omega3: nutritionalAnalysis.omega3,
          antioxidants: nutritionalAnalysis.antioxidants,
          nutritionalDensityScore: nutritionalAnalysis.nutritionalDensityScore,
          keyNutrients: nutritionalAnalysis.keyNutrients,
          nutrientGaps: nutritionalAnalysis.nutrientGaps,
        }
      });
    } catch (error: any) {
      console.error('❌ Get recipe error:', error);
      res.status(500).json({ error: 'Failed to fetch recipe' });
    }
  },

  // Get suggested recipes
  async getSuggestedRecipes(req: Request, res: Response) {
    try {
    console.log('🎯 GET /api/recipes/suggested - METHOD CALLED');
      const userId = getUserId(req);
      
      // Check if data sharing is enabled for recommendations
      const { isDataSharingEnabledFromRequest } = require('@/utils/privacyHelper');
      const dataSharingEnabled = isDataSharingEnabledFromRequest(req);
      
      // Extract filter parameters from query
      const {
        cuisines,
        dietaryRestrictions,
        maxCookTime,
        difficulty,
        includeAI,
        maxCost,
        mealPrepMode, // Filter by meal prep suitability
        search, // Search query for title/description
        scope, // Search scope: 'all' | 'saved' | 'liked'
      } = req.query;
      
      console.log('🔍 Filter parameters:', { cuisines, dietaryRestrictions, maxCookTime, difficulty });
      console.log('🔒 Data sharing enabled:', dataSharingEnabled);

      // Get user preferences, macro goals, and physical profile for scoring (only if data sharing enabled)
      let userPreferences = null;
      let macroGoals = null;
      let physicalProfile = null;
      
      if (dataSharingEnabled) {
        [userPreferences, macroGoals, physicalProfile] = await Promise.all([
          prisma.userPreferences.findFirst({
            where: { userId },
            include: {
              bannedIngredients: true,
              likedCuisines: true,
              dietaryRestrictions: true,
              preferredSuperfoods: true  // Include preferred superfoods for scoring
            }
          }),
          prisma.macroGoals.findFirst({
            where: { userId }
          }),
          prisma.userPhysicalProfile.findFirst({
            where: { userId }
          })
        ]);
      } else {
        console.log('🔒 Data sharing disabled - using generic recommendations without personalization');
      }
      
      // Import cost calculator
      const { calculateRecipeCost, isWithinBudget, calculateCostScore } = await import('../../utils/costCalculator');
      
      console.log('👤 User preferences found:', !!userPreferences);
      console.log('🎯 Macro goals found:', !!macroGoals);
      
      // Extract search term for case-insensitive filtering in JavaScript
      // (SQLite doesn't support Prisma's mode: 'insensitive')
      let searchTerm: string | null = null;
      if (search && typeof search === 'string' && search.trim().length > 0) {
        searchTerm = search.trim().toLowerCase();
        console.log('🔍 Searching for (case-insensitive):', searchTerm);
      }
      
      // Get offset/rotation parameter for pagination (to get different recipes on reload)
      const offset = parseInt(req.query.offset as string) || 0;
      const recipesPerPage = 50; // Get more recipes to score and sort for variety
      
      // If there's a search term, fetch a broader set first (prioritize search results)
      // Otherwise, apply all filters in the database query
      let allRecipes;
      if (searchTerm) {
        // For search: fetch more recipes with minimal filters, then filter in JavaScript
        console.log('🔍 Search mode: fetching broader set of recipes for search');
        
        // Fetch meals first (70% of results)
        const searchMealRecipes = await prisma.recipe.findMany({
          where: {
            isUserCreated: false,
            OR: [
              { mealType: null },
              { mealType: { in: ['breakfast', 'lunch', 'dinner'] } }
            ]
          },
          take: 140, // 70% of 200
          skip: Math.floor(offset * 10 * 0.7),
          orderBy: { createdAt: 'desc' },
          include: {
            ingredients: { orderBy: { order: 'asc' } },
            instructions: { orderBy: { step: 'asc' } }
          }
        });
        
        // Then snacks/desserts (30% of results)
        const searchSnackDessertRecipes = await prisma.recipe.findMany({
          where: {
            isUserCreated: false,
            mealType: { in: ['snack', 'dessert'] }
          },
          take: 60, // 30% of 200
          skip: Math.floor(offset * 10 * 0.3),
          orderBy: { createdAt: 'desc' },
          include: {
            ingredients: { orderBy: { order: 'asc' } },
            instructions: { orderBy: { step: 'asc' } }
          }
        });
        
        // Combine and shuffle
        allRecipes = [...searchMealRecipes, ...searchSnackDessertRecipes];
        for (let i = allRecipes.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allRecipes[i], allRecipes[j]] = [allRecipes[j], allRecipes[i]];
        }
        
        console.log(`📊 Found ${allRecipes.length} recipes in database (search mode)`);
        
        // Apply case-insensitive search filter first
        allRecipes = allRecipes.filter(recipe => {
          const titleMatch = recipe.title.toLowerCase().includes(searchTerm!);
          const descriptionMatch = recipe.description?.toLowerCase().includes(searchTerm!);
          return titleMatch || descriptionMatch;
        });
        console.log(`🔍 After case-insensitive search filter: ${allRecipes.length} recipes match "${searchTerm}"`);
      } else {
        // No search: apply all filters in database query
        // Build where clause for filtering
        const where: any = {
          isUserCreated: false, // Only system recipes for now
        };
        
        // Build AND conditions array for combining multiple filters
        const andConditions: any[] = [];
        
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
        
        // Filter by meal prep suitability
        // Only apply filter when explicitly enabled ('true' or '1')
        // When false, undefined, or not provided, don't filter by meal prep
        if (mealPrepMode === 'true' || mealPrepMode === '1') {
          // Show only recipes with mealPrepScore >= 60 (minimum suitability threshold)
          // All recipes have scores calculated, so we don't need to check for null
          andConditions.push({
            mealPrepScore: { gte: 60 }
          });
          console.log('🍱 Filtering for meal prep suitable recipes (min score: 60/100)');
        } else if (mealPrepMode === 'false' || mealPrepMode === '0') {
          // Explicitly disabled - ensure no meal prep filter is applied
          console.log('🍽️ Meal prep mode disabled - showing all recipes');
        }
        
        // Combine AND conditions if any exist
        if (andConditions.length > 0) {
          where.AND = andConditions;
        }
        
        console.log('🔍 Querying database for recipes with filters...');
        console.log('🔍 Where clause:', JSON.stringify(where, null, 2));
        
        // Fetch recipes with balanced mealType distribution
        // First, get meals (breakfast, lunch, dinner) and recipes with null mealType
        const mealRecipes = await prisma.recipe.findMany({
          where: {
            ...where,
            OR: [
              { mealType: null },
              { mealType: { in: ['breakfast', 'lunch', 'dinner'] } }
            ]
          },
          take: Math.floor(recipesPerPage * 0.7), // 70% meals
          skip: Math.floor(offset * 10 * 0.7),
          orderBy: { createdAt: 'desc' },
          include: {
            ingredients: { orderBy: { order: 'asc' } },
            instructions: { orderBy: { step: 'asc' } }
          }
        });
        
        // Then, get snacks and desserts
        const snackDessertRecipes = await prisma.recipe.findMany({
          where: {
            ...where,
            mealType: { in: ['snack', 'dessert'] }
          },
          take: Math.floor(recipesPerPage * 0.3), // 30% snacks/desserts
          skip: Math.floor(offset * 10 * 0.3),
          orderBy: { createdAt: 'desc' },
          include: {
            ingredients: { orderBy: { order: 'asc' } },
            instructions: { orderBy: { step: 'asc' } }
          }
        });
        
        // Combine meals and snacks/desserts
        allRecipes = [...mealRecipes, ...snackDessertRecipes];
        
        // If we don't have enough recipes, fill with any available recipes
        if (allRecipes.length < recipesPerPage) {
          const remainingNeeded = recipesPerPage - allRecipes.length;
          const existingIds = new Set(allRecipes.map(r => r.id));
          const additionalRecipes = await prisma.recipe.findMany({
            where: {
              ...where,
              id: { notIn: [...existingIds] }
            },
            take: remainingNeeded,
            orderBy: { createdAt: 'desc' },
            include: {
              ingredients: { orderBy: { order: 'asc' } },
              instructions: { orderBy: { step: 'asc' } }
            }
          });
          allRecipes = [...allRecipes, ...additionalRecipes];
        }
        
        // Shuffle to mix meals and snacks/desserts together
        for (let i = allRecipes.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allRecipes[i], allRecipes[j]] = [allRecipes[j], allRecipes[i]];
        }
        console.log(`📊 Found ${allRecipes.length} recipes in database`);
      }
      
      // Apply additional filters in JavaScript if we're in search mode
      let searchFilteredRecipes = allRecipes;
      if (searchTerm) {
        // When searching, prioritize search results - apply filters but don't be too strict
        // If search results are limited, we'll show them even if they don't match all filters
        const originalCount = searchFilteredRecipes.length;
        
        // Apply other filters (cuisines, meal prep, cook time, difficulty) in JavaScript
        let filteredByCuisine = searchFilteredRecipes;
        if (cuisines && typeof cuisines === 'string') {
          const cuisineArray = cuisines.split(',').map(c => c.trim());
          filteredByCuisine = searchFilteredRecipes.filter(recipe => 
            recipe.cuisine && cuisineArray.includes(recipe.cuisine)
          );
          console.log(`🍽️ After cuisine filter: ${filteredByCuisine.length} recipes`);
        }
        
        let filteredByCookTime = filteredByCuisine;
        if (maxCookTime && !isNaN(Number(maxCookTime))) {
          filteredByCookTime = filteredByCuisine.filter(recipe => 
            recipe.cookTime && recipe.cookTime <= Number(maxCookTime)
          );
          console.log(`⏱️ After cook time filter: ${filteredByCookTime.length} recipes`);
        }
        
        let filteredByDifficulty = filteredByCookTime;
        if (difficulty && typeof difficulty === 'string') {
          const diff = String(difficulty).toLowerCase();
          filteredByDifficulty = filteredByCookTime.filter(recipe => {
            if (!recipe.cookTime) return false;
            if (diff === 'easy') return recipe.cookTime <= 30;
            if (diff === 'medium') return recipe.cookTime >= 31 && recipe.cookTime <= 45;
            if (diff === 'hard') return recipe.cookTime >= 46;
            return true;
          });
          console.log(`📊 After difficulty filter: ${filteredByDifficulty.length} recipes`);
        }
        
        let filteredByMealPrep = filteredByDifficulty;
        if (mealPrepMode === 'true' || mealPrepMode === '1') {
          filteredByMealPrep = filteredByDifficulty.filter(recipe => {
            // Only show recipes with mealPrepScore >= 60
            return recipe.mealPrepScore !== null && 
                   recipe.mealPrepScore !== undefined && 
                   recipe.mealPrepScore >= 60;
          });
          console.log(`🍱 After meal prep filter (min score: 60/100): ${filteredByMealPrep.length} recipes`);
        }
        
        // If strict filtering removed all results but we had search matches, 
        // still respect meal prep filter (don't bypass it)
        // Only bypass other filters (cuisine, cook time, difficulty) but keep meal prep requirement
        if (filteredByMealPrep.length === 0 && originalCount > 0 && mealPrepMode === 'true') {
          console.log(`⚠️ Meal prep filter removed all search results. No meal prep suitable recipes found.`);
          searchFilteredRecipes = []; // Return empty - meal prep requirement is strict
        } else if (filteredByMealPrep.length === 0 && originalCount > 0 && mealPrepMode !== 'true' && mealPrepMode !== '1') {
          console.log(`⚠️ Strict filters removed all search results. Showing ${originalCount} search result(s) anyway.`);
          searchFilteredRecipes = allRecipes; // Return search results without strict filters (only if not in meal prep mode)
        } else {
          searchFilteredRecipes = filteredByMealPrep;
        }
      }

      // If no recipes found, return empty array
      if (searchFilteredRecipes.length === 0) {
        console.log('❌ No recipes found matching criteria');
        return res.json([]);
      }

      console.log(`📝 First recipe title: "${searchFilteredRecipes[0].title}"`);
      console.log(`🔍 Debug: searchTerm="${searchTerm}", searchFilteredRecipes.length=${searchFilteredRecipes.length}`);

      // If we have a search term, find similar recipes and add them to the pool
      if (searchTerm && searchFilteredRecipes.length > 0) {
        console.log(`🔍 Starting similar recipes search for "${searchTerm}" with ${searchFilteredRecipes.length} exact match(es)`);
        try {
          const { findSimilarToSearchQuery } = require('../../utils/recipeSimilarity');
          
          // Fetch a broader set of recipes to find similarities from
          // If we found exact matches, prioritize same cuisine; otherwise get diverse pool
          const exactMatchCuisines = [...new Set(searchFilteredRecipes.map(r => r.cuisine))];
          
          // Map related cuisines (e.g., "Latin American" -> "Mexican", "Spanish", etc.)
          const relatedCuisines: Record<string, string[]> = {
            'Latin American': ['Mexican', 'Spanish', 'Caribbean', 'South American', 'Central American'],
            'Mexican': ['Latin American', 'Spanish', 'Southwestern', 'Tex-Mex'],
            'Asian': ['Chinese', 'Japanese', 'Korean', 'Thai', 'Vietnamese', 'Indian'],
            'Mediterranean': ['Italian', 'Greek', 'Middle Eastern', 'Spanish'],
            'Italian': ['Mediterranean', 'French'],
            'American': ['Southern', 'Southwestern', 'Tex-Mex'],
          };
          
          // Expand cuisine list with related cuisines
          const expandedCuisines = new Set(exactMatchCuisines);
          exactMatchCuisines.forEach(cuisine => {
            if (relatedCuisines[cuisine]) {
              relatedCuisines[cuisine].forEach(related => expandedCuisines.add(related));
            }
          });
          
          const candidatePoolWhere: any = {
            isUserCreated: false,
            id: { notIn: searchFilteredRecipes.map(r => r.id) } // Exclude exact matches
          };
          
          // If exact matches have a cuisine, prioritize that cuisine and related cuisines for similar recipes
          if (expandedCuisines.size > 0) {
            candidatePoolWhere.cuisine = { in: [...expandedCuisines] };
            console.log(`🔍 Looking for similar recipes in cuisines: ${[...expandedCuisines].join(', ')}`);
          }
          
          const candidatePool = await prisma.recipe.findMany({
            where: candidatePoolWhere,
            take: 300, // Get a larger pool to find similarities
            include: {
              ingredients: { orderBy: { order: 'asc' } },
            }
          });
          
          // If we didn't get enough candidates with cuisine filter, get more without it
          if (candidatePool.length < 50 && exactMatchCuisines.length > 0) {
            const additionalCandidates = await prisma.recipe.findMany({
              where: {
                isUserCreated: false,
                id: { 
                  notIn: [...searchFilteredRecipes.map(r => r.id), ...candidatePool.map(r => r.id)]
                }
              },
              take: 200,
              include: {
                ingredients: { orderBy: { order: 'asc' } },
              }
            });
            candidatePool.push(...additionalCandidates);
          }
          
          console.log(`🔍 Candidate pool for similar recipes: ${candidatePool.length} recipes`);

          // Find similar recipes
          const similarRecipes = findSimilarToSearchQuery(
            searchTerm,
            candidatePool.map(r => ({
              id: r.id,
              title: r.title,
              description: r.description,
              cuisine: r.cuisine,
              cookTime: r.cookTime,
              calories: r.calories,
              protein: r.protein,
              carbs: r.carbs,
              fat: r.fat,
              servings: r.servings,
              ingredients: r.ingredients,
            })),
            searchFilteredRecipes.map(r => ({
              id: r.id,
              title: r.title,
              description: r.description,
              cuisine: r.cuisine,
              cookTime: r.cookTime,
              calories: r.calories,
              protein: r.protein,
              carbs: r.carbs,
              fat: r.fat,
              servings: r.servings,
              ingredients: r.ingredients || [],
            })),
            { limit: 15, minScore: 0.15 } // Lower threshold and get more results
          );

          if (similarRecipes.length > 0) {
            console.log(`🔍 Found ${similarRecipes.length} similar recipes for search query "${searchTerm}"`);
            console.log(`🔍 Similar recipe IDs: ${similarRecipes.map((s: { recipeId: string }) => s.recipeId).join(', ')}`);
            console.log(`🔍 Similar recipe scores: ${similarRecipes.map((s: { recipeId: string; score: number }) => `${s.recipeId.substring(0, 8)}:${s.score.toFixed(2)}`).join(', ')}`);
            
            // Fetch full recipe data for similar recipes
            const similarRecipeIds = similarRecipes.map((s: { recipeId: string }) => s.recipeId);
            const similarRecipesWhere: any = {
              id: { in: similarRecipeIds }
            };
            
            // Apply meal prep filter to similar recipes if meal prep mode is enabled
            if (mealPrepMode === 'true' || mealPrepMode === '1') {
              similarRecipesWhere.mealPrepScore = { gte: 60 };
              console.log('🍱 Filtering similar recipes for meal prep mode (min score: 60/100)');
            }
            
            const similarRecipesFull = await prisma.recipe.findMany({
              where: similarRecipesWhere,
              include: {
                ingredients: { orderBy: { order: 'asc' } },
                instructions: { orderBy: { step: 'asc' } }
              }
            });

            console.log(`🔍 Similar recipe titles: ${similarRecipesFull.map(r => r.title).join(', ')}`);

            // Mark exact matches so we can prioritize them in sorting
            const exactMatchIds = new Set(searchFilteredRecipes.map(r => r.id));
            searchFilteredRecipes.forEach((r: any) => {
              r._isExactMatch = true;
            });
            
            // Mark similar recipes
            similarRecipesFull.forEach((r: any) => {
              r._isExactMatch = false;
              r._isSimilarMatch = true;
            });

            // Add similar recipes to the pool (they'll be scored and may appear in results)
            // Note: Similar recipes bypass strict filters - they're added even if they don't match all filters
            // This ensures users see related recipes when searching
            const exactMatchCount = searchFilteredRecipes.length;
            searchFilteredRecipes = [...searchFilteredRecipes, ...similarRecipesFull];
            console.log(`📊 Total recipes after adding similar: ${searchFilteredRecipes.length} (${exactMatchCount} exact + ${similarRecipesFull.length} similar)`);
          } else {
            console.log(`⚠️ No similar recipes found for search query "${searchTerm}"`);
            console.log(`⚠️ Exact match cuisines: ${exactMatchCuisines.join(', ')}`);
            console.log(`⚠️ Candidate pool size: ${candidatePool.length}`);
          }
        } catch (error) {
          console.error('❌ Error finding similar recipes:', error);
          console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
          // Continue without similar recipes if there's an error
        }
      } else {
        if (searchTerm) {
          console.log(`⚠️ Skipping similar recipes: searchTerm="${searchTerm}", searchFilteredRecipes.length=${searchFilteredRecipes.length}`);
        }
      }

      // Apply search scope filter (saved / liked)
      if (scope === 'saved' || scope === 'liked') {
        let scopeRecipeIds: Set<string>;
        if (scope === 'saved') {
          const savedRecords = await (prisma as any).savedRecipe.findMany({
            where: { userId },
            select: { recipeId: true },
          });
          scopeRecipeIds = new Set(savedRecords.map((r: any) => r.recipeId));
        } else {
          const likedRecords = await (prisma as any).recipeFeedback.findMany({
            where: { userId, liked: true },
            select: { recipeId: true },
          });
          scopeRecipeIds = new Set(likedRecords.map((r: any) => r.recipeId));
        }
        const before = searchFilteredRecipes.length;
        searchFilteredRecipes = searchFilteredRecipes.filter(r => scopeRecipeIds.has(r.id));
        console.log(`🔎 Scope "${scope}" filter: ${before} → ${searchFilteredRecipes.length} recipes`);

        if (searchFilteredRecipes.length === 0) {
          console.log(`❌ No recipes found for scope "${scope}"`);
          return res.json([]);
        }
      }

      // Get user behavioral data for scoring (only if data sharing enabled)
      let userBehavior = null;
      if (dataSharingEnabled) {
        userBehavior = await getUserBehaviorData(userId);
      } else {
        // Use empty behavior data when data sharing is disabled
        userBehavior = {
          likedRecipes: [],
          dislikedRecipes: [],
          savedRecipes: [],
          consumedRecipes: [],
          recentCuisines: [],
          recentIngredients: [],
          mealHistory: [],
        };
      }

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
      const { calculatePredictiveScore } = require('@/utils/predictiveScoring');
      const { calculateCollaborativeScore } = require('@/utils/collaborativeFiltering');
      const { calculateHealthMetricsScore } = require('@/utils/healthMetricsScoring');
      const { calculateDiscriminatoryScore, getUserPreferencesForScoring } = require('../../utils/discriminatoryScoring');
      const { calculateExternalScore, calculateHybridScore } = require('@/utils/externalScoring');
      const { calculateHealthGoalMatch } = require('@/utils/healthGoalScoring');
      const { calculateHealthGrade } = require('@/utils/healthGrade');
      
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
      
      // Calculate optimal weights based on user behavior (Phase 6 - dynamic weight adjustment)
      const { getOptimalWeights, calculateHistoricalScores } = require('@/utils/dynamicWeightAdjustment');
      let optimalWeights = null;
      try {
        const historicalScores = await calculateHistoricalScores(userBehavior, {
          userPreferences,
          macroGoals,
          physicalProfile,
          temporalContext,
          userTemporalPatterns,
          cookTimeContext,
          userKitchenProfile,
          userPrefsForScoring
        });
        
        if (historicalScores.length > 0) {
          optimalWeights = getOptimalWeights(userBehavior, historicalScores);
          console.log('🎯 Optimal weights calculated:', optimalWeights);
        }
      } catch (error) {
        console.error('⚠️ Error calculating optimal weights, using defaults:', error);
      }
      
      // Use optimal weights if available, otherwise use defaults
      const weights = optimalWeights || {
        discriminatoryWeight: 0.60,
        baseScoreWeight: 0.25,
        healthGoalWeight: 0.15,
        behavioralWeight: 0.15,
        temporalWeight: 0.10,
        enhancedWeight: 0.10,
        externalWeight: 0.05,
      };
      
      // Calculate scores for each recipe (using Promise.all for async operations)
      const recipesWithScores = await Promise.all(searchFilteredRecipes.map(async (recipe: any) => {
        try {
          // Calculate recipe cost
          let recipeCost = recipe.estimatedCost || recipe.pricePerServing * recipe.servings || null;
          let costScore = 50; // Default neutral score
          
          if (!recipeCost) {
            try {
              const costResult = await calculateRecipeCost(recipe.id, userId);
              recipeCost = costResult.estimatedCost;
              recipe.estimatedCost = costResult.estimatedCost;
              recipe.estimatedCostPerServing = costResult.estimatedCostPerServing;
              recipe.costSource = costResult.costSource;
            } catch (error) {
              console.warn('⚠️ Could not calculate cost for recipe:', recipe.title);
            }
          }
          
          // Check if within budget
          const budgetConstraints = {
            maxRecipeCost: userPreferences?.maxRecipeCost || (maxCost ? parseFloat(maxCost as string) : null),
            maxMealCost: userPreferences?.maxMealCost || null,
            maxDailyFoodBudget: userPreferences?.maxDailyFoodBudget || null,
          };
          
          // Filter by cost if budget is set
          if (recipeCost && budgetConstraints.maxRecipeCost && recipeCost > budgetConstraints.maxRecipeCost) {
            return null; // Filter out recipes that exceed budget
          }
          
          // Calculate cost score for scoring
          if (recipeCost) {
            costScore = calculateCostScore(recipeCost, recipe.calories, budgetConstraints);
          }
          
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
          
          // Calculate health goal match score (Phase 6 - sophisticated health goal matching)
          const healthGoalScore = calculateHealthGoalMatch(
            recipe,
            physicalProfile?.fitnessGoal as any || null,
            macroGoals ? {
              calories: macroGoals.calories,
              protein: macroGoals.protein,
              carbs: macroGoals.carbs,
              fat: macroGoals.fat
            } : null
          );
          
          // Calculate health grade (Phase 6 - nutritional density scoring)
          const healthGrade = calculateHealthGrade(recipe);
          
          // Calculate predictive score (Phase 6 - predictive scoring based on historical data)
          const predictiveScore = calculatePredictiveScore(recipe, userBehavior, {
            userPreferences,
            macroGoals,
            temporalContext
          });
          
          // Calculate collaborative filtering score (Phase 6 - advanced collaborative filtering)
          let collaborativeScore = { total: 0, breakdown: { userBasedScore: 0, itemBasedScore: 0 }, details: { similarUsersCount: 0, similarRecipesCount: 0, userSimilarityStrength: 0, itemSimilarityStrength: 0 } };
          try {
            collaborativeScore = await calculateCollaborativeScore(recipe, userId, userBehavior);
          } catch (error) {
            console.warn('⚠️ Collaborative filtering failed, continuing without it:', error);
          }
          
          // Calculate health metrics score (Phase 6 - health app data integration - fitness goal based)
          // Step count is NOT used for recipe recommendations, only for expenditure calculation in weight goals
          let healthMetricsScore = { total: 50, breakdown: { expenditureAdjustment: 0 }, details: { steps: 0, calculatedExpenditure: 0, recommendedCalorieRange: { min: 0, max: 0 }, fitnessGoalBased: false } };
          try {
            // Note: Weight goals table doesn't exist yet, so we skip this for now
            // When weight goals are implemented, uncomment this:
            // const activeWeightGoal = await prisma.$queryRaw`
            //   SELECT requiredCaloriesPerDay FROM weight_goals
            //   WHERE userId = ${userId} AND isActive = 1
            //   ORDER BY createdAt DESC
            //   LIMIT 1
            // ` as any[];
            
            // Use weight goal calories if available, otherwise use macro goals or fitness goal
            // Focus on daily totals, not strict per-meal limits
            // TODO: Re-enable when weight_goals table is created
            // let calorieTarget: { calories: number; min: number; max: number } | null = null;
            // if (activeWeightGoal && activeWeightGoal.length > 0) {
            //   // Use weight goal's required calories per day
            //   // Very lenient range: 10-50% of daily calories per meal (allows big lunches, small dinners)
            //   const dailyCalories = activeWeightGoal[0].requiredCaloriesPerDay;
            //   calorieTarget = {
            //     calories: dailyCalories, // Store daily total for reference
            //     min: Math.round(dailyCalories * 0.10), // 10% of daily (very small meal)
            //     max: Math.round(dailyCalories * 0.50), // 50% of daily (very large meal)
            //   };
            // }
            
            if (physicalProfile || macroGoals) {
              healthMetricsScore = calculateHealthMetricsScore(
                recipe,
                null, // Step count not used for recipe scoring
                physicalProfile ? {
                  weightKg: physicalProfile.weightKg,
                  heightCm: physicalProfile.heightCm,
                  age: physicalProfile.age,
                  gender: physicalProfile.gender,
                  activityLevel: physicalProfile.activityLevel,
                  fitnessGoal: physicalProfile.fitnessGoal,
                } : null,
                macroGoals ? { calories: macroGoals.calories } : null
              );
              
              // TODO: Override range if weight goal is active (use lenient range)
              // if (calorieTarget) {
              //   healthMetricsScore.details.recommendedCalorieRange = {
              //     min: calorieTarget.min,
              //     max: calorieTarget.max,
              //   };
              //   // Use the lenient scoring from calculateHealthMetricsScore
              //   // No need to recalculate - it already handles wide ranges leniently
              // }
            }
          } catch (error) {
            console.warn('⚠️ Health metrics scoring failed, continuing without it:', error);
          }
          
          // Calculate overall score with all factors
          const baseScore = calculateRecipeScore(recipe, userPreferences, macroGoals, behavioralScore.total, temporalScore.total);
          
          // Internal score combines all internal algorithms with dynamic weights
          const internalScore = Math.round(
            discriminatoryScore.total * weights.discriminatoryWeight + 
            baseScore.total * weights.baseScoreWeight +
            healthGoalScore.total * weights.healthGoalWeight
          );
          
          // Add predictive, collaborative, and health metrics scores (8% each) to internal score
          const predictiveBoost = predictiveScore.total * 0.08;
          const collaborativeBoost = collaborativeScore.total * 0.08;
          const healthMetricsBoost = healthMetricsScore.total * 0.08;
          const internalScoreWithPredictive = Math.round(Math.min(100, internalScore + predictiveBoost + collaborativeBoost + healthMetricsBoost));
          
          // Final hybrid score blends internal and external data
          const finalScore = calculateHybridScore(
            internalScoreWithPredictive,
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
          
          // Add cost score boost (5% weight) - lower cost = higher boost
          const costBoost = Math.round((costScore - 50) * 0.05); // Convert cost score to -2.5 to +2.5 boost
          
          const finalScoreWeighted = Math.round(Math.min(100, finalScore + cuisineBoost + qualityBoost + costBoost));
          
          return {
        ...recipe,
        estimatedCost: recipeCost,
        estimatedCostPerServing: recipeCost ? recipeCost / recipe.servings : null,
        costSource: recipe.costSource || null,
        score: {
              total: finalScoreWeighted,
              matchPercentage: finalScoreWeighted,
              macroScore: baseScore.macroScore,
              tasteScore: baseScore.tasteScore,
              costScore: costScore,
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
              healthGoalScore: healthGoalScore.total,
              healthGoalBreakdown: healthGoalScore.breakdown,
              healthGrade: healthGrade.grade,
              healthGradeScore: healthGrade.score,
              healthGradeBreakdown: healthGrade.breakdown,
              predictiveScore: predictiveScore.total,
              predictiveBreakdown: predictiveScore.breakdown,
              collaborativeScore: collaborativeScore.total,
              collaborativeBreakdown: collaborativeScore.breakdown,
              healthMetricsScore: healthMetricsScore.total,
              healthMetricsBreakdown: healthMetricsScore.breakdown,
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
      }));

      // Filter out null recipes (those that exceeded budget)
      let filteredRecipes = recipesWithScores.filter((r: any) => r !== null);
      
      // Optional: Filter by ingredient availability if requested
      const { minAvailabilityScore } = req.query;
      if (minAvailabilityScore && !isNaN(Number(minAvailabilityScore))) {
        try {
          const { filterRecipesByAvailability } = require('../../utils/ingredientAvailability');
          const recipeIds = filteredRecipes.map((r: any) => r.id);
          const availableRecipeIds = await filterRecipesByAvailability(
            recipeIds,
            userId,
            Number(minAvailabilityScore)
          );
          const availableIdsSet = new Set(availableRecipeIds);
          filteredRecipes = filteredRecipes.filter((r: any) => availableIdsSet.has(r.id));
        } catch (error) {
          console.warn('⚠️ Ingredient availability filtering failed, continuing without it:', error);
        }
      }
      
      // Sort by score, but prioritize exact matches over similar recipes
      filteredRecipes.sort((a: any, b: any) => {
        // First, prioritize exact matches over similar recipes (only if search was used)
        const aIsExact = a._isExactMatch === true;
        const bIsExact = b._isExactMatch === true;
        if (aIsExact && !bIsExact) return -1;
        if (!aIsExact && bIsExact) return 1;
        
        // If both are same type (both exact, both similar, or neither marked), sort by score
        return b.score.total - a.score.total;
      });
        const limit = 10;
        const perCuisineCap = 3;
        const selected: any[] = [];
        const cuisineCounts = new Map<string, number>();
        const seenIds = new Set<string>(); // Track seen recipe IDs to prevent duplicates
        
        // Add some randomization: shuffle the top 30 scored recipes before selecting
        // This ensures variety on reload while still prioritizing high-scored recipes
        // But still prioritize exact matches over similar recipes
        const shuffledRecipes = [...filteredRecipes]
          .sort((a: any, b: any) => {
            // First, prioritize exact matches over similar recipes (only if search was used)
            const aIsExact = a._isExactMatch === true;
            const bIsExact = b._isExactMatch === true;
            if (aIsExact && !bIsExact) return -1;
            if (!aIsExact && bIsExact) return 1;
            // Then sort by score
            return (b.score?.total || 0) - (a.score?.total || 0);
          })
          .slice(0, 30) // Take top 30
          .sort((a: any, b: any) => {
            // When shuffling, keep exact matches at the top
            const aIsExact = a._isExactMatch === true;
            const bIsExact = b._isExactMatch === true;
            if (aIsExact && !bIsExact) return -1;
            if (!aIsExact && bIsExact) return 1;
            // Then randomize within same type
            return Math.random() - 0.5;
          });
        
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

        // Final deduplication check - ensure no duplicate IDs in response
        const uniqueRecipes = Array.from(
          new Map(topRecipes.map(r => [r.id, r])).values()
        );
        
        if (uniqueRecipes.length !== topRecipes.length) {
          console.warn(`⚠️ Removed ${topRecipes.length - uniqueRecipes.length} duplicate(s) from final response`);
        }

        // Final safety check: Ensure no recipes with mealPrepScore < 60 are returned when meal prep mode is enabled
        let finalRecipes = uniqueRecipes;
        if (mealPrepMode === 'true' || mealPrepMode === '1') {
          const beforeCount = finalRecipes.length;
          finalRecipes = finalRecipes.filter((recipe: any) => {
            const score = recipe.mealPrepScore;
            if (score === null || score === undefined || score < 60) {
              console.warn(`⚠️ Filtering out recipe "${recipe.title}" with mealPrepScore=${score} (below 60 threshold)`);
              return false;
            }
            return true;
          });
          if (beforeCount !== finalRecipes.length) {
            console.log(`🍱 Final meal prep filter: Removed ${beforeCount - finalRecipes.length} recipe(s) with score < 60`);
          }
        }
        
        console.log(`✅ Returning ${finalRecipes.length} recipes with real scores`);
        console.log(`🏆 Top recipe: "${finalRecipes[0]?.title}" (${finalRecipes[0]?.score?.total}% match)`);

        // Log all recipe IDs for debugging
        console.log('📋 Recipe IDs:', finalRecipes.map(r => r.id).join(', '));

        // Debug: Check imageUrl presence before variation
        const recipesWithImages = finalRecipes.filter((r: any) => r.imageUrl);
        if (recipesWithImages.length < finalRecipes.length) {
          console.log(`⚠️  ${finalRecipes.length - recipesWithImages.length} suggested recipes missing imageUrl out of ${finalRecipes.length} total`);
        }

        // Apply runtime image variation for unique images per page
        const recipesWithVariedImages = varyImageUrlsForPage(finalRecipes, offset);

        // Verify imageUrl is preserved after variation
        const variedWithImages = recipesWithVariedImages.filter((r: any) => r.imageUrl);
        if (variedWithImages.length < recipesWithImages.length) {
          console.warn(`⚠️  Image variation may have removed imageUrl from ${recipesWithImages.length - variedWithImages.length} suggested recipes`);
        }

        // Track search query for analytics (non-blocking)
        if (search && typeof search === 'string' && (search as string).trim().length > 0) {
          recordSearchQuery(userId, search as string, finalRecipes.length).catch(() => {});
        }

        res.json(recipesWithVariedImages);
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
      const userId = getUserId(req);
      const { collectionId, page: pageParam, limit: limitParam } = req.query as { collectionId?: string; page?: string; limit?: string };
      const paginated = pageParam !== undefined;
      const page = paginated ? Math.max(0, parseInt(pageParam as string, 10) || 0) : 0;
      const limit = paginated ? Math.min(100, Math.max(1, parseInt(limitParam as string, 10) || 50)) : 0;

      // Support multiple collection IDs via comma-separated list
      const collectionIds = collectionId
        ? (collectionId as string).split(',').filter(Boolean)
        : [];

      const includeClause = {
        recipe: {
          include: {
            ingredients: { orderBy: { order: 'asc' as const } },
            instructions: { orderBy: { step: 'asc' as const } }
          }
        },
        recipeCollections: {
          include: { collection: true }
        }
      };

      let savedRecipes;
      let total = 0;

      if (collectionIds.length > 0) {
        // Filter by collections using join table
        const savedRecipeIds = await (prisma as any).recipeCollection.findMany({
          where: { collectionId: { in: collectionIds } },
          select: { savedRecipeId: true }
        });

        const uniqueSavedRecipeIds = [...new Set(savedRecipeIds.map((rc: any) => String(rc.savedRecipeId)))] as string[];
        const whereClause = { userId, id: { in: uniqueSavedRecipeIds } };

        if (paginated) {
          [savedRecipes, total] = await Promise.all([
            (prisma as any).savedRecipe.findMany({
              where: whereClause,
              include: includeClause,
              orderBy: { savedDate: 'desc' },
              skip: page * limit,
              take: limit,
            }),
            (prisma as any).savedRecipe.count({ where: whereClause }),
          ]);
        } else {
          savedRecipes = await (prisma as any).savedRecipe.findMany({
            where: whereClause,
            include: includeClause,
            orderBy: { savedDate: 'desc' },
          });
        }
      } else {
        // Get all saved recipes (All collection)
        const whereClause = { userId };

        if (paginated) {
          [savedRecipes, total] = await Promise.all([
            (prisma as any).savedRecipe.findMany({
              where: whereClause,
              include: includeClause,
              orderBy: { savedDate: 'desc' },
              skip: page * limit,
              take: limit,
            }),
            (prisma as any).savedRecipe.count({ where: whereClause }),
          ]);
        } else {
          savedRecipes = await (prisma as any).savedRecipe.findMany({
            where: whereClause,
            include: includeClause,
            orderBy: { savedDate: 'desc' },
          });
        }
      }

      console.log(`📚 Found ${savedRecipes.length} saved recipes`);

      // Get user preferences, macro goals, and physical profile for scoring
      const [userPreferences, macroGoals, physicalProfile] = await Promise.all([
        prisma.userPreferences.findFirst({
          where: { userId },
          include: {
            bannedIngredients: true,
            likedCuisines: true,
            dietaryRestrictions: true,
            preferredSuperfoods: true
          }
        }),
        prisma.macroGoals.findFirst({
          where: { userId }
        }),
        prisma.userPhysicalProfile.findFirst({
          where: { userId }
        })
      ]);

      // Get user behavioral data for scoring
      const userBehavior = await getUserBehaviorData(userId);
      
      // Get current temporal context
      const { getCurrentTemporalContext, calculateTemporalScore, analyzeUserTemporalPatterns } = require('@/utils/temporalScoring');
      const temporalContext = getCurrentTemporalContext();
      const userTemporalPatterns = analyzeUserTemporalPatterns(userBehavior.consumedRecipes);
      
      // Import scoring functions
      const { calculateRecipeScore } = require('@/utils/scoring');
      const { calculateBehavioralScore } = require('@/utils/behavioralScoring');
      const { calculateEnhancedScore } = require('@/utils/enhancedScoring');
      const { calculateDiscriminatoryScore, getUserPreferencesForScoring } = require('../../utils/discriminatoryScoring');
      const { calculateExternalScore } = require('@/utils/externalScoring');
      const { calculateHealthGoalMatch } = require('@/utils/healthGoalScoring');
      const { calculateHealthGrade } = require('@/utils/healthGrade');
      
      // Create enhanced scoring context
      const cookTimeContext = {
        availableTime: 30,
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

      // Use default weights for saved recipes (simpler than suggested recipes)
      const weights = {
        discriminatoryWeight: 0.60,
        baseScoreWeight: 0.25,
        healthGoalWeight: 0.15,
        behavioralWeight: 0.15,
        temporalWeight: 0.10,
        enhancedWeight: 0.10,
        externalWeight: 0.05,
      };
      
      // Batch fetch cooking stats for all saved recipe IDs
      const recipeIds = savedRecipes.map((s: any) => s.recipeId);
      const cookingStats = await (prisma as any).cookingLog.groupBy({
        by: ['recipeId'],
        where: { userId, recipeId: { in: recipeIds } },
        _count: { id: true },
        _max: { cookedAt: true },
      });
      const cookingStatsMap = new Map<string, { cookCount: number; lastCooked: Date | null }>(
        cookingStats.map((s: any) => [s.recipeId, { cookCount: s._count.id, lastCooked: s._max.cookedAt }])
      );

      // Calculate scores for each saved recipe
      const recipesWithScores = await Promise.all(savedRecipes.map(async (saved: any) => {
        const recipe = saved.recipe;
        try {
          // Calculate health grade
          const healthGrade = calculateHealthGrade(recipe);

          // Calculate behavioral score
          const behavioralScore = calculateBehavioralScore(recipe, userBehavior);
          
          // Calculate temporal score
          const temporalScore = calculateTemporalScore(recipe, temporalContext, userTemporalPatterns);
          
          // Calculate enhanced score
          const enhancedScore = calculateEnhancedScore(recipe, cookTimeContext, userKitchenProfile);
          
          // Calculate discriminatory score
          let discriminatoryScore;
          try {
            discriminatoryScore = userPrefsForScoring ? 
              calculateDiscriminatoryScore(recipe, userPrefsForScoring) : 
              { total: 50, breakdown: { cuisineMatch: 50, ingredientPenalty: 0, cookTimeMatch: 50, dietaryMatch: 50, spiceMatch: 50 } };
          } catch (error) {
            console.error('❌ Error calculating discriminatory score:', error);
            discriminatoryScore = { total: 50, breakdown: { cuisineMatch: 50, ingredientPenalty: 0, cookTimeMatch: 50, dietaryMatch: 50, spiceMatch: 50 } };
          }
          
          // Calculate external score
          const externalScore = calculateExternalScore(recipe);
          
          // Calculate health goal match score
          const healthGoalScore = calculateHealthGoalMatch(
            recipe,
            physicalProfile?.fitnessGoal || null,
            macroGoals ? {
              calories: macroGoals.calories,
              protein: macroGoals.protein,
              carbs: macroGoals.carbs,
              fat: macroGoals.fat
            } : null
          );
          
          // Calculate base recipe score
          const baseScore = calculateRecipeScore(
            recipe,
            userPreferences,
            macroGoals,
            behavioralScore.total,
            temporalScore.total
          );
          
          // Calculate final weighted score
          const finalScore = Math.round(
            discriminatoryScore.total * weights.discriminatoryWeight +
            baseScore.total * weights.baseScoreWeight +
            healthGoalScore.total * weights.healthGoalWeight +
            behavioralScore.total * weights.behavioralWeight +
            temporalScore.total * weights.temporalWeight +
            enhancedScore.total * weights.enhancedWeight +
            externalScore.total * weights.externalWeight
          );
          
          const cookStats = cookingStatsMap.get(recipe.id);
          return {
            ...recipe,
            savedDate: saved.savedDate.toISOString().split('T')[0],
            notes: saved.notes || null,
            rating: saved.rating || null,
            cookCount: cookStats?.cookCount || 0,
            lastCooked: cookStats?.lastCooked?.toISOString() || null,
            collections: (saved.recipeCollections || []).map((rc: any) => rc.collection),
            healthGrade: healthGrade.grade,
            score: {
              total: Math.min(100, Math.max(0, finalScore)),
              macroScore: baseScore.macroScore,
              tasteScore: baseScore.tasteScore,
              matchPercentage: baseScore.matchPercentage,
              behavioralScore: behavioralScore.total,
              temporalScore: temporalScore.total,
              enhancedScore: enhancedScore.total,
              discriminatoryScore: discriminatoryScore.total,
              externalScore: externalScore.total,
              healthGoalScore: healthGoalScore.total,
              healthGrade: healthGrade.grade,
              healthGradeScore: healthGrade.score,
              healthGradeBreakdown: healthGrade.breakdown,
            }
          };
        } catch (error) {
          console.error(`❌ Error calculating score for recipe ${recipe.id}:`, error);
          const cookStats = cookingStatsMap.get(recipe.id);
          return {
            ...recipe,
            savedDate: saved.savedDate.toISOString().split('T')[0],
            notes: saved.notes || null,
            rating: saved.rating || null,
            cookCount: cookStats?.cookCount || 0,
            lastCooked: cookStats?.lastCooked?.toISOString() || null,
            collections: (saved.recipeCollections || []).map((rc: any) => rc.collection)
          };
        }
      }));

      if (paginated) {
        res.json({
          recipes: recipesWithScores,
          pagination: { total, page, limit, hasMore: (page + 1) * limit < total },
        });
      } else {
        res.json(recipesWithScores);
      }
    } catch (error: any) {
      console.error('❌ Get saved recipes error:', error);
      res.status(500).json({ error: 'Failed to fetch saved recipes' });
    }
  },

  // Get liked recipes
  async getLikedRecipes(req: Request, res: Response) {
    try {
      console.log('👍 GET /api/recipes/liked called');
      const userId = getUserId(req);
      const { collectionId } = req.query;
      const { page: pageParam, limit: limitParam } = req.query as { page?: string; limit?: string };
      const paginated = pageParam !== undefined;
      const page = paginated ? Math.max(0, parseInt(pageParam as string, 10) || 0) : 0;
      const limit = paginated ? Math.min(100, Math.max(1, parseInt(limitParam as string, 10) || 50)) : 0;

      const whereClause = { userId, liked: true };
      const includeClause = {
        recipe: {
          include: {
            ingredients: { orderBy: { order: 'asc' as const } },
            instructions: { orderBy: { step: 'asc' as const } }
          }
        }
      };

      let feedbackEntries;
      let total = 0;

      if (paginated) {
        [feedbackEntries, total] = await Promise.all([
          prisma.recipeFeedback.findMany({
            where: whereClause,
            include: includeClause,
            orderBy: { createdAt: 'desc' },
            skip: page * limit,
            take: limit,
          }),
          prisma.recipeFeedback.count({ where: whereClause }),
        ]);
      } else {
        feedbackEntries = await prisma.recipeFeedback.findMany({
          where: whereClause,
          include: includeClause,
          orderBy: { createdAt: 'desc' },
        });
      }

      console.log(`👍 Found ${feedbackEntries.length} liked recipes${paginated ? ` (page ${page}, total ${total})` : ''}`);
      
      // Import scoring functions
      const { calculateRecipeScore } = require('@/utils/scoring');
      const { calculateHealthGrade } = require('@/utils/healthGrade');
      const { calculateHealthGoalMatch } = require('@/utils/healthGoalScoring');
      const { calculateDiscriminatoryScore, getUserPreferencesForScoring } = require('../../utils/discriminatoryScoring');
      
      // Get user preferences for scoring
      const userPreferences = await prisma.userPreferences.findUnique({
        where: { userId },
        include: { likedCuisines: true }
      });
      
      const macroGoals = await prisma.macroGoals.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      
      const physicalProfile = await prisma.userPhysicalProfile.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' }
      });
      
      const userPrefsForScoring = userPreferences ? getUserPreferencesForScoring(userPreferences) : null;
      const likedCuisineSet = new Set((userPreferences?.likedCuisines || []).map((c: any) => (c.name || '').toLowerCase()));
      
      let recipes = await Promise.all(feedbackEntries.map(async (entry: any) => {
        const recipe = entry.recipe;
        
        try {
          // Calculate health grade
          const healthGrade = calculateHealthGrade(recipe);
          
          // Calculate health goal match score
          const healthGoalScore = calculateHealthGoalMatch(
            recipe,
            physicalProfile?.fitnessGoal as any || null,
            macroGoals ? {
              calories: macroGoals.calories,
              protein: macroGoals.protein,
              carbs: macroGoals.carbs,
              fat: macroGoals.fat
            } : null
          );
          
          // Calculate discriminatory score
          let discriminatoryScore;
          try {
            discriminatoryScore = userPrefsForScoring ? 
              calculateDiscriminatoryScore(recipe, userPrefsForScoring) : 
              { total: 50, breakdown: {} };
          } catch (error) {
            discriminatoryScore = { total: 50, breakdown: {} };
          }
          
          // Calculate base score
          const baseScore = calculateRecipeScore(recipe, userPreferences, macroGoals, 0, 0);
          
          // Calculate final score with boosts
          const isLikedCuisine = likedCuisineSet.has((recipe.cuisine || '').toLowerCase());
          const cuisineBoost = isLikedCuisine ? 12 : 0;
          const hasImage = !!recipe.imageUrl;
          const ingredientCount = Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0;
          const instructionCount = Array.isArray(recipe.instructions) ? recipe.instructions.length : 0;
          let qualityBoost = 0;
          if (hasImage) qualityBoost += 2;
          if (ingredientCount >= 5) qualityBoost += 1;
          if (instructionCount >= 4) qualityBoost += 2;
          
          const internalScore = Math.round(
            discriminatoryScore.total * 0.35 + 
            baseScore.total * 0.35 +
            healthGoalScore.total * 0.30
          );
          
          const finalScore = Math.round(Math.min(100, internalScore + cuisineBoost + qualityBoost));
          
          return {
            ...recipe,
        savedDate: entry.createdAt.toISOString().split('T')[0],
        likedDate: entry.createdAt.toISOString().split('T')[0],
            isLiked: true,
            score: {
              total: finalScore,
              matchPercentage: finalScore,
              healthGrade: healthGrade.grade,
              healthGradeScore: healthGrade.score,
              healthGoalScore: healthGoalScore.total,
            }
          };
        } catch (error) {
          console.warn('⚠️ Error calculating score for liked recipe:', recipe.title, error);
          return {
            ...recipe,
            savedDate: entry.createdAt.toISOString().split('T')[0],
            likedDate: entry.createdAt.toISOString().split('T')[0],
            isLiked: true,
            score: {
              total: 75,
              matchPercentage: 75,
              healthGrade: 'B',
              healthGradeScore: 70,
              healthGoalScore: 50,
            }
          };
        }
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

      if (paginated) {
        res.json({
          recipes,
          pagination: { total, page, limit, hasMore: (page + 1) * limit < total },
        });
      } else {
        res.json(recipes);
      }
    } catch (error: any) {
      console.error('❌ Get liked recipes error:', error);
      res.status(500).json({ error: 'Failed to fetch liked recipes' });
    }
  },

  // Get disliked recipes
  async getDislikedRecipes(req: Request, res: Response) {
    try {
      console.log('👎 GET /api/recipes/disliked called');
      const userId = getUserId(req);
      const { collectionId } = req.query;
      const { page: pageParam, limit: limitParam } = req.query as { page?: string; limit?: string };
      const paginated = pageParam !== undefined;
      const page = paginated ? Math.max(0, parseInt(pageParam as string, 10) || 0) : 0;
      const limit = paginated ? Math.min(100, Math.max(1, parseInt(limitParam as string, 10) || 50)) : 0;

      const whereClause = { userId, disliked: true };
      const includeClause = {
        recipe: {
          include: {
            ingredients: { orderBy: { order: 'asc' as const } },
            instructions: { orderBy: { step: 'asc' as const } }
          }
        }
      };

      let feedbackEntries;
      let total = 0;

      if (paginated) {
        [feedbackEntries, total] = await Promise.all([
          prisma.recipeFeedback.findMany({
            where: whereClause,
            include: includeClause,
            orderBy: { createdAt: 'desc' },
            skip: page * limit,
            take: limit,
          }),
          prisma.recipeFeedback.count({ where: whereClause }),
        ]);
      } else {
        feedbackEntries = await prisma.recipeFeedback.findMany({
          where: whereClause,
          include: includeClause,
          orderBy: { createdAt: 'desc' },
        });
      }

      console.log(`👎 Found ${feedbackEntries.length} disliked recipes${paginated ? ` (page ${page}, total ${total})` : ''}`);
      
      // Import scoring functions
      const { calculateRecipeScore } = require('@/utils/scoring');
      const { calculateHealthGrade } = require('@/utils/healthGrade');

      // Get user preferences for scoring (best-effort)
      const userPreferences = await prisma.userPreferences.findUnique({
        where: { userId },
        include: { likedCuisines: true }
      });
      
      const macroGoals = await prisma.macroGoals.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      let recipes = await Promise.all(feedbackEntries.map(async (entry: any) => {
        const recipe = entry.recipe;
        try {
          const healthGrade = calculateHealthGrade(recipe);
          const baseScore = calculateRecipeScore(recipe, userPreferences, macroGoals, 0, 0);
          const total = Math.round(Math.min(100, Math.max(0, baseScore.total ?? 50)));
          const matchPercentage = Math.round(Math.min(100, Math.max(0, baseScore.matchPercentage ?? total)));

          return {
            ...recipe,
        dislikedDate: entry.createdAt.toISOString().split('T')[0],
            isDisliked: true,
            healthGrade: healthGrade.grade,
            score: {
              total,
              matchPercentage,
              healthGrade: healthGrade.grade,
              healthGradeScore: healthGrade.score,
              healthGradeBreakdown: healthGrade.breakdown,
            }
          };
        } catch (e) {
          return {
            ...recipe,
            dislikedDate: entry.createdAt.toISOString().split('T')[0],
            isDisliked: true,
          };
        }
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

      if (paginated) {
        res.json({
          recipes,
          pagination: { total, page, limit, hasMore: (page + 1) * limit < total },
        });
      } else {
        res.json(recipes);
      }
    } catch (error: any) {
      console.error('❌ Get disliked recipes error:', error);
      res.status(500).json({ error: 'Failed to fetch disliked recipes' });
    }
  },

  // Save recipe
  async saveRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
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
      const userId = getUserId(req);
      
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
      const userId = getUserId(req);
      const collections = await (prisma as any).collection.findMany({
        where: { userId },
        orderBy: [{ isPinned: 'desc' }, { sortOrder: 'asc' }, { isDefault: 'desc' }, { name: 'asc' }],
        include: { _count: { select: { recipeCollections: true } } },
      });
      const result = collections.map((c: any) => ({
        ...c,
        recipeCount: c._count?.recipeCollections || 0,
        _count: undefined,
      }));
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('❌ Get collections error:', error);
      res.status(500).json({ error: 'Failed to fetch collections' });
    }
  },

  // Collections: create
  async createCollection(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { name, description, coverImageUrl } = req.body as { name: string; description?: string; coverImageUrl?: string };
      if (!name) return res.status(400).json({ error: 'Name is required' });
      const collection = await (prisma as any).collection.create({
        data: { userId, name, description: description || null, coverImageUrl: coverImageUrl || null, isDefault: false },
      });
      res.json({ success: true, data: collection });
    } catch (error: any) {
      console.error('❌ Create collection error:', error);
      if (error?.code === 'P2002') {
        return res.status(409).json({ error: 'Collection already exists' });
      }
      res.status(500).json({ error: 'Failed to create collection' });
    }
  },

  // Collections: update (partial — only provided fields are updated)
  async updateCollection(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const { name, description, coverImageUrl, isPinned } = req.body as {
        name?: string; description?: string | null; coverImageUrl?: string | null; isPinned?: boolean;
      };
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;
      if (coverImageUrl !== undefined) data.coverImageUrl = coverImageUrl;
      if (isPinned !== undefined) data.isPinned = isPinned;
      const updated = await (prisma as any).collection.update({ where: { id }, data });
      res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('❌ Update collection error:', error);
      res.status(500).json({ error: 'Failed to update collection' });
    }
  },

  // Collections: delete (remove all recipe-collection associations)
  async deleteCollection(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
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
      const userId = getUserId(req);
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

  // Collections: toggle pin
  async togglePinCollection(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const collection = await (prisma as any).collection.findFirst({ where: { id, userId } });
      if (!collection) return res.status(404).json({ error: 'Collection not found' });
      const updated = await (prisma as any).collection.update({
        where: { id },
        data: { isPinned: !collection.isPinned },
      });
      res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('❌ Toggle pin collection error:', error);
      res.status(500).json({ error: 'Failed to toggle pin' });
    }
  },

  // Collections: reorder
  async reorderCollections(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { order } = req.body as { order: { id: string; sortOrder: number }[] };
      if (!order || !Array.isArray(order)) return res.status(400).json({ error: 'Order array is required' });
      await Promise.all(
        order.map(({ id, sortOrder }) =>
          (prisma as any).collection.updateMany({ where: { id, userId }, data: { sortOrder } })
        )
      );
      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ Reorder collections error:', error);
      res.status(500).json({ error: 'Failed to reorder collections' });
    }
  },

  // Collections: duplicate
  async duplicateCollection(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const source = await (prisma as any).collection.findFirst({
        where: { id, userId },
        include: { recipeCollections: true },
      });
      if (!source) return res.status(404).json({ error: 'Collection not found' });

      const newCollection = await (prisma as any).collection.create({
        data: {
          userId,
          name: `${source.name} (Copy)`,
          description: source.description,
          coverImageUrl: source.coverImageUrl,
          isDefault: false,
        },
      });

      // Copy all recipe associations
      if (source.recipeCollections.length > 0) {
        await (prisma as any).recipeCollection.createMany({
          data: source.recipeCollections.map((rc: any) => ({
            savedRecipeId: rc.savedRecipeId,
            collectionId: newCollection.id,
            addedAt: new Date(),
          })),
          skipDuplicates: true,
        });
      }

      res.json({ success: true, data: { ...newCollection, recipeCount: source.recipeCollections.length } });
    } catch (error: any) {
      console.error('❌ Duplicate collection error:', error);
      if (error?.code === 'P2002') {
        return res.status(409).json({ error: 'A collection with that name already exists' });
      }
      res.status(500).json({ error: 'Failed to duplicate collection' });
    }
  },

  // Collections: merge (move recipes from sources into target, delete sources)
  async mergeCollections(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { sourceIds, targetId } = req.body as { sourceIds: string[]; targetId: string };
      if (!sourceIds?.length || !targetId) return res.status(400).json({ error: 'sourceIds and targetId are required' });
      if (sourceIds.includes(targetId)) return res.status(400).json({ error: 'Target cannot be a source' });

      // Verify all collections belong to user
      const collections = await (prisma as any).collection.findMany({
        where: { id: { in: [...sourceIds, targetId] }, userId },
      });
      if (collections.length !== sourceIds.length + 1) {
        return res.status(404).json({ error: 'One or more collections not found' });
      }

      // Get all recipe associations from source collections
      const sourceAssociations = await (prisma as any).recipeCollection.findMany({
        where: { collectionId: { in: sourceIds } },
      });

      // Move each to target (skip duplicates)
      for (const assoc of sourceAssociations) {
        try {
          await (prisma as any).recipeCollection.create({
            data: { savedRecipeId: assoc.savedRecipeId, collectionId: targetId, addedAt: new Date() },
          });
        } catch (e: any) {
          if (e.code !== 'P2002') throw e;
        }
      }

      // Delete source recipe associations and collections
      await (prisma as any).recipeCollection.deleteMany({ where: { collectionId: { in: sourceIds } } });
      await (prisma as any).collection.deleteMany({ where: { id: { in: sourceIds }, userId } });

      const updated = await (prisma as any).collection.findUnique({
        where: { id: targetId },
        include: { _count: { select: { recipeCollections: true } } },
      });
      res.json({ success: true, data: { ...updated, recipeCount: updated._count?.recipeCollections || 0, _count: undefined } });
    } catch (error: any) {
      console.error('❌ Merge collections error:', error);
      res.status(500).json({ error: 'Failed to merge collections' });
    }
  },

  // Create user recipe
  async createRecipe(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
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
          mealType: data.mealType ? String(data.mealType) : null,
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
          mealType: data.mealType != null ? String(data.mealType) : undefined,
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
      const userId = getUserId(req);
      
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
      const userId = getUserId(req);
      
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
      const userId = getUserId(req);
      
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
      
      // Check if recipe already has a healthy grade (A, B, or C) - no need to healthify
      const healthGrade = (recipe as any).healthGrade;
      if (healthGrade && (healthGrade.toUpperCase() === 'A' || healthGrade.toUpperCase() === 'B' || healthGrade.toUpperCase() === 'C')) {
        return res.status(400).json({
          success: false,
          error: 'Recipe already healthy',
          message: `This recipe already has a healthy grade (${healthGrade}) and doesn't need healthifying. Healthify is only available for recipes with grades D or F.`,
          code: 'ALREADY_HEALTHY',
        });
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

  // Get batch cooking recommendations based on user preferences
  async getBatchCookingRecommendations(req: Request, res: Response) {
    try {
      console.log('🍱 GET /api/recipes/batch-cooking-recommendations - METHOD CALLED');
      const userId = getUserId(req);
      const limit = parseInt(req.query.limit as string) || 10;

      const recommendations = await generateBatchCookingRecommendations(userId, limit);

      console.log(`✅ Returning ${recommendations.length} batch cooking recommendations`);
      res.json(recommendations);
    } catch (error: any) {
      console.error('❌ Error in getBatchCookingRecommendations:', error);
      res.status(500).json({ error: 'Failed to fetch batch cooking recommendations', details: error.message });
    }
  },

  // Get similar recipes ("You might like")
  async getSimilarRecipes(req: Request, res: Response) {
    try {
      const recipeId = req.params.id;
      const userId = getUserId(req);
      const limit = parseInt(req.query.limit as string) || 5;
      const mealPrepMode = req.query.mealPrepMode as string;

      console.log(`🔍 GET /api/recipes/${recipeId}/similar - METHOD CALLED (mealPrepMode: ${mealPrepMode})`);

      // Get the target recipe
      const targetRecipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
        }
      });

      if (!targetRecipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      // Get user preferences for personalized recommendations
      const userPreferences = await prisma.userPreferences.findFirst({
        where: { userId },
        include: {
          likedCuisines: true,
          dietaryRestrictions: true,
          bannedIngredients: true,
          preferredSuperfoods: true,
        }
      });

      // Macro goals are used to compute the same match % shown on the Home screen
      const macroGoals = await prisma.macroGoals.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      // Build where clause for candidate recipes
      const whereClause: any = {
        isUserCreated: false,
        id: { not: recipeId }
      };

      // Filter by meal prep mode if enabled
      if (mealPrepMode === 'true' || mealPrepMode === '1') {
        whereClause.mealPrepScore = { gte: 60 };
        console.log('🍱 Filtering similar recipes for meal prep mode (min score: 60/100)');
      }

      // Fetch candidate recipes (exclude the target recipe and user-created recipes)
      const candidateRecipes = await prisma.recipe.findMany({
        where: whereClause,
        take: 200, // Get a good pool to find similarities
        include: {
          ingredients: { orderBy: { order: 'asc' } },
        }
      });

      // Use similarity utility to find similar recipes
      const { findSimilarRecipes } = require('../../utils/recipeSimilarity');
      
      const similarRecipes = findSimilarRecipes(
        {
          id: targetRecipe.id,
          title: targetRecipe.title,
          description: targetRecipe.description,
          cuisine: targetRecipe.cuisine,
          cookTime: targetRecipe.cookTime,
          calories: targetRecipe.calories,
          protein: targetRecipe.protein,
          carbs: targetRecipe.carbs,
          fat: targetRecipe.fat,
          servings: targetRecipe.servings,
          ingredients: targetRecipe.ingredients,
        },
        candidateRecipes.map(r => ({
          id: r.id,
          title: r.title,
          description: r.description,
          cuisine: r.cuisine,
          cookTime: r.cookTime,
          calories: r.calories,
          protein: r.protein,
          carbs: r.carbs,
          fat: r.fat,
          servings: r.servings,
          ingredients: r.ingredients,
        })),
        {
          limit,
          minScore: 0.2,
          // Adjust weights based on user preferences
          weights: {
            cuisine: userPreferences?.likedCuisines.length ? 0.30 : 0.25,
            ingredients: 0.30,
            nutrition: 0.20,
            cookTime: 0.10,
            semantic: 0.15,
          }
        }
      );

      // Fetch full recipe data for similar recipes
      const similarRecipeIds = similarRecipes.map((s: { recipeId: string }) => s.recipeId);
      const similarRecipesFull = await prisma.recipe.findMany({
        where: {
          id: { in: similarRecipeIds }
        },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { step: 'asc' } }
        }
      });

      // Import health grade calculator
      const { calculateHealthGrade } = require('@/utils/healthGrade');

      // Sort by similarity score
      const sortedSimilar = similarRecipesFull
        .map(recipe => {
          const similarity = similarRecipes.find((s: { recipeId: string }) => s.recipeId === recipe.id);

          // Calculate health grade for badge display
          let healthGrade: string | undefined;
          try {
            const healthResult = calculateHealthGrade(recipe);
            healthGrade = healthResult?.grade;
          } catch (e) {
            healthGrade = undefined;
          }

          // Attach user match score (drives the "% match" badge in the UI)
          // Keep this lightweight: base scoring only (no behavioral/temporal enrichment here).
          let score: {
            total: number;
            matchPercentage: number;
            macroScore?: number;
            tasteScore?: number;
            healthGrade?: string;
          } | undefined;

          try {
            // Import scoring function lazily to match existing controller patterns
            const { calculateRecipeScore } = require('@/utils/scoring');
            const baseScore = calculateRecipeScore(recipe, userPreferences, macroGoals, 0, 0);

            const total = Math.round(Math.min(100, Math.max(0, baseScore.total ?? 50)));
            const matchPercentage = Math.round(
              Math.min(100, Math.max(0, baseScore.matchPercentage ?? total))
            );

            score = {
              total,
              matchPercentage,
              macroScore: baseScore.macroScore,
              tasteScore: baseScore.tasteScore,
              healthGrade,
            };
          } catch (e: any) {
            // Log scoring error for debugging
            console.warn(`⚠️ Score calculation failed for similar recipe ${recipe.id}:`, e.message);
            score = undefined;
          }

          return {
            ...recipe,
            similarityScore: similarity?.score || 0,
            similarityFactors: similarity?.factors,
            healthGrade,
            ...(score ? { score } : {}),
          };
        })
        .sort((a, b) => b.similarityScore - a.similarityScore);

      console.log(`✅ Returning ${sortedSimilar.length} similar recipes`);

      // Apply runtime image variation for unique images
      const recipesWithVariedImages = varyImageUrlsForPage(sortedSimilar, 0);

      res.json(recipesWithVariedImages);
    } catch (error: any) {
      console.error('❌ Error in getSimilarRecipes:', error);
      res.status(500).json({ error: 'Failed to fetch similar recipes', details: error.message });
    }
  },

  // Update saved recipe notes/rating
  async updateSavedMeta(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      const { notes, rating } = req.body as { notes?: string | null; rating?: number | null };

      if (rating !== undefined && rating !== null) {
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
        }
      }

      const savedRecipe = await prisma.savedRecipe.findFirst({
        where: { userId, recipeId: id }
      });

      if (!savedRecipe) {
        return res.status(404).json({ error: 'Saved recipe not found' });
      }

      const updated = await prisma.savedRecipe.update({
        where: { id: savedRecipe.id },
        data: {
          ...(notes !== undefined ? { notes } : {}),
          ...(rating !== undefined ? { rating } : {}),
        }
      });

      console.log('✅ Saved recipe meta updated:', { recipeId: id, notes: !!updated.notes, rating: updated.rating });
      res.json({ message: 'Updated successfully', notes: updated.notes, rating: updated.rating });
    } catch (error: any) {
      console.error('❌ Update saved meta error:', error);
      res.status(500).json({ error: 'Failed to update saved recipe metadata' });
    }
  },

  // Record recipe view
  async recordView(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = getUserId(req);

      await (prisma as any).recipeView.upsert({
        where: { recipeId_userId: { recipeId: id, userId } },
        create: { recipeId: id, userId, viewedAt: new Date() },
        update: { viewedAt: new Date() },
      });

      console.log('👁️ Recipe view recorded:', id);
      res.json({ message: 'View recorded' });
    } catch (error: any) {
      console.error('❌ Record view error:', error);
      res.status(500).json({ error: 'Failed to record view' });
    }
  },

  // Get recently viewed recipes
  async getRecentlyViewed(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const limit = Math.min(50, parseInt(req.query.limit as string) || 50);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      const views = await (prisma as any).recipeView.findMany({
        where: {
          userId,
          viewedAt: { gte: cutoffDate },
        },
        include: {
          recipe: {
            include: {
              ingredients: { orderBy: { order: 'asc' } },
              instructions: { orderBy: { step: 'asc' } },
            }
          }
        },
        orderBy: { viewedAt: 'desc' },
        take: limit,
      });

      const recipes = views.map((v: any) => ({
        ...v.recipe,
        viewedAt: v.viewedAt.toISOString(),
      }));

      console.log(`👁️ Found ${recipes.length} recently viewed recipes`);
      res.json(recipes);
    } catch (error: any) {
      console.error('❌ Get recently viewed error:', error);
      res.status(500).json({ error: 'Failed to get recently viewed recipes' });
    }
  },

  // Record cooking session
  async recordCook(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      const { notes } = req.body as { notes?: string };

      await (prisma as any).cookingLog.create({
        data: { recipeId: id, userId, notes: notes || null },
      });

      console.log('🍳 Cook recorded for recipe:', id);
      res.json({ message: 'Cook recorded' });
    } catch (error: any) {
      console.error('❌ Record cook error:', error);
      res.status(500).json({ error: 'Failed to record cook' });
    }
  },

  // Get cooking history for a recipe
  async getCookingHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = getUserId(req);

      const logs = await (prisma as any).cookingLog.findMany({
        where: { recipeId: id, userId },
        orderBy: { cookedAt: 'desc' },
      });

      res.json({
        recipeId: id,
        cookCount: logs.length,
        lastCooked: logs.length > 0 ? logs[0].cookedAt.toISOString() : null,
        history: logs.map((l: any) => ({
          id: l.id,
          cookedAt: l.cookedAt.toISOString(),
          notes: l.notes,
        })),
      });
    } catch (error: any) {
      console.error('❌ Get cooking history error:', error);
      res.status(500).json({ error: 'Failed to get cooking history' });
    }
  },

  // ─── Search 2.0 ──────────────────────────────────────────────────────

  /** GET /api/recipes/autocomplete?q=...&limit=10 */
  async getAutoCompleteSuggestions(req: Request, res: Response) {
    try {
      const query = (req.query.q as string)?.trim();
      const limit = Math.min(10, parseInt(req.query.limit as string) || 10);

      if (!query || query.length < 2) {
        return res.json({ suggestions: [] });
      }

      const queryLower = query.toLowerCase();

      // Run 3 queries in parallel for speed
      // SQLite LIKE is already case-insensitive for ASCII, no mode needed
      const [recipeTitles, cuisineMatches, ingredientMatches] = await Promise.all([
        prisma.recipe.findMany({
          where: {
            isUserCreated: false,
            title: { contains: query },
          },
          select: { title: true, cuisine: true },
          take: 5,
        }),

        prisma.recipe.findMany({
          where: {
            isUserCreated: false,
            cuisine: { contains: query },
          },
          select: { cuisine: true },
          distinct: ['cuisine'],
          take: 3,
        }),

        prisma.recipeIngredient.findMany({
          where: { text: { contains: query } },
          select: { text: true },
          take: 20,
        }),
      ]);

      const suggestions: Array<{
        type: 'recipe' | 'cuisine' | 'ingredient';
        text: string;
        highlight: { start: number; end: number };
        metadata?: { cuisine?: string };
      }> = [];

      // Add recipe title suggestions
      const seenTitles = new Set<string>();
      for (const recipe of recipeTitles) {
        const titleLower = recipe.title.toLowerCase();
        if (seenTitles.has(titleLower)) continue;
        seenTitles.add(titleLower);
        const idx = titleLower.indexOf(queryLower);
        if (idx !== -1) {
          suggestions.push({
            type: 'recipe',
            text: recipe.title,
            highlight: { start: idx, end: idx + query.length },
            metadata: { cuisine: recipe.cuisine },
          });
        }
      }

      // Add cuisine suggestions
      for (const c of cuisineMatches) {
        const idx = c.cuisine.toLowerCase().indexOf(queryLower);
        if (idx !== -1) {
          suggestions.push({
            type: 'cuisine',
            text: c.cuisine,
            highlight: { start: idx, end: idx + query.length },
          });
        }
      }

      // Add ingredient suggestions (extract base ingredient name)
      const seenIngredients = new Set<string>();
      for (const ing of ingredientMatches) {
        // Strip leading quantities/units: "1cup Broccoli Florets" → "Broccoli Florets"
        const normalized = ing.text
          .replace(/^[\d./\s]+(cup|cups|tbsp|tsp|oz|lb|lbs|g|kg|ml|l|piece|pieces|clove|cloves|can|cans|bunch|bunches|pinch|dash|handful|slice|slices|sprig|sprigs|head|heads|stalk|stalks|medium|large|small)\s*/gi, '')
          .trim()
          .split(',')[0]
          .trim();
        if (!normalized || normalized.length < 2) continue;

        const normalizedLower = normalized.toLowerCase();
        if (seenIngredients.has(normalizedLower)) continue;
        seenIngredients.add(normalizedLower);

        const idx = normalizedLower.indexOf(queryLower);
        if (idx !== -1) {
          suggestions.push({
            type: 'ingredient',
            text: normalized,
            highlight: { start: idx, end: idx + query.length },
          });
        }
        if (seenIngredients.size >= 5) break;
      }

      res.json({ suggestions: suggestions.slice(0, limit) });
    } catch (error: any) {
      console.error('❌ Auto-complete error:', error);
      res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
  },

  /** GET /api/recipes/popular-searches?limit=5 */
  async getPopularSearches(req: Request, res: Response) {
    try {
      const limit = Math.min(10, parseInt(req.query.limit as string) || 5);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const popular = await prisma.searchQuery.groupBy({
        by: ['query'],
        where: {
          searchedAt: { gte: sevenDaysAgo },
          resultCount: { gt: 0 },
        },
        _count: { query: true },
        orderBy: { _count: { query: 'desc' } },
        take: limit,
      });

      res.json({
        popularSearches: popular.map((s) => ({
          query: s.query,
          count: s._count.query,
        })),
      });
    } catch (error: any) {
      console.error('❌ Popular searches error:', error);
      res.status(500).json({ error: 'Failed to fetch popular searches' });
    }
  },

  /**
   * Consolidated Home Feed endpoint
   * Replaces 7 separate API calls with a single request
   * Returns: recipeOfTheDay, suggestedRecipes, quickMeals, perfectMatches, likedRecipes, popularSearches
   */
  async getHomeFeed(req: Request, res: Response) {
    try {
      console.log('🏠 GET /api/recipes/home-feed called');
      const userId = getUserId(req);

      // Parse filter params (same as getRecipes)
      const page = Math.max(0, parseInt(req.query.page as string) || 0);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
      const offset = page * limit;
      const cuisines = req.query.cuisines as string;
      const maxCookTime = req.query.maxCookTime as string;
      const difficulty = req.query.difficulty as string;
      const mealPrepMode = req.query.mealPrepMode as string;
      const search = req.query.search as string;
      const shuffle = req.query.shuffle as string;
      const useTimeAwareDefaults = req.query.useTimeAwareDefaults as string;
      const mood = req.query.mood as string;
      const minProtein = req.query.minProtein as string;
      const maxCarbs = req.query.maxCarbs as string;
      const maxCalories = req.query.maxCalories as string;
      const dietaryRestrictions = req.query.dietaryRestrictions as string;

      // Check data sharing
      const { isDataSharingEnabledFromRequest } = require('@/utils/privacyHelper');
      const dataSharingEnabled = isDataSharingEnabledFromRequest(req);

      // 1. Fetch user context ONCE (shared across all scoring)
      let userPreferences: any = null;
      let macroGoals: any = null;
      let physicalProfile: any = null;
      let userBehavior: any = null;

      if (dataSharingEnabled) {
        [userPreferences, macroGoals, physicalProfile, userBehavior] = await Promise.all([
          prisma.userPreferences.findFirst({
            where: { userId },
            include: {
              bannedIngredients: true,
              likedCuisines: true,
              dietaryRestrictions: true,
              preferredSuperfoods: true,
            },
          }),
          prisma.macroGoals.findFirst({ where: { userId } }),
          prisma.userPhysicalProfile.findFirst({ where: { userId } }),
          getUserBehaviorData(userId),
        ]);
      } else {
        userBehavior = { likedRecipes: [], dislikedRecipes: [], savedRecipes: [], consumedRecipes: [] };
      }

      // 2. Build where clause for main recipes (same as getRecipes)
      const where: any = { isUserCreated: false };
      const andConditions: any[] = [];

      if (cuisines && typeof cuisines === 'string') {
        where.cuisine = { in: cuisines.split(',').map((c: string) => c.trim()) };
      }
      if (maxCookTime && !isNaN(Number(maxCookTime))) {
        where.cookTime = { lte: Number(maxCookTime) };
      }
      if (difficulty && typeof difficulty === 'string') {
        const diff = difficulty.toLowerCase();
        const cookTimeFilter: any = where.cookTime ? { ...where.cookTime } : {};
        if (diff === 'easy') cookTimeFilter.lte = Math.min(cookTimeFilter.lte ?? Number.MAX_SAFE_INTEGER, 30);
        else if (diff === 'medium') { cookTimeFilter.gte = Math.max(cookTimeFilter.gte ?? 0, 31); cookTimeFilter.lte = Math.min(cookTimeFilter.lte ?? Number.MAX_SAFE_INTEGER, 45); }
        else if (diff === 'hard') cookTimeFilter.gte = Math.max(cookTimeFilter.gte ?? 0, 46);
        if (Object.keys(cookTimeFilter).length > 0) where.cookTime = cookTimeFilter;
      }
      if (mealPrepMode === 'true' || mealPrepMode === '1') {
        andConditions.push({ mealPrepScore: { gte: 60 } });
      }
      if (minProtein && !isNaN(Number(minProtein))) andConditions.push({ protein: { gte: Number(minProtein) } });
      if (maxCarbs && !isNaN(Number(maxCarbs))) andConditions.push({ carbs: { lte: Number(maxCarbs) } });
      if (maxCalories && !isNaN(Number(maxCalories))) andConditions.push({ calories: { lte: Number(maxCalories) } });
      if (dietaryRestrictions && typeof dietaryRestrictions === 'string') {
        // Apply dietary restriction filtering if needed
      }
      if (useTimeAwareDefaults === 'true') {
        const { getCurrentTemporalContext } = require('@/utils/temporalScoring');
        const tc = getCurrentTemporalContext();
        const mealTypeMap: Record<string, string> = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', snack: 'snack' };
        if (mealTypeMap[tc.mealPeriod]) where.mealType = mealTypeMap[tc.mealPeriod];
      }
      if (mood) {
        const moodCriteria: Record<string, any> = {
          lazy: { maxCookTime: 20 },
          healthy: { maxCalories: 500, minProtein: 20 },
          adventurous: { cuisines: ['Thai', 'Indian', 'Japanese', 'Korean', 'Vietnamese', 'Ethiopian', 'Moroccan', 'Greek', 'Turkish'] },
          indulgent: {},
          comfort: { cuisines: ['American', 'Italian', 'Mexican', 'French', 'Chinese'] },
          energetic: { minProtein: 30, maxCookTime: 30 },
        };
        const criteria = moodCriteria[mood];
        if (criteria) {
          if (criteria.maxCookTime && !where.cookTime) where.cookTime = { lte: criteria.maxCookTime };
          if (criteria.maxCalories) andConditions.push({ calories: { lte: criteria.maxCalories } });
          if (criteria.minProtein) andConditions.push({ protein: { gte: criteria.minProtein } });
          if (criteria.cuisines && !where.cuisine) where.cuisine = { in: criteria.cuisines };
        }
      }
      if (search) {
        andConditions.push({
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        });
      }
      if (andConditions.length > 0) where.AND = andConditions;

      // Quick meals where clause (same base filters but cookTime <= 30)
      const quickMealsWhere: any = { ...where, cookTime: { lte: 30 } };
      // Remove any conflicting cookTime from andConditions
      if (quickMealsWhere.AND) {
        quickMealsWhere.AND = quickMealsWhere.AND.filter((c: any) => !c.cookTime);
      }

      // 3. Run ALL data queries in parallel
      const today = new Date();
      const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recipeInclude = {
        ingredients: { orderBy: { order: 'asc' as const } },
        instructions: { orderBy: { step: 'asc' as const } },
      };

      const [rotdCandidates, allMainRecipes, totalCount, quickMealRecipes, likedEntries, popularSearchData] = await Promise.all([
        // Recipe of the Day candidates
        prisma.recipe.findMany({
          where: { isUserCreated: false, imageUrl: { not: null } },
          include: recipeInclude,
          orderBy: [{ healthScore: 'desc' }, { qualityScore: 'desc' }],
          take: 100,
        }),
        // Main recipes (all for scoring, then paginate)
        prisma.recipe.findMany({
          where,
          include: recipeInclude,
        }),
        // Total count for pagination
        prisma.recipe.count({ where }),
        // Quick meals (≤30 min, max 10 candidates to score)
        prisma.recipe.findMany({
          where: quickMealsWhere,
          include: recipeInclude,
          take: 20,
        }),
        // Liked recipes (max 5)
        prisma.recipeFeedback.findMany({
          where: { userId, liked: true },
          include: { recipe: { include: recipeInclude } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        // Popular searches
        prisma.searchQuery.groupBy({
          by: ['query'],
          where: { searchedAt: { gte: sevenDaysAgo }, resultCount: { gt: 0 } },
          _count: { query: true },
          orderBy: { _count: { query: 'desc' } },
          take: 5,
        }),
      ]);

      // 4. Set up scoring context (shared across all recipes)
      const { getCurrentTemporalContext, calculateTemporalScore, analyzeUserTemporalPatterns } = require('@/utils/temporalScoring');
      const { calculateRecipeScore } = require('@/utils/scoring');
      const { calculateBehavioralScore } = require('@/utils/behavioralScoring');
      const { calculateEnhancedScore } = require('@/utils/enhancedScoring');
      const { calculateDiscriminatoryScore, getUserPreferencesForScoring } = require('../../utils/discriminatoryScoring');
      const { calculateHealthGoalMatch } = require('@/utils/healthGoalScoring');
      const { calculateHealthGrade } = require('@/utils/healthGrade');

      const temporalContext = getCurrentTemporalContext();
      const userTemporalPatterns = analyzeUserTemporalPatterns(userBehavior.consumedRecipes || []);
      const userPrefsForScoring = await getUserPreferencesForScoring(userId);
      const likedCuisineSet = new Set((userPreferences?.likedCuisines || []).map((c: any) => (c.name || '').toLowerCase()));

      const cookTimeContext = {
        availableTime: 30,
        timeOfDay: (temporalContext.mealPeriod === 'breakfast' ? 'morning' :
                    temporalContext.mealPeriod === 'lunch' ? 'afternoon' :
                    temporalContext.mealPeriod === 'dinner' ? 'evening' : 'night') as 'morning' | 'afternoon' | 'evening' | 'night',
        dayOfWeek: (temporalContext.isWeekend ? 'weekend' : 'weekday') as 'weekday' | 'weekend',
        urgency: 'medium' as const,
      };
      const userKitchenProfile = {
        cookingSkill: 'intermediate' as const,
        preferredCookTime: 30,
        kitchenEquipment: ['stovetop', 'oven', 'microwave', 'refrigerator', 'freezer', 'knife', 'cutting board', 'mixing bowl', 'measuring cups', 'measuring spoons', 'whisk', 'spatula', 'tongs'],
        dietaryRestrictions: [] as string[],
        budget: 'medium' as const,
      };

      const weights = {
        discriminatoryWeight: 0.60,
        baseScoreWeight: 0.25,
        healthGoalWeight: 0.15,
      };

      // Score a recipe using shared context
      function scoreRecipe(recipe: any) {
        try {
          const behavioralScore = (() => { try { return calculateBehavioralScore(recipe, userBehavior); } catch { return { total: 0 }; } })();
          const temporalScore = (() => { try { return calculateTemporalScore(recipe, temporalContext, userTemporalPatterns); } catch { return { total: 0 }; } })();
          const enhancedScore = (() => { try { return calculateEnhancedScore(recipe, cookTimeContext, userKitchenProfile); } catch { return { total: 0 }; } })();
          const discriminatoryScore = (() => { try { return userPrefsForScoring ? calculateDiscriminatoryScore(recipe, userPrefsForScoring) : { total: 50, breakdown: {} }; } catch { return { total: 50, breakdown: {} }; } })();
          const healthGoalScore = (() => { try { return calculateHealthGoalMatch(recipe, physicalProfile?.fitnessGoal || null, macroGoals ? { calories: macroGoals.calories, protein: macroGoals.protein, carbs: macroGoals.carbs, fat: macroGoals.fat } : null); } catch { return { total: 50 }; } })();
          const healthGrade = (() => { try { return calculateHealthGrade(recipe); } catch { return { grade: 'C', score: 50 }; } })();
          const baseScore = (() => { try { return calculateRecipeScore(recipe, userPreferences, macroGoals, behavioralScore.total, temporalScore.total); } catch { return { total: 50, macroScore: 50, tasteScore: 50 }; } })();

          const internalScore = Math.round(
            discriminatoryScore.total * weights.discriminatoryWeight +
            baseScore.total * weights.baseScoreWeight +
            healthGoalScore.total * weights.healthGoalWeight
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

          const finalScore = Math.round(Math.min(100, internalScore + cuisineBoost + qualityBoost));

          return {
            ...recipe,
            score: {
              total: finalScore,
              matchPercentage: finalScore,
              macroScore: baseScore.macroScore,
              tasteScore: baseScore.tasteScore,
              behavioralScore: behavioralScore.total,
              temporalScore: temporalScore.total,
              enhancedScore: enhancedScore.total,
              discriminatoryScore: discriminatoryScore.total,
              healthGoalScore: healthGoalScore.total,
              healthGrade: healthGrade.grade,
              healthGradeScore: healthGrade.score,
            },
          };
        } catch {
          return {
            ...recipe,
            score: { total: 50, matchPercentage: 50, macroScore: 50, tasteScore: 50, behavioralScore: 0, temporalScore: 0, enhancedScore: 0, discriminatoryScore: 50, healthGoalScore: 50, healthGrade: 'C', healthGradeScore: 50 },
          };
        }
      }

      // 5. Score all main recipes and sort
      const scoredMainRecipes = allMainRecipes.map(scoreRecipe);
      scoredMainRecipes.sort((a: any, b: any) => (b.score?.matchPercentage || 0) - (a.score?.matchPercentage || 0));

      // Shuffle mode for pull-to-discover
      if (shuffle === 'true') {
        for (let i = scoredMainRecipes.length - 1; i > 0; i--) {
          const j = Math.floor(Math.pow(Math.random(), 0.7) * (i + 1));
          [scoredMainRecipes[i], scoredMainRecipes[j]] = [scoredMainRecipes[j], scoredMainRecipes[i]];
        }
      }

      // Paginate main recipes
      const paginatedRecipes = varyImageUrlsForPage(scoredMainRecipes.slice(offset, offset + limit), offset);

      // 6. Score and sort quick meals
      const scoredQuickMeals = quickMealRecipes
        .filter((r: any) => r.cookTime && r.cookTime <= 30)
        .map(scoreRecipe)
        .sort((a: any, b: any) => (b.score?.matchPercentage || 0) - (a.score?.matchPercentage || 0))
        .slice(0, 5);

      // 7. Extract perfect matches from scored main recipes (≥85% match, top 5)
      const perfectMatches = scoredMainRecipes
        .filter((r: any) => r.score?.matchPercentage >= 85)
        .slice(0, 5);

      // 8. Recipe of the Day (date-seeded selection)
      let recipeOfTheDay = null;
      if (rotdCandidates.length > 0) {
        const selectedIndex = dateSeed % rotdCandidates.length;
        const rotdRaw = rotdCandidates[selectedIndex];
        const healthGrade = (() => { try { return calculateHealthGrade(rotdRaw); } catch { return { grade: 'B', score: 70 }; } })();
        recipeOfTheDay = {
          ...rotdRaw,
          healthGrade: healthGrade?.grade || 'B',
          isRecipeOfTheDay: true,
          selectedDate: today.toISOString().split('T')[0],
        };
      }

      // 9. Format liked recipes
      const likedRecipes = likedEntries.map((entry: any) => {
        const recipe = entry.recipe;
        return scoreRecipe(recipe);
      });

      // 10. Format popular searches
      const popularSearches = popularSearchData.map((s: any) => ({
        query: s.query,
        count: s._count.query,
      }));

      // Track search query for analytics (non-blocking)
      if (search && typeof search === 'string' && search.trim().length > 0) {
        recordSearchQuery(userId, search, paginatedRecipes.length).catch(() => {});
      }

      console.log(`🏠 Home feed: ${paginatedRecipes.length} suggested, ${scoredQuickMeals.length} quick, ${perfectMatches.length} perfect, ${likedRecipes.length} liked, ROTD: ${recipeOfTheDay?.title || 'none'}`);

      res.json({
        recipeOfTheDay,
        suggestedRecipes: paginatedRecipes,
        quickMeals: scoredQuickMeals,
        perfectMatches,
        likedRecipes,
        popularSearches,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: offset + paginatedRecipes.length < totalCount,
          hasPrevPage: page > 0,
        },
      });
    } catch (error: any) {
      console.error('❌ Error in getHomeFeed:', error);
      res.status(500).json({ error: 'Failed to fetch home feed', details: error.message });
    }
  },
};
