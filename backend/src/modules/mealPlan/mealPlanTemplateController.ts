import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { getUserId } from '../../utils/authHelper';

// Get all templates (user's + system)
export const getTemplates = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    const templates = await prisma.mealPlanTemplate.findMany({
      where: {
        OR: [
          { userId },
          { isSystem: true },
        ],
      },
      include: {
        meals: {
          include: { recipe: true },
          orderBy: [{ dayIndex: 'asc' }, { mealType: 'asc' }],
        },
      },
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'desc' }],
    });

    res.json(templates);
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
};

// Create template from existing meal plan
export const createTemplate = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { name, description, goal, mealPlanId } = req.body;

    if (!name || !mealPlanId) {
      return res.status(400).json({ error: 'Name and mealPlanId are required' });
    }

    // Fetch the meal plan with meals
    const mealPlan = await prisma.mealPlan.findFirst({
      where: { id: mealPlanId, userId },
      include: {
        meals: {
          include: { recipe: true },
        },
      },
    });

    if (!mealPlan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    if (mealPlan.meals.length === 0) {
      return res.status(400).json({ error: 'Meal plan has no meals to save as template' });
    }

    const startTime = mealPlan.startDate.getTime();

    // Create template + meals in a transaction
    const template = await prisma.$transaction(async (tx) => {
      const created = await tx.mealPlanTemplate.create({
        data: {
          userId,
          name,
          description: description || null,
          goal: goal || null,
        },
      });

      const templateMeals = mealPlan.meals.map((meal) => {
        const dayIndex = Math.floor(
          (meal.date.getTime() - startTime) / (24 * 60 * 60 * 1000)
        );

        return {
          templateId: created.id,
          dayIndex: Math.max(0, Math.min(6, dayIndex)),
          mealType: meal.mealType,
          recipeId: meal.recipeId,
          customName: meal.customName,
          customDescription: meal.customDescription,
          customCalories: meal.customCalories,
          customProtein: meal.customProtein,
          customCarbs: meal.customCarbs,
          customFat: meal.customFat,
        };
      });

      await tx.templateMeal.createMany({ data: templateMeals });

      return tx.mealPlanTemplate.findUnique({
        where: { id: created.id },
        include: {
          meals: {
            include: { recipe: true },
            orderBy: [{ dayIndex: 'asc' }, { mealType: 'asc' }],
          },
        },
      });
    });

    res.json({ message: 'Template created successfully', template });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
};

// Apply template to a week
export const applyTemplate = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { startDate } = req.body;

    if (!startDate) {
      return res.status(400).json({ error: 'startDate is required' });
    }

    // Fetch template with meals
    const template = await prisma.mealPlanTemplate.findFirst({
      where: {
        id,
        OR: [{ userId }, { isSystem: true }],
      },
      include: { meals: true },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const weekStart = new Date(startDate);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find or create meal plan for this week
    let mealPlan = await prisma.mealPlan.findFirst({
      where: {
        userId,
        isActive: true,
        startDate: { lte: weekEnd },
        endDate: { gte: weekStart },
      },
    });

    if (mealPlan) {
      // Delete existing meals for the week range
      await prisma.meal.deleteMany({
        where: {
          mealPlanId: mealPlan.id,
          date: { gte: weekStart, lte: weekEnd },
        },
      });
    } else {
      mealPlan = await prisma.mealPlan.create({
        data: {
          userId,
          name: `Week from ${template.name}`,
          startDate: weekStart,
          endDate: weekEnd,
          isActive: true,
        },
      });
    }

    // Create meals from template
    const meals = template.meals.map((tm) => {
      const mealDate = new Date(weekStart);
      mealDate.setDate(mealDate.getDate() + tm.dayIndex);

      return {
        mealPlanId: mealPlan!.id,
        date: mealDate,
        mealType: tm.mealType,
        recipeId: tm.recipeId,
        customName: tm.customName,
        customDescription: tm.customDescription,
        customCalories: tm.customCalories,
        customProtein: tm.customProtein,
        customCarbs: tm.customCarbs,
        customFat: tm.customFat,
      };
    });

    await prisma.meal.createMany({ data: meals });

    // Return the updated weekly plan
    const updatedPlan = await prisma.mealPlan.findUnique({
      where: { id: mealPlan.id },
      include: {
        meals: {
          include: { recipe: true },
          orderBy: [{ date: 'asc' }, { mealType: 'asc' }],
        },
      },
    });

    res.json({
      message: 'Template applied successfully',
      mealPlan: updatedPlan,
    });
  } catch (error) {
    console.error('Error applying template:', error);
    res.status(500).json({ error: 'Failed to apply template' });
  }
};

// Delete a user template
export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const template = await prisma.mealPlanTemplate.findFirst({
      where: { id, userId },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (template.isSystem) {
      return res.status(403).json({ error: 'Cannot delete system templates' });
    }

    await prisma.mealPlanTemplate.delete({ where: { id } });

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
};
