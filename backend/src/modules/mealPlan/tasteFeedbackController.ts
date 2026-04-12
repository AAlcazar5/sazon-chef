// backend/src/modules/mealPlan/tasteFeedbackController.ts
import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';

function getUserId(req: Request): string {
  return (req as any).user?.id || '';
}

const VALID_FLAVOR_TAGS = new Set([
  'Too bland', 'Perfect spice', 'Great texture', 'Too salty',
  'Loved the sauce', 'Kid-approved', 'Would make again',
  'Needs more protein', 'Too much effort', 'Great leftovers',
]);

export async function submitTasteFeedback(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const { mealId } = req.params;
    const { tasteRating, flavorTags = [] } = req.body;

    // Validate tasteRating
    if (tasteRating == null || typeof tasteRating !== 'number' || tasteRating < 1 || tasteRating > 5 || !Number.isInteger(tasteRating)) {
      return res.status(400).json({ error: 'tasteRating is required and must be an integer between 1 and 5' });
    }

    // Validate flavorTags
    if (!Array.isArray(flavorTags)) {
      return res.status(400).json({ error: 'flavorTags must be an array of strings' });
    }

    // Filter to valid tags only (ignore unknown tags silently)
    const validTags = flavorTags.filter((t: unknown) => typeof t === 'string' && VALID_FLAVOR_TAGS.has(t));

    // Find meal and verify ownership
    const meal = await prisma.meal.findFirst({
      where: {
        id: mealId,
        mealPlan: { userId },
      },
      include: { mealPlan: true },
    });

    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    // Save taste feedback to the meal
    const updatedMeal = await prisma.meal.update({
      where: { id: mealId },
      data: {
        tasteRating,
        flavorTags: JSON.stringify(validTags),
      },
    });

    // Sync to RecipeFeedback if this meal has a recipe
    if (meal.recipeId) {
      const existingFeedback = await prisma.recipeFeedback.findFirst({
        where: { recipeId: meal.recipeId, userId },
      });

      const feedbackData = {
        liked: tasteRating >= 4,
        disliked: tasteRating <= 2,
        consumed: true,
      };

      if (existingFeedback) {
        await prisma.recipeFeedback.update({
          where: { id: existingFeedback.id },
          data: feedbackData,
        });
      } else {
        await prisma.recipeFeedback.create({
          data: {
            recipeId: meal.recipeId,
            userId,
            ...feedbackData,
          },
        });
      }
    }

    res.json(updatedMeal);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error submitting taste feedback:', message);
    res.status(500).json({ error: 'Failed to submit taste feedback' });
  }
}
