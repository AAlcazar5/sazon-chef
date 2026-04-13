// frontend/__tests__/utils/dailyRollover.test.ts
import { computeDailyRollovers } from '../../utils/dailyRollover';

function d(year: number, month: number, day: number): string {
  // Local-time ISO date key (YYYY-MM-DD).
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
}

describe('computeDailyRollovers', () => {
  test('returns empty map when input is empty', () => {
    const out = computeDailyRollovers({ dailyConsumed: {}, dailyTarget: 2000 });
    expect(out.size).toBe(0);
  });

  test('returns zero delta for the first day of the week (no prior)', () => {
    const out = computeDailyRollovers({
      dailyConsumed: { [d(2026, 4, 13)]: 1900 },
      dailyTarget: 2000,
    });
    // Monday has no yesterday in the week → no rollover entry.
    expect(out.has(d(2026, 4, 14))).toBe(false);
  });

  test('positive delta when yesterday was under target (surplus carried forward)', () => {
    // Monday: 1800 (200 under). Tuesday inherits +200.
    const out = computeDailyRollovers({
      dailyConsumed: {
        [d(2026, 4, 13)]: 1800,
        [d(2026, 4, 14)]: 0,
      },
      dailyTarget: 2000,
    });
    const tuesday = out.get(d(2026, 4, 14));
    expect(tuesday).toBeDefined();
    expect(tuesday!.delta).toBe(200);
    expect(tuesday!.fromDate).toBe(d(2026, 4, 13));
  });

  test('negative delta when yesterday was over target (deficit to recover)', () => {
    // Monday: 2300 (300 over). Tuesday inherits -300.
    const out = computeDailyRollovers({
      dailyConsumed: {
        [d(2026, 4, 13)]: 2300,
        [d(2026, 4, 14)]: 0,
      },
      dailyTarget: 2000,
    });
    expect(out.get(d(2026, 4, 14))!.delta).toBe(-300);
  });

  test('skips days where yesterday had zero consumption (not yet cooked/planned)', () => {
    const out = computeDailyRollovers({
      dailyConsumed: {
        [d(2026, 4, 13)]: 0,
        [d(2026, 4, 14)]: 0,
      },
      dailyTarget: 2000,
    });
    // Monday consumed nothing → no rollover into Tuesday (nothing to carry).
    expect(out.has(d(2026, 4, 14))).toBe(false);
  });

  test('chains across multiple days independently (each day only inherits from yesterday)', () => {
    const out = computeDailyRollovers({
      dailyConsumed: {
        [d(2026, 4, 13)]: 1800, // under 200
        [d(2026, 4, 14)]: 2100, // over 100
        [d(2026, 4, 15)]: 0,
      },
      dailyTarget: 2000,
    });
    expect(out.get(d(2026, 4, 14))!.delta).toBe(200);  // from Monday
    expect(out.get(d(2026, 4, 15))!.delta).toBe(-100); // from Tuesday
  });

  test('returns zero-delta entry when yesterday exactly matched target', () => {
    const out = computeDailyRollovers({
      dailyConsumed: {
        [d(2026, 4, 13)]: 2000,
        [d(2026, 4, 14)]: 0,
      },
      dailyTarget: 2000,
    });
    // Exactly on target — callers usually hide the pill, but the util still emits 0.
    expect(out.get(d(2026, 4, 14))!.delta).toBe(0);
  });

  test('returns empty when dailyTarget is 0 or negative', () => {
    const out = computeDailyRollovers({
      dailyConsumed: { [d(2026, 4, 13)]: 1800, [d(2026, 4, 14)]: 0 },
      dailyTarget: 0,
    });
    expect(out.size).toBe(0);
  });
});
