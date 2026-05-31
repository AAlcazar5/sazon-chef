// Tier Q — Beta feedback intake.

import { Router } from 'express';
import { feedbackController } from './feedbackController';

export const feedbackRoutes = Router();
feedbackRoutes.post('/', feedbackController.create);
