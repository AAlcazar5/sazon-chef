// backend/src/modules/weightGoal/weightGoalRoutes.ts
// Weight goal and weight logging API routes (Phase 6, Group 12)

import { Router } from 'express';
import { weightGoalController } from './weightGoalController';

const router = Router();

// Weight goal endpoints
router.post('/', weightGoalController.setWeightGoal);
router.get('/', weightGoalController.getWeightGoal);
router.get('/calories-from-steps', weightGoalController.getCaloriesFromSteps);

// Weight logging endpoints
router.post('/log', weightGoalController.logWeight);
router.get('/history', weightGoalController.getWeightHistory);

export { router as weightGoalRoutes };

