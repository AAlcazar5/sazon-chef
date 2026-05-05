// backend/__tests__/services/sazonQuipService.test.ts
// ROADMAP 4.0 Tier J7 — Sazon daily quip (TDD).

import {
  SAZON_QUIPS,
  pickQuipForDate,
  getQuipById,
  BANNED_VOCAB,
} from '../../src/services/sazonQuipService';

describe('SAZON_QUIPS — content library', () => {
  it('exposes at least 200 quips', () => {
    expect(SAZON_QUIPS.length).toBeGreaterThanOrEqual(200);
  });

  it('every quip has id + text + category', () => {
    for (const q of SAZON_QUIPS) {
      expect(typeof q.id).toBe('string');
      expect(q.id.length).toBeGreaterThan(0);
      expect(typeof q.text).toBe('string');
      expect(q.text.length).toBeGreaterThan(0);
      expect(['proverb', 'observation', 'personality']).toContain(q.category);
    }
  });

  it('every id is unique', () => {
    const ids = SAZON_QUIPS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains all three categories', () => {
    const categories = new Set(SAZON_QUIPS.map((q) => q.category));
    expect(categories.has('proverb')).toBe(true);
    expect(categories.has('observation')).toBe(true);
    expect(categories.has('personality')).toBe(true);
  });

  it('contains no banned vocabulary (cut/bulk/maintain/macro-friendly)', () => {
    for (const q of SAZON_QUIPS) {
      const lower = q.text.toLowerCase();
      for (const banned of BANNED_VOCAB) {
        expect(lower).not.toContain(banned);
      }
    }
  });

  it('contains no verdict/punitive phrasing', () => {
    const verdictPhrases = [
      "you're under",
      "you're over",
      'you missed',
      'failed your goal',
      'you exceeded',
    ];
    for (const q of SAZON_QUIPS) {
      const lower = q.text.toLowerCase();
      for (const phrase of verdictPhrases) {
        expect(lower).not.toContain(phrase);
      }
    }
  });

  it('keeps quips short (≤200 chars)', () => {
    for (const q of SAZON_QUIPS) {
      expect(q.text.length).toBeLessThanOrEqual(200);
    }
  });
});

describe('pickQuipForDate — deterministic rotation', () => {
  it('returns a quip for any date', () => {
    const q = pickQuipForDate(new Date('2026-05-05'));
    expect(q).toBeDefined();
    expect(SAZON_QUIPS).toContainEqual(q);
  });

  it('same date returns the same quip', () => {
    const a = pickQuipForDate(new Date('2026-05-05T00:00:00Z'));
    const b = pickQuipForDate(new Date('2026-05-05T23:59:00Z'));
    expect(a.id).toBe(b.id);
  });

  it('different dates can return different quips', () => {
    const seen = new Set<string>();
    for (let day = 1; day <= 60; day += 1) {
      const d = new Date(2026, 0, day);
      seen.add(pickQuipForDate(d).id);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('rotates across the full library when sampled across a year', () => {
    const seen = new Set<string>();
    for (let day = 1; day <= 365; day += 1) {
      const d = new Date(2026, 0, day);
      seen.add(pickQuipForDate(d).id);
    }
    expect(seen.size).toBeGreaterThanOrEqual(200);
  });
});

describe('getQuipById', () => {
  it('returns the quip when id exists', () => {
    const first = SAZON_QUIPS[0];
    expect(getQuipById(first.id)).toEqual(first);
  });

  it('returns null for unknown id', () => {
    expect(getQuipById('does-not-exist')).toBeNull();
  });

  it('returns null for empty id', () => {
    expect(getQuipById('')).toBeNull();
  });
});
