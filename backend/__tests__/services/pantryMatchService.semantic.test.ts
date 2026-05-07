// ROADMAP 4.0 IG7.1 — Semantic pantry match (embedding-distance).
//
// Extends the binary fuzzy-token match with a semantic layer powered by
// the IG1 ingredient embeddings. Match score:
//   matchedExact * 1.0 + matchedSemantic * 0.7 - missingCritical * 0.5
//
// Cold-start (no embedding row for the ingredient) falls back to the binary
// path, so existing 14 tests in pantryMatchService.test.ts stay green
// regardless of whether IG1 has been run.

import {
  semanticMatch,
  computeSemanticPantryMatch,
  __INTERNALS,
} from '../../src/services/pantryMatchService';

const VEC_THYME = [1, 0, 0];
const VEC_ROSEMARY = [0.95, 0.31, 0]; // cosine ≈ 0.95 with thyme
const VEC_OREGANO = [0.9, 0.43, 0]; // cosine ≈ 0.9 with thyme
const VEC_BASIL = [0.85, 0.52, 0]; // cosine ≈ 0.85 with thyme
const VEC_FLOUR = [0, 1, 0];
const VEC_OLIVE_OIL = [0, 0, 1];

function emb(pairs: Array<[string, number[]]>): Map<string, number[]> {
  return new Map(pairs);
}

describe('IG7.1 — semanticMatch', () => {
  it('returns exact match when pantry contains the same canonical name', () => {
    const out = semanticMatch('thyme', ['thyme', 'rosemary'], emb([]));
    expect(out.kind).toBe('exact');
    expect(out.weight).toBe(1.0);
  });

  it('returns semantic match when cosine ≥ threshold', () => {
    const out = semanticMatch(
      'thyme',
      ['rosemary'],
      emb([
        ['thyme', VEC_THYME],
        ['rosemary', VEC_ROSEMARY],
      ]),
    );
    expect(out.kind).toBe('semantic');
    expect(out.weight).toBe(0.7);
    expect(out.matchedPantryItem).toBe('rosemary');
    expect(out.similarity).toBeGreaterThan(0.8);
  });

  it('returns none when nothing crosses the threshold', () => {
    const out = semanticMatch(
      'thyme',
      ['flour'],
      emb([
        ['thyme', VEC_THYME],
        ['flour', VEC_FLOUR],
      ]),
    );
    expect(out.kind).toBe('none');
    expect(out.weight).toBe(0);
  });

  it('cold-start (ingredient missing from embeddings) falls back to binary', () => {
    // No embedding for thyme → semantic step skips, binary fuzzy path runs
    // (no match because pantry has rosemary not thyme).
    const out = semanticMatch('thyme', ['rosemary'], emb([]));
    expect(out.kind).toBe('none');
    expect(out.fallback).toBe('binary');
  });

  it('cold-start binary still returns exact match when names overlap', () => {
    const out = semanticMatch('rosemary', ['fresh rosemary'], emb([]));
    expect(out.kind).toBe('exact');
    expect(out.fallback).toBe('binary');
  });

  it('threshold defaults to 0.8 (IG7.1 spec)', () => {
    expect(__INTERNALS.SEMANTIC_THRESHOLD).toBe(0.8);
  });

  it('caller can override threshold', () => {
    // basil ≈ 0.85 cosine with thyme — passes default 0.8 but fails 0.9.
    const high = semanticMatch(
      'thyme',
      ['basil'],
      emb([
        ['thyme', VEC_THYME],
        ['basil', VEC_BASIL],
      ]),
      { threshold: 0.9 },
    );
    expect(high.kind).toBe('none');
    const low = semanticMatch(
      'thyme',
      ['basil'],
      emb([
        ['thyme', VEC_THYME],
        ['basil', VEC_BASIL],
      ]),
    );
    expect(low.kind).toBe('semantic');
  });

  it('picks the highest-similarity pantry item when multiple cross threshold', () => {
    const out = semanticMatch(
      'thyme',
      ['basil', 'rosemary', 'oregano'],
      emb([
        ['thyme', VEC_THYME],
        ['basil', VEC_BASIL],
        ['rosemary', VEC_ROSEMARY],
        ['oregano', VEC_OREGANO],
      ]),
    );
    expect(out.kind).toBe('semantic');
    expect(out.matchedPantryItem).toBe('rosemary');
  });
});

describe('IG7.1 — computeSemanticPantryMatch', () => {
  it('aggregates exact + semantic + missing into the IG7.1 score formula', () => {
    const out = computeSemanticPantryMatch({
      recipeIngredients: [
        { text: 'thyme' },
        { text: 'flour', isCritical: true },
        { text: 'rosemary' },
      ],
      pantryNames: ['rosemary', 'olive oil'],
      embeddings: emb([
        ['thyme', VEC_THYME],
        ['rosemary', VEC_ROSEMARY],
        ['flour', VEC_FLOUR],
        ['olive oil', VEC_OLIVE_OIL],
      ]),
    });
    // thyme → semantic via rosemary (0.7)
    // flour → missing critical (-0.5)
    // rosemary → exact (1.0)
    expect(out.matchedExact.map((m) => m.text)).toContain('rosemary');
    expect(out.matchedSemantic.map((m) => m.text)).toContain('thyme');
    expect(out.missingCritical.map((m) => m.text)).toContain('flour');
    expect(out.score).toBeCloseTo(1.0 + 0.7 - 0.5, 3);
  });

  it('non-critical missing items don\'t penalize score', () => {
    const out = computeSemanticPantryMatch({
      recipeIngredients: [
        { text: 'thyme' },
        { text: 'cumin' }, // no embedding → cold-start binary → no match → not critical
      ],
      pantryNames: ['rosemary'],
      embeddings: emb([
        ['thyme', VEC_THYME],
        ['rosemary', VEC_ROSEMARY],
      ]),
    });
    expect(out.matchedSemantic.map((m) => m.text)).toContain('thyme');
    expect(out.missing.map((m) => m.text)).toContain('cumin');
    expect(out.missingCritical).toHaveLength(0);
    expect(out.score).toBeCloseTo(0.7, 3);
  });

  it('returns score 0 for empty recipe', () => {
    const out = computeSemanticPantryMatch({
      recipeIngredients: [],
      pantryNames: ['rosemary'],
      embeddings: emb([]),
    });
    expect(out.score).toBe(0);
    expect(out.matchedExact).toEqual([]);
  });

  it('cold-start with no embeddings yields binary-path results', () => {
    const out = computeSemanticPantryMatch({
      recipeIngredients: [
        { text: 'rosemary' },
        { text: 'thyme' },
      ],
      pantryNames: ['rosemary'],
      embeddings: emb([]),
    });
    // rosemary → exact via binary fuzzy
    // thyme → no exact, no embedding → missing
    expect(out.matchedExact.map((m) => m.text)).toContain('rosemary');
    expect(out.missing.map((m) => m.text)).toContain('thyme');
    expect(out.matchedSemantic).toHaveLength(0);
  });

  it('staples are auto-matched as exact (preserves existing service behavior)', () => {
    const out = computeSemanticPantryMatch({
      recipeIngredients: [{ text: 'salt' }, { text: 'olive oil' }],
      pantryNames: [],
      embeddings: emb([]),
    });
    expect(out.matchedExact.map((m) => m.text)).toEqual(['salt', 'olive oil']);
  });
});
