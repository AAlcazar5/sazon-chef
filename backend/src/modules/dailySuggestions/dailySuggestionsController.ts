// backend/src/modules/dailySuggestions/dailySuggestionsController.ts
import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { generateDailySuggestions, getDailySuggestionInsights } from '@/utils/dailySuggestions';
import { getCurrentTemporalContext, analyzeUserTemporalPatterns } from '@/utils/temporalScoring';
import { getUserBehaviorData } from '../recipe/recipeController';

export const dailySuggestionsController = {
  // Get daily meal suggestions for a user
  async getDailySuggestions(req: Request, res: Response) {
    try {
      console.log('📅 GET /api/daily-suggestions - METHOD CALLED');
      const userId = 'temp-user-id'; // TODO: Replace with actual user ID from auth
      
      // Get user data
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
      
      if (!userPreferences || !macroGoals) {
        return res.status(400).json({
          error: 'User profile incomplete',
          message: 'Please complete your preferences and macro goals to get daily suggestions'
        });
      }
      
      // Get user behavioral data
      const userBehavior = await getUserBehaviorData(userId);
      
      // Get temporal context
      const temporalContext = getCurrentTemporalContext();
      const userTemporalPatterns = analyzeUserTemporalPatterns(userBehavior.consumedRecipes);
      
      // Get recent meals to avoid repetition
      const recentMeals = await prisma.mealHistory.findMany({
        where: { 
          userId,
          date: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        include: {
          recipe: true
        },
        orderBy: { date: 'desc' },
        take: 20
      });
      
      // Get planned meals for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const plannedMeals = await prisma.meal.findMany({
        where: {
          mealPlan: {
            userId
          },
          date: {
            gte: today,
            lt: tomorrow
          }
        },
        include: {
          recipe: true
        }
      });
      
      // Create context for daily suggestions
      const context = {
        userPreferences,
        macroGoals,
        userBehavior,
        temporalContext,
        userTemporalPatterns,
        recentMeals: recentMeals.map(m => m.recipe),
        plannedMeals: plannedMeals.map(m => m.recipe),
        availableIngredients: [], // TODO: Implement ingredient tracking
        timeConstraints: {
          breakfastTime: 15, // 15 minutes for breakfast
          lunchTime: 30,     // 30 minutes for lunch
          dinnerTime: 45     // 45 minutes for dinner
        }
      };
      
      // Generate daily suggestions
      const dailyPlan = await generateDailySuggestionsWithRecipes(context);
      
      // Get insights
      const insights = getDailySuggestionInsights(dailyPlan);
      
      console.log(`✅ Generated daily suggestions with ${Object.values(dailyPlan).filter(Boolean).length} meals`);
      
      res.json({
        dailyPlan,
        insights,
        generatedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error in getDailySuggestions:', error);
      res.status(500).json({ 
        error: 'Failed to generate daily suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
  
  // Get suggestions for a specific meal type
  async getMealSuggestions(req: Request, res: Response) {
    try {
      const { mealType } = req.params;
      const userId = 'temp-user-id';
      
      if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
        return res.status(400).json({ error: 'Invalid meal type' });
      }
      
      // Get user data (similar to daily suggestions)
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
      
      if (!userPreferences || !macroGoals) {
        return res.status(400).json({
          error: 'User profile incomplete',
          message: 'Please complete your preferences and macro goals'
        });
      }
      
      // Get user behavioral data and temporal context
      const userBehavior = await getUserBehaviorData(userId);
      const temporalContext = getCurrentTemporalContext();
      const userTemporalPatterns = analyzeUserTemporalPatterns(userBehavior.consumedRecipes);
      
      // Get candidate recipes for the meal type
      const candidateRecipes = await getCandidateRecipesForMeal(mealType, userPreferences, userBehavior);
      
      if (candidateRecipes.length === 0) {
        return res.json({
          suggestions: [],
          message: `No recipes found for ${mealType}`
        });
      }
      
      // Score and rank recipes
      const { calculateRecipeScore } = await import('@/utils/scoring');
      const { calculateBehavioralScore } = await import('@/utils/behavioralScoring');
      const { calculateTemporalScore } = await import('@/utils/temporalScoring');
      
      const scoredRecipes = candidateRecipes.map(recipe => {
        const behavioralScore = calculateBehavioralScore(recipe, userBehavior);
        const temporalScore = calculateTemporalScore(recipe, temporalContext, userTemporalPatterns);
        const baseScore = calculateRecipeScore(recipe, userPreferences, macroGoals, behavioralScore.total, temporalScore.total);
        
        return {
          ...recipe,
          score: {
            ...baseScore,
            behavioralScore: behavioralScore.total,
            temporalScore: temporalScore.total
          }
        };
      });
      
      // Sort by score and take top 5
      scoredRecipes.sort((a, b) => b.score.total - a.score.total);
      const topSuggestions = scoredRecipes.slice(0, 5);
      
      console.log(`✅ Generated ${topSuggestions.length} ${mealType} suggestions`);
      
      res.json({
        mealType,
        suggestions: topSuggestions,
        generatedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error in getMealSuggestions:', error);
      res.status(500).json({ 
        error: 'Failed to generate meal suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

// Helper function to generate daily suggestions with actual recipes
async function generateDailySuggestionsWithRecipes(context: any) {
  const { userPreferences, macroGoals, userBehavior, temporalContext, userTemporalPatterns } = context;
  
  // Calculate macro distribution
  const macroDistribution = {
    breakfast: {
      calories: Math.round(macroGoals.calories * 0.25),
      protein: Math.round(macroGoals.protein * 0.25),
      carbs: Math.round(macroGoals.carbs * 0.25),
      fat: Math.round(macroGoals.fat * 0.25)
    },
    lunch: {
      calories: Math.round(macroGoals.calories * 0.35),
      protein: Math.round(macroGoals.protein * 0.35),
      carbs: Math.round(macroGoals.carbs * 0.35),
      fat: Math.round(macroGoals.fat * 0.35)
    },
    dinner: {
      calories: Math.round(macroGoals.calories * 0.30),
      protein: Math.round(macroGoals.protein * 0.30),
      carbs: Math.round(macroGoals.carbs * 0.30),
      fat: Math.round(macroGoals.fat * 0.30)
    },
    snack: {
      calories: Math.round(macroGoals.calories * 0.10),
      protein: Math.round(macroGoals.protein * 0.10),
      carbs: Math.round(macroGoals.carbs * 0.10),
      fat: Math.round(macroGoals.fat * 0.10)
    }
  };
  
  // Generate suggestions for each meal
  const breakfast = await generateMealSuggestion('breakfast', context, macroDistribution.breakfast);
  const lunch = await generateMealSuggestion('lunch', context, macroDistribution.lunch);
  const dinner = await generateMealSuggestion('dinner', context, macroDistribution.dinner);
  const snack = await generateMealSuggestion('snack', context, macroDistribution.snack);
  
  // Calculate totals
  const totalMacros = {
    calories: (breakfast?.recipe?.calories || 0) + (lunch?.recipe?.calories || 0) + 
               (dinner?.recipe?.calories || 0) + (snack?.recipe?.calories || 0),
    protein: (breakfast?.recipe?.protein || 0) + (lunch?.recipe?.protein || 0) + 
             (dinner?.recipe?.protein || 0) + (snack?.recipe?.protein || 0),
    carbs: (breakfast?.recipe?.carbs || 0) + (lunch?.recipe?.carbs || 0) + 
           (dinner?.recipe?.carbs || 0) + (snack?.recipe?.carbs || 0),
    fat: (breakfast?.recipe?.fat || 0) + (lunch?.recipe?.fat || 0) + 
         (dinner?.recipe?.fat || 0) + (snack?.recipe?.fat || 0)
  };
  
  const macroProgress = {
    calories: Math.round((totalMacros.calories / macroGoals.calories) * 100),
    protein: Math.round((totalMacros.protein / macroGoals.protein) * 100),
    carbs: Math.round((totalMacros.carbs / macroGoals.carbs) * 100),
    fat: Math.round((totalMacros.fat / macroGoals.fat) * 100)
  };
  
  return {
    date: new Date().toISOString().split('T')[0],
    breakfast,
    lunch,
    dinner,
    snack,
    totalMacros,
    macroGoals,
    macroProgress
  };
}

// Helper function to generate meal-specific suggestions
async function generateMealSuggestion(mealType: string, context: any, macroTarget: any) {
  const { userPreferences, userBehavior, temporalContext, userTemporalPatterns } = context;
  
  // Get candidate recipes for this meal type
  const candidateRecipes = await getCandidateRecipesForMeal(mealType, userPreferences, userBehavior);
  
  if (candidateRecipes.length === 0) {
    return null;
  }
  
  // Score recipes
  const { calculateRecipeScore } = await import('@/utils/scoring');
  const { calculateBehavioralScore } = await import('@/utils/behavioralScoring');
  const { calculateTemporalScore } = await import('@/utils/temporalScoring');
  
  const scoredRecipes = candidateRecipes.map(recipe => {
    const behavioralScore = calculateBehavioralScore(recipe, userBehavior);
    const temporalScore = calculateTemporalScore(recipe, temporalContext, userTemporalPatterns);
    const baseScore = calculateRecipeScore(recipe, userPreferences, context.macroGoals, behavioralScore.total, temporalScore.total);
    
    // Add meal-specific scoring
    const mealSpecificScore = calculateMealTypeScore(recipe, mealType, macroTarget);
    
    const total = Math.round(baseScore.total * 0.7 + mealSpecificScore * 0.3);
    
    return {
      recipe,
      score: {
        total,
        baseScore,
        behavioralScore,
        temporalScore,
        mealSpecificScore
      }
    };
  });
  
  // Sort and pick best
  scoredRecipes.sort((a, b) => b.score.total - a.score.total);
  const best = scoredRecipes[0];
  
  if (!best) return null;
  
  return {
    recipe: best.recipe,
    score: best.score.total,
    reasoning: generateSuggestionReasoning(best.recipe, mealType, best.score, context),
    mealType: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
    estimatedTime: formatCookTime(best.recipe.cookTime),
    difficulty: assessDifficulty(best.recipe)
  };
}

// Helper function to get candidate recipes for a meal type
async function getCandidateRecipesForMeal(mealType: string, userPreferences: any, userBehavior: any) {
  // Build where clause based on meal type and user preferences
  const where: any = {
    isUserCreated: false
  };
  
  // Add meal type specific filters
  switch (mealType) {
    case 'breakfast':
      where.cookTime = { lte: 20 };
      where.calories = { lte: 500 };
      break;
    case 'lunch':
      where.cookTime = { lte: 35 };
      where.calories = { gte: 200, lte: 700 };
      break;
    case 'dinner':
      where.cookTime = { gte: 15 };
      where.calories = { gte: 300 };
      break;
    case 'snack':
      where.cookTime = { lte: 15 };
      where.calories = { lte: 300 };
      break;
  }
  
  // Add user preference filters
  if (userPreferences?.bannedIngredients?.length > 0) {
    const bannedNames = userPreferences.bannedIngredients.map((bi: any) => bi.name);
    where.NOT = {
      ingredients: {
        some: {
          text: {
            in: bannedNames
          }
        }
      }
    };
  }
  
  if (userPreferences?.likedCuisines?.length > 0) {
    const likedNames = userPreferences.likedCuisines.map((lc: any) => lc.name);
    where.cuisine = { in: likedNames };
  }
  
  // Get recipes from database
  const recipes = await prisma.recipe.findMany({
    where,
    take: 20,
    include: {
      ingredients: { orderBy: { order: 'asc' } },
      instructions: { orderBy: { step: 'asc' } }
    }
  });
  
  return recipes;
}

// Helper functions
function calculateMealTypeScore(recipe: any, mealType: string, macroTarget: any): number {
  let score = 50;
  
  // Macro matching
  const calorieDiff = Math.abs(recipe.calories - macroTarget.calories) / macroTarget.calories;
  const proteinDiff = Math.abs(recipe.protein - macroTarget.protein) / macroTarget.protein;
  const avgDiff = (calorieDiff + proteinDiff) / 2;
  const macroScore = Math.max(0, 100 - avgDiff * 100);
  
  // Meal type adjustments
  switch (mealType) {
    case 'breakfast':
      if (recipe.cookTime <= 15) score += 20;
      if (recipe.calories <= 400) score += 15;
      break;
    case 'lunch':
      if (recipe.cookTime <= 30) score += 15;
      if (recipe.calories >= 300 && recipe.calories <= 600) score += 15;
      break;
    case 'dinner':
      if (recipe.cookTime >= 20) score += 10;
      if (recipe.calories >= 400) score += 15;
      break;
    case 'snack':
      if (recipe.cookTime <= 10) score += 30;
      if (recipe.calories <= 200) score += 25;
      break;
  }
  
  return Math.round((macroScore * 0.6 + score * 0.4));
}

function generateSuggestionReasoning(recipe: any, mealType: string, score: any, context: any): string[] {
  const reasoning: string[] = [];
  
  if (score.total >= 80) {
    reasoning.push(`Perfect match for ${mealType} (${score.total}% compatibility)`);
  } else if (score.total >= 60) {
    reasoning.push(`Good choice for ${mealType} (${score.total}% compatibility)`);
  } else {
    reasoning.push(`Suitable for ${mealType} (${score.total}% compatibility)`);
  }
  
  if (score.baseScore?.macroScore >= 70) {
    reasoning.push('Excellent macro balance for your goals');
  }
  
  if (score.temporalScore?.total >= 80) {
    reasoning.push('Perfect timing for this meal period');
  }
  
  if (score.behavioralScore?.total >= 70) {
    reasoning.push('Matches your taste preferences');
  }
  
  return reasoning;
}

function formatCookTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${hours}h ${remainingMinutes}m`;
    }
  }
}

function assessDifficulty(recipe: any): 'easy' | 'medium' | 'hard' {
  const cookTime = recipe.cookTime;
  const ingredientCount = recipe.ingredients?.length || 0;
  
  let difficultyScore = 0;
  
  if (cookTime <= 15) difficultyScore += 1;
  else if (cookTime <= 30) difficultyScore += 2;
  else if (cookTime <= 60) difficultyScore += 3;
  else difficultyScore += 4;
  
  if (ingredientCount <= 5) difficultyScore += 1;
  else if (ingredientCount <= 10) difficultyScore += 2;
  else difficultyScore += 3;
  
  if (difficultyScore <= 3) return 'easy';
  else if (difficultyScore <= 6) return 'medium';
  else return 'hard';
}
