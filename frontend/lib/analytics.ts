// frontend/lib/analytics.ts
//
// Lightweight typed analytics shim. Wire to the real provider (PostHog /
// Amplitude / Segment) when one is selected — the call sites stay stable.
//
// ROADMAP 4.0 T4.1 — Tonight Mode events.

type AnalyticsEvent =
  | 'skipped_first_plate'
  | 'completed_first_plate'
  | 'tonight_proposal_shown'
  | 'tonight_proposal_accepted'
  | 'tonight_proposal_swapped'
  | 'tonight_proposal_escaped'
  | 'tonight_mode_disabled';

interface TrackPayload {
  [key: string]: string | number | boolean | null | undefined;
}

// Exported as a namespace property so call sites can do
// `analytics.track(...)` AND tests can spy on `track` via the module record.
export const track = (event: AnalyticsEvent, _payload?: TrackPayload): void => {
  // Stub — wire to a real analytics provider in Group 6.
};

// ROADMAP 4.0 T4.1 — Tonight Mode event registry. Centralizing the strings
// keeps every call site in lockstep with the dashboard / analyst contract.
export const TONIGHT_EVENTS = {
  shown: 'tonight_proposal_shown',
  accepted: 'tonight_proposal_accepted',
  swapped: 'tonight_proposal_swapped',
  escaped: 'tonight_proposal_escaped',
  disabled: 'tonight_mode_disabled',
} as const;

interface TonightBasePayload {
  proposalLatencyMs: number;
  pantryCoveragePct: number | null;
}

interface TonightShownPayload extends TonightBasePayload {
  recipeId: string | null;
}

interface TonightAcceptedPayload extends TonightBasePayload {
  recipeId: string;
}

interface TonightSwappedPayload extends TonightBasePayload {
  fromRecipeId: string | null;
  toRecipeId: string;
}

// Use an internal indirection so jest.spyOn(analytics, 'track') is honored.
// Importing this module as a namespace and spying on the named export
// replaces the binding on this module record — call sites that reach
// through `module.track(...)` see the spy. Direct `track(...)` calls in the
// same file would not, so all helpers go through the namespace ref.
import * as self from './analytics';

export const trackTonightProposalShown = (payload: TonightShownPayload): void => {
  self.track(TONIGHT_EVENTS.shown, payload as unknown as TrackPayload);
};

export const trackTonightProposalAccepted = (payload: TonightAcceptedPayload): void => {
  self.track(TONIGHT_EVENTS.accepted, payload as unknown as TrackPayload);
};

export const trackTonightProposalSwapped = (payload: TonightSwappedPayload): void => {
  self.track(TONIGHT_EVENTS.swapped, payload as unknown as TrackPayload);
};

export const trackTonightProposalEscaped = (payload: TonightBasePayload): void => {
  self.track(TONIGHT_EVENTS.escaped, payload as unknown as TrackPayload);
};

export const trackTonightModeDisabled = (): void => {
  self.track(TONIGHT_EVENTS.disabled, {});
};
