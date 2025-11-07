// backend/src/modules/healthMetrics/healthMetricsRoutes.ts
// Health metrics API routes (Phase 6, Group 12)

import { Router } from 'express';
import { healthMetricsController } from './healthMetricsController';

const router = Router();

// Store health metrics data
router.post('/', healthMetricsController.storeHealthMetrics);

// Get recent health metrics
router.get('/recent', healthMetricsController.getRecentHealthMetrics);

// Get today's health metrics
router.get('/today', healthMetricsController.getTodaysHealthMetrics);

export { router as healthMetricsRoutes };

