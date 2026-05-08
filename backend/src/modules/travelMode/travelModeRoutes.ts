// ROADMAP 4.0 G2.1 — Sazon Travel mode heartbeat route.
//
// POST /api/travel-mode/heartbeat — client posts current lat/lng on app
// open or significant location change; server returns the resolved
// travel state + city for the Today header.
//
// GET /api/travel-mode/state — read current state without writing (no
// new coordinates available).

import { Router, type Request, type Response } from 'express';
import { recordHeartbeat } from '@/services/travelModeService';
import { getUserId } from '@/utils/authHelper';
import { logger } from '@/utils/logger';

const router = Router();

router.post('/heartbeat', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { latitude, longitude, homeLatitude, homeLongitude } = req.body ?? {};
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ error: 'latitude + longitude required (numbers)' });
  }
  try {
    const result = await recordHeartbeat({
      userId,
      latitude,
      longitude,
      homeLatitude: typeof homeLatitude === 'number' ? homeLatitude : undefined,
      homeLongitude: typeof homeLongitude === 'number' ? homeLongitude : undefined,
    });
    return res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'failed';
    if (/required|invalid coordinate|not found/i.test(msg)) {
      return res.status(400).json({ error: msg });
    }
    logger.error({ err: error }, 'travelMode.heartbeat.failed');
    return res.status(500).json({ error: 'heartbeat failed' });
  }
});

export const travelModeRouter = router;
