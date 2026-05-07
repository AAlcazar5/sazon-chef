// backend/src/modules/telemetry/homeSurfaceEventController.ts
// ROADMAP 4.0 HX7.1 — frontend log endpoint for home-surface events.
//
// Accepts a single event or a small batch (impressions + taps + rerolls
// the user fired during a session). Each event flows through
// `logHomeSurfaceEvent`, which handles dedup + PII guard + persistence.

import { Request, Response } from 'express';
import { z } from 'zod';
import { getUserId } from '@/utils/authHelper';
import {
  logHomeSurfaceEvent,
  type HomeSurfaceId,
  type HomeSurfaceEventType,
} from '@/services/homeSurfaceEventLog';
import { logger } from '@/utils/logger';

const SURFACE_IDS: HomeSurfaceId[] = [
  'today_hero',
  'hero_rationale_ribbon',
  'first_cuisine_badge',
  'cohort_overlay',
  'sazon_reasoning_peek',
  'almost_made_it',
  'seasonal_produce_card',
  'today_discovery_card',
  'quick_action_chip',
  'stretch_card',
  'plate_of_week_card',
];

const EVENT_TYPES: HomeSurfaceEventType[] = [
  'impression',
  'tap',
  'reroll',
  'expand',
  'dismiss',
];

const eventSchema = z.object({
  surface: z.enum(SURFACE_IDS as unknown as [string, ...string[]]),
  eventType: z.enum(EVENT_TYPES as unknown as [string, ...string[]]),
  position: z.number().int().min(0).max(1000).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  occurredAt: z.string().datetime().optional(),
});

const batchSchema = z.object({
  events: z.array(eventSchema).min(1).max(50),
});

export const homeSurfaceEventController = {
  async record(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const body = req.body;

      const parsed = Array.isArray(body?.events)
        ? batchSchema.safeParse(body)
        : (() => {
            const single = eventSchema.safeParse(body);
            return single.success
              ? { success: true as const, data: { events: [single.data] } }
              : { success: false as const, error: single.error };
          })();

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid event payload',
          details: parsed.error?.issues ?? [],
        });
      }

      // Fire-and-forget: don't make the client wait on prisma.
      const writes = parsed.data.events.map((ev) =>
        logHomeSurfaceEvent({
          userId,
          surface: ev.surface as HomeSurfaceId,
          eventType: ev.eventType as HomeSurfaceEventType,
          position: ev.position,
          metadata: ev.metadata,
          occurredAt: ev.occurredAt ? new Date(ev.occurredAt) : undefined,
        }),
      );

      // Track the count of *attempted* writes; the service deduplicates.
      void Promise.all(writes).catch(() => undefined);

      res.json({ accepted: parsed.data.events.length });
    } catch (err) {
      logger.warn({ err }, 'HX7.1 record home-surface-event failed');
      res.status(500).json({ error: 'Failed to record home-surface events' });
    }
  },
};
