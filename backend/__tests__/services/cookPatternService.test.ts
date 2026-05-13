// P4 retention — cook-pattern picker tests.

import {
  pickCookPattern,
  COOK_PATTERN_MIN_COOKS,
  COOK_PATTERN_DOMINANCE,
} from '../../src/services/cookPatternService';

// Pick a known anchor date so weekday math is deterministic.
// Mon 2026-05-11 → getDay() === 1.
const monday = (offset: number = 0): Date => {
  const d = new Date('2026-05-11T19:00:00Z');
  d.setDate(d.getDate() + offset);
  return d;
};

describe('pickCookPattern', () => {
  it('returns null pattern when there aren\'t enough cooks yet', () => {
    const dates: Date[] = Array.from({ length: COOK_PATTERN_MIN_COOKS - 1 }, () => monday());
    const out = pickCookPattern(dates);
    expect(out.dominantDay).toBeNull();
    expect(out.dominantDayName).toBeNull();
  });

  it('returns null pattern when no single day exceeds the dominance threshold', () => {
    // Spread evenly across 7 days — ~14% each, below 25% threshold
    const dates: Date[] = [];
    for (let d = 0; d < 7; d++) {
      for (let i = 0; i < 2; i++) dates.push(monday(d));
    }
    const out = pickCookPattern(dates);
    expect(out.dominantDay).toBeNull();
  });

  it('detects the dominant weekday when a day has ≥25% of cooks', () => {
    const dates: Date[] = [
      monday(0), monday(7), monday(14), monday(21), // 4 Mondays
      monday(1), // 1 Tuesday
      monday(2), // 1 Wednesday
      monday(5), // 1 Saturday
      monday(8), // 1 Tuesday
    ];
    const out = pickCookPattern(dates);
    expect(out.dominantDay).toBe(1);
    expect(out.dominantDayName).toBe('Monday');
    expect(out.totalCooks).toBe(dates.length);
  });

  it('uses calendar-day-of-week, not UTC, via Date#getDay()', () => {
    // Sunday → getDay() === 0
    const sunday = new Date('2026-05-10T19:00:00Z');
    const sundayDates: Date[] = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(d.getDate() + i * 7);
      return d;
    });
    const out = pickCookPattern(sundayDates);
    expect(out.dominantDayName).toBe('Sunday');
  });

  it('exposes the dominance + min-cooks thresholds for cap-test inspection', () => {
    expect(COOK_PATTERN_MIN_COOKS).toBeGreaterThan(0);
    expect(COOK_PATTERN_DOMINANCE).toBeGreaterThan(0);
    expect(COOK_PATTERN_DOMINANCE).toBeLessThanOrEqual(1);
  });
});
