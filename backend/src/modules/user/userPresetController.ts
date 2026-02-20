// backend/src/modules/user/userPresetController.ts
// Profile preset CRUD + apply

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';

export const userPresetController = {
  // GET /user/presets
  async getPresets(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const presets = await (prisma as any).profilePreset.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      res.json(presets);
    } catch (error) {
      console.error('Get presets error:', error);
      res.status(500).json({ error: 'Failed to fetch presets' });
    }
  },

  // POST /user/presets
  async createPreset(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { name, description } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }

      // Snapshot current settings
      const [macroGoals, physicalProfile, preferences] = await Promise.all([
        prisma.macroGoals.findUnique({ where: { userId } }),
        prisma.userPhysicalProfile.findUnique({ where: { userId } }),
        prisma.userPreferences.findUnique({ where: { userId } }),
      ]);

      if (!macroGoals) {
        return res.status(400).json({
          error: 'No macro goals set',
          message: 'Please set your macro goals before saving a preset',
        });
      }

      const preset = await (prisma as any).profilePreset.create({
        data: {
          userId,
          name: name.trim(),
          description: description?.trim() || null,
          calories: macroGoals.calories,
          protein: macroGoals.protein,
          carbs: macroGoals.carbs,
          fat: macroGoals.fat,
          activityLevel: physicalProfile?.activityLevel || null,
          fitnessGoal: physicalProfile?.fitnessGoal || null,
          maxDailyFoodBudget: preferences?.maxDailyFoodBudget || null,
          currency: preferences?.currency || 'USD',
        },
      });

      res.status(201).json({ message: 'Preset created successfully', preset });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'A preset with that name already exists' });
      }
      console.error('Create preset error:', error);
      res.status(500).json({ error: 'Failed to create preset' });
    }
  },

  // PUT /user/presets/:id
  async updatePreset(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const { name, description } = req.body;

      const preset = await (prisma as any).profilePreset.findFirst({
        where: { id, userId },
      });

      if (!preset) {
        return res.status(404).json({ error: 'Preset not found' });
      }

      const updated = await (prisma as any).profilePreset.update({
        where: { id },
        data: {
          ...(name && { name: name.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
        },
      });

      res.json({ message: 'Preset updated successfully', preset: updated });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'A preset with that name already exists' });
      }
      console.error('Update preset error:', error);
      res.status(500).json({ error: 'Failed to update preset' });
    }
  },

  // DELETE /user/presets/:id
  async deletePreset(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const preset = await (prisma as any).profilePreset.findFirst({
        where: { id, userId },
      });

      if (!preset) {
        return res.status(404).json({ error: 'Preset not found' });
      }

      await (prisma as any).profilePreset.delete({ where: { id } });
      res.json({ message: 'Preset deleted successfully' });
    } catch (error) {
      console.error('Delete preset error:', error);
      res.status(500).json({ error: 'Failed to delete preset' });
    }
  },

  // POST /user/presets/:id/apply
  async applyPreset(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const preset = await (prisma as any).profilePreset.findFirst({
        where: { id, userId },
      });

      if (!preset) {
        return res.status(404).json({ error: 'Preset not found' });
      }

      await prisma.$transaction(async (tx) => {
        // 1. Update macro goals
        await tx.macroGoals.upsert({
          where: { userId },
          update: {
            calories: preset.calories,
            protein: preset.protein,
            carbs: preset.carbs,
            fat: preset.fat,
          },
          create: {
            userId,
            calories: preset.calories,
            protein: preset.protein,
            carbs: preset.carbs,
            fat: preset.fat,
          },
        });

        // 2. Update physical profile (if preset has those fields)
        if (preset.activityLevel || preset.fitnessGoal) {
          const existingProfile = await tx.userPhysicalProfile.findUnique({
            where: { userId },
          });
          if (existingProfile) {
            await tx.userPhysicalProfile.update({
              where: { userId },
              data: {
                ...(preset.activityLevel && { activityLevel: preset.activityLevel }),
                ...(preset.fitnessGoal && { fitnessGoal: preset.fitnessGoal }),
              },
            });
          }
        }

        // 3. Update budget preference
        if (preset.maxDailyFoodBudget !== null || preset.currency) {
          const existingPrefs = await tx.userPreferences.findUnique({
            where: { userId },
          });
          if (existingPrefs) {
            await tx.userPreferences.update({
              where: { userId },
              data: {
                ...(preset.maxDailyFoodBudget !== null && {
                  maxDailyFoodBudget: preset.maxDailyFoodBudget,
                }),
                ...(preset.currency && { currency: preset.currency }),
              },
            });
          }
        }

        // 4. Mark this preset as active, deactivate others
        await (tx as any).profilePreset.updateMany({
          where: { userId },
          data: { isActive: false },
        });
        await (tx as any).profilePreset.update({
          where: { id },
          data: { isActive: true },
        });
      });

      res.json({ message: 'Preset applied successfully', preset });
    } catch (error) {
      console.error('Apply preset error:', error);
      res.status(500).json({ error: 'Failed to apply preset' });
    }
  },
};
