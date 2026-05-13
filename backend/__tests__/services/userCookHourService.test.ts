// P4 retention — per-user cook-hour learning tests.

import {
  pickCookHour,
  shouldFireAtCurrentHour,
  COOK_HOUR_DEFAULT,
  COOK_HOUR_MATCH_WINDOW,
} from '../../src/services/userCookHourService';

const at = (h: number, m: number = 0): Date => {
  const d = new Date('2026-05-13T00:00:00Z');
  d.setHours(h, m, 0, 0);
  return d;
};

describe('pickCookHour', () => {
  it('falls back to the default dinner hour when there is no evening data', () => {
    expect(pickCookHour([])).toBe(COOK_HOUR_DEFAULT);
    expect(pickCookHour([at(7), at(9), at(12)])).toBe(COOK_HOUR_DEFAULT);
  });

  it('returns the median when ≥3 evening cooks exist', () => {
    const out = pickCookHour([at(17), at(19), at(20)]);
    expect(out).toBe(19);
  });

  it('averages the two middle values for even-length sequences', () => {
    const out = pickCookHour([at(17), at(18), at(20), at(22)]);
    // Sorted: 17, 18, 20, 22 → median = (18+20)/2 = 19
    expect(out).toBe(19);
  });

  it('ignores breakfast / lunch cooks (outside 16:00–22:00 window)', () => {
    const out = pickCookHour([
      at(7), at(8), at(13), // ignored
      at(18), at(19), at(20), // counted → median 19
    ]);
    expect(out).toBe(19);
  });
});

describe('shouldFireAtCurrentHour', () => {
  it('matches the exact hour', () => {
    expect(shouldFireAtCurrentHour(19, 19)).toBe(true);
  });

  it('matches within ± window', () => {
    expect(shouldFireAtCurrentHour(19, 18)).toBe(true);
    expect(shouldFireAtCurrentHour(19, 20)).toBe(true);
  });

  it('rejects hours outside the ± window', () => {
    const offBy = COOK_HOUR_MATCH_WINDOW + 1;
    expect(shouldFireAtCurrentHour(19, 19 + offBy)).toBe(false);
    expect(shouldFireAtCurrentHour(19, 19 - offBy)).toBe(false);
  });
});
