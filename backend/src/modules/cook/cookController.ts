// backend/src/modules/cook/cookController.ts
//
// W-D Phase 1 / D-1 — Cook Log read API. Cursor-paged, user-scoped, and
// deliberately countless: the response NEVER carries a total/denominator
// (W-D1 no-recipe-count law — the Cook Log is a like-signal store, not a
// countable catalog). The user is taken ONLY from the authed request
// (lib/api/core auth middleware sets req.user) — never from query/body.

import { Request, Response } from 'express';
import { getUserId } from '@/utils/authHelper';
import { getCookLog } from '@/services/cookEventService';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export const cookController = {
  async getCookLog(req: Request, res: Response): Promise<Response> {
    const userId = getUserId(req);

    const rawLimit = parseInt(String(req.query.limit ?? ''), 10);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(MAX_LIMIT, Math.max(1, rawLimit))
      : DEFAULT_LIMIT;
    const cursor =
      typeof req.query.cursor === 'string' && req.query.cursor.trim() !== ''
        ? req.query.cursor
        : undefined;

    const entries = await getCookLog(userId, { limit, cursor });

    // Seamless pagination: a cursor, never a total. nextCursor is the last
    // item's timestamp only when the page came back full (more may exist).
    const nextCursor =
      entries.length >= limit
        ? entries[entries.length - 1].createdAt.toISOString()
        : null;

    return res.json({ entries, nextCursor });
  },
};
