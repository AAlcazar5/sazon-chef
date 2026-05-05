// backend/__tests__/services/seasonalProduceService.test.ts

import {
  SEASONAL_PRODUCE_BY_MONTH,
  pickSeasonalProduce,
  findPeakMonth,
} from '../../src/services/seasonalProduceService';

describe('SEASONAL_PRODUCE_BY_MONTH library', () => {
  it('has 12 months', () => {
    expect(SEASONAL_PRODUCE_BY_MONTH).toHaveLength(12);
  });

  it('every month has at least 3 produce entries', () => {
    for (const month of SEASONAL_PRODUCE_BY_MONTH) {
      expect(month.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('every entry has a non-empty name and hook', () => {
    for (const month of SEASONAL_PRODUCE_BY_MONTH) {
      for (const p of month) {
        expect(p.name.length).toBeGreaterThan(0);
        expect(p.hook.length).toBeGreaterThan(0);
      }
    }
  });

  it('names are lowercase', () => {
    for (const month of SEASONAL_PRODUCE_BY_MONTH) {
      for (const p of month) {
        expect(p.name).toBe(p.name.toLowerCase());
      }
    }
  });

  it('lifestyle voice — no banned macro/diet vocabulary', () => {
    const banned = [' macro', 'cut your', 'bulk ', 'low-cal', 'low cal'];
    for (const month of SEASONAL_PRODUCE_BY_MONTH) {
      for (const p of month) {
        const blob = p.hook.toLowerCase();
        for (const phrase of banned) {
          expect(blob).not.toContain(phrase);
        }
      }
    }
  });
});

describe('pickSeasonalProduce', () => {
  it('returns a SeasonalProduce for the requested date', () => {
    const pick = pickSeasonalProduce({ asOfDate: new Date('2026-03-15T12:00:00Z') });
    expect(pick).not.toBeNull();
    expect(pick?.name).toBeTruthy();
    expect(pick?.hook).toBeTruthy();
  });

  it('is deterministic — same calendar day returns the same pick', () => {
    // Use mid-day on both to avoid timezone-induced day boundary flips.
    const a = pickSeasonalProduce({ asOfDate: new Date(2026, 6, 4, 9, 0, 0) });
    const b = pickSeasonalProduce({ asOfDate: new Date(2026, 6, 4, 17, 30, 0) });
    expect(a).toEqual(b);
  });

  it('cycles through entries day-by-day', () => {
    const julyEntries = SEASONAL_PRODUCE_BY_MONTH[6];
    const day1 = pickSeasonalProduce({ asOfDate: new Date('2026-07-01T12:00:00Z') });
    const day2 = pickSeasonalProduce({ asOfDate: new Date('2026-07-02T12:00:00Z') });
    expect(day1).toEqual(julyEntries[0]);
    expect(day2).toEqual(julyEntries[1 % julyEntries.length]);
  });

  it('defaults to today when no date is provided', () => {
    const pick = pickSeasonalProduce();
    expect(pick).not.toBeNull();
  });

  it('returns one of the entries from the matching month', () => {
    const julyEntries = SEASONAL_PRODUCE_BY_MONTH[6];
    const pick = pickSeasonalProduce({ asOfDate: new Date('2026-07-15T12:00:00Z') });
    expect(julyEntries).toContainEqual(pick);
  });
});

describe('findPeakMonth', () => {
  it('returns the month index where an ingredient peaks', () => {
    expect(findPeakMonth('asparagus')).toBeGreaterThanOrEqual(0);
  });

  it('is case-insensitive', () => {
    expect(findPeakMonth('ASPARAGUS')).toBe(findPeakMonth('asparagus'));
  });

  it('returns -1 for ingredients not on the seasonal list', () => {
    expect(findPeakMonth('chocolate')).toBe(-1);
  });

  it('returns -1 for empty input', () => {
    expect(findPeakMonth('')).toBe(-1);
    expect(findPeakMonth('   ')).toBe(-1);
  });

  it('asparagus is in March–May (months 2–4)', () => {
    const month = findPeakMonth('asparagus');
    expect([2, 3, 4]).toContain(month);
  });

  it('tomatoes are in July–August (months 6–7)', () => {
    const month = findPeakMonth('tomatoes');
    expect([6, 7]).toContain(month);
  });
});
