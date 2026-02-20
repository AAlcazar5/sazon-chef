import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { getUserId } from '../../utils/authHelper';

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

function validateDaysOfWeek(daysOfWeek: string): boolean {
  const days = daysOfWeek.split(',').map(d => d.trim());
  return days.length > 0 && days.every(d => {
    const n = parseInt(d, 10);
    return !isNaN(n) && n >= 0 && n <= 6;
  });
}

// GET /api/meal-plan/recurring
export const getRecurringMeals = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    const rules = await (prisma as any).recurringMeal.findMany({
      where: { userId },
      include: {
        recipe: {
          select: { id: true, title: true, imageUrl: true, calories: true, protein: true, carbs: true, fat: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(rules);
  } catch (error) {
    console.error('Error getting recurring meals:', error);
    res.status(500).json({ error: 'Failed to get recurring meals' });
  }
};

// POST /api/meal-plan/recurring
export const createRecurringMeal = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { mealType, daysOfWeek, recipeId, title, calories, protein, carbs, fat } = req.body;

    if (!mealType || !VALID_MEAL_TYPES.includes(mealType)) {
      return res.status(400).json({ error: 'Valid mealType is required (breakfast, lunch, dinner, snack)' });
    }

    if (!daysOfWeek || !validateDaysOfWeek(daysOfWeek)) {
      return res.status(400).json({ error: 'Valid daysOfWeek is required (comma-separated 0-6)' });
    }

    if (!recipeId && !title) {
      return res.status(400).json({ error: 'Either recipeId or title is required' });
    }

    const rule = await (prisma as any).recurringMeal.create({
      data: {
        userId,
        mealType,
        daysOfWeek,
        recipeId: recipeId || null,
        title: title || null,
        calories: calories || null,
        protein: protein || null,
        carbs: carbs || null,
        fat: fat || null,
      },
      include: {
        recipe: {
          select: { id: true, title: true, imageUrl: true, calories: true, protein: true, carbs: true, fat: true },
        },
      },
    });

    res.json(rule);
  } catch (error) {
    console.error('Error creating recurring meal:', error);
    res.status(500).json({ error: 'Failed to create recurring meal' });
  }
};

// PUT /api/meal-plan/recurring/:id
export const updateRecurringMeal = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { mealType, daysOfWeek, recipeId, title, calories, protein, carbs, fat, isActive } = req.body;

    // Verify ownership
    const existing = await (prisma as any).recurringMeal.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Recurring meal not found' });
    }

    if (mealType && !VALID_MEAL_TYPES.includes(mealType)) {
      return res.status(400).json({ error: 'Invalid mealType' });
    }

    if (daysOfWeek && !validateDaysOfWeek(daysOfWeek)) {
      return res.status(400).json({ error: 'Invalid daysOfWeek' });
    }

    const updateData: any = {};
    if (mealType !== undefined) updateData.mealType = mealType;
    if (daysOfWeek !== undefined) updateData.daysOfWeek = daysOfWeek;
    if (recipeId !== undefined) updateData.recipeId = recipeId || null;
    if (title !== undefined) updateData.title = title || null;
    if (calories !== undefined) updateData.calories = calories;
    if (protein !== undefined) updateData.protein = protein;
    if (carbs !== undefined) updateData.carbs = carbs;
    if (fat !== undefined) updateData.fat = fat;
    if (isActive !== undefined) updateData.isActive = isActive;

    const rule = await (prisma as any).recurringMeal.update({
      where: { id },
      data: updateData,
      include: {
        recipe: {
          select: { id: true, title: true, imageUrl: true, calories: true, protein: true, carbs: true, fat: true },
        },
      },
    });

    res.json(rule);
  } catch (error) {
    console.error('Error updating recurring meal:', error);
    res.status(500).json({ error: 'Failed to update recurring meal' });
  }
};

// DELETE /api/meal-plan/recurring/:id
export const deleteRecurringMeal = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const existing = await (prisma as any).recurringMeal.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Recurring meal not found' });
    }

    await (prisma as any).recurringMeal.delete({ where: { id } });

    res.json({ message: 'Recurring meal deleted' });
  } catch (error) {
    console.error('Error deleting recurring meal:', error);
    res.status(500).json({ error: 'Failed to delete recurring meal' });
  }
};

// POST /api/meal-plan/recurring/apply
export const applyRecurringMeals = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { weekStartDate } = req.body;

    if (!weekStartDate) {
      return res.status(400).json({ error: 'weekStartDate is required' });
    }

    // Get all active recurring rules for this user
    const rules = await (prisma as any).recurringMeal.findMany({
      where: { userId, isActive: true },
      include: {
        recipe: {
          select: { id: true, title: true, calories: true, protein: true, carbs: true, fat: true },
        },
      },
    });

    if (rules.length === 0) {
      return res.json({ created: 0 });
    }

    // Get or create meal plan for this week
    const startDate = new Date(weekStartDate);
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    let mealPlan = await prisma.mealPlan.findFirst({
      where: {
        userId,
        startDate: { gte: startDate },
        endDate: { lte: endDate },
      },
    });

    if (!mealPlan) {
      mealPlan = await prisma.mealPlan.create({
        data: {
          userId,
          name: 'My Meal Plan',
          startDate,
          endDate,
          isActive: true,
        },
      });
    }

    // Get existing meals for this week to avoid duplicates
    const existingMeals = await prisma.meal.findMany({
      where: { mealPlanId: mealPlan.id },
      select: { date: true, mealType: true },
    });

    // Build a set of existing date+mealType combos
    const existingSet = new Set(
      existingMeals.map(m => `${m.date.toISOString().split('T')[0]}|${m.mealType}`)
    );

    let created = 0;

    for (const rule of rules) {
      const days = rule.daysOfWeek.split(',').map((d: string) => parseInt(d.trim(), 10));

      for (const dayIndex of days) {
        const mealDate = new Date(startDate);
        mealDate.setDate(startDate.getDate() + dayIndex);
        const dateStr = mealDate.toISOString().split('T')[0];

        const key = `${dateStr}|${rule.mealType}`;
        if (existingSet.has(key)) continue;

        // Create the meal
        await prisma.meal.create({
          data: {
            mealPlanId: mealPlan.id,
            date: mealDate,
            mealType: rule.mealType,
            recipeId: rule.recipeId || null,
            customName: rule.title || null,
            customCalories: rule.calories || null,
            customProtein: rule.protein || null,
            customCarbs: rule.carbs || null,
            customFat: rule.fat || null,
            isFromRecurring: true,
            recurringMealId: rule.id,
          },
        });

        existingSet.add(key);
        created++;
      }
    }

    res.json({ created });
  } catch (error) {
    console.error('Error applying recurring meals:', error);
    res.status(500).json({ error: 'Failed to apply recurring meals' });
  }
};
