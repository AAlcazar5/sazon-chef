// backend/src/modules/mealHistory/mealHistoryController.ts
import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';

export const mealHistoryController = {
  // Get user's meal history
  async getMealHistory(req: Request, res: Response) {
    try {
      console.log('📊 GET /api/meal-history - METHOD CALLED');
      const userId = 'temp-user-id'; // TODO: Replace with actual user ID from auth
      
      const { 
        startDate, 
        endDate, 
        limit = '50',
        offset = '0'
      } = req.query;
      
      // Build where clause
      const where: any = { userId };
      
      // Date range filtering
      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          where.date.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.date.lte = new Date(endDate as string);
        }
      }
      
      // Get meal history with recipe details
      const mealHistory = await prisma.mealHistory.findMany({
        where,
        include: {
          recipe: {
            include: {
              ingredients: { orderBy: { order: 'asc' } },
              instructions: { orderBy: { step: 'asc' } }
            }
          }
        },
        orderBy: { date: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string)
      });
      
      // Calculate summary statistics
      const summary = await calculateMealHistorySummary(userId, mealHistory);
      
      console.log(`✅ Retrieved ${mealHistory.length} meal history entries`);
      
      res.json({
        mealHistory,
        summary,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: mealHistory.length
        }
      });
      
    } catch (error) {
      console.error('❌ Error in getMealHistory:', error);
      res.status(500).json({ 
        error: 'Failed to fetch meal history',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
  
  // Add a meal to history
  async addMealToHistory(req: Request, res: Response) {
    try {
      console.log('📝 POST /api/meal-history - METHOD CALLED');
      const userId = 'temp-user-id'; // TODO: Replace with actual user ID from auth
      
      const {
        recipeId,
        date,
        consumed = true,
        feedback
      } = req.body;
      
      // Validate required fields
      if (!recipeId) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'recipeId is required'
        });
      }
      
      // Verify recipe exists
      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId }
      });
      
      if (!recipe) {
        return res.status(404).json({
          error: 'Recipe not found',
          message: 'The specified recipe does not exist'
        });
      }
      
      // Create meal history entry
      const mealEntry = await prisma.mealHistory.create({
        data: {
          recipeId,
          userId,
          date: date ? new Date(date) : new Date(),
          consumed,
          feedback
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
      
      console.log(`✅ Added meal to history: ${recipe.title}`);
      
      res.status(201).json({
        message: 'Meal added to history successfully',
        mealEntry
      });
      
    } catch (error) {
      console.error('❌ Error in addMealToHistory:', error);
      res.status(500).json({ 
        error: 'Failed to add meal to history',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
  
  // Update a meal history entry
  async updateMealHistory(req: Request, res: Response) {
    try {
      console.log('📝 PUT /api/meal-history/:id - METHOD CALLED');
      const { id } = req.params;
      const userId = 'temp-user-id'; // TODO: Replace with actual user ID from auth
      
      const {
        consumed,
        feedback
      } = req.body;
      
      // Verify the meal history entry exists and belongs to user
      const existingEntry = await prisma.mealHistory.findFirst({
        where: { 
          id,
          userId 
        }
      });
      
      if (!existingEntry) {
        return res.status(404).json({
          error: 'Meal history entry not found',
          message: 'The specified meal history entry does not exist or does not belong to you'
        });
      }
      
      // Update the meal history entry
      const updatedEntry = await prisma.mealHistory.update({
        where: { id },
        data: {
          ...(consumed !== undefined && { consumed }),
          ...(feedback && { feedback })
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
      
      console.log(`✅ Updated meal history entry: ${id}`);
      
      res.json({
        message: 'Meal history updated successfully',
        mealEntry: updatedEntry
      });
      
    } catch (error) {
      console.error('❌ Error in updateMealHistory:', error);
      res.status(500).json({ 
        error: 'Failed to update meal history',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
  
  // Delete a meal history entry
  async deleteMealHistory(req: Request, res: Response) {
    try {
      console.log('🗑️ DELETE /api/meal-history/:id - METHOD CALLED');
      const { id } = req.params;
      const userId = 'temp-user-id'; // TODO: Replace with actual user ID from auth
      
      // Verify the meal history entry exists and belongs to user
      const existingEntry = await prisma.mealHistory.findFirst({
        where: { 
          id,
          userId 
        }
      });
      
      if (!existingEntry) {
        return res.status(404).json({
          error: 'Meal history entry not found',
          message: 'The specified meal history entry does not exist or does not belong to you'
        });
      }
      
      // Delete the meal history entry
      await prisma.mealHistory.delete({
        where: { id }
      });
      
      console.log(`✅ Deleted meal history entry: ${id}`);
      
      res.json({
        message: 'Meal history entry deleted successfully'
      });
      
    } catch (error) {
      console.error('❌ Error in deleteMealHistory:', error);
      res.status(500).json({ 
        error: 'Failed to delete meal history',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
  
  // Get meal history analytics
  async getMealHistoryAnalytics(req: Request, res: Response) {
    try {
      console.log('📈 GET /api/meal-history/analytics - METHOD CALLED');
      const userId = 'temp-user-id'; // TODO: Replace with actual user ID from auth
      
      const { 
        period = '30', // days
        groupBy = 'day' // day, week, month
      } = req.query;
      
      const days = parseInt(period as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Get meal history for the period
      const mealHistory = await prisma.mealHistory.findMany({
        where: {
          userId,
          date: {
            gte: startDate
          }
        },
        include: {
          recipe: true
        },
        orderBy: { date: 'asc' }
      });
      
      // Calculate analytics
      const analytics = await calculateMealHistoryAnalytics(mealHistory, groupBy as string);
      
      console.log(`✅ Generated analytics for ${mealHistory.length} meals over ${days} days`);
      
      res.json({
        period: `${days} days`,
        groupBy,
        analytics,
        generatedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error in getMealHistoryAnalytics:', error);
      res.status(500).json({ 
        error: 'Failed to generate meal history analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
  
  // Get meal history insights
  async getMealHistoryInsights(req: Request, res: Response) {
    try {
      console.log('🔍 GET /api/meal-history/insights - METHOD CALLED');
      const userId = 'temp-user-id'; // TODO: Replace with actual user ID from auth
      
      // Get recent meal history (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentMeals = await prisma.mealHistory.findMany({
        where: {
          userId,
          date: {
            gte: thirtyDaysAgo
          }
        },
        include: {
          recipe: true
        },
        orderBy: { date: 'desc' }
      });
      
      // Generate insights
      const insights = await generateMealHistoryInsights(recentMeals);
      
      console.log(`✅ Generated insights from ${recentMeals.length} recent meals`);
      
      res.json({
        insights,
        period: '30 days',
        totalMeals: recentMeals.length,
        generatedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error in getMealHistoryInsights:', error);
      res.status(500).json({ 
        error: 'Failed to generate meal history insights',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

// Helper function to calculate meal history summary
async function calculateMealHistorySummary(userId: string, mealHistory: any[]) {
  const totalMeals = mealHistory.length;
  const consumedMeals = mealHistory.filter(m => m.consumed).length;
  
  // Calculate macro totals
  const totalMacros = mealHistory.reduce((totals, meal) => {
    if (meal.consumed && meal.recipe) {
      totals.calories += meal.recipe.calories || 0;
      totals.protein += meal.recipe.protein || 0;
      totals.carbs += meal.recipe.carbs || 0;
      totals.fat += meal.recipe.fat || 0;
    }
    return totals;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  
  // Calculate feedback distribution
  const feedbackDistribution = mealHistory.reduce((dist, meal) => {
    const feedback = meal.feedback || 'none';
    dist[feedback] = (dist[feedback] || 0) + 1;
    return dist;
  }, {} as Record<string, number>);
  
  // Calculate cuisine preferences
  const cuisineDistribution = mealHistory.reduce((dist, meal) => {
    if (meal.recipe) {
      const cuisine = meal.recipe.cuisine;
      dist[cuisine] = (dist[cuisine] || 0) + 1;
    }
    return dist;
  }, {} as Record<string, number>);
  
  // Get most recent meal
  const mostRecentMeal = mealHistory.length > 0 ? mealHistory[0] : null;
  
  return {
    totalMeals,
    consumedMeals,
    totalMacros,
    feedbackDistribution,
    cuisineDistribution,
    mostRecentMeal: mostRecentMeal ? {
      id: mostRecentMeal.id,
      recipeTitle: mostRecentMeal.recipe?.title,
      feedback: mostRecentMeal.feedback,
      date: mostRecentMeal.date
    } : null
  };
}

// Helper function to calculate meal history analytics
async function calculateMealHistoryAnalytics(mealHistory: any[], groupBy: string) {
  const analytics: any = {
    totalMeals: mealHistory.length,
    consumedMeals: mealHistory.filter(m => m.consumed).length,
    macroTrends: {
      calories: [],
      protein: [],
      carbs: [],
      fat: []
    },
    feedbackTrends: {},
    cuisineTrends: {}
  };
  
  // Group meals by time period
  const groupedMeals = groupMealsByPeriod(mealHistory, groupBy);
  
  // Calculate trends for each period
  for (const [period, meals] of Object.entries(groupedMeals)) {
    const periodMeals = meals as any[];
    
    // Macro trends
    const periodMacros = periodMeals.reduce((totals, meal) => {
      if (meal.consumed && meal.recipe) {
        totals.calories += meal.recipe.calories || 0;
        totals.protein += meal.recipe.protein || 0;
        totals.carbs += meal.recipe.carbs || 0;
        totals.fat += meal.recipe.fat || 0;
      }
      return totals;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    
    analytics.macroTrends.calories.push({ period, value: periodMacros.calories });
    analytics.macroTrends.protein.push({ period, value: periodMacros.protein });
    analytics.macroTrends.carbs.push({ period, value: periodMacros.carbs });
    analytics.macroTrends.fat.push({ period, value: periodMacros.fat });
    
    // Feedback trends
    const feedbackCounts = periodMeals.reduce((counts, meal) => {
      const feedback = meal.feedback || 'none';
      counts[feedback] = (counts[feedback] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    analytics.feedbackTrends[period] = feedbackCounts;
    
    // Cuisine trends
    const cuisineCounts = periodMeals.reduce((counts, meal) => {
      if (meal.recipe) {
        const cuisine = meal.recipe.cuisine;
        counts[cuisine] = (counts[cuisine] || 0) + 1;
      }
      return counts;
    }, {} as Record<string, number>);
    
    analytics.cuisineTrends[period] = cuisineCounts;
  }
  
  return analytics;
}

// Helper function to group meals by time period
function groupMealsByPeriod(mealHistory: any[], groupBy: string): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  
  mealHistory.forEach(meal => {
    const date = new Date(meal.date);
    let period: string;
    
    switch (groupBy) {
      case 'day':
        period = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        period = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default:
        period = date.toISOString().split('T')[0];
    }
    
    if (!grouped[period]) {
      grouped[period] = [];
    }
    grouped[period].push(meal);
  });
  
  return grouped;
}

// Helper function to generate meal history insights
async function generateMealHistoryInsights(recentMeals: any[]) {
  const insights: any[] = [];
  
  if (recentMeals.length === 0) {
    insights.push({
      type: 'info',
      title: 'No Recent Meals',
      message: 'Start tracking your meals to get personalized insights!',
      priority: 'low'
    });
    return insights;
  }
  
  // Calculate basic statistics
  const totalMeals = recentMeals.length;
  const consumedMeals = recentMeals.filter(m => m.consumed).length;
  const likedMeals = recentMeals.filter(m => m.feedback === 'liked').length;
  const dislikedMeals = recentMeals.filter(m => m.feedback === 'disliked').length;
  
  // Meal frequency insights
  const daysWithMeals = new Set(recentMeals.map(m => m.date.toISOString().split('T')[0])).size;
  const mealFrequency = totalMeals / 30; // meals per day
  
  if (mealFrequency < 2) {
    insights.push({
      type: 'suggestion',
      title: 'Increase Meal Frequency',
      message: `You're averaging ${Math.round(mealFrequency * 10) / 10} meals per day. Consider adding more regular meals for better nutrition.`,
      priority: 'medium'
    });
  }
  
  // Feedback insights
  if (likedMeals > 0 && dislikedMeals > 0) {
    const satisfactionRatio = likedMeals / (likedMeals + dislikedMeals);
    if (satisfactionRatio < 0.5) {
      insights.push({
        type: 'concern',
        title: 'Low Meal Satisfaction',
        message: `You've disliked more meals than you've liked recently. Consider trying new recipes or adjusting your preferences.`,
        priority: 'high'
      });
    } else if (satisfactionRatio >= 0.8) {
      insights.push({
        type: 'positive',
        title: 'Great Meal Satisfaction',
        message: `Excellent! You've liked ${likedMeals} meals and only disliked ${dislikedMeals} recently. Keep up the great choices!`,
        priority: 'low'
      });
    }
  }
  
  // Cuisine diversity insights
  const cuisines = new Set(recentMeals.map(m => m.recipe?.cuisine).filter(Boolean));
  if (cuisines.size < 3) {
    insights.push({
      type: 'suggestion',
      title: 'Expand Cuisine Diversity',
      message: `You've tried ${cuisines.size} different cuisines recently. Consider exploring new culinary traditions!`,
      priority: 'medium'
    });
  }
  
  // Consumption insights
  const consumptionRate = consumedMeals / totalMeals;
  if (consumptionRate < 0.8) {
    insights.push({
      type: 'suggestion',
      title: 'Track More Meals',
      message: `You've only marked ${Math.round(consumptionRate * 100)}% of your meals as consumed. Consider tracking more meals for better insights.`,
      priority: 'medium'
    });
  }
  
  // Recent activity insights
  const lastMeal = recentMeals[0];
  const daysSinceLastMeal = Math.floor((Date.now() - lastMeal.date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceLastMeal > 3) {
    insights.push({
      type: 'reminder',
      title: 'Track Your Meals',
      message: `It's been ${daysSinceLastMeal} days since your last meal entry. Keep tracking for better insights!`,
      priority: 'medium'
    });
  }
  
  return insights;
}
