import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { getUserId } from '../../utils/authHelper';

// Get daily meal suggestions
export const getDailySuggestion = async (req: Request, res: Response) => {
  try {
      const userId = getUserId(req);
    const { date } = req.query;
    
    const targetDate = date ? new Date(date as string) : new Date();
    
    // Get user's active meal plan for the date
    const mealPlan = await prisma.mealPlan.findFirst({
      where: {
        userId,
        isActive: true,
        startDate: { lte: targetDate },
        endDate: { gte: targetDate }
      },
      include: {
        meals: {
          where: {
            date: {
              gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
              lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1)
            }
          },
          include: {
            recipe: true
          }
        }
      }
    });

    // If no meal plan exists, return empty suggestion
    if (!mealPlan) {
      return res.json({
        date: targetDate.toISOString().split('T')[0],
        meals: {
          breakfast: null,
          lunch: null,
          dinner: null,
          snacks: []
        },
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0
      });
    }

    // Organize meals by type
    const mealsByType = {
      breakfast: mealPlan.meals.find(m => m.mealType === 'breakfast'),
      lunch: mealPlan.meals.find(m => m.mealType === 'lunch'),
      dinner: mealPlan.meals.find(m => m.mealType === 'dinner'),
      snacks: mealPlan.meals.filter(m => m.mealType === 'snack')
    };

    // Calculate totals
    const totalCalories = mealPlan.meals.reduce((sum, meal) => {
      if (meal.recipe) {
        return sum + meal.recipe.calories;
      }
      return sum + (meal.customCalories || 0);
    }, 0);

    const totalProtein = mealPlan.meals.reduce((sum, meal) => {
      if (meal.recipe) {
        return sum + meal.recipe.protein;
      }
      return sum + (meal.customProtein || 0);
    }, 0);

    const totalCarbs = mealPlan.meals.reduce((sum, meal) => {
      if (meal.recipe) {
        return sum + meal.recipe.carbs;
      }
      return sum + (meal.customCarbs || 0);
    }, 0);

    const totalFat = mealPlan.meals.reduce((sum, meal) => {
      if (meal.recipe) {
        return sum + meal.recipe.fat;
      }
      return sum + (meal.customFat || 0);
    }, 0);

    res.json({
      date: targetDate.toISOString().split('T')[0],
      meals: mealsByType,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat
    });
  } catch (error) {
    console.error('Error getting daily suggestion:', error);
    res.status(500).json({ error: 'Failed to get daily suggestion' });
  }
};

// Get weekly meal plan
export const getWeeklyPlan = async (req: Request, res: Response) => {
  try {
      const userId = getUserId(req);
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date();
    const end = endDate ? new Date(endDate as string) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Get user's active meal plans for the week
    const mealPlans = await prisma.mealPlan.findMany({
      where: {
        userId,
        isActive: true,
        startDate: { lte: end },
        endDate: { gte: start }
      },
      include: {
        meals: {
          where: {
            date: {
              gte: start,
              lte: end
            }
          },
          include: {
            recipe: true
          }
        }
      }
    });

    // Get meal prep sessions for the week
    const mealPrepSessions = await prisma.mealPrepSession.findMany({
      where: {
        userId,
        scheduledDate: {
          gte: start,
          lte: end
        }
      },
      include: {
        recipes: {
          include: {
            recipe: {
              include: {
                ingredients: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // Get active meal prep portions (available for consumption)
    const mealPrepPortions = await prisma.mealPrepPortion.findMany({
      where: {
        userId,
        AND: [
          {
            OR: [
              { freshServingsRemaining: { gt: 0 } },
              { frozenServingsRemaining: { gt: 0 } },
            ],
          },
          {
            OR: [
              { expiryDate: null },
              { expiryDate: { gte: start } },
            ],
          },
          {
            OR: [
              { freezerExpiryDate: null },
              { freezerExpiryDate: { gte: start } },
            ],
          },
        ],
      },
      include: {
        recipe: {
          include: {
            ingredients: { orderBy: { order: 'asc' } },
          },
        },
        consumedPortions: {
          orderBy: { consumedDate: 'desc' },
          take: 5, // Recent consumption
        },
      },
    });

    // Organize by date
    const weeklyPlan: { [key: string]: any } = {};
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayMeals = mealPlans.flatMap(plan => 
        plan.meals.filter(meal => 
          meal.date.toISOString().split('T')[0] === dateStr
        )
      );

      // Get meal prep sessions for this date
      const dayMealPrepSessions = mealPrepSessions.filter(session => 
        session.scheduledDate.toISOString().split('T')[0] === dateStr
      );

      weeklyPlan[dateStr] = {
        date: dateStr,
        meals: {
          breakfast: dayMeals.find(m => m.mealType === 'breakfast'),
          lunch: dayMeals.find(m => m.mealType === 'lunch'),
          dinner: dayMeals.find(m => m.mealType === 'dinner'),
          snacks: dayMeals.filter(m => m.mealType === 'snack')
        },
        totalCalories: dayMeals.reduce((sum, meal) => {
          if (meal.recipe) return sum + meal.recipe.calories;
          return sum + (meal.customCalories || 0);
        }, 0),
        mealPrepSessions: dayMealPrepSessions,
      };
    }

    res.json({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      weeklyPlan,
      totalPlannedMeals: mealPlans.reduce((sum, plan) => sum + plan.meals.length, 0),
      mealPrepPortions, // Available meal prep portions
    });
  } catch (error) {
    console.error('Error getting weekly plan:', error);
    res.status(500).json({ error: 'Failed to get weekly plan' });
  }
};

// Generate new meal plan
export const generateMealPlan = async (req: Request, res: Response) => {
  try {
      const userId = getUserId(req);
    const { preferences } = req.body;
    
    // For now, create an empty meal plan
    // TODO: Implement AI-powered meal plan generation
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const mealPlan = await prisma.mealPlan.create({
      data: {
        userId,
        name: 'Generated Meal Plan',
        startDate,
        endDate,
        isActive: true
      }
    });

    res.json({
      message: 'Meal plan generated successfully',
      mealPlan: {
        id: mealPlan.id,
        name: mealPlan.name,
        startDate: mealPlan.startDate,
        endDate: mealPlan.endDate
      }
    });
  } catch (error) {
    console.error('Error generating meal plan:', error);
    res.status(500).json({ error: 'Failed to generate meal plan' });
  }
};

// Get meal history
export const getMealHistory = async (req: Request, res: Response) => {
  try {
      const userId = getUserId(req);
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    
    const mealHistory = await prisma.mealHistory.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lte: end
        }
      },
      include: {
        recipe: true
      },
      orderBy: {
        date: 'desc'
      }
    });

    res.json({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      meals: mealHistory,
      totalMeals: mealHistory.length
    });
  } catch (error) {
    console.error('Error getting meal history:', error);
    res.status(500).json({ error: 'Failed to get meal history' });
  }
};

// Add recipe to meal plan
export const addRecipeToMeal = async (req: Request, res: Response) => {
  try {
      const userId = getUserId(req);
    const { mealPlanId, recipeId, date, mealType } = req.body;
    
    // Get or create active meal plan
    let mealPlan;
    if (mealPlanId) {
      mealPlan = await prisma.mealPlan.findFirst({
        where: { id: mealPlanId, userId }
      });
    } else {
      // Create new meal plan for the week
      const startDate = new Date(date);
      const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      mealPlan = await prisma.mealPlan.create({
        data: {
          userId,
          name: 'My Meal Plan',
          startDate,
          endDate,
          isActive: true
        }
      });
    }

    if (!mealPlan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    // Add recipe to meal
    const meal = await prisma.meal.create({
      data: {
        mealPlanId: mealPlan.id,
        date: new Date(date),
        mealType,
        recipeId
      },
      include: {
        recipe: true
      }
    });

    res.json({
      message: 'Recipe added to meal plan successfully',
      meal
    });
  } catch (error) {
    console.error('Error adding recipe to meal:', error);
    res.status(500).json({ error: 'Failed to add recipe to meal plan' });
  }
};

// Update meal completion status
export const updateMealCompletion = async (req: Request, res: Response) => {
  try {
    console.log('🍽️ PUT /api/meal-plan/meals/:mealId/complete - Route hit');
    const userId = getUserId(req);
    const { mealId } = req.params;
    const { isCompleted } = req.body;
    console.log('🍽️ Meal ID:', mealId, 'isCompleted:', isCompleted);

    // Find the meal and verify it belongs to the user
    const meal = await prisma.meal.findFirst({
      where: {
        id: mealId,
        mealPlan: {
          userId
        }
      }
    });

    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    // Update completion status
    const updatedMeal = await prisma.meal.update({
      where: { id: mealId },
      data: {
        isCompleted: isCompleted === true,
        completedAt: isCompleted === true ? new Date() : null
      },
      include: {
        recipe: true
      }
    });

    res.json(updatedMeal);
  } catch (error) {
    console.error('Error updating meal completion:', error);
    res.status(500).json({ error: 'Failed to update meal completion' });
  }
};

// Update meal notes
export const updateMealNotes = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { mealId } = req.params;
    const { notes } = req.body;

    // Find the meal and verify it belongs to the user
    const meal = await prisma.meal.findFirst({
      where: {
        id: mealId,
        mealPlan: {
          userId
        }
      }
    });

    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    // Update notes
    const updatedMeal = await prisma.meal.update({
      where: { id: mealId },
      data: { notes: notes || null },
      include: {
        recipe: true
      }
    });

    res.json(updatedMeal);
  } catch (error) {
    console.error('Error updating meal notes:', error);
    res.status(500).json({ error: 'Failed to update meal notes' });
  }
};

// Get meal swap suggestions
export const getMealSwapSuggestions = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { mealId } = req.params;

    // Find the meal and verify it belongs to the user
    const meal = await prisma.meal.findFirst({
      where: {
        id: mealId,
        mealPlan: {
          userId
        }
      },
      include: {
        recipe: true
      }
    });

    if (!meal || !meal.recipe) {
      return res.status(404).json({ error: 'Meal or recipe not found' });
    }

    // Get user preferences for recommendations
    const userPreferences = await prisma.userPreferences.findUnique({
      where: { userId },
      include: {
        likedCuisines: true,
        dietaryRestrictions: true,
        bannedIngredients: true
      }
    });

    // Find similar recipes based on:
    // 1. Same meal type
    // 2. Similar macros (within 20% of original)
    // 3. User preferences (cuisine, dietary restrictions)
    // 4. Different recipe (not the same one)
    const targetCalories = meal.recipe.calories;
    const targetProtein = meal.recipe.protein;
    const targetCarbs = meal.recipe.carbs;
    const targetFat = meal.recipe.fat;

    const likedCuisines = userPreferences?.likedCuisines.map(c => c.name) || [];
    const dietaryRestrictions = userPreferences?.dietaryRestrictions.map(d => d.name) || [];
    const bannedIngredients = userPreferences?.bannedIngredients.map(b => b.name.toLowerCase()) || [];

    // Build query for similar recipes
    const where: any = {
      id: { not: meal.recipeId },
      mealType: meal.mealType,
      calories: {
        gte: Math.round(targetCalories * 0.8),
        lte: Math.round(targetCalories * 1.2)
      }
    };

    // Filter by liked cuisines if available
    if (likedCuisines.length > 0) {
      where.cuisine = { in: likedCuisines };
    }

    // Get candidate recipes
    const candidates = await prisma.recipe.findMany({
      where,
      take: 20,
      include: {
        ingredients: true
      }
    });

    // Score and filter candidates
    const suggestions = candidates
      .map(recipe => {
        // Calculate similarity score
        const calorieDiff = Math.abs(recipe.calories - targetCalories) / targetCalories;
        const proteinDiff = Math.abs(recipe.protein - targetProtein) / Math.max(targetProtein, 1);
        const carbsDiff = Math.abs(recipe.carbs - targetCarbs) / Math.max(targetCarbs, 1);
        const fatDiff = Math.abs(recipe.fat - targetFat) / Math.max(targetFat, 1);

        // Check for banned ingredients
        const recipeIngredients = recipe.ingredients.map(i => i.text.toLowerCase());
        const hasBannedIngredient = bannedIngredients.some(banned => 
          recipeIngredients.some(ing => ing.includes(banned))
        );

        if (hasBannedIngredient) {
          return null; // Skip recipes with banned ingredients
        }

        // Calculate similarity score (lower is better)
        const similarityScore = (calorieDiff * 0.4) + (proteinDiff * 0.3) + (carbsDiff * 0.15) + (fatDiff * 0.15);

        return {
          recipe,
          similarityScore,
          macroDifference: {
            calories: recipe.calories - targetCalories,
            protein: recipe.protein - targetProtein,
            carbs: recipe.carbs - targetCarbs,
            fat: recipe.fat - targetFat
          }
        };
      })
      .filter(item => item !== null)
      .sort((a, b) => a!.similarityScore - b!.similarityScore)
      .slice(0, 5) // Top 5 suggestions
      .map(item => ({
        recipe: item!.recipe,
        macroDifference: item!.macroDifference,
        reason: getSwapReason(item!.recipe, meal.recipe!, item!.macroDifference)
      }));

    res.json({
      originalMeal: meal,
      suggestions
    });
  } catch (error) {
    console.error('Error getting meal swap suggestions:', error);
    res.status(500).json({ error: 'Failed to get meal swap suggestions' });
  }
};

// Helper function to generate swap reason
function getSwapReason(newRecipe: any, originalRecipe: any, macroDiff: any): string {
  const reasons: string[] = [];

  if (Math.abs(macroDiff.calories) < 50) {
    reasons.push('similar calories');
  } else if (macroDiff.calories < 0) {
    reasons.push(`${Math.abs(macroDiff.calories)} fewer calories`);
  } else {
    reasons.push(`${macroDiff.calories} more calories`);
  }

  if (newRecipe.cuisine !== originalRecipe.cuisine) {
    reasons.push(`different cuisine (${newRecipe.cuisine})`);
  }

  if (newRecipe.cookTime < originalRecipe.cookTime) {
    reasons.push(`${originalRecipe.cookTime - newRecipe.cookTime} min faster`);
  }

  return reasons.length > 0 ? reasons.join(', ') : 'similar recipe';
}

// Get weekly nutrition summary
export const getWeeklyNutritionSummary = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date();
    const end = endDate ? new Date(endDate as string) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get all meals for the week
    const mealPlans = await prisma.mealPlan.findMany({
      where: {
        userId,
        isActive: true,
        startDate: { lte: end },
        endDate: { gte: start }
      },
      include: {
        meals: {
          where: {
            date: {
              gte: start,
              lte: end
            }
          },
          include: {
            recipe: true
          }
        }
      }
    });

    // Calculate totals
    const allMeals = mealPlans.flatMap(plan => plan.meals);
    const completedMeals = allMeals.filter(meal => meal.isCompleted);

    const totalCalories = allMeals.reduce((sum, meal) => {
      if (meal.recipe) return sum + meal.recipe.calories;
      return sum + (meal.customCalories || 0);
    }, 0);

    const totalProtein = allMeals.reduce((sum, meal) => {
      if (meal.recipe) return sum + meal.recipe.protein;
      return sum + (meal.customProtein || 0);
    }, 0);

    const totalCarbs = allMeals.reduce((sum, meal) => {
      if (meal.recipe) return sum + meal.recipe.carbs;
      return sum + (meal.customCarbs || 0);
    }, 0);

    const totalFat = allMeals.reduce((sum, meal) => {
      if (meal.recipe) return sum + meal.recipe.fat;
      return sum + (meal.customFat || 0);
    }, 0);

    // Calculate completed totals
    const completedCalories = completedMeals.reduce((sum, meal) => {
      if (meal.recipe) return sum + meal.recipe.calories;
      return sum + (meal.customCalories || 0);
    }, 0);

    const completedProtein = completedMeals.reduce((sum, meal) => {
      if (meal.recipe) return sum + meal.recipe.protein;
      return sum + (meal.customProtein || 0);
    }, 0);

    const completedCarbs = completedMeals.reduce((sum, meal) => {
      if (meal.recipe) return sum + meal.recipe.carbs;
      return sum + (meal.customCarbs || 0);
    }, 0);

    const completedFat = completedMeals.reduce((sum, meal) => {
      if (meal.recipe) return sum + meal.recipe.fat;
      return sum + (meal.customFat || 0);
    }, 0);

    // Calculate daily averages
    const daysInRange = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const avgDailyCalories = totalCalories / daysInRange;
    const avgDailyProtein = totalProtein / daysInRange;
    const avgDailyCarbs = totalCarbs / daysInRange;
    const avgDailyFat = totalFat / daysInRange;

    // Get user macro goals for comparison
    const macroGoals = await prisma.macroGoals.findUnique({
      where: { userId }
    });

    res.json({
      period: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        days: daysInRange
      },
      totals: {
        calories: totalCalories,
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat
      },
      completed: {
        calories: completedCalories,
        protein: completedProtein,
        carbs: completedCarbs,
        fat: completedFat,
        mealsCompleted: completedMeals.length,
        totalMeals: allMeals.length,
        completionRate: allMeals.length > 0 ? (completedMeals.length / allMeals.length) * 100 : 0
      },
      averages: {
        dailyCalories: avgDailyCalories,
        dailyProtein: avgDailyProtein,
        dailyCarbs: avgDailyCarbs,
        dailyFat: avgDailyFat
      },
      goals: macroGoals ? {
        dailyCalories: macroGoals.calories,
        dailyProtein: macroGoals.protein,
        dailyCarbs: macroGoals.carbs,
        dailyFat: macroGoals.fat,
        weeklyCalories: macroGoals.calories * 7,
        weeklyProtein: macroGoals.protein * 7,
        weeklyCarbs: macroGoals.carbs * 7,
        weeklyFat: macroGoals.fat * 7
      } : null
    });
  } catch (error) {
    console.error('Error getting weekly nutrition summary:', error);
    res.status(500).json({ error: 'Failed to get weekly nutrition summary' });
  }
};
