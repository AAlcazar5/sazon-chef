// BAP1.1: useTodayPlateContext — variant priority resolution.
//
// Pure-resolver tests for the priority logic. The full hook integrates
// three React Query sources; mounting that requires a substantial mock
// graph (covered by contract checks on the file source below). The
// priority decision IS the contract worth pinning — a regression in
// the resolver order silently lands the wrong framing per visit.

import {
  resolveTodayPlateVariant,
  type TodayPlateVariant,
} from '../../hooks/useTodayPlateContext';

describe('BAP1.1: resolveTodayPlateVariant', () => {
  it('leftover wins when leftoverCount ≥ 2 (regardless of other signals)', () => {
    const v = resolveTodayPlateVariant({
      leftoverCount: 2,
      pantryCoveragePercent: 95, // would otherwise win
      hasWeekPlate: true,
    });
    expect(v).toBe<TodayPlateVariant>('leftover');
  });

  it('leftover wins on exactly the threshold (≥2, not >2)', () => {
    expect(
      resolveTodayPlateVariant({
        leftoverCount: 2,
        pantryCoveragePercent: null,
        hasWeekPlate: false,
      }),
    ).toBe<TodayPlateVariant>('leftover');
  });

  it('1 leftover is NOT enough — falls through to next signal', () => {
    expect(
      resolveTodayPlateVariant({
        leftoverCount: 1,
        pantryCoveragePercent: 80,
        hasWeekPlate: false,
      }),
    ).toBe<TodayPlateVariant>('pantry');
  });

  it('pantry wins when pantryCoveragePercent ≥ 60 and no leftover priority', () => {
    expect(
      resolveTodayPlateVariant({
        leftoverCount: 0,
        pantryCoveragePercent: 60,
        hasWeekPlate: true, // would otherwise win
      }),
    ).toBe<TodayPlateVariant>('pantry');
  });

  it('pantry coverage at 59 is NOT enough — falls through', () => {
    expect(
      resolveTodayPlateVariant({
        leftoverCount: 0,
        pantryCoveragePercent: 59,
        hasWeekPlate: true,
      }),
    ).toBe<TodayPlateVariant>('plateOfWeek');
  });

  it('null pantry coverage is treated as no-signal (falls through)', () => {
    expect(
      resolveTodayPlateVariant({
        leftoverCount: 0,
        pantryCoveragePercent: null,
        hasWeekPlate: true,
      }),
    ).toBe<TodayPlateVariant>('plateOfWeek');
  });

  it('plateOfWeek wins when neither leftover nor pantry qualifies but a week plate exists', () => {
    expect(
      resolveTodayPlateVariant({
        leftoverCount: 1,
        pantryCoveragePercent: 30,
        hasWeekPlate: true,
      }),
    ).toBe<TodayPlateVariant>('plateOfWeek');
  });

  it('coldStart is the final fallback when no signal resolves', () => {
    expect(
      resolveTodayPlateVariant({
        leftoverCount: 0,
        pantryCoveragePercent: null,
        hasWeekPlate: false,
      }),
    ).toBe<TodayPlateVariant>('coldStart');
  });

  it('leftover beats pantry when both qualify (priority is a strict order)', () => {
    expect(
      resolveTodayPlateVariant({
        leftoverCount: 5,
        pantryCoveragePercent: 100,
        hasWeekPlate: true,
      }),
    ).toBe<TodayPlateVariant>('leftover');
  });
});
