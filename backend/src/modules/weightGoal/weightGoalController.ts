// backend/src/modules/weightGoal/weightGoalController.ts
// Weight goal and weight logging controller (Phase 6, Group 12)

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';
import { calculateWeightGoal, calculateWeightProgress, calculateCaloriesFromSteps } from '@/utils/weightGoalCalculator';
import { calculateBMR, calculateTDEE } from '@/utils/nutritionCalculator';

// Extend Express Request type to include user
// Note: This should match the type in authMiddleware.ts
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export const weightGoalController = {
  // Create or update weight goal
  async setWeightGoal(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const {
        targetWeightKg,
        targetDate, // ISO date string
      } = req.body;

      console.log('🎯 POST /api/weight-goal called');

      // Validate required fields
      if (!targetWeightKg || !targetDate) {
        return res.status(400).json({
          error: 'targetWeightKg and targetDate are required',
        });
      }

      // Get user's physical profile
      const physicalProfile = await prisma.userPhysicalProfile.findFirst({
        where: { userId },
      });

      if (!physicalProfile) {
        return res.status(400).json({
          error: 'Physical profile not found. Please set up your physical profile first.',
        });
      }

      // Get current weight (from most recent weight log or physical profile)
      const latestWeightLog = await prisma.$queryRaw`
        SELECT weightKg FROM weight_logs
        WHERE userId = ${userId}
        ORDER BY date DESC
        LIMIT 1
      ` as any[];

      const currentWeightKg = latestWeightLog && latestWeightLog.length > 0
        ? latestWeightLog[0].weightKg
        : physicalProfile.weightKg;

      // Calculate weight goal
      const weightGoal = calculateWeightGoal(
        currentWeightKg,
        parseFloat(targetWeightKg),
        new Date(targetDate),
        {
          gender: physicalProfile.gender,
          age: physicalProfile.age,
          heightCm: physicalProfile.heightCm,
          weightKg: physicalProfile.weightKg,
          activityLevel: physicalProfile.activityLevel,
          fitnessGoal: physicalProfile.fitnessGoal,
        }
      );

      // Store or update weight goal
      const { randomUUID } = require('crypto');
      const goalId = randomUUID();

      await prisma.$executeRaw`
        INSERT OR REPLACE INTO weight_goals (
          id, userId, currentWeightKg, targetWeightKg, targetDate,
          dailyCalorieDeficit, requiredCaloriesPerDay, requiredStepsPerDay,
          caloriesFromSteps, caloriesFromDiet, isActive,
          createdAt, updatedAt
        )
        VALUES (
          ${goalId}, ${userId}, ${weightGoal.currentWeightKg}, ${weightGoal.targetWeightKg}, ${new Date(targetDate)},
          ${weightGoal.dailyCalorieDeficit}, ${weightGoal.requiredCaloriesPerDay}, ${weightGoal.requiredStepsPerDay},
          ${weightGoal.caloriesFromSteps}, ${weightGoal.caloriesFromDiet}, 1,
          datetime('now'), datetime('now')
        )
      `;

      console.log('✅ Weight goal set successfully');

      res.json({
        success: true,
        weightGoal,
      });
    } catch (error: any) {
      console.error('❌ Set weight goal error:', error);
      res.status(500).json({
        error: 'Failed to set weight goal',
        message: error.message,
      });
    }
  },

  // Get current weight goal
  async getWeightGoal(req: Request, res: Response) {
    try {
      const userId = getUserId(req);

      console.log('🎯 GET /api/weight-goal called');

      const goal = await prisma.$queryRaw`
        SELECT * FROM weight_goals
        WHERE userId = ${userId} AND isActive = 1
        ORDER BY createdAt DESC
        LIMIT 1
      ` as any[];

      if (!goal || goal.length === 0) {
        return res.json({
          success: true,
          weightGoal: null,
        });
      }

      // Get weight history for progress calculation
      const weightHistory = await prisma.$queryRaw`
        SELECT weightKg, date FROM weight_logs
        WHERE userId = ${userId}
        ORDER BY date DESC
        LIMIT 30
      ` as Array<{ weightKg: number; date: Date }>;

      // Get current weight
      const latestWeightLog = await prisma.$queryRaw`
        SELECT weightKg FROM weight_logs
        WHERE userId = ${userId}
        ORDER BY date DESC
        LIMIT 1
      ` as any[];

      const currentWeightKg = latestWeightLog && latestWeightLog.length > 0
        ? latestWeightLog[0].weightKg
        : goal[0].currentWeightKg;

      // Calculate progress
      const progress = calculateWeightProgress(
        currentWeightKg,
        goal[0].targetWeightKg,
        new Date(goal[0].targetDate),
        weightHistory.map(w => ({ weightKg: w.weightKg, date: new Date(w.date) }))
      );

      res.json({
        success: true,
        weightGoal: {
          ...goal[0],
          progress,
        },
      });
    } catch (error: any) {
      console.error('❌ Get weight goal error:', error);
      res.status(500).json({
        error: 'Failed to fetch weight goal',
        message: error.message,
      });
    }
  },

  // Log weight
  async logWeight(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const {
        weightKg,
        date, // ISO date string, optional (defaults to today)
        notes,
      } = req.body;

      console.log('⚖️ POST /api/weight-log called');

      // Validate required fields
      if (!weightKg) {
        return res.status(400).json({
          error: 'weightKg is required',
        });
      }

      const logDate = date ? new Date(date) : new Date();
      const { randomUUID } = require('crypto');
      const logId = randomUUID();

      // Store weight log
      await prisma.$executeRaw`
        INSERT INTO weight_logs (
          id, userId, weightKg, date, notes,
          createdAt, updatedAt
        )
        VALUES (
          ${logId}, ${userId}, ${parseFloat(weightKg)}, ${logDate}, ${notes || null},
          datetime('now'), datetime('now')
        )
      `;

      // Update physical profile with latest weight
      await prisma.userPhysicalProfile.updateMany({
        where: { userId },
        data: { weightKg: parseFloat(weightKg) },
      });

      console.log('✅ Weight logged successfully');

      res.json({
        success: true,
        message: 'Weight logged successfully',
      });
    } catch (error: any) {
      console.error('❌ Log weight error:', error);
      res.status(500).json({
        error: 'Failed to log weight',
        message: error.message,
      });
    }
  },

  // Get weight history
  async getWeightHistory(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const days = parseInt(req.query.days as string) || 30;

      console.log(`⚖️ GET /api/weight-log called (${days} days)`);

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);

      const history = await prisma.$queryRaw`
        SELECT * FROM weight_logs
        WHERE userId = ${userId}
        AND date >= ${daysAgo}
        ORDER BY date DESC
      `;

      res.json({
        success: true,
        history: history || [],
      });
    } catch (error: any) {
      console.error('❌ Get weight history error:', error);
      res.status(500).json({
        error: 'Failed to fetch weight history',
        message: error.message,
      });
    }
  },

  // Calculate calories from today's steps
  async getCaloriesFromSteps(req: Request, res: Response) {
    try {
      const userId = getUserId(req);

      console.log('💓 GET /api/weight-goal/calories-from-steps called');

      // Get physical profile
      const physicalProfile = await prisma.userPhysicalProfile.findFirst({
        where: { userId },
      });

      if (!physicalProfile) {
        return res.status(400).json({
          error: 'Physical profile not found',
        });
      }

      // Get today's steps
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayMetrics = await prisma.$queryRaw`
        SELECT steps FROM health_metrics
        WHERE userId = ${userId}
        AND date >= ${today}
        AND date < ${tomorrow}
        ORDER BY date DESC
        LIMIT 1
      ` as any[];

      const steps = todayMetrics && todayMetrics.length > 0 ? todayMetrics[0].steps : 0;

      // Calculate calories from steps
      const calories = calculateCaloriesFromSteps(
        steps,
        {
          gender: physicalProfile.gender,
          age: physicalProfile.age,
          heightCm: physicalProfile.heightCm,
          weightKg: physicalProfile.weightKg,
          activityLevel: physicalProfile.activityLevel,
          fitnessGoal: physicalProfile.fitnessGoal,
        }
      );

      res.json({
        success: true,
        steps,
        caloriesFromSteps: calories,
      });
    } catch (error: any) {
      console.error('❌ Get calories from steps error:', error);
      res.status(500).json({
        error: 'Failed to calculate calories from steps',
        message: error.message,
      });
    }
  },
};

