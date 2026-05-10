// backend/__tests__/utils/diversifyResults.test.ts
// TDD for the post-sort diversifier — fixes the "same recipe 4x in a row"
// home-feed bug (e.g., 4 "Soy-Honey Sesame Glazed…" variants surfacing
// adjacent because they all score within a hair of each other).

import { diversifyByTitleSignature, titleSignature } from '../../src/utils/diversifyResults';

const r = (id: string, title: string) => ({ id, title });

describe('titleSignature', () => {
  it('returns first 2 meaningful words, lowercased', () => {
    expect(titleSignature('Soy-Honey Sesame Glazed Chicken Bites')).toBe('soy-honey sesame');
  });

  it('strips common stop-words', () => {
    expect(titleSignature('A Pot of Spicy Ramen')).toBe('pot spicy');
  });

  it('handles ampersand and hyphen separators', () => {
    expect(titleSignature('Mac & Cheese with Bacon')).toBe('mac cheese');
  });

  it('returns empty string on empty title', () => {
    expect(titleSignature('')).toBe('');
    expect(titleSignature('   ')).toBe('');
  });

  it('handles single-word titles', () => {
    expect(titleSignature('Tacos')).toBe('tacos');
  });

  it('is case-insensitive', () => {
    expect(titleSignature('SOY-HONEY SESAME')).toBe(titleSignature('soy-honey sesame'));
  });
});

describe('diversifyByTitleSignature', () => {
  it('returns empty for empty input', () => {
    expect(diversifyByTitleSignature([])).toEqual([]);
  });

  it('returns single-item input unchanged', () => {
    const input = [r('1', 'Tacos')];
    expect(diversifyByTitleSignature(input)).toEqual(input);
  });

  it('preserves order when no signatures repeat', () => {
    const input = [
      r('1', 'Spicy Ramen'),
      r('2', 'Tacos al Pastor'),
      r('3', 'Pad Thai'),
    ];
    expect(diversifyByTitleSignature(input).map(x => x.id)).toEqual(['1', '2', '3']);
  });

  it('breaks up 4 same-signature recipes adjacent at the top of the list', () => {
    const input = [
      r('soy1', 'Soy-Honey Sesame Glazed Chicken'),
      r('soy2', 'Soy-Honey Sesame Glazed Tofu'),
      r('soy3', 'Soy-Honey Sesame Glazed Salmon'),
      r('soy4', 'Soy-Honey Sesame Glazed Mushrooms'),
      r('o1', 'Spicy Ramen Bowl'),
      r('o2', 'Tacos al Pastor'),
      r('o3', 'Pad Thai'),
      r('o4', 'Greek Salad'),
    ];
    const out = diversifyByTitleSignature(input);
    // First emission keeps the highest-scoring soy-honey (input order = score order in tests).
    expect(out[0].id).toBe('soy1');
    // Position 1 must NOT be another soy-honey — diversity rule.
    expect(out[1].id).not.toMatch(/^soy/);
    // Within the first 4 outputs, no more than 2 "soy-honey" allowed (K=2 window).
    const top4 = out.slice(0, 4);
    expect(top4.filter(x => x.id.startsWith('soy')).length).toBeLessThanOrEqual(2);
    // No recipes lost.
    expect(out.length).toBe(input.length);
    expect(new Set(out.map(x => x.id)).size).toBe(input.length);
  });

  it('falls back to grouping deferred items at the end when no diverse alternatives remain', () => {
    // Every recipe has the same signature — there's nowhere to interleave.
    // Behavior: emit all in original order (defer-loop never finds release slots).
    const input = [
      r('a', 'Soy-Honey Sesame A'),
      r('b', 'Soy-Honey Sesame B'),
      r('c', 'Soy-Honey Sesame C'),
    ];
    const out = diversifyByTitleSignature(input);
    expect(out.length).toBe(3);
    expect(new Set(out.map(x => x.id))).toEqual(new Set(['a', 'b', 'c']));
  });

  it('respects a configurable window K', () => {
    const input = [
      r('s1', 'Soy-Honey Sesame A'),
      r('s2', 'Soy-Honey Sesame B'),
      r('s3', 'Soy-Honey Sesame C'),
      r('o1', 'Spicy Ramen'),
      r('o2', 'Tacos'),
      r('o3', 'Pad Thai'),
    ];
    // K=1 is permissive: only forbids immediate adjacency. K=2 forbids any
    // two same-sig in any 3-recipe window.
    const k1 = diversifyByTitleSignature(input, 1).map(x => x.id);
    // No two adjacent soy-* allowed.
    for (let i = 1; i < k1.length; i++) {
      expect(!(k1[i].startsWith('s') && k1[i - 1].startsWith('s'))).toBe(true);
    }
  });

  it('treats empty / null titles as never-conflicting', () => {
    const input = [
      { id: '1', title: '' },
      { id: '2', title: '' },
      { id: '3', title: 'Tacos' },
    ];
    const out = diversifyByTitleSignature(input);
    // Empty signatures shouldn't trigger the dedupe rule against each other.
    expect(out.map(x => x.id)).toEqual(['1', '2', '3']);
  });
});
