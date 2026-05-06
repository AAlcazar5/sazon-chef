// backend/__tests__/data/underrepresentedCuisines.test.ts
// ROADMAP 4.0 Tier D9 — Underrepresented-cuisine acquisition list.

import {
  UNDERREPRESENTED,
  isUnderrepresented,
  findUnderrepresented,
  listUnderrepresentedKeys,
} from '../../src/data/underrepresentedCuisines';
import { findByCanonical, listAllCanonicals } from '../../src/data/cuisineTaxonomy';

describe('underrepresented list — structural integrity', () => {
  it('every entry references a known canonical', () => {
    const known = new Set(listAllCanonicals().map((c) => c.canonical));
    for (const e of UNDERREPRESENTED) {
      expect(known.has(e.canonical)).toBe(true);
    }
  });

  it('every entry with a sub-cuisine references a real sub of its canonical', () => {
    for (const e of UNDERREPRESENTED) {
      if (!e.subCuisine) continue;
      const canon = findByCanonical(e.canonical);
      expect(canon).not.toBeNull();
      const subSlugs = canon!.subCuisines.map((s) => s.slug);
      expect(subSlugs).toContain(e.subCuisine);
    }
  });

  it('every entry has ≥4 archetype slots specified', () => {
    for (const e of UNDERREPRESENTED) {
      const slots = Object.keys(e.archetypeTargets);
      expect(slots.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('every archetype target has ≥1 canonical dish', () => {
    for (const e of UNDERREPRESENTED) {
      for (const [archetype, target] of Object.entries(e.archetypeTargets)) {
        expect(target!.canonicalDishes.length).toBeGreaterThanOrEqual(1);
        // No empty strings
        expect(
          target!.canonicalDishes.every((d) => d.trim().length > 0),
        ).toBe(true);
      }
    }
  });

  it('every entry has rationale + ≥1 advisor', () => {
    for (const e of UNDERREPRESENTED) {
      expect(e.rationale.length).toBeGreaterThan(20);
      expect(e.advisors.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('contains the named-list cuisines from the roadmap (Filipino, Eritrean, Senegalese, Burmese, Lao, Trinidadian, Hungarian, Georgian)', () => {
    const canonicals = new Set(UNDERREPRESENTED.map((e) => e.canonical));
    for (const c of [
      'filipino',
      'eritrean',
      'senegalese',
      'burmese',
      'lao',
      'trinidadian',
      'hungarian',
      'georgian',
      'ethiopian',
      'peruvian',
    ]) {
      expect(canonicals.has(c)).toBe(true);
    }
  });

  it('contains the named-list sub-cuisines (Oaxacan, Yucatecan, Michoacán, Sicilian, Sardinian, Andalusian, Lebanese, Palestinian)', () => {
    const subs = UNDERREPRESENTED.filter((e) => e.subCuisine).map(
      (e) => e.subCuisine,
    );
    for (const s of [
      'oaxacan',
      'yucatecan',
      'michoacan',
      'sicilian',
      'sardinian',
      'andalusian',
      'lebanese',
      'palestinian',
    ]) {
      expect(subs).toContain(s);
    }
  });
});

describe('helpers', () => {
  it('isUnderrepresented matches canonical + subCuisine pair', () => {
    expect(isUnderrepresented('senegalese')).toBe(true);
    expect(isUnderrepresented('mexican', 'michoacan')).toBe(true);
    expect(isUnderrepresented('mexican')).toBe(false); // mexican alone is not on the list
    expect(isUnderrepresented('italian', 'roman')).toBe(false);
  });

  it('findUnderrepresented returns the entry or null', () => {
    const senegalese = findUnderrepresented('senegalese');
    expect(senegalese).not.toBeNull();
    expect(senegalese!.displayName).toBe('Senegalese');

    const michoacan = findUnderrepresented('mexican', 'michoacan');
    expect(michoacan).not.toBeNull();
    expect(michoacan!.displayName).toBe('Michoacán');

    expect(findUnderrepresented('klingon')).toBeNull();
  });

  it('listUnderrepresentedKeys returns one entry per (canonical, sub) pair', () => {
    const keys = listUnderrepresentedKeys();
    expect(keys.length).toBe(UNDERREPRESENTED.length);
    // No duplicates
    const seen = new Set<string>();
    for (const k of keys) {
      const key = `${k.canonical}|${k.subCuisine ?? ''}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});
