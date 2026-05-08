// ROADMAP 4.0 G2.3 — "What I ate" travel journal routes.
//
// POST  /api/travel-journal              record a new entry
// GET   /api/travel-journal              list entries for the user
// PATCH /api/travel-journal/:id/share    flip isPrivate=false
// PATCH /api/travel-journal/:id/contribute  stamp anonymized contribution

import { Router, type Request, type Response } from 'express';
import {
  recordEntry,
  getEntriesForUser,
  shareWithFriends,
  contributeAnonymized,
} from '@/services/travelJournalService';
import { getUserId } from '@/utils/authHelper';
import { logger } from '@/utils/logger';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { dishName, citySlug, cuisineTag, photoUri, note, isPrivate, occurredAt } =
    req.body ?? {};
  try {
    const entry = await recordEntry({
      userId,
      dishName,
      citySlug,
      cuisineTag,
      photoUri,
      note,
      isPrivate,
      occurredAt: occurredAt ? new Date(occurredAt) : undefined,
    });
    return res.status(201).json(entry);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'invalid request';
    if (/required|exceeds|length/i.test(msg)) {
      return res.status(400).json({ error: msg });
    }
    logger.error({ err: error }, 'travelJournal.create.failed');
    return res.status(500).json({ error: 'create failed' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const since = req.query.since ? new Date(req.query.since as string) : undefined;
  const limitRaw = req.query.limit;
  const limit = typeof limitRaw === 'string' ? Number.parseInt(limitRaw, 10) : undefined;
  try {
    const entries = await getEntriesForUser({
      userId,
      since: since && !Number.isNaN(since.getTime()) ? since : undefined,
      limit: Number.isFinite(limit) ? (limit as number) : undefined,
    });
    return res.json({ entries });
  } catch (error) {
    logger.error({ err: error }, 'travelJournal.list.failed');
    return res.status(500).json({ error: 'list failed' });
  }
});

router.patch('/:id/share', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const entryId = req.params.id;
  try {
    const entry = await shareWithFriends({ userId, entryId });
    return res.json(entry);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'failed';
    if (/not found/i.test(msg)) {
      return res.status(404).json({ error: msg });
    }
    logger.error({ err: error }, 'travelJournal.share.failed');
    return res.status(500).json({ error: 'share failed' });
  }
});

router.patch('/:id/contribute', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const entryId = req.params.id;
  try {
    const entry = await contributeAnonymized({ userId, entryId });
    return res.json(entry);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'failed';
    if (/not found/i.test(msg)) {
      return res.status(404).json({ error: msg });
    }
    logger.error({ err: error }, 'travelJournal.contribute.failed');
    return res.status(500).json({ error: 'contribute failed' });
  }
});

export const travelJournalRouter = router;
