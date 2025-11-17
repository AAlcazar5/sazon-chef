// backend/src/modules/mealPrep/mealPrepController.ts
import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';

export const mealPrepController = {
  // Create a meal prep portion entry
  async createMealPrepPortion(req: Request, res: Response) {
    try {
      console.log('🍱 POST /api/meal-prep/portions - METHOD CALLED');
      const userId = getUserId(req);

      const {
        recipeId,
        totalServings,
        servingsToFreeze,
        servingsForWeek,
        prepDate,
        notes,
      } = req.body;

      // Validate required fields
      if (!recipeId || !totalServings) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'recipeId and totalServings are required',
        });
      }

      // Validate servings add up
      const calculatedTotal = (servingsToFreeze || 0) + (servingsForWeek || 0);
      if (calculatedTotal !== totalServings) {
        return res.status(400).json({
          error: 'Invalid portion allocation',
          message: `servingsToFreeze (${servingsToFreeze || 0}) + servingsForWeek (${servingsForWeek || 0}) must equal totalServings (${totalServings})`,
        });
      }

      // Verify recipe exists
      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
      });

      if (!recipe) {
        return res.status(404).json({
          error: 'Recipe not found',
          message: 'The specified recipe does not exist',
        });
      }

      // Calculate expiry dates based on recipe storage info
      const prepDateObj = prepDate ? new Date(prepDate) : new Date();
      let expiryDate: Date | null = null;
      let freezerExpiryDate: Date | null = null;

      if (recipe.fridgeStorageDays && servingsForWeek > 0) {
        expiryDate = new Date(prepDateObj);
        expiryDate.setDate(expiryDate.getDate() + recipe.fridgeStorageDays);
      }

      if (recipe.freezerStorageMonths && servingsToFreeze > 0) {
        freezerExpiryDate = new Date(prepDateObj);
        freezerExpiryDate.setMonth(freezerExpiryDate.getMonth() + recipe.freezerStorageMonths);
      } else if (recipe.freezable && servingsToFreeze > 0) {
        // Default to 3 months if freezable but no specific months set
        freezerExpiryDate = new Date(prepDateObj);
        freezerExpiryDate.setMonth(freezerExpiryDate.getMonth() + 3);
      }

      // Create meal prep portion entry
      const mealPrepPortion = await prisma.mealPrepPortion.create({
        data: {
          userId,
          recipeId,
          totalServings,
          servingsToFreeze: servingsToFreeze || 0,
          servingsForWeek: servingsForWeek || 0,
          frozenServingsRemaining: servingsToFreeze || 0,
          freshServingsRemaining: servingsForWeek || 0,
          prepDate: prepDateObj,
          freezeDate: servingsToFreeze > 0 ? prepDateObj : null,
          expiryDate,
          freezerExpiryDate,
          notes: notes || null,
        },
        include: {
          recipe: {
            include: {
              ingredients: { orderBy: { order: 'asc' } },
            },
          },
          consumedPortions: {
            orderBy: { consumedDate: 'desc' },
          },
        },
      });

      console.log(`✅ Created meal prep portion: ${recipe.title} (${totalServings} servings)`);

      res.status(201).json({
        message: 'Meal prep portion created successfully',
        mealPrepPortion,
      });
    } catch (error: any) {
      console.error('❌ Error in createMealPrepPortion:', error);
      res.status(500).json({
        error: 'Failed to create meal prep portion',
        details: error.message,
      });
    }
  },

  // Get all meal prep portions for a user
  async getMealPrepPortions(req: Request, res: Response) {
    try {
      console.log('🍱 GET /api/meal-prep/portions - METHOD CALLED');
      const userId = getUserId(req);

      const { includeConsumed = 'true' } = req.query;

      const mealPrepPortions = await prisma.mealPrepPortion.findMany({
        where: { userId },
        include: {
          recipe: {
            include: {
              ingredients: { orderBy: { order: 'asc' } },
            },
          },
          consumedPortions: includeConsumed === 'true' ? {
            orderBy: { consumedDate: 'desc' },
          } : false,
        },
        orderBy: { prepDate: 'desc' },
      });

      console.log(`✅ Retrieved ${mealPrepPortions.length} meal prep portions`);

      res.json(mealPrepPortions);
    } catch (error: any) {
      console.error('❌ Error in getMealPrepPortions:', error);
      res.status(500).json({
        error: 'Failed to fetch meal prep portions',
        details: error.message,
      });
    }
  },

  // Get a specific meal prep portion
  async getMealPrepPortion(req: Request, res: Response) {
    try {
      console.log('🍱 GET /api/meal-prep/portions/:id - METHOD CALLED');
      const userId = getUserId(req);
      const { id } = req.params;

      const mealPrepPortion = await prisma.mealPrepPortion.findFirst({
        where: {
          id,
          userId, // Ensure user owns this portion
        },
        include: {
          recipe: {
            include: {
              ingredients: { orderBy: { order: 'asc' } },
              instructions: { orderBy: { step: 'asc' } },
            },
          },
          consumedPortions: {
            orderBy: { consumedDate: 'desc' },
          },
        },
      });

      if (!mealPrepPortion) {
        return res.status(404).json({
          error: 'Meal prep portion not found',
          message: 'The specified meal prep portion does not exist or you do not have access to it',
        });
      }

      res.json(mealPrepPortion);
    } catch (error: any) {
      console.error('❌ Error in getMealPrepPortion:', error);
      res.status(500).json({
        error: 'Failed to fetch meal prep portion',
        details: error.message,
      });
    }
  },

  // Record consumption of a meal prep portion
  async consumeMealPrepPortion(req: Request, res: Response) {
    try {
      console.log('🍱 POST /api/meal-prep/portions/:id/consume - METHOD CALLED');
      const userId = getUserId(req);
      const { id } = req.params;

      const {
        servings,
        portionType, // "frozen" or "fresh"
        consumedDate,
        notes,
      } = req.body;

      // Validate required fields
      if (!servings || !portionType) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'servings and portionType are required',
        });
      }

      if (portionType !== 'frozen' && portionType !== 'fresh') {
        return res.status(400).json({
          error: 'Invalid portion type',
          message: 'portionType must be "frozen" or "fresh"',
        });
      }

      // Get the meal prep portion
      const mealPrepPortion = await prisma.mealPrepPortion.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!mealPrepPortion) {
        return res.status(404).json({
          error: 'Meal prep portion not found',
          message: 'The specified meal prep portion does not exist or you do not have access to it',
        });
      }

      // Check if enough servings are available
      const availableServings = portionType === 'frozen'
        ? mealPrepPortion.frozenServingsRemaining
        : mealPrepPortion.freshServingsRemaining;

      if (servings > availableServings) {
        return res.status(400).json({
          error: 'Insufficient servings',
          message: `Only ${availableServings} ${portionType} servings available, but ${servings} requested`,
        });
      }

      // Create consumption record
      const consumption = await prisma.mealPrepConsumption.create({
        data: {
          mealPrepPortionId: id,
          servings,
          portionType,
          consumedDate: consumedDate ? new Date(consumedDate) : new Date(),
          notes: notes || null,
        },
      });

      // Update remaining servings
      const updateData: any = {};
      if (portionType === 'frozen') {
        updateData.frozenServingsRemaining = mealPrepPortion.frozenServingsRemaining - servings;
      } else {
        updateData.freshServingsRemaining = mealPrepPortion.freshServingsRemaining - servings;
      }

      const updatedPortion = await prisma.mealPrepPortion.update({
        where: { id },
        data: updateData,
        include: {
          recipe: true,
          consumedPortions: {
            orderBy: { consumedDate: 'desc' },
          },
        },
      });

      console.log(`✅ Recorded consumption: ${servings} ${portionType} servings`);

      res.json({
        message: 'Consumption recorded successfully',
        consumption,
        mealPrepPortion: updatedPortion,
      });
    } catch (error: any) {
      console.error('❌ Error in consumeMealPrepPortion:', error);
      res.status(500).json({
        error: 'Failed to record consumption',
        details: error.message,
      });
    }
  },

  // Get meal prep portion statistics
  async getMealPrepStats(req: Request, res: Response) {
    try {
      console.log('🍱 GET /api/meal-prep/stats - METHOD CALLED');
      const userId = getUserId(req);

      const mealPrepPortions = await prisma.mealPrepPortion.findMany({
        where: { userId },
        include: {
          consumedPortions: true,
        },
      });

      // Calculate statistics
      const totalPrepped = mealPrepPortions.reduce((sum, p) => sum + p.totalServings, 0);
      const totalFrozen = mealPrepPortions.reduce((sum, p) => sum + p.servingsToFreeze, 0);
      const totalFresh = mealPrepPortions.reduce((sum, p) => sum + p.servingsForWeek, 0);
      const totalConsumed = mealPrepPortions.reduce((sum, p) => {
        return sum + p.consumedPortions.reduce((cSum, c) => cSum + c.servings, 0);
      }, 0);
      const totalRemaining = mealPrepPortions.reduce((sum, p) => {
        return sum + p.frozenServingsRemaining + p.freshServingsRemaining;
      }, 0);
      const totalWasted = Math.max(0, totalPrepped - totalConsumed - totalRemaining);

      // Calculate success metrics
      const consumptionRate = totalPrepped > 0 ? (totalConsumed / totalPrepped) * 100 : 0;
      const wasteRate = totalPrepped > 0 ? (totalWasted / totalPrepped) * 100 : 0;
      const successRate = totalPrepped > 0 ? ((totalConsumed + totalRemaining) / totalPrepped) * 100 : 0;
      
      // Calculate average servings per prep session
      const totalPrepSessions = mealPrepPortions.length;
      const avgServingsPerPrep = totalPrepSessions > 0 ? totalPrepped / totalPrepSessions : 0;

      // Calculate consumption by type
      const frozenConsumed = mealPrepPortions.reduce((sum, p) => {
        return sum + p.consumedPortions
          .filter(c => c.portionType === 'frozen')
          .reduce((cSum, c) => cSum + c.servings, 0);
      }, 0);
      
      const freshConsumed = mealPrepPortions.reduce((sum, p) => {
        return sum + p.consumedPortions
          .filter(c => c.portionType === 'fresh')
          .reduce((cSum, c) => cSum + c.servings, 0);
      }, 0);

      const stats = {
        totalPrepped,
        totalFrozen,
        totalFresh,
        totalConsumed,
        totalRemaining,
        totalWasted,
        frozenConsumed,
        freshConsumed,
        activeMealPreps: mealPrepPortions.filter(p => 
          p.frozenServingsRemaining > 0 || p.freshServingsRemaining > 0
        ).length,
        expiredMealPreps: mealPrepPortions.filter(p => {
          const now = new Date();
          return (p.expiryDate && new Date(p.expiryDate) < now) ||
                 (p.freezerExpiryDate && new Date(p.freezerExpiryDate) < now);
        }).length,
        totalPrepSessions,
        avgServingsPerPrep: Math.round(avgServingsPerPrep * 10) / 10,
        // Success metrics (percentages)
        consumptionRate: Math.round(consumptionRate * 10) / 10,
        wasteRate: Math.round(wasteRate * 10) / 10,
        successRate: Math.round(successRate * 10) / 10,
        // Status indicators
        status: {
          consumption: consumptionRate >= 80 ? 'excellent' : consumptionRate >= 60 ? 'good' : consumptionRate >= 40 ? 'fair' : 'needs-improvement',
          waste: wasteRate <= 5 ? 'excellent' : wasteRate <= 10 ? 'good' : wasteRate <= 20 ? 'fair' : 'needs-improvement',
          success: successRate >= 90 ? 'excellent' : successRate >= 75 ? 'good' : successRate >= 60 ? 'fair' : 'needs-improvement',
        },
      };

      res.json(stats);
    } catch (error: any) {
      console.error('❌ Error in getMealPrepStats:', error);
      res.status(500).json({
        error: 'Failed to fetch meal prep statistics',
        details: error.message,
      });
    }
  },

  // Create a meal prep session
  async createMealPrepSession(req: Request, res: Response) {
    try {
      console.log('🍱 POST /api/meal-prep/sessions - METHOD CALLED');
      const userId = getUserId(req);

      const {
        scheduledDate,
        scheduledTime,
        duration,
        notes,
        recipeIds, // Array of recipe IDs to prep in this session
      } = req.body;

      // Validate required fields
      if (!scheduledDate) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'scheduledDate is required',
        });
      }

      // Create meal prep session
      const mealPrepSession = await prisma.mealPrepSession.create({
        data: {
          userId,
          scheduledDate: new Date(scheduledDate),
          scheduledTime: scheduledTime || null,
          duration: duration || null,
          notes: notes || null,
        },
      });

      console.log(`✅ Created meal prep session: ${mealPrepSession.id}`);

      res.status(201).json({
        message: 'Meal prep session created successfully',
        mealPrepSession,
      });
    } catch (error: any) {
      console.error('❌ Error in createMealPrepSession:', error);
      res.status(500).json({
        error: 'Failed to create meal prep session',
        details: error.message,
      });
    }
  },

  // Get meal prep sessions for a date range
  async getMealPrepSessions(req: Request, res: Response) {
    try {
      console.log('🍱 GET /api/meal-prep/sessions - METHOD CALLED');
      const userId = getUserId(req);
      const { startDate, endDate } = req.query;

      const where: any = { userId };

      if (startDate || endDate) {
        where.scheduledDate = {};
        if (startDate) {
          where.scheduledDate.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.scheduledDate.lte = new Date(endDate as string);
        }
      }

      const sessions = await prisma.mealPrepSession.findMany({
        where,
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

      console.log(`✅ Retrieved ${sessions.length} meal prep sessions`);

      res.json(sessions);
    } catch (error: any) {
      console.error('❌ Error in getMealPrepSessions:', error);
      res.status(500).json({
        error: 'Failed to fetch meal prep sessions',
        details: error.message,
      });
    }
  },

  // Update meal prep session
  async updateMealPrepSession(req: Request, res: Response) {
    try {
      console.log('🍱 PUT /api/meal-prep/sessions/:id - METHOD CALLED');
      const userId = getUserId(req);
      const { id } = req.params;

      const {
        scheduledDate,
        scheduledTime,
        duration,
        notes,
        isCompleted,
      } = req.body;

      // Verify session exists and belongs to user
      const existingSession = await prisma.mealPrepSession.findFirst({
        where: { id, userId },
      });

      if (!existingSession) {
        return res.status(404).json({
          error: 'Meal prep session not found',
          message: 'The specified meal prep session does not exist or you do not have access to it',
        });
      }

      const updateData: any = {};
      if (scheduledDate) updateData.scheduledDate = new Date(scheduledDate);
      if (scheduledTime !== undefined) updateData.scheduledTime = scheduledTime;
      if (duration !== undefined) updateData.duration = duration;
      if (notes !== undefined) updateData.notes = notes;
      if (isCompleted !== undefined) {
        updateData.isCompleted = isCompleted;
        if (isCompleted && !existingSession.completedAt) {
          updateData.completedAt = new Date();
        } else if (!isCompleted) {
          updateData.completedAt = null;
        }
      }

      const updatedSession = await prisma.mealPrepSession.update({
        where: { id },
        data: updateData,
        include: {
          recipes: {
            include: {
              recipe: true,
            },
          },
        },
      });

      console.log(`✅ Updated meal prep session: ${id}`);

      res.json({
        message: 'Meal prep session updated successfully',
        mealPrepSession: updatedSession,
      });
    } catch (error: any) {
      console.error('❌ Error in updateMealPrepSession:', error);
      res.status(500).json({
        error: 'Failed to update meal prep session',
        details: error.message,
      });
    }
  },

  // Delete meal prep session
  async deleteMealPrepSession(req: Request, res: Response) {
    try {
      console.log('🍱 DELETE /api/meal-prep/sessions/:id - METHOD CALLED');
      const userId = getUserId(req);
      const { id } = req.params;

      // Verify session exists and belongs to user
      const existingSession = await prisma.mealPrepSession.findFirst({
        where: { id, userId },
      });

      if (!existingSession) {
        return res.status(404).json({
          error: 'Meal prep session not found',
          message: 'The specified meal prep session does not exist or you do not have access to it',
        });
      }

      await prisma.mealPrepSession.delete({
        where: { id },
      });

      console.log(`✅ Deleted meal prep session: ${id}`);

      res.json({
        message: 'Meal prep session deleted successfully',
      });
    } catch (error: any) {
      console.error('❌ Error in deleteMealPrepSession:', error);
      res.status(500).json({
        error: 'Failed to delete meal prep session',
        details: error.message,
      });
    }
  },

  // Get meal prep portions that need thawing reminders
  async getThawingReminders(req: Request, res: Response) {
    try {
      console.log('🍱 GET /api/meal-prep/thawing-reminders - METHOD CALLED');
      const userId = getUserId(req);
      const { daysAhead = 1 } = req.query; // Default to 1 day ahead

      const daysAheadNum = parseInt(daysAhead as string) || 1;
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + daysAheadNum);

      // Get meal prep portions with frozen servings that will need thawing
      const portionsNeedingThawing = await prisma.mealPrepPortion.findMany({
        where: {
          userId,
          frozenServingsRemaining: { gt: 0 },
          freezerExpiryDate: { gte: new Date() }, // Not expired
        },
        include: {
          recipe: {
            select: {
              id: true,
              title: true,
              cookTime: true,
            },
          },
        },
        orderBy: { freezerExpiryDate: 'asc' },
      });

      // Calculate thawing recommendations
      // Most frozen meals need 24 hours in fridge to thaw, some need less
      const reminders = portionsNeedingThawing.map(portion => {
        // Estimate thaw time based on recipe (default 24 hours)
        const estimatedThawHours = 24; // Could be customized based on recipe type
        const recommendedThawDate = new Date(reminderDate);
        recommendedThawDate.setHours(recommendedThawDate.getHours() - estimatedThawHours);

        return {
          mealPrepPortionId: portion.id,
          recipeId: portion.recipeId,
          recipe: portion.recipe,
          frozenServingsRemaining: portion.frozenServingsRemaining,
          freezerExpiryDate: portion.freezerExpiryDate,
          recommendedThawDate: recommendedThawDate.toISOString(),
          estimatedThawHours,
          reminderMessage: `Remember to thaw ${portion.recipe.title} - ${portion.frozenServingsRemaining} serving${portion.frozenServingsRemaining > 1 ? 's' : ''} available`,
        };
      });

      res.json({
        reminders,
        count: reminders.length,
        reminderDate: reminderDate.toISOString(),
      });
    } catch (error: any) {
      console.error('❌ Error in getThawingReminders:', error);
      res.status(500).json({
        error: 'Failed to fetch thawing reminders',
        details: error.message,
      });
    }
  },

  // Schedule a thawing reminder for a meal prep portion
  async scheduleThawingReminder(req: Request, res: Response) {
    try {
      console.log('🍱 POST /api/meal-prep/thawing-reminders - METHOD CALLED');
      const userId = getUserId(req);
      const { mealPrepPortionId, reminderDate, reminderTime } = req.body;

      if (!mealPrepPortionId || !reminderDate) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'mealPrepPortionId and reminderDate are required',
        });
      }

      // Verify portion exists and belongs to user
      const portion = await prisma.mealPrepPortion.findFirst({
        where: {
          id: mealPrepPortionId,
          userId,
          frozenServingsRemaining: { gt: 0 },
        },
        include: {
          recipe: {
            select: {
              title: true,
            },
          },
        },
      });

      if (!portion) {
        return res.status(404).json({
          error: 'Meal prep portion not found',
          message: 'The specified meal prep portion does not exist, does not belong to you, or has no frozen servings',
        });
      }

      // For now, we'll return the reminder info
      // In a full implementation, this would schedule a push notification
      const reminder = {
        mealPrepPortionId: portion.id,
        recipeTitle: portion.recipe.title,
        frozenServingsRemaining: portion.frozenServingsRemaining,
        reminderDate: new Date(reminderDate),
        reminderTime: reminderTime || null,
        message: `Time to thaw ${portion.recipe.title}! You have ${portion.frozenServingsRemaining} frozen serving${portion.frozenServingsRemaining > 1 ? 's' : ''} ready to thaw.`,
      };

      res.status(201).json({
        message: 'Thawing reminder scheduled successfully',
        reminder,
        note: 'In a full implementation, this would schedule a push notification',
      });
    } catch (error: any) {
      console.error('❌ Error in scheduleThawingReminder:', error);
      res.status(500).json({
        error: 'Failed to schedule thawing reminder',
        details: error.message,
      });
    }
  },

  // Get cost optimization analysis for meal prep
  async getMealPrepCostAnalysis(req: Request, res: Response) {
    try {
      console.log('🍱 GET /api/meal-prep/cost-analysis - METHOD CALLED');
      const userId = getUserId(req);
      const { recipeId, totalServings } = req.query;

      if (!recipeId) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'recipeId is required',
        });
      }

      const { calculateRecipeCost } = await import('../../utils/costCalculator');

      // Get recipe
      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId as string },
        include: {
          ingredients: true,
        },
      });

      if (!recipe) {
        return res.status(404).json({
          error: 'Recipe not found',
          message: 'The specified recipe does not exist',
        });
      }

      const originalServings = recipe.servings || 1;
      const mealPrepServings = totalServings ? parseInt(totalServings as string) : originalServings * 3; // Default to 3x

      // Calculate cost for original recipe
      const originalCostResult = await calculateRecipeCost(recipeId as string, userId);
      const originalCostPerServing = originalCostResult.estimatedCostPerServing;
      const originalTotalCost = originalCostResult.estimatedCost;

      // Calculate cost for meal prep (scaled)
      // For meal prep, we scale the total cost proportionally
      // However, bulk buying often reduces cost per unit, so we apply a discount
      const scaleFactor = mealPrepServings / originalServings;
      const bulkDiscountFactor = scaleFactor >= 3 ? 0.85 : scaleFactor >= 2 ? 0.90 : 0.95; // 5-15% discount for bulk
      
      const mealPrepTotalCost = originalTotalCost * scaleFactor * bulkDiscountFactor;
      const mealPrepCostPerServing = mealPrepTotalCost / mealPrepServings;

      // Calculate savings
      const savingsPerServing = originalCostPerServing - mealPrepCostPerServing;
      const totalSavings = savingsPerServing * mealPrepServings;
      const savingsPercent = ((savingsPerServing / originalCostPerServing) * 100);

      // Get existing meal prep portions for this recipe to show comparison
      const existingPortions = await prisma.mealPrepPortion.findMany({
        where: {
          userId,
          recipeId: recipeId as string,
        },
        orderBy: { prepDate: 'desc' },
        take: 5,
      });

      const analysis = {
        recipe: {
          id: recipe.id,
          title: recipe.title,
          originalServings,
        },
        costComparison: {
          original: {
            servings: originalServings,
            totalCost: originalTotalCost,
            costPerServing: originalCostPerServing,
          },
          mealPrep: {
            servings: mealPrepServings,
            totalCost: mealPrepTotalCost,
            costPerServing: mealPrepCostPerServing,
            bulkDiscount: (1 - bulkDiscountFactor) * 100,
          },
          savings: {
            perServing: savingsPerServing,
            total: totalSavings,
            percent: savingsPercent,
          },
        },
        recommendations: generateCostRecommendations(
          originalCostPerServing,
          mealPrepCostPerServing,
          savingsPercent,
          mealPrepServings
        ),
        existingPortions: existingPortions.map(p => ({
          totalServings: p.totalServings,
          costPerServing: originalTotalCost * (p.totalServings / originalServings) * bulkDiscountFactor / p.totalServings,
          prepDate: p.prepDate,
        })),
      };

      res.json(analysis);
    } catch (error: any) {
      console.error('❌ Error in getMealPrepCostAnalysis:', error);
      res.status(500).json({
        error: 'Failed to calculate meal prep cost analysis',
        details: error.message,
      });
    }
  },
};

// Helper function to generate cost recommendations
function generateCostRecommendations(
  originalCostPerServing: number,
  mealPrepCostPerServing: number,
  savingsPercent: number,
  mealPrepServings: number
): string[] {
  const recommendations: string[] = [];

  if (savingsPercent > 20) {
    recommendations.push(`Excellent savings! You'll save ${savingsPercent.toFixed(1)}% per serving with meal prep.`);
  } else if (savingsPercent > 10) {
    recommendations.push(`Good savings! Meal prep reduces cost by ${savingsPercent.toFixed(1)}% per serving.`);
  } else if (savingsPercent > 0) {
    recommendations.push(`Moderate savings of ${savingsPercent.toFixed(1)}% per serving.`);
  } else {
    recommendations.push('Consider buying ingredients in bulk to maximize savings.');
  }

  if (mealPrepServings >= 12) {
    recommendations.push('Large batch size allows for better bulk purchasing discounts.');
  }

  if (savingsPercent > 15 && mealPrepServings >= 6) {
    recommendations.push('Freezing portions extends shelf life and reduces food waste costs.');
  }

  return recommendations;
}

// Meal Prep Template Management
export const mealPrepTemplateController = {
  // Create or update a meal prep template
  async createOrUpdateTemplate(req: Request, res: Response) {
    try {
      console.log('🍱 POST /api/meal-prep/templates - METHOD CALLED');
      const userId = getUserId(req);

      const {
        recipeId,
        defaultServings,
        defaultServingsToFreeze,
        defaultServingsForWeek,
        name,
        notes,
        isFavorite,
      } = req.body;

      // Validate required fields
      if (!recipeId || !defaultServings) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'recipeId and defaultServings are required',
        });
      }

      // Verify recipe exists
      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
      });

      if (!recipe) {
        return res.status(404).json({
          error: 'Recipe not found',
          message: 'The specified recipe does not exist',
        });
      }

      // Check if template already exists
      const existingTemplate = await prisma.mealPrepTemplate.findUnique({
        where: {
          userId_recipeId: {
            userId,
            recipeId,
          },
        },
      });

      let template;
      if (existingTemplate) {
        // Update existing template
        template = await prisma.mealPrepTemplate.update({
          where: { id: existingTemplate.id },
          data: {
            defaultServings,
            defaultServingsToFreeze: defaultServingsToFreeze || null,
            defaultServingsForWeek: defaultServingsForWeek || null,
            name: name || null,
            notes: notes || null,
            isFavorite: isFavorite !== undefined ? isFavorite : existingTemplate.isFavorite,
          },
          include: {
            recipe: {
              select: {
                id: true,
                title: true,
                imageUrl: true,
              },
            },
          },
        });
        console.log(`✅ Updated meal prep template: ${template.id}`);
      } else {
        // Create new template
        template = await prisma.mealPrepTemplate.create({
          data: {
            userId,
            recipeId,
            defaultServings,
            defaultServingsToFreeze: defaultServingsToFreeze || null,
            defaultServingsForWeek: defaultServingsForWeek || null,
            name: name || null,
            notes: notes || null,
            isFavorite: isFavorite || false,
          },
          include: {
            recipe: {
              select: {
                id: true,
                title: true,
                imageUrl: true,
              },
            },
          },
        });
        console.log(`✅ Created meal prep template: ${template.id}`);
      }

      res.status(existingTemplate ? 200 : 201).json({
        message: existingTemplate ? 'Meal prep template updated successfully' : 'Meal prep template created successfully',
        template,
      });
    } catch (error: any) {
      console.error('❌ Error in createOrUpdateTemplate:', error);
      res.status(500).json({
        error: 'Failed to create/update meal prep template',
        details: error.message,
      });
    }
  },

  // Get all meal prep templates for user
  async getTemplates(req: Request, res: Response) {
    try {
      console.log('🍱 GET /api/meal-prep/templates - METHOD CALLED');
      const userId = getUserId(req);
      const { favoriteOnly } = req.query;

      const where: any = { userId };
      if (favoriteOnly === 'true') {
        where.isFavorite = true;
      }

      const templates = await prisma.mealPrepTemplate.findMany({
        where,
        include: {
          recipe: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
              servings: true,
              mealPrepSuitable: true,
              freezable: true,
              batchFriendly: true,
            },
          },
        },
        orderBy: [
          { isFavorite: 'desc' },
          { timesUsed: 'desc' },
          { lastUsed: 'desc' },
        ],
      });

      console.log(`✅ Retrieved ${templates.length} meal prep templates`);

      res.json(templates);
    } catch (error: any) {
      console.error('❌ Error in getTemplates:', error);
      res.status(500).json({
        error: 'Failed to fetch meal prep templates',
        details: error.message,
      });
    }
  },

  // Get template by recipe ID
  async getTemplateByRecipe(req: Request, res: Response) {
    try {
      console.log('🍱 GET /api/meal-prep/templates/recipe/:recipeId - METHOD CALLED');
      const userId = getUserId(req);
      const { recipeId } = req.params;

      const template = await prisma.mealPrepTemplate.findUnique({
        where: {
          userId_recipeId: {
            userId,
            recipeId,
          },
        },
        include: {
          recipe: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
              servings: true,
            },
          },
        },
      });

      if (!template) {
        return res.status(404).json({
          error: 'Template not found',
          message: 'No meal prep template exists for this recipe',
        });
      }

      res.json(template);
    } catch (error: any) {
      console.error('❌ Error in getTemplateByRecipe:', error);
      res.status(500).json({
        error: 'Failed to fetch meal prep template',
        details: error.message,
      });
    }
  },

  // Delete template
  async deleteTemplate(req: Request, res: Response) {
    try {
      console.log('🍱 DELETE /api/meal-prep/templates/:id - METHOD CALLED');
      const userId = getUserId(req);
      const { id } = req.params;

      // Verify template exists and belongs to user
      const template = await prisma.mealPrepTemplate.findFirst({
        where: { id, userId },
      });

      if (!template) {
        return res.status(404).json({
          error: 'Template not found',
          message: 'The specified meal prep template does not exist or you do not have access to it',
        });
      }

      await prisma.mealPrepTemplate.delete({
        where: { id },
      });

      console.log(`✅ Deleted meal prep template: ${id}`);

      res.json({
        message: 'Meal prep template deleted successfully',
      });
    } catch (error: any) {
      console.error('❌ Error in deleteTemplate:', error);
      res.status(500).json({
        error: 'Failed to delete meal prep template',
        details: error.message,
      });
    }
  },

  // Use template to create meal prep portion
  async useTemplate(req: Request, res: Response) {
    try {
      console.log('🍱 POST /api/meal-prep/templates/:id/use - METHOD CALLED');
      const userId = getUserId(req);
      const { id } = req.params;
      const { overrideServings, overrideServingsToFreeze, overrideServingsForWeek, prepDate, notes } = req.body;

      // Get template
      const template = await prisma.mealPrepTemplate.findFirst({
        where: { id, userId },
        include: {
          recipe: true,
        },
      });

      if (!template) {
        return res.status(404).json({
          error: 'Template not found',
          message: 'The specified meal prep template does not exist or you do not have access to it',
        });
      }

      // Use template values or overrides
      const totalServings = overrideServings || template.defaultServings;
      const servingsToFreeze = overrideServingsToFreeze !== undefined ? overrideServingsToFreeze : template.defaultServingsToFreeze || 0;
      const servingsForWeek = overrideServingsForWeek !== undefined ? overrideServingsForWeek : template.defaultServingsForWeek || 0;

      // Validate
      if (servingsToFreeze + servingsForWeek !== totalServings) {
        return res.status(400).json({
          error: 'Invalid portion allocation',
          message: `servingsToFreeze (${servingsToFreeze}) + servingsForWeek (${servingsForWeek}) must equal totalServings (${totalServings})`,
        });
      }

      // Calculate expiry dates
      const prepDateObj = prepDate ? new Date(prepDate) : new Date();
      let expiryDate: Date | null = null;
      let freezerExpiryDate: Date | null = null;

      if (template.recipe.fridgeStorageDays && servingsForWeek > 0) {
        expiryDate = new Date(prepDateObj);
        expiryDate.setDate(expiryDate.getDate() + template.recipe.fridgeStorageDays);
      }

      if (template.recipe.freezerStorageMonths && servingsToFreeze > 0) {
        freezerExpiryDate = new Date(prepDateObj);
        freezerExpiryDate.setMonth(freezerExpiryDate.getMonth() + template.recipe.freezerStorageMonths);
      } else if (template.recipe.freezable && servingsToFreeze > 0) {
        freezerExpiryDate = new Date(prepDateObj);
        freezerExpiryDate.setMonth(freezerExpiryDate.getMonth() + 3);
      }

      // Create meal prep portion
      const mealPrepPortion = await prisma.mealPrepPortion.create({
        data: {
          userId,
          recipeId: template.recipeId,
          totalServings,
          servingsToFreeze,
          servingsForWeek,
          frozenServingsRemaining: servingsToFreeze,
          freshServingsRemaining: servingsForWeek,
          prepDate: prepDateObj,
          freezeDate: servingsToFreeze > 0 ? prepDateObj : null,
          expiryDate,
          freezerExpiryDate,
          notes: notes || template.notes || null,
        },
        include: {
          recipe: {
            include: {
              ingredients: { orderBy: { order: 'asc' } },
            },
          },
        },
      });

      // Update template usage tracking
      await prisma.mealPrepTemplate.update({
        where: { id },
        data: {
          timesUsed: { increment: 1 },
          lastUsed: new Date(),
        },
      });

      console.log(`✅ Created meal prep portion from template: ${mealPrepPortion.id}`);

      res.status(201).json({
        message: 'Meal prep portion created from template successfully',
        mealPrepPortion,
        template,
      });
    } catch (error: any) {
      console.error('❌ Error in useTemplate:', error);
      res.status(500).json({
        error: 'Failed to use meal prep template',
        details: error.message,
      });
    }
  },
};

