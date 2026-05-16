// Tests for the dedup-safe seed's diversity helpers (#3 per-job diversity
// axis) + the retry-on-dup avoid-context accumulator (#1). Pure logic only —
// the generation loop in seed-500-newer-cuisines-dedup.ts composes these.

import {
  buildAvoidContext,
  appendAvoid,
  pickDiversityAxis,
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

describe('pickDiversityAxis', () => {
  const meals = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

  it('returns a non-empty positive steer for every meal type and index', () => {
    for (const m of meals) {
      for (let i = 0; i < 100; i += 1) {
        const s = pickDiversityAxis(m, i);
        expect(typeof s).toBe('string');
        expect(s.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('is deterministic for the same (mealType, jobIndex)', () => {
    expect(pickDiversityAxis('dinner', 17)).toBe(pickDiversityAxis('dinner', 17));
  });

  it('rotates with jobIndex so successive same-cuisine jobs get a different steer', () => {
    expect(pickDiversityAxis('dinner', 0)).not.toBe(pickDiversityAxis('dinner', 1));
  });

  it('explores broadly — ≥30 distinct steers across 70 jobs (breaks the ~70-100/cuisine ceiling)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 70; i += 1) seen.add(pickDiversityAxis('dinner', i));
    expect(seen.size).toBeGreaterThanOrEqual(30);
  });

  it('breakfast steers stay breakfast-appropriate (no braised stews at 8am)', () => {
    for (let i = 0; i < 40; i += 1) {
      const s = pickDiversityAxis('breakfast', i);
      expect(s).toMatch(/breakfast|morning|brunch/i);
      expect(s).not.toMatch(/braised|stew/i);
    }
  });

  it('snack steers read as snacks, not mains', () => {
    for (let i = 0; i < 30; i += 1) {
      expect(pickDiversityAxis('snack', i)).toMatch(/snack|bite|nibble|finger/i);
    }
  });

  it('rotation includes explicit anti-iconic steers (not every nudge, but they recur)', () => {
    // Sweep a full archetype cycle so the nudge index spans all 5 values;
    // at least the "regional/lesser-known" and "sub-region/not the most
    // famous" nudges must surface — those are the explicit anti-iconic ones.
    const sweep = Array.from({ length: 16 * 5 }, (_, i) => pickDiversityAxis('dinner', i));
    const antiIconic = sweep.filter((s) =>
      /not the (most )?(iconic|obvious|famous)|lesser-known|regional|sub-region/i.test(s),
    );
    expect(antiIconic.length).toBeGreaterThan(0);
  });
});
