// Public waitlist routes (no auth — pre-launch landing page).

import { Router } from 'express';
import { waitlistController } from './waitlistController';
import { strictPublicLimiter } from '@/middleware/rateLimiter';

export const waitlistRoutes = Router();
// U6: unauthenticated public endpoint — strict per-IP limiter to thwart sign-up spam.
waitlistRoutes.post('/', strictPublicLimiter, waitlistController.signup);
