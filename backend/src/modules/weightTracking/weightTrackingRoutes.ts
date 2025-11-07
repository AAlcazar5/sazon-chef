// backend/src/modules/weightTracking/weightTrackingRoutes.ts
// Weight tracking API routes (Phase 6, Group 12)

import { Router } from 'express';
import { weightTrackingController } from './weightTrackingController';

const router = Router();

// Log weight
router.post('/log', weightTrackingController.logWeight);

// Get weight history
router.get('/history', weightTrackingController.getWeightHistory);

// Get latest weight
router.get('/latest', weightTrackingController.getLatestWeight);

// Create or update weight goal
router.post('/goal', weightTrackingController.setWeightGoal);

// Get active weight goal
router.get('/goal', weightTrackingController.getActiveWeightGoal);

// Get weight progress
router.get('/progress', weightTrackingController.getWeightProgress);

export { router as weightTrackingRoutes };

