// ROADMAP 4.0 G2.4 — founder-trip curation task routes.
//
// Internal-only admin tooling. Mounted under `requireAdmin`.
//
// POST  /api/admin/founder-trips             generate trip tasks
// GET   /api/admin/founder-trips/tasks       list this admin's tasks
// PATCH /api/admin/founder-trips/tasks/:id   update task progress

import { Router, type Request, type Response } from 'express';
import {
  generateTripTasks,
  getTasksForUser,
  updateTaskProgress,
  type TaskStatus,
  type TaskType,
} from '@/services/founderTripService';
import { getUserId } from '@/utils/authHelper';
import { logger } from '@/utils/logger';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { locale, citySlug, taskTypes, targetCounts } = req.body ?? {};
  if (!locale || typeof locale !== 'string') {
    return res.status(400).json({ error: 'locale is required' });
  }
  try {
    const result = await generateTripTasks({
      userId,
      locale,
      citySlug,
      taskTypes: Array.isArray(taskTypes) ? (taskTypes as TaskType[]) : undefined,
      targetCounts,
    });
    return res.status(201).json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'failed';
    if (/required|unknown task type/i.test(msg)) {
      return res.status(400).json({ error: msg });
    }
    logger.error({ err: error }, 'founderTrip.generate.failed');
    return res.status(500).json({ error: 'generate failed' });
  }
});

router.get('/tasks', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const status = req.query.status as TaskStatus | undefined;
  try {
    const tasks = await getTasksForUser({ userId, status });
    return res.json({ tasks });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'failed';
    if (/unknown status|userId/i.test(msg)) {
      return res.status(400).json({ error: msg });
    }
    logger.error({ err: error }, 'founderTrip.list.failed');
    return res.status(500).json({ error: 'list failed' });
  }
});

router.patch('/tasks/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const taskId = req.params.id;
  const { completedCount, status, notes } = req.body ?? {};
  try {
    const task = await updateTaskProgress({
      userId,
      taskId,
      completedCount: typeof completedCount === 'number' ? completedCount : undefined,
      status: status as TaskStatus | undefined,
      notes: typeof notes === 'string' ? notes : undefined,
    });
    return res.json(task);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'failed';
    if (/not found/i.test(msg)) return res.status(404).json({ error: msg });
    if (/unknown status/i.test(msg)) return res.status(400).json({ error: msg });
    logger.error({ err: error }, 'founderTrip.update.failed');
    return res.status(500).json({ error: 'update failed' });
  }
});

export const founderTripRouter = router;
