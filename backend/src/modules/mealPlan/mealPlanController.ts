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

    // Organize by date
    const weeklyPlan: { [key: string]: any } = {};
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayMeals = mealPlans.flatMap(plan => 
        plan.meals.filter(meal => 
          meal.date.toISOString().split('T')[0] === dateStr
        )
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
        }, 0)
      };
    }

    res.json({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      weeklyPlan,
      totalPlannedMeals: mealPlans.reduce((sum, plan) => sum + plan.meals.length, 0)
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
