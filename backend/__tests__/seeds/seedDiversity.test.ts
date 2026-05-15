// Tests for the dedup-safe seed's diversity helpers (#3 per-job diversity
// axis) + the retry-on-dup avoid-context accumulator (#1). Pure logic only —
// the generation loop in seed-500-newer-cuisines-dedup.ts composes these.

import {
  buildAvoidContext,
  appendAvoid,
  type AvoidMeal,
} from '../../scripts/seedDiversity';

describe('buildAvoidContext', () => {
  it('returns [] for no known titles', () => {
    expect(buildAvoidContext([], { windowSize: 12, jobIndex: 0 })).toEqual([]);
  });

  it('neutralizes cuisine to "" so prompt line 619 cannot fight cuisineOverride', () => {
    const ctx = buildAvoidContext(['Chicken Karahi'], { windowSize: 12, jobIndex: 0 });
    expect(ctx).toHaveLength(1);
    expect(ctx[0]).toEqual({ title: 'Chicken Karahi', cuisine: '' });
  });

  it('caps the window at windowSize (token budget guard)', () => {
    const known = Array.from({ length: 50 }, (_, i) => `Dish ${i}`);
    const ctx = buildAvoidContext(known, { windowSize: 12, jobIndex: 0 });
    expect(ctx).toHaveLength(12);
  });

  it('rotates the window by jobIndex so successive jobs suppress different prototypes', () => {
    const known = Array.from({ length: 30 }, (_, i) => `Dish ${i}`);
    const a = buildAvoidContext(known, { windowSize: 10, jobIndex: 0 }).map((m) => m.title);
    const b = buildAvoidContext(known, { windowSize: 10, jobIndex: 1 }).map((m) => m.title);
    expect(a).not.toEqual(b);
  });

  it('rotation is stable/deterministic for the same jobIndex', () => {
    const known = Array.from({ length: 30 }, (_, i) => `Dish ${i}`);
    const a = buildAvoidContext(known, { windowSize: 10, jobIndex: 7 });
    const b = buildAvoidContext(known, { windowSize: 10, jobIndex: 7 });
    expect(a).toEqual(b);
  });

  it('dedupes by normalized title key (no wasted avoid slots)', () => {
    const ctx = buildAvoidContext(
      ['Chicken Karahi', 'chicken  karahi', 'Chicken Karahi!'],
      { windowSize: 12, jobIndex: 0 },
    );
    expect(ctx).toHaveLength(1);
  });

  it('returns every known title (deduped) when windowSize >= count', () => {
    const ctx = buildAvoidContext(['A', 'B', 'C'], { windowSize: 12, jobIndex: 3 });
    expect(ctx.map((m) => m.title).sort()).toEqual(['A', 'B', 'C']);
  });
});

describe('appendAvoid', () => {
  const base: AvoidMeal[] = [{ title: 'Aloo Gobi', cuisine: '' }];

  it('appends the collided title immutably (new array, source untouched)', () => {
    const next = appendAvoid(base, 'Chicken Karahi', 16);
    expect(next).toHaveLength(2);
    expect(next[1]).toEqual({ title: 'Chicken Karahi', cuisine: '' });
    expect(base).toHaveLength(1);
  });

  it('skips a collided title already present (normalized)', () => {
    const next = appendAvoid(base, 'aloo  gobi', 16);
    expect(next).toEqual(base);
  });

  it('caps length, dropping the oldest entries (recent collisions matter most)', () => {
    let ctx: AvoidMeal[] = [];
    for (let i = 0; i < 20; i += 1) ctx = appendAvoid(ctx, `Dish ${i}`, 5);
    expect(ctx).toHaveLength(5);
    expect(ctx[ctx.length - 1].title).toBe('Dish 19');
    expect(ctx[0].title).toBe('Dish 15');
  });
});
