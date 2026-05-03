// Phase 4 (10Y-D): Coach client-side analytics emission. Routes through the
// existing analytics service (privacy-aware, queued).

import { analytics } from '../utils/analytics';

export type CoachAnalyticsEvent =
  | 'coach_paywall_view'
  | 'coach_paywall_convert'
  | 'coach_attachment_blocked';

type EventProps = Record<string, string | number | boolean | null | undefined>;

export function emit(event: CoachAnalyticsEvent | string, props: EventProps = {}): void {
  // TODO 10Y-D follow-up: wire to PostHog/Segment when the production pipeline lands.
  analytics.track(event, props).catch(() => {
    // Swallow — analytics must never throw into Coach UI.
  });
}
