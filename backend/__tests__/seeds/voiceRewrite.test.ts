// Tier U voice rewrite — pure helper unit tests.

import { pickBestAttempt, formatRewriteReport } from '../../scripts/voiceRewrite';
import { summarize } from '../../scripts/voiceGrade';

describe('pickBestAttempt', () => {
  it('returns null when there are no attempts', () => {
    expect(pickBestAttempt([], 3)).toBeNull();
  });

  it('returns null when no attempt strictly beats the old score', () => {
    // equal does not count — same flatness, not worth a write
    expect(
      pickBestAttempt(
        [
          { description: 'a', score: 2 },
          { description: 'b', score: 3 },
        ],
        3,
      ),
    ).toBeNull();
  });

  it('picks the highest-scoring attempt above the old score', () => {
    expect(
      pickBestAttempt(
        [
          { description: 'a', score: 3 },
          { description: 'b', score: 5 },
          { description: 'c', score: 4 },
        ],
        2,
      ),
    ).toEqual({ description: 'b', score: 5 });
  });

  it('accepts a single improving attempt', () => {
    expect(pickBestAttempt([{ description: 'x', score: 4 }], 3)).toEqual({
      description: 'x',
      score: 4,
    });
  });

  it('keeps the first of tied maxima', () => {
    expect(
      pickBestAttempt(
        [
          { description: 'first', score: 5 },
          { description: 'second', score: 5 },
        ],
        1,
      ),
    ).toEqual({ description: 'first', score: 5 });
  });
});

describe('formatRewriteReport', () => {
  it('renders before→after ship movement and the action tally', () => {
    const before = summarize([
      { cuisine: 'Thai', score: 3 },
      { cuisine: 'Thai', score: 1 },
      { cuisine: 'Thai', score: 5 },
    ]);
    const after = summarize([
      { cuisine: 'Thai', score: 4 },
      { cuisine: 'Thai', score: 5 },
    ]);
    const report = formatRewriteReport({
      before,
      after,
      updated: 1,
      skippedRegression: 0,
      failed: 0,
      discarded: 1,
    });
    expect(report).toMatch(/before/i);
    expect(report).toMatch(/after/i);
    expect(report).toMatch(/updated\D*1/i);
    expect(report).toMatch(/discard\D*1/i);
    // before ship 33.3% (1/3) → after ship 100% (2/2)
    expect(report).toContain('33.3');
    expect(report).toContain('100');
  });
});
