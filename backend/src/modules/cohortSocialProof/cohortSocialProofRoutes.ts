// backend/src/modules/cohortSocialProof/cohortSocialProofRoutes.ts
// ROADMAP 4.0 F9 — Cohort social proof routes.

import { Router } from 'express';
import { cohortSocialProofController } from './cohortSocialProofController';

export const cohortSocialProofRoutes = Router();
cohortSocialProofRoutes.get('/', cohortSocialProofController.get);
