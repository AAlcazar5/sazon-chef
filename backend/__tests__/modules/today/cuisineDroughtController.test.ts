// P1 retention — Today drought-card selection logic.

import { pickDroughtCuisine } from '../../../src/modules/today/cuisineDroughtController';

const days = (n: number) => n * 24 * 60 * 60 * 1000;

describe('pickDroughtCuisine', () => {
  const now = new Date('2026-05-13T12:00:00Z');
  const ageDays = (n: number) => new Date(now.getTime() - days(n));

  it('returns the top cuisine that has gone 7+ days quiet', () => {
    const logs = [
      { cookedAt: ageDays(2), recipe: { cuisine: 'Italian' } },
      { cookedAt: ageDays(8), recipe: { cuisine: 'Persian' } },
      { cookedAt: ageDays(9), recipe: { cuisine: 'Persian' } },
      { cookedAt: ageDays(10), recipe: { cuisine: 'Persian' } },
    ];
    const out = pickDroughtCuisine(logs, now);
    expect(out.cuisine).toBe('Persian');
    expect(out.daysSince).toBe(8);
  });

  it('ignores cuisines with fewer than 3 cooks (noise floor)', () => {
    const logs = [
      { cookedAt: ageDays(20), recipe: { cuisine: 'Persian' } },
      { cookedAt: ageDays(21), recipe: { cuisine: 'Persian' } },
    ];
    expect(pickDroughtCuisine(logs, now)).toEqual({ cuisine: null, daysSince: null });
  });

  it('returns null when the top cuisine was cooked within 7 days', () => {
    const logs = [
      { cookedAt: ageDays(1), recipe: { cuisine: 'Persian' } },
      { cookedAt: ageDays(2), recipe: { cuisine: 'Persian' } },
      { cookedAt: ageDays(3), recipe: { cuisine: 'Persian' } },
    ];
    expect(pickDroughtCuisine(logs, now)).toEqual({ cuisine: null, daysSince: null });
  });

  it('ignores logs with no cuisine attached', () => {
    const logs = [
      { cookedAt: ageDays(10), recipe: { cuisine: null } },
      { cookedAt: ageDays(11), recipe: null },
    ];
    expect(pickDroughtCuisine(logs, now)).toEqual({ cuisine: null, daysSince: null });
  });

  it('ranks by count (ties broken by sort order) and only considers top-3', () => {
    const logs = [
      // Persian: 3 cooks, all 8+ days ago → drought candidate
      { cookedAt: ageDays(8), recipe: { cuisine: 'Persian' } },
      { cookedAt: ageDays(9), recipe: { cuisine: 'Persian' } },
      { cookedAt: ageDays(10), recipe: { cuisine: 'Persian' } },
      // Italian: 5 cooks, recent → not drought
      { cookedAt: ageDays(1), recipe: { cuisine: 'Italian' } },
      { cookedAt: ageDays(2), recipe: { cuisine: 'Italian' } },
      { cookedAt: ageDays(3), recipe: { cuisine: 'Italian' } },
      { cookedAt: ageDays(4), recipe: { cuisine: 'Italian' } },
      { cookedAt: ageDays(5), recipe: { cuisine: 'Italian' } },
    ];
    const out = pickDroughtCuisine(logs, now);
    expect(out.cuisine).toBe('Persian');
  });
});
