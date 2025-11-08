// backend/src/modules/weightTracking/weightTrackingController.ts
// Weight tracking and goal management (Phase 6, Group 12)

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';
import {
  calculateWeightGoal,
  calculateWeightProgress,
  calculateStepsForCalories,
  calculateCaloriesFromSteps,
} from '@/utils/weightGoalCalculator';
import type { PhysicalProfile } from '@/utils/nutritionCalculator';

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

export const weightTrackingController = {
  // Log weight
  async logWeight(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { date, weightKg, notes } = req.body;

      console.log('⚖️ POST /api/weight-tracking/log called');

      if (!weightKg || weightKg <= 0) {
        return res.status(400).json({
          error: 'Weight is required and must be greater than 0',
        });
      }

      // Generate unique ID
      const { randomUUID } = require('crypto');
      const logId = randomUUID();
      const logDate = date ? new Date(date) : new Date();

      // Store weight log
      await prisma.$executeRaw`
        INSERT OR REPLACE INTO weight_logs (
          id, userId, date, weightKg, notes,
          createdAt, updatedAt
        )
        VALUES (
          ${logId}, ${userId}, ${logDate}, ${weightKg}, ${notes || null},
          datetime('now'), datetime('now')
        )
      `;

      // Update user's physical profile with latest weight
      await prisma.userPhysicalProfile.updateMany({
        where: { userId },
        data: { weightKg },
      });

      console.log('✅ Weight logged successfully');

      res.json({
        success: true,
        message: 'Weight logged successfully',
        weightLog: {
          id: logId,
          date: logDate,
          weightKg,
          notes,
        },
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

      console.log(`⚖️ GET /api/weight-tracking/history called (${days} days)`);

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);

      const weightLogs = await prisma.$queryRaw`
        SELECT * FROM weight_logs
        WHERE userId = ${userId}
        AND date >= ${daysAgo}
        ORDER BY date DESC
      `;

      res.json({
        success: true,
        weightLogs: weightLogs || [],
      });
    } catch (error: any) {
      console.error('❌ Get weight history error:', error);
      res.status(500).json({
        error: 'Failed to fetch weight history',
        message: error.message,
      });
    }
  },

  // Get latest weight
  async getLatestWeight(req: Request, res: Response) {
    try {
      const userId = getUserId(req);

      console.log('⚖️ GET /api/weight-tracking/latest called');

      const latestWeight = await prisma.$queryRaw`
        SELECT * FROM weight_logs
        WHERE userId = ${userId}
        ORDER BY date DESC
        LIMIT 1
      ` as any[];

      const weight = latestWeight && latestWeight.length > 0 ? latestWeight[0] : null;

      res.json({
        success: true,
        weight: weight,
      });
    } catch (error: any) {
      console.error('❌ Get latest weight error:', error);
      res.status(500).json({
        error: 'Failed to fetch latest weight',
        message: error.message,
      });
    }
  },

  // Create or update weight goal
  async setWeightGoal(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { targetWeightKg, weeksToGoal, goalType } = req.body;

      console.log('⚖️ POST /api/weight-tracking/goal called');

      if (!targetWeightKg || !weeksToGoal) {
        return res.status(400).json({
          error: 'Target weight and weeks to goal are required',
        });
      }

      // Get current weight from latest log or physical profile
      const latestWeight = await prisma.$queryRaw`
        SELECT weightKg FROM weight_logs
        WHERE userId = ${userId}
        ORDER BY date DESC
        LIMIT 1
      ` as any[];

      const physicalProfile = await prisma.userPhysicalProfile.findFirst({
        where: { userId },
      });

      const currentWeightKg = latestWeight && latestWeight.length > 0
        ? latestWeight[0].weightKg
        : physicalProfile?.weightKg;

      if (!currentWeightKg) {
        return res.status(400).json({
          error: 'Current weight not found. Please log your weight first.',
        });
      }

      // Calculate target date from weeks
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + (weeksToGoal * 7));

      // Get user physical profile for calculations
      const physicalProfileData = await prisma.userPhysicalProfile.findFirst({
        where: { userId }
      });

      const userProfileForCalc: PhysicalProfile = physicalProfileData ? {
        weightKg: physicalProfileData.weightKg,
        heightCm: physicalProfileData.heightCm,
        age: physicalProfileData.age,
        gender: physicalProfileData.gender,
        activityLevel: physicalProfileData.activityLevel,
        fitnessGoal: physicalProfileData.fitnessGoal,
      } : {
        weightKg: currentWeightKg,
        heightCm: 170,
        age: 30,
        gender: 'male',
        activityLevel: 'sedentary',
        fitnessGoal: 'maintain',
      };

      // Calculate weight goal
      const weightGoal = calculateWeightGoal(
        currentWeightKg,
        targetWeightKg,
        targetDate,
        userProfileForCalc
      );

      // Calculate step requirements from weightGoal
      let stepRequirement = weightGoal.requiredStepsPerDay || null;

      // Store weight goal
      const { randomUUID } = require('crypto');
      const goalId = randomUUID();

      // Deactivate previous goals
      await prisma.$executeRaw`
        UPDATE weight_goals
        SET isActive = 0
        WHERE userId = ${userId} AND isActive = 1
      `;

      // Insert new goal
      // Note: Using raw SQL because the Prisma schema may not match the database structure
      // The WeightGoal type from weightGoalCalculator has different fields
      await prisma.$executeRaw`
        INSERT INTO weight_goals (
          id, userId, targetWeightKg, startWeightKg, startDate, targetDate,
          goalType, targetWeightChangeKg, weeksToGoal, weeklyWeightChangeKg,
          dailyCalorieDeficit, isActive,
          createdAt, updatedAt
        )
        VALUES (
          ${goalId}, ${userId}, ${weightGoal.targetWeightKg}, ${currentWeightKg},
          datetime('now'), ${weightGoal.targetDate.toISOString()},
          ${goalType || (weightGoal.targetWeightKg < currentWeightKg ? 'lose_weight' : 'gain_weight')}, 
          ${weightGoal.totalWeightChangeKg}, ${weightGoal.weeksToGoal},
          ${weightGoal.totalWeightChangeKg / weightGoal.weeksToGoal}, ${weightGoal.dailyCalorieDeficit}, 1,
          datetime('now'), datetime('now')
        )
      `;

      console.log('✅ Weight goal set successfully');

      res.json({
        success: true,
        message: 'Weight goal set successfully',
        weightGoal: {
          ...weightGoal,
          stepRequirement,
        },
      });
    } catch (error: any) {
      console.error('❌ Set weight goal error:', error);
      res.status(500).json({
        error: 'Failed to set weight goal',
        message: error.message,
      });
    }
  },

  // Get active weight goal
  async getActiveWeightGoal(req: Request, res: Response) {
    try {
      const userId = getUserId(req);

      console.log('⚖️ GET /api/weight-tracking/goal called');

      const activeGoals = await prisma.$queryRaw`
        SELECT * FROM weight_goals
        WHERE userId = ${userId} AND isActive = 1
        ORDER BY createdAt DESC
        LIMIT 1
      ` as any[];

      const goal = activeGoals && activeGoals.length > 0 ? activeGoals[0] : null;

      if (!goal) {
        return res.json({
          success: true,
          goal: null,
          message: 'No active weight goal found',
        });
      }

      // Get latest weight
      const latestWeight = await prisma.$queryRaw`
        SELECT weightKg FROM weight_logs
        WHERE userId = ${userId}
        ORDER BY date DESC
        LIMIT 1
      ` as any[];

      const currentWeightKg = latestWeight && latestWeight.length > 0
        ? latestWeight[0].weightKg
        : goal.startWeightKg;

      // Calculate progress
      const weightGoal = {
        targetWeightKg: goal.targetWeightKg,
        startWeightKg: goal.startWeightKg,
        startDate: new Date(goal.startDate),
        targetDate: new Date(goal.targetDate),
        goalType: goal.goalType,
        targetWeightChangeKg: goal.targetWeightChangeKg,
        weeksToGoal: goal.weeksToGoal,
        weeklyWeightChangeKg: goal.weeklyWeightChangeKg,
        dailyCalorieDeficit: goal.dailyCalorieDeficit,
      };

      // Get weight history for progress calculation
      const weightHistoryData = await prisma.$queryRaw`
        SELECT weightKg, date
        FROM weight_logs
        WHERE userId = ${userId}
        ORDER BY date DESC
        LIMIT 30
      ` as Array<{ weightKg: number; date: Date }>;
      
      const progress = calculateWeightProgress(
        currentWeightKg,
        goal.targetWeightKg,
        new Date(goal.targetDate),
        weightHistoryData.map(w => ({ weightKg: w.weightKg, date: new Date(w.date) }))
      );

      // Get user profile for step calculation
      const physicalProfile = await prisma.userPhysicalProfile.findFirst({
        where: { userId },
      });

      // Calculate step requirement from goal's daily calorie deficit
      // Estimate that 30% of deficit can come from steps
      let stepRequirement = null;
      if (physicalProfile) {
        const caloriesFromSteps = Math.abs(goal.dailyCalorieDeficit) * 0.3;
        stepRequirement = calculateStepsForCalories(caloriesFromSteps, {
          weightKg: physicalProfile.weightKg,
          heightCm: physicalProfile.heightCm,
          age: physicalProfile.age,
          gender: physicalProfile.gender,
          activityLevel: physicalProfile.activityLevel,
          fitnessGoal: physicalProfile.fitnessGoal,
        });
      }

      res.json({
        success: true,
        goal: {
          ...goal,
          progress,
          stepRequirement,
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

  // Get weight progress
  async getWeightProgress(req: Request, res: Response) {
    try {
      const userId = getUserId(req);

      console.log('⚖️ GET /api/weight-tracking/progress called');

      // Get active goal
      const activeGoals = await prisma.$queryRaw`
        SELECT * FROM weight_goals
        WHERE userId = ${userId} AND isActive = 1
        ORDER BY createdAt DESC
        LIMIT 1
      ` as any[];

      if (!activeGoals || activeGoals.length === 0) {
        return res.json({
          success: true,
          progress: null,
          message: 'No active weight goal found',
        });
      }

      const goal = activeGoals[0];

      // Get latest weight
      const latestWeight = await prisma.$queryRaw`
        SELECT weightKg, date FROM weight_logs
        WHERE userId = ${userId}
        ORDER BY date DESC
        LIMIT 1
      ` as any[];

      const currentWeightKg = latestWeight && latestWeight.length > 0
        ? latestWeight[0].weightKg
        : goal.startWeightKg;

      const weightGoal = {
        targetWeightKg: goal.targetWeightKg,
        startWeightKg: goal.startWeightKg,
        startDate: new Date(goal.startDate),
        targetDate: new Date(goal.targetDate),
        goalType: goal.goalType,
        targetWeightChangeKg: goal.targetWeightChangeKg,
        weeksToGoal: goal.weeksToGoal,
        weeklyWeightChangeKg: goal.weeklyWeightChangeKg,
        dailyCalorieDeficit: goal.dailyCalorieDeficit,
      };

      // Get weight history for progress calculation
      const weightHistoryData = await prisma.$queryRaw`
        SELECT weightKg, date
        FROM weight_logs
        WHERE userId = ${userId}
        ORDER BY date DESC
        LIMIT 30
      ` as Array<{ weightKg: number; date: Date }>;
      
      const progress = calculateWeightProgress(
        currentWeightKg,
        goal.targetWeightKg,
        new Date(goal.targetDate),
        weightHistoryData.map(w => ({ weightKg: w.weightKg, date: new Date(w.date) }))
      );

      // Calculate adjusted calories based on progress
      const physicalProfile = await prisma.userPhysicalProfile.findFirst({
        where: { userId },
      });

      let adjustedCalories = null;
      if (physicalProfile && physicalProfile.tdee) {
        const baseCalorieTarget = physicalProfile.tdee + goal.dailyCalorieDeficit;
        // Simple adjustment based on progress
        // If ahead of schedule, reduce deficit; if behind, increase deficit
        const progressFactor = progress.progressPercentage / 100;
        const startDate = new Date(goal.startDate);
        const targetDate = new Date(goal.targetDate);
        const expectedProgress = (Date.now() - startDate.getTime()) / 
                                 (targetDate.getTime() - startDate.getTime());
        const adjustment = (progressFactor - expectedProgress) * 100; // Adjust by up to 100 calories
        adjustedCalories = baseCalorieTarget + adjustment;
      }

      res.json({
        success: true,
        progress: {
          ...progress,
          adjustedCalories,
        },
      });
    } catch (error: any) {
      console.error('❌ Get weight progress error:', error);
      res.status(500).json({
        error: 'Failed to fetch weight progress',
        message: error.message,
      });
    }
  },
};

