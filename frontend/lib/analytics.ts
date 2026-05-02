type AnalyticsEvent =
  | 'skipped_first_plate'
  | 'completed_first_plate';

interface TrackPayload {
  [key: string]: string | number | boolean | null | undefined;
}

export const track = (event: AnalyticsEvent, _payload?: TrackPayload): void => {
  // Stub — wire to a real analytics provider (PostHog/Amplitude) in Group 6.
};
