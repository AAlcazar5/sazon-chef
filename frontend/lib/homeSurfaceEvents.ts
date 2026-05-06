// frontend/lib/homeSurfaceEvents.ts
// ROADMAP 4.0 HX7.1 — home-surface event client.
//
// Fire-and-forget log helper consumed by HX hero re-roll, rationale-ribbon
// expand, almost-made-it tap, first-cuisine-badge tap, cohort-overlay tap,
// Sazon-reasoning peek, lifted-discovery-card impression, lifted-discovery-
// card tap, and quick-action chip tap.
//
// Errors are silently swallowed — the surface event log is best-effort
// telemetry, never a user-blocking failure.

import { apiClient } from './api';

export type HomeSurfaceId =
  | 'today_hero'
  | 'hero_rationale_ribbon'
  | 'first_cuisine_badge'
  | 'cohort_overlay'
  | 'sazon_reasoning_peek'
  | 'almost_made_it'
  | 'seasonal_produce_card'
  | 'today_discovery_card'
  | 'quick_action_chip'
  | 'stretch_card'
  | 'plate_of_week_card';

export type HomeSurfaceEventType =
  | 'impression'
  | 'tap'
  | 'reroll'
  | 'expand'
  | 'dismiss';

export interface HomeSurfaceEventPayload {
  surface: HomeSurfaceId;
  eventType: HomeSurfaceEventType;
  position?: number;
  metadata?: Record<string, string | number | boolean | null>;
}

export function logHomeSurfaceEvent(payload: HomeSurfaceEventPayload): void {
  // Fire-and-forget — never await.
  apiClient
    .post('/telemetry/home-surface-events', payload)
    .catch(() => undefined);
}

export function logHomeSurfaceEventBatch(events: HomeSurfaceEventPayload[]): void {
  if (events.length === 0) return;
  apiClient
    .post('/telemetry/home-surface-events', { events })
    .catch(() => undefined);
}
