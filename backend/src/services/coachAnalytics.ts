// Phase 4 (10Y-D): Coach analytics — structured stdout JSON for now.
// Wire to existing analytics infra (PostHog/Segment) in a follow-up.

type EventProps = Record<string, unknown>;

export type CoachAnalyticsEvent =
  | 'coach_message_sent'
  | 'coach_pro_message_sent'
  | 'coach_cap_hit'
  | 'coach_paywall_view';

export function emit(event: CoachAnalyticsEvent | string, props: EventProps): void {
  const payload = {
    type: 'coach_analytics',
    event,
    ts: new Date().toISOString(),
    ...props,
  };
  // TODO 10Y-D follow-up: route through structured logger / external sink
  // (currently process.stdout — picked up by the existing log pipeline).
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}
