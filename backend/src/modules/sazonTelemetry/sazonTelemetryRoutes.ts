// ROADMAP 4.0 IA2.8 — Sazon sheet open-event sink.
//
// POST /api/telemetry/sazon-open — frontend posts here every time
// SazonSheet opens. Body: { source, contextSeed?, locale?, extra? }.

import { Router, type Request, type Response } from 'express';
import {
  logSazonOpen,
  SAZON_OPEN_SOURCES,
  type SazonOpenSource,
} from '@/services/sazonOpenLog';
import { getUserId } from '@/utils/authHelper';
import { logger } from '@/utils/logger';

const router = Router();

router.post('/sazon-open', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { source, contextSeed, locale, extra } = req.body ?? {};
  if (!source || typeof source !== 'string') {
    return res.status(400).json({ error: 'source is required' });
  }
  if (!SAZON_OPEN_SOURCES.includes(source as SazonOpenSource)) {
    return res.status(400).json({
      error: 'unknown source',
      allowed: SAZON_OPEN_SOURCES,
    });
  }

  try {
    await logSazonOpen({
      userId,
      source: source as SazonOpenSource,
      contextSeed: typeof contextSeed === 'string' ? contextSeed : undefined,
      locale: typeof locale === 'string' ? locale : undefined,
      extra: extra && typeof extra === 'object' ? extra : undefined,
    });
    return res.status(204).send();
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'failed';
    if (/userId|source/i.test(msg)) return res.status(400).json({ error: msg });
    logger.error({ err: error }, 'sazonTelemetry.open.failed');
    return res.status(500).json({ error: 'log failed' });
  }
});

export const sazonTelemetryRouter = router;
