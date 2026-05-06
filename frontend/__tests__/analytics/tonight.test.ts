// frontend/__tests__/analytics/tonight.test.ts
// ROADMAP 4.0 T4.1 — Tonight Mode analytics event shapes.
//
// Verifies the exported event names + payload contract. Each event must
// include `proposalLatencyMs` + `pantryCoveragePct` (T4.1 spec).

import {
  TONIGHT_EVENTS,
  trackTonightProposalShown,
  trackTonightProposalAccepted,
  trackTonightProposalSwapped,
  trackTonightProposalEscaped,
  trackTonightModeDisabled,
} from '../../lib/analytics';

import * as analytics from '../../lib/analytics';

describe('Tonight analytics events (T4.1)', () => {
  let trackSpy: jest.SpyInstance;

  beforeEach(() => {
    trackSpy = jest.spyOn(analytics, 'track').mockImplementation(() => {});
  });
  afterEach(() => {
    trackSpy.mockRestore();
  });

  it('exposes the 5 documented event names', () => {
    expect(TONIGHT_EVENTS).toEqual({
      shown: 'tonight_proposal_shown',
      accepted: 'tonight_proposal_accepted',
      swapped: 'tonight_proposal_swapped',
      escaped: 'tonight_proposal_escaped',
      disabled: 'tonight_mode_disabled',
    });
  });

  it('trackTonightProposalShown emits exactly one event with required payload', () => {
    trackTonightProposalShown({ proposalLatencyMs: 250, pantryCoveragePct: 0.78, recipeId: 'r1' });
    expect(trackSpy).toHaveBeenCalledTimes(1);
    expect(trackSpy).toHaveBeenCalledWith('tonight_proposal_shown', expect.objectContaining({
      proposalLatencyMs: 250,
      pantryCoveragePct: 0.78,
      recipeId: 'r1',
    }));
  });

  it('trackTonightProposalAccepted emits exactly one event with required payload', () => {
    trackTonightProposalAccepted({ proposalLatencyMs: 100, pantryCoveragePct: 0.9, recipeId: 'r1' });
    expect(trackSpy).toHaveBeenCalledTimes(1);
    expect(trackSpy).toHaveBeenCalledWith('tonight_proposal_accepted', expect.objectContaining({
      proposalLatencyMs: 100,
      pantryCoveragePct: 0.9,
      recipeId: 'r1',
    }));
  });

  it('trackTonightProposalSwapped includes from/to recipe ids', () => {
    trackTonightProposalSwapped({
      proposalLatencyMs: 150,
      pantryCoveragePct: 0.7,
      fromRecipeId: 'r1',
      toRecipeId: 'r2',
    });
    expect(trackSpy).toHaveBeenCalledWith('tonight_proposal_swapped', expect.objectContaining({
      fromRecipeId: 'r1',
      toRecipeId: 'r2',
    }));
  });

  it('trackTonightProposalEscaped fires once', () => {
    trackTonightProposalEscaped({ proposalLatencyMs: 200, pantryCoveragePct: 0.65 });
    expect(trackSpy).toHaveBeenCalledTimes(1);
  });

  it('trackTonightModeDisabled fires once on toggle off', () => {
    trackTonightModeDisabled();
    expect(trackSpy).toHaveBeenCalledTimes(1);
    expect(trackSpy).toHaveBeenCalledWith('tonight_mode_disabled', expect.any(Object));
  });
});
