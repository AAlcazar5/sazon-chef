// backend/src/modules/discoveryMilestones/discoveryMilestonesRoutes.ts
// ROADMAP 4.0 Tier J5 — Discovery milestones routes.

import { Router } from 'express';
import { discoveryMilestonesController } from './discoveryMilestonesController';

export const discoveryMilestonesRoutes = Router();
discoveryMilestonesRoutes.post('/', discoveryMilestonesController.mark);
discoveryMilestonesRoutes.get('/', discoveryMilestonesController.list);
