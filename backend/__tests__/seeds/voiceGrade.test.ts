// Tier U voice-grade pass — pure helper unit tests.
// Rubric (brand-voice.md): 5/4 ship · 3 rewrite (🟡) · 2 rewrite (❌) · 1 discard.
// Ship threshold ≥4; discard <2; rewrite is the [2,4) middle band.

import {
  MVP_CUISINES,
  bucketGrade,
  summarize,
  formatReport,
  type ScoredRecipe,
} from '../../scripts/voiceGrade';

describe('MVP_CUISINES', () => {
  it('is the 20-cuisine Tier U launch roster', () => {
    expect(MVP_CUISINES).toHaveLength(20);
    expect(MVP_CUISINES).toEqual(
      expect.arrayContaining([
        'Italian',
        'Mexican',
        'Japanese',
        'Thai',
        'American Southern',
        'Cajun',
      ]),
    );
  });

  it('has no duplicates', () => {
    expect(new Set(MVP_CUISINES).size).toBe(MVP_CUISINES.length);
  });
});

describe('bucketGrade', () => {
  it('ships scores at or above 4', () => {
    expect(bucketGrade(5)).toBe('ship');
    expect(bucketGrade(4)).toBe('ship');
    expect(bucketGrade(4.0)).toBe('ship');
  });

  it('rewrites the [2,4) middle band', () => {
    expect(bucketGrade(3.99)).toBe('rewrite');
    expect(bucketGrade(3)).toBe('rewrite');
    expect(bucketGrade(2)).toBe('rewrite');
  });

  it('discards below 2', () => {
    expect(bucketGrade(1.99)).toBe('discard');
    expect(bucketGrade(1)).toBe('discard');
    expect(bucketGrade(0)).toBe('discard');
  });
});

describe('summarize', () => {
  const rows: ScoredRecipe[] = [
    { cuisine: 'Thai', score: 5 },
    { cuisine: 'Thai', score: 4 },
    { cuisine: 'Thai', score: 3 },
    { cuisine: 'Thai', score: 1 },
    { cuisine: 'Italian', score: 4 },
    { cuisine: 'Italian', score: 2 },
  ];

  it('rolls up overall ship/rewrite/discard counts', () => {
    const s = summarize(rows);
    expect(s.total).toBe(6);
    expect(s.ship).toBe(3); // two Thai (5,4) + one Italian (4)
    expect(s.rewrite).toBe(2); // Thai 3 + Italian 2
    expect(s.discard).toBe(1); // Thai 1
    expect(s.shipPct).toBeCloseTo(50.0, 1);
  });

  it('rolls up per-cuisine, sorted by cuisine name', () => {
    const s = summarize(rows);
    expect(s.byCuisine.map((c) => c.cuisine)).toEqual(['Italian', 'Thai']);
    const thai = s.byCuisine.find((c) => c.cuisine === 'Thai')!;
    expect(thai).toMatchObject({ total: 4, ship: 2, rewrite: 1, discard: 1 });
    expect(thai.shipPct).toBeCloseTo(50.0, 1);
  });

  it('handles an empty set without dividing by zero', () => {
    const s = summarize([]);
    expect(s).toMatchObject({ total: 0, ship: 0, rewrite: 0, discard: 0, shipPct: 0 });
    expect(s.byCuisine).toEqual([]);
  });
});

describe('formatReport', () => {
  it('renders a monospace table with the headline ship rate', () => {
    const report = formatReport(
      summarize([
        { cuisine: 'Thai', score: 5 },
        { cuisine: 'Thai', score: 1 },
      ]),
    );
    expect(report).toContain('Thai');
    expect(report).toContain('50');
    expect(report).toMatch(/ship/i);
  });
});
