// backend/src/modules/telemetry/surfaceEventController.ts
// ROADMAP 4.0 Tier B3 — Surface event sink endpoint.
//
// Frontend POSTs impression / tap / cook / rate events here. Single endpoint,
// batched by the client to keep network noise low.

import { Request, Response } from 'express';
import { z } from 'zod';
import { getUserId } from '@/utils/authHelper';
import {
  recordSurfaceEvent,
  SURFACES,
  ACTIONS,
} from '@/services/surfaceYieldService';
import { logger } from '@/utils/logger';

const eventSchema = z.object({
  surface: z.enum(SURFACES as unknown as [string, ...string[]]),
  action: z.enum(ACTIONS as unknown as [string, ...string[]]),
  recipeId: z.string().nullable().optional(),
  variant: z.string().nullable().optional(),
});

const batchSchema = z.object({
  events: z.array(eventSchema).min(1).max(50),
});

export const surfaceEventController = {
  async record(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const body = req.body;

      // Accept either a single event or {events: [...]}.
      const parsed = Array.isArray(body?.events)
        ? batchSchema.safeParse(body)
        : (() => {
            const single = eventSchema.safeParse(body);
            return single.success
              ? { success: true as const, data: { events: [single.data] } }
              : single;
          })();

      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid surface event payload', details: parsed.error.format() });
      }

      const { events } = parsed.data;
      let accepted = 0;
      for (const evt of events) {
        try {
          await recordSurfaceEvent({
            userId,
            surface: evt.surface,
            action: evt.action,
            recipeId: evt.recipeId ?? null,
            variant: evt.variant ?? null,
          });
          accepted += 1;
        } catch (err) {
          logger.warn({ err, evt }, 'recordSurfaceEvent failed for one event');
          // Continue — best-effort batch.
        }
      }

      return res.json({ accepted, total: events.length });
    } catch (err) {
      logger.error({ err }, 'surfaceEventController.record failed');
      return res.status(500).json({ error: 'Failed to record surface event' });
    }
  },
};
