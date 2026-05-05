// Public waitlist routes (no auth — pre-launch landing page).

import { Router } from 'express';
import { waitlistController } from './waitlistController';

export const waitlistRoutes = Router();
waitlistRoutes.post('/', waitlistController.signup);
