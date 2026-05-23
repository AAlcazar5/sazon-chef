// backend/src/modules/cook/cookController.ts
//
// W-D Phase 1 / D-1 — Cook Log read API. Cursor-paged, user-scoped, and
// deliberately countless: the response NEVER carries a total/denominator
// (W-D1 no-recipe-count law — the Cook Log is a like-signal store, not a
// countable catalog). The user is taken ONLY from the authed request
// (lib/api/core auth middleware sets req.user) — never from query/body.

import { Request, Response } from 'express';
import { getUserId } from '@/utils/authHelper';
import {
  getCookLog,
  recordCookEvent,
  type CookEventType,
} from '@/services/cookEventService';
import { buildCookContextExport } from '@/services/cookContextExportService';
import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const ALLOWED_TYPES: readonly CookEventType[] = [
  'scale',
  'swap',
  'made_it',
  'note',
  'outcome',
];

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

  // D-6 — log a cook the user did with help elsewhere (the §9a
  // "complement Claude" path). User is the AUTHED user only (IDOR). type
  // defaults to made_it; recipeId optional (no Sazon recipe required).
  // recordCookEvent also feeds the affinity loop (non-blocking).
  async logCookEvent(req: Request, res: Response): Promise<Response> {
    const userId = getUserId(req);
    const body = (req.body ?? {}) as {
      type?: string;
      recipeId?: string | null;
      payload?: Record<string, unknown>;
    };

    const type = (body.type ?? 'made_it') as CookEventType;
    if (!ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ error: `unknown cook event type: ${body.type}` });
    }
    const payload =
      body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload)
        ? body.payload
        : {};

    const created = await recordCookEvent({
      userId,
      recipeId: body.recipeId ?? null,
      type,
      payload,
    });
    return res.json({ id: created.id });
  },

  // X-B1 (founder roadmap Tier X — Moat Hardening): structured cook
  // context export. Versioned, PII-aware, deterministic. User-scoped
  // by the auth middleware (NO query/body userId — IDOR-safe).
  async getCookContextExport(req: Request, res: Response): Promise<Response> {
    const userId = getUserId(req);
    try {
      const payload = await buildCookContextExport({ prisma, userId });
      return res.json(payload);
    } catch (error) {
      logger.error(
        { err: error, userId },
        'cook.context-export.failed',
      );
      return res
        .status(500)
        .json({ error: 'Failed to build cook context export.' });
    }
  },
};
