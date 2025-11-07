// backend/src/modules/healthMetrics/healthMetricsController.ts
// Health metrics API controller (Phase 6, Group 12)

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}

export const healthMetricsController = {
  // Store health metrics data
  async storeHealthMetrics(req: Request, res: Response) {
    try {
      const userId = 'temp-user-id'; // TODO: Replace with actual user ID from auth
      const {
        date,
        steps,
      } = req.body;

      console.log('💓 POST /api/health-metrics called');

      // Validate required fields
      if (!date) {
        return res.status(400).json({
          error: 'Date is required',
        });
      }

      // Generate unique ID
      const { randomUUID } = require('crypto');
      const metricId = randomUUID();
      const metricDate = new Date(date);
      
      // Validate steps
      if (steps === undefined || steps === null) {
        return res.status(400).json({
          error: 'Steps is required',
        });
      }

      // Store or update health metrics using raw SQL for SQLite
      await prisma.$executeRaw`
        INSERT OR REPLACE INTO health_metrics (
          id, userId, date, steps,
          createdAt, updatedAt
        )
        VALUES (
          ${metricId}, ${userId}, ${metricDate}, ${steps},
          datetime('now'), datetime('now')
        )
      `;

      console.log('✅ Health metrics stored successfully');

      res.json({
        success: true,
        message: 'Health metrics stored successfully',
      });
    } catch (error: any) {
      console.error('❌ Store health metrics error:', error);
      res.status(500).json({
        error: 'Failed to store health metrics',
        message: error.message,
      });
    }
  },

  // Get recent health metrics
  async getRecentHealthMetrics(req: Request, res: Response) {
    try {
      const userId = 'temp-user-id'; // TODO: Replace with actual user ID from auth
      const days = parseInt(req.query.days as string) || 7;

      console.log(`💓 GET /api/health-metrics/recent called (${days} days)`);

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);
      
      const metrics = await prisma.$queryRaw`
        SELECT * FROM health_metrics
        WHERE userId = ${userId}
        AND date >= ${daysAgo}
        ORDER BY date DESC
      `;

      res.json({
        success: true,
        metrics: metrics || [],
      });
    } catch (error: any) {
      console.error('❌ Get health metrics error:', error);
      res.status(500).json({
        error: 'Failed to fetch health metrics',
        message: error.message,
      });
    }
  },

  // Get today's health metrics
  async getTodaysHealthMetrics(req: Request, res: Response) {
    try {
      const userId = 'temp-user-id'; // TODO: Replace with actual user ID from auth

      console.log('💓 GET /api/health-metrics/today called');

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const metrics = await prisma.$queryRaw`
        SELECT * FROM health_metrics
        WHERE userId = ${userId}
        AND date >= ${today}
        AND date < ${tomorrow}
        ORDER BY date DESC
        LIMIT 1
      `;

      const todayMetrics = Array.isArray(metrics) && metrics.length > 0 ? metrics[0] : null;

      res.json({
        success: true,
        metrics: todayMetrics,
      });
    } catch (error: any) {
      console.error('❌ Get today health metrics error:', error);
      res.status(500).json({
        error: 'Failed to fetch today health metrics',
        message: error.message,
      });
    }
  },
};

