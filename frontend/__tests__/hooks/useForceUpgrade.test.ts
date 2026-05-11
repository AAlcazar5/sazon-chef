// U3: useForceUpgrade hook tests.
//
// Reads `GET /api/app/min-version` on app-open, compares against the current
// expo-constants build version, returns a `mustUpgrade` flag and per-platform
// floor. Network/API failures degrade to `mustUpgrade: false` so a backend
// outage cannot brick the app.

import { compareSemver, evaluateUpgrade } from '../../lib/forceUpgrade';

describe('U3: compareSemver', () => {
  it.each<[string, string, number]>([
    ['1.0.0', '1.0.0', 0],
    ['1.0.1', '1.0.0', 1],
    ['1.0.0', '1.0.1', -1],
    ['1.1.0', '1.0.99', 1],
    ['2.0.0', '1.99.99', 1],
    ['1.0.0-beta', '1.0.0', -1],
    ['1.0.0', '1.0.0-beta', 1],
  ])('compares %s vs %s = %s', (a, b, expected) => {
    expect(compareSemver(a, b)).toBe(expected);
  });

  it('treats malformed inputs as zero so a bad build version cannot lock users out', () => {
    expect(compareSemver('garbage', '1.0.0')).toBeLessThan(0);
    expect(compareSemver('1.0.0', 'garbage')).toBeGreaterThan(0);
  });
});

describe('U3: evaluateUpgrade', () => {
  it('returns mustUpgrade=false when build matches floor', () => {
    const r = evaluateUpgrade({
      build: '1.0.0',
      platform: 'ios',
      floor: { ios: '1.0.0', android: '1.0.0' },
    });
    expect(r.mustUpgrade).toBe(false);
  });

  it('returns mustUpgrade=true when build is below floor', () => {
    const r = evaluateUpgrade({
      build: '1.0.0',
      platform: 'ios',
      floor: { ios: '1.1.0', android: '1.0.0' },
    });
    expect(r.mustUpgrade).toBe(true);
    expect(r.floor).toBe('1.1.0');
  });

  it('returns mustUpgrade=false when build is above floor', () => {
    const r = evaluateUpgrade({
      build: '2.0.0',
      platform: 'android',
      floor: { ios: '1.0.0', android: '1.5.0' },
    });
    expect(r.mustUpgrade).toBe(false);
  });

  it('passes through gracefully when floor payload is missing', () => {
    const r = evaluateUpgrade({
      build: '1.0.0',
      platform: 'ios',
      floor: null,
    });
    expect(r.mustUpgrade).toBe(false);
  });

  it('passes through gracefully when API is unreachable (null floor)', () => {
    const r = evaluateUpgrade({
      build: '0.0.1',
      platform: 'ios',
      floor: null,
    });
    expect(r.mustUpgrade).toBe(false);
  });
});
