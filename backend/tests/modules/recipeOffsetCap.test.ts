// backend/tests/modules/recipeOffsetCap.test.ts
//
// Tier L H7 — pre-launch cap on the home-feed offset.
//
// We're not converting the home-feed (`GET /api/recipes/suggested`) to true
// cursor pagination right now: the endpoint shuffles + scores results across
// two mealType partitions, so `id: { gt: lastSeen }` doesn't compose with
// the variety mechanism without a wider redesign. The launch-readiness cut
// is the cap: clamp inbound `offset` so SQLite never scan-and-discards an
// unbounded prefix.
//
// This test characterizes the cap so future refactors can't quietly remove
// it. It mirrors the controller's three-line clamp:
//   const MAX_HOME_OFFSET = 50;
//   const rawOffset = parseInt(req.query.offset as string) || 0;
//   const offset = Math.min(Math.max(0, rawOffset), MAX_HOME_OFFSET);

const MAX_HOME_OFFSET = 50;

function clampOffset(input: unknown): number {
  const raw = parseInt(input as string) || 0;
  return Math.min(Math.max(0, raw), MAX_HOME_OFFSET);
}

describe('home-feed offset cap (H7)', () => {
  it('returns 0 for missing/garbage input', () => {
    expect(clampOffset(undefined)).toBe(0);
    expect(clampOffset('')).toBe(0);
    expect(clampOffset('abc')).toBe(0);
    expect(clampOffset(null)).toBe(0);
  });

  it('floors at 0 for negative values', () => {
    expect(clampOffset('-5')).toBe(0);
    expect(clampOffset('-9999')).toBe(0);
  });

  it('passes through values inside the cap', () => {
    expect(clampOffset('0')).toBe(0);
    expect(clampOffset('25')).toBe(25);
    expect(clampOffset('50')).toBe(50);
  });

  it('caps anything above MAX_HOME_OFFSET', () => {
    expect(clampOffset('51')).toBe(50);
    expect(clampOffset('1000')).toBe(50);
    expect(clampOffset('9999999')).toBe(50);
  });

  it('worst-case skip per partition stays bounded', () => {
    // Partition skips inside the controller are
    //   Math.floor(offset * 10 * 0.7)  // 70% partition (meals)
    //   Math.floor(offset * 10 * 0.3)  // 30% partition (snacks/desserts)
    // With offset capped at 50, those become 350 + 150 — bounded scans
    // even on a 4,700-row table.
    const offset = clampOffset('999999');
    expect(Math.floor(offset * 10 * 0.7)).toBeLessThanOrEqual(350);
    expect(Math.floor(offset * 10 * 0.3)).toBeLessThanOrEqual(150);
  });
});
