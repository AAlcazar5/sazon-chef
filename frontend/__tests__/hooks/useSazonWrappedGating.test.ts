// J13 — gating logic for the Sazon Wrapped surface.
//
// Pure-function tests (no React, no AsyncStorage). The hook composes these
// + AsyncStorage reads; component-level tests cover the integration.

import {
  DEFAULT_WRAPPED_WINDOW,
  isInWrappedWindow,
  shouldShowWrapped,
  wrappedYearForDate,
} from '../../hooks/useSazonWrappedGating';

const d = (year: number, monthIndex: number, day: number): Date =>
  new Date(year, monthIndex, day, 12, 0, 0);

describe('wrappedYearForDate / isInWrappedWindow', () => {
  it('returns the current year on Dec 28', () => {
    expect(wrappedYearForDate(d(2026, 11, 28))).toBe(2026);
    expect(isInWrappedWindow(d(2026, 11, 28))).toBe(true);
  });

  it('returns the current year on Dec 31', () => {
    expect(wrappedYearForDate(d(2026, 11, 31))).toBe(2026);
  });

  it('returns the PREVIOUS year on Jan 2 (January catch-up window)', () => {
    expect(wrappedYearForDate(d(2027, 0, 2))).toBe(2026);
  });

  it('returns null on Jan 3 (window closed)', () => {
    expect(wrappedYearForDate(d(2027, 0, 3))).toBeNull();
    expect(isInWrappedWindow(d(2027, 0, 3))).toBe(false);
  });

  it('returns null on Dec 27 (window not yet open)', () => {
    expect(wrappedYearForDate(d(2026, 11, 27))).toBeNull();
  });

  it('returns null mid-summer', () => {
    expect(wrappedYearForDate(d(2026, 6, 15))).toBeNull();
  });

  it('honors a custom window', () => {
    // Custom: Nov 1 – Nov 30 only
    const custom = { startMonth: 10, startDay: 1, endMonth: 10, endDay: 30 };
    expect(wrappedYearForDate(d(2026, 10, 15), custom)).toBe(2026);
    expect(wrappedYearForDate(d(2026, 11, 1), custom)).toBeNull();
  });
});

describe('shouldShowWrapped', () => {
  const inWindow = d(2026, 11, 28);
  const outOfWindow = d(2026, 6, 15);

  it('show=false when out of window', () => {
    expect(shouldShowWrapped({ now: outOfWindow, cookCount: 50, lastSeenYear: null })).toEqual({
      show: false,
      year: null,
    });
  });

  it('show=false when cookCount=0 even in window', () => {
    expect(shouldShowWrapped({ now: inWindow, cookCount: 0, lastSeenYear: null })).toEqual({
      show: false,
      year: 2026,
    });
  });

  it('show=true when in window + has cooks + never seen', () => {
    expect(shouldShowWrapped({ now: inWindow, cookCount: 12, lastSeenYear: null })).toEqual({
      show: true,
      year: 2026,
    });
  });

  it('show=false when this year already seen', () => {
    expect(shouldShowWrapped({ now: inWindow, cookCount: 12, lastSeenYear: 2026 })).toEqual({
      show: false,
      year: 2026,
    });
  });

  it('show=true when only PRIOR years are seen', () => {
    expect(shouldShowWrapped({ now: inWindow, cookCount: 12, lastSeenYear: 2025 })).toEqual({
      show: true,
      year: 2026,
    });
  });

  it('January catch-up surfaces the prior year and respects last-seen', () => {
    const janWindow = d(2027, 0, 2);
    expect(shouldShowWrapped({ now: janWindow, cookCount: 5, lastSeenYear: null })).toEqual({
      show: true,
      year: 2026,
    });
    expect(
      shouldShowWrapped({ now: janWindow, cookCount: 5, lastSeenYear: 2026 })
    ).toEqual({ show: false, year: 2026 });
  });

  it('cookCount of exactly 1 is enough to qualify', () => {
    expect(shouldShowWrapped({ now: inWindow, cookCount: 1, lastSeenYear: null })).toEqual({
      show: true,
      year: 2026,
    });
  });

  it('default window is Dec 28 – Jan 2', () => {
    expect(DEFAULT_WRAPPED_WINDOW).toEqual({
      startMonth: 11,
      startDay: 28,
      endMonth: 0,
      endDay: 2,
    });
  });
});
