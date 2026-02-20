import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { getUserId } from '../../utils/authHelper';

/**
 * Find or create an active meal plan covering the given date.
 */
async function findOrCreateMealPlan(userId: string, date: Date) {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  let mealPlan = await prisma.mealPlan.findFirst({
    where: {
      userId,
      isActive: true,
      startDate: { lte: weekEnd },
      endDate: { gte: weekStart },
    },
  });

  if (!mealPlan) {
    mealPlan = await prisma.mealPlan.create({
      data: {
        userId,
        name: 'My Meal Plan',
        startDate: weekStart,
        endDate: weekEnd,
        isActive: true,
      },
    });
  }

  return mealPlan;
}

/**
 * Copy fields from a source meal into a create-data object.
 */
function copyMealFields(source: any, date: Date, mealPlanId: string, mealType?: string) {
  return {
    mealPlanId,
    date,
    mealType: mealType || source.mealType,
    recipeId: source.recipeId || undefined,
    customName: source.customName || undefined,
    customDescription: source.customDescription || undefined,
    customCalories: source.customCalories ?? undefined,
    customProtein: source.customProtein ?? undefined,
    customCarbs: source.customCarbs ?? undefined,
    customFat: source.customFat ?? undefined,
  };
}

/**
 * POST /api/meal-plan/duplicate
 *
 * Duplicate meals in 3 modes:
 * - mode=week: copy previous week → current week
 * - mode=day: copy one day → another day
 * - mode=meal: copy one meal → multiple days
 */
export const duplicateMeals = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { mode, targetStartDate, sourceDate, targetDate, sourceMealId, targetDates, targetMealType } = req.body;

    if (!mode || !targetStartDate) {
      return res.status(400).json({ error: 'mode and targetStartDate are required' });
    }

    if (mode === 'week') {
      // Copy previous week to target week
      const targetStart = new Date(targetStartDate);
      targetStart.setHours(0, 0, 0, 0);
      const targetEnd = new Date(targetStart.getTime() + 6 * 24 * 60 * 60 * 1000);
      targetEnd.setHours(23, 59, 59, 999);

      // Source is previous week
      const sourceStart = new Date(targetStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      const sourceEnd = new Date(targetStart.getTime() - 1);
      sourceEnd.setHours(23, 59, 59, 999);

      // Find source meals
      const sourcePlans = await prisma.mealPlan.findMany({
        where: {
          userId,
          isActive: true,
          startDate: { lte: sourceEnd },
          endDate: { gte: sourceStart },
        },
        include: {
          meals: {
            where: {
              date: { gte: sourceStart, lte: sourceEnd },
            },
            include: { recipe: true },
          },
        },
      });

      const sourceMeals = sourcePlans.flatMap(p => p.meals);
      if (sourceMeals.length === 0) {
        return res.status(400).json({ error: 'No meals found in previous week' });
      }

      // Find or create target meal plan
      const targetPlan = await findOrCreateMealPlan(userId, targetStart);

      // Delete existing meals in target week
      await prisma.meal.deleteMany({
        where: {
          mealPlanId: targetPlan.id,
          date: { gte: targetStart, lte: targetEnd },
        },
      });

      // Copy meals with offset
      const newMeals = sourceMeals.map(meal => {
        const sourceDayOffset = Math.floor(
          (meal.date.getTime() - sourceStart.getTime()) / (24 * 60 * 60 * 1000)
        );
        const newDate = new Date(targetStart.getTime() + sourceDayOffset * 24 * 60 * 60 * 1000);
        return copyMealFields(meal, newDate, targetPlan.id);
      });

      await prisma.meal.createMany({ data: newMeals });

      return res.json({ message: 'Week copied successfully', copiedCount: newMeals.length });

    } else if (mode === 'day') {
      if (!sourceDate || !targetDate) {
        return res.status(400).json({ error: 'sourceDate and targetDate are required for mode=day' });
      }

      const source = new Date(sourceDate);
      source.setHours(0, 0, 0, 0);
      const sourceEnd = new Date(source);
      sourceEnd.setHours(23, 59, 59, 999);

      const target = new Date(targetDate);
      target.setHours(0, 0, 0, 0);
      const targetEnd = new Date(target);
      targetEnd.setHours(23, 59, 59, 999);

      // Find source meals
      const sourcePlans = await prisma.mealPlan.findMany({
        where: {
          userId,
          isActive: true,
          startDate: { lte: sourceEnd },
          endDate: { gte: source },
        },
        include: {
          meals: {
            where: { date: { gte: source, lte: sourceEnd } },
            include: { recipe: true },
          },
        },
      });

      const sourceMeals = sourcePlans.flatMap(p => p.meals);
      if (sourceMeals.length === 0) {
        return res.status(400).json({ error: 'No meals found on source date' });
      }

      // Find or create target meal plan
      const targetPlan = await findOrCreateMealPlan(userId, target);

      // Delete existing meals on target date
      await prisma.meal.deleteMany({
        where: {
          mealPlanId: targetPlan.id,
          date: { gte: target, lte: targetEnd },
        },
      });

      // Copy meals
      const newMeals = sourceMeals.map(meal => copyMealFields(meal, target, targetPlan.id));
      await prisma.meal.createMany({ data: newMeals });

      return res.json({ message: 'Day copied successfully', copiedCount: newMeals.length });

    } else if (mode === 'meal') {
      if (!sourceMealId || !targetDates || targetDates.length === 0) {
        return res.status(400).json({ error: 'sourceMealId and targetDates are required for mode=meal' });
      }

      // Find source meal and verify ownership
      const sourceMeal = await prisma.meal.findFirst({
        where: {
          id: sourceMealId,
          mealPlan: { userId },
        },
        include: { recipe: true },
      });

      if (!sourceMeal) {
        return res.status(404).json({ error: 'Source meal not found' });
      }

      const mealType = targetMealType || sourceMeal.mealType;
      let copiedCount = 0;

      for (const dateStr of targetDates) {
        const targetDateObj = new Date(dateStr);
        targetDateObj.setHours(0, 0, 0, 0);
        const targetDateEnd = new Date(targetDateObj);
        targetDateEnd.setHours(23, 59, 59, 999);

        const targetPlan = await findOrCreateMealPlan(userId, targetDateObj);

        // Delete existing meal of same type on target date
        await prisma.meal.deleteMany({
          where: {
            mealPlanId: targetPlan.id,
            date: { gte: targetDateObj, lte: targetDateEnd },
            mealType,
          },
        });

        // Create copied meal
        await prisma.meal.create({
          data: copyMealFields(sourceMeal, targetDateObj, targetPlan.id, mealType),
        });

        copiedCount++;
      }

      return res.json({ message: 'Meal copied successfully', copiedCount });

    } else {
      return res.status(400).json({ error: 'Invalid mode. Use "week", "day", or "meal".' });
    }
  } catch (error) {
    console.error('Error duplicating meals:', error);
    res.status(500).json({ error: 'Failed to duplicate meals' });
  }
};
