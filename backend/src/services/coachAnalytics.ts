// Phase 4 (10Y-D): Coach analytics — structured event log.
// Wire to existing analytics infra (PostHog/Segment) in a follow-up.

import { logger } from '../utils/logger';

type EventProps = Record<string, unknown>;

export type CoachAnalyticsEvent =
  | 'coach_message_sent'
  | 'coach_pro_message_sent'
  | 'coach_cap_hit'
  | 'coach_paywall_view';

export function emit(event: CoachAnalyticsEvent | string, props: EventProps): void {
  // M18: was process.stdout.write — bypassed pino entirely, breaking log
  // aggregation (the line shape didn't match other structured logs and
  // production filters that key on `level` would drop coach events).
  // Now routed through pino at info level with `coach_analytics` event
  // tag so it's filterable + carries the request-id from H12 if a child
  // logger is in scope.
  logger.info(
    {
      coachEvent: event,
      ...props,
    },
    'coach_analytics',
  );
}
