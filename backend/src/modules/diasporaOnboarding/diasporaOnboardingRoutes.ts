// ROADMAP 4.0 G1.1 — diaspora onboarding route.
//
// POST /api/onboarding/diaspora — apply heritage selection: seeds cuisine-
// affinity weights + soft-sets locale (when device is en-US AND user has
// no persisted non-en locale). Returns the applied state for the client
// to confirm.
//
// GET /api/onboarding/diaspora/options — list of available heritage
// options for the onboarding UI.

import { Router, type Request, type Response } from 'express';
import {
  HERITAGE_CUISINES,
  applyDiasporaOnboarding,
} from '@/services/diasporaOnboardingService';
import { getUserId } from '@/utils/authHelper';
import { logger } from '@/utils/logger';

const router = Router();

router.get('/options', (_req: Request, res: Response) => {
  return res.json({ options: HERITAGE_CUISINES });
});

router.post('/', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { heritages, deviceLocale } = req.body ?? {};
  if (!Array.isArray(heritages)) {
    return res.status(400).json({ error: 'heritages must be an array' });
  }
  if (typeof deviceLocale !== 'string' || !deviceLocale) {
    return res.status(400).json({ error: 'deviceLocale is required' });
  }
  try {
    const result = await applyDiasporaOnboarding({ userId, heritages, deviceLocale });
    return res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'failed';
    if (/userId/i.test(msg)) return res.status(400).json({ error: msg });
    logger.error({ err: error }, 'diasporaOnboarding.apply.failed');
    return res.status(500).json({ error: 'apply failed' });
  }
});

export const diasporaOnboardingRouter = router;
