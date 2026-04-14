import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { getUserId } from '../../utils/authHelper';
import {
  calculateVarietyScore,
  findRepetitiveMealIds,
  type MealForVariety,
} from '../../utils/varietyScore';

async function loadMealsForPlan(mealPlanId: string, userId: string): Promise<MealForVariety[] | null> {
  const plan = await prisma.mealPlan.findFirst({
    where: { id: mealPlanId, userId },
  });
  if (!plan) return null;

  const meals = await prisma.meal.findMany({
    where: { mealPlanId },
    include: {
      recipe: {
        include: {
          ingredients: { orderBy: { order: 'asc' } },
        },
      },
    },
    orderBy: { date: 'asc' },
  });

  return meals
    .filter(m => m.recipe)
    .map(m => ({
      id: m.id,
      date: m.date.toISOString().slice(0, 10),
      mealType: m.mealType,
      title: m.recipe!.title,
      cuisine: m.recipe!.cuisine,
      ingredients: m.recipe!.ingredients.map(i => i.text),
    }));
}

export const getMealPlanVarietyScore = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const mealPlanId = req.params.id;

    const meals = await loadMealsForPlan(mealPlanId, userId);
    if (meals === null) {
      res.status(404).json({ error: 'Meal plan not found' });
      return;
    }

    const score = calculateVarietyScore(meals);
    const repetitiveMealIds = findRepetitiveMealIds(meals);

    res.json({
      success: true,
      varietyScore: score,
      repetitiveMealIds,
      nudgeMessage: score.isBoringWeek
        ? 'Your week is looking a bit samey — want Sazon to mix it up?'
        : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error computing variety score:', message);
    res.status(500).json({ error: 'Failed to compute variety score', details: message });
  }
};
