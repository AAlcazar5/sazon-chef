// P4 retention — taste-cohort picker tests.

import {
  pickCohortPayload,
  COHORT_PROOF_MIN_COUNT,
} from '../../src/services/recipeCohortProofService';

describe('pickCohortPayload', () => {
  it('returns quiet when no top cuisine is known', () => {
    expect(pickCohortPayload(null, 5)).toEqual({
      cookerCount: 0,
      cohortLabel: null,
    });
  });

  it('returns quiet when distinct cooker count is below MIN_VISIBLE_COUNT', () => {
    expect(pickCohortPayload('Persian', COHORT_PROOF_MIN_COUNT - 1)).toEqual({
      cookerCount: 0,
      cohortLabel: null,
    });
  });

  it('renders the proof at the visible threshold', () => {
    const out = pickCohortPayload('Persian', COHORT_PROOF_MIN_COUNT);
    expect(out.cookerCount).toBe(COHORT_PROOF_MIN_COUNT);
    expect(out.cohortLabel).toBe('Persian');
  });

  it('passes through higher counts unchanged', () => {
    const out = pickCohortPayload('Thai', 27);
    expect(out.cookerCount).toBe(27);
    expect(out.cohortLabel).toBe('Thai');
  });
});
