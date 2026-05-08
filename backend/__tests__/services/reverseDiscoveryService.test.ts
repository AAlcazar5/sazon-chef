// I2.4 — reverse-discovery aggregation tests.
//
// Pure function. Given the local-ingredient catalog + user's cooking
// history + locale + a stable date seed, return up to 2 ingredients
// that:
//   - the user's locale stocks commonly (availabilityTier='common')
//   - the user has NEVER cooked
// Output rotates deterministically per (userId, date) — same surface
// returns the same suggestion until tomorrow.

import {
  pickReverseDiscovery,
  composeDiscoveryCopy,
  type ReverseDiscoveryInputs,
  type ReverseDiscoveryCandidate,
} from '../../src/services/reverseDiscoveryService';
import type { LocalEquivalent } from '../../src/data/ingredientLocalEquivalents';

const STARTER_CATALOG: LocalEquivalent[] = [
  { canonical: 'kale', locale: 'pt-BR', localName: 'couve manteiga', availabilityTier: 'common' },
  { canonical: 'cassava', locale: 'pt-BR', localName: 'mandioca', availabilityTier: 'common' },
  { canonical: 'acai', locale: 'pt-BR', localName: 'açaí', availabilityTier: 'common' },
  { canonical: 'plantain', locale: 'pt-BR', localName: 'banana-da-terra', availabilityTier: 'common' },
  { canonical: 'cilantro', locale: 'pt-BR', localName: 'coentro', availabilityTier: 'common' },
  // specialty/rare in pt-BR — must NOT surface
  { canonical: 'huitlacoche', locale: 'pt-BR', localName: 'huitlacoche', availabilityTier: 'rare' },
  { canonical: 'tomatillo', locale: 'pt-BR', localName: 'tomatillo', availabilityTier: 'rare' },
  // other locale — must NOT surface for pt-BR user
  { canonical: 'kale', locale: 'es-MX', localName: 'kale', availabilityTier: 'specialty' },
];

const baseInputs = (overrides: Partial<ReverseDiscoveryInputs> = {}): ReverseDiscoveryInputs => ({
  userId: 'u1',
  locale: 'pt-BR',
  catalog: STARTER_CATALOG,
  cookedCanonicals: new Set<string>(),
  asOfDate: new Date('2026-05-08'),
  limit: 2,
  ...overrides,
});

describe('pickReverseDiscovery', () => {
  it('returns common-tier ingredients in the user\'s locale', () => {
    const out = pickReverseDiscovery(baseInputs());
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(2);
    for (const c of out) {
      expect(c.locale).toBe('pt-BR');
      expect(c.availabilityTier).toBe('common');
    }
  });

  it('excludes ingredients the user has already cooked', () => {
    const cookedCanonicals = new Set(['kale', 'cassava', 'acai']);
    const out = pickReverseDiscovery(baseInputs({ cookedCanonicals }));
    for (const c of out) {
      expect(cookedCanonicals.has(c.canonical)).toBe(false);
    }
  });

  it('excludes specialty + rare tiers from the candidate pool', () => {
    const out = pickReverseDiscovery(baseInputs());
    const canonicals = out.map((c) => c.canonical);
    expect(canonicals).not.toContain('huitlacoche');
    expect(canonicals).not.toContain('tomatillo');
  });

  it('excludes catalog rows for other locales', () => {
    const out = pickReverseDiscovery(baseInputs({ locale: 'pt-BR' }));
    // 'kale' has both pt-BR (common) AND es-MX (specialty) rows; only pt-BR
    // should ever surface, never the es-MX row's tier/name.
    for (const c of out) {
      expect(c.locale).toBe('pt-BR');
    }
  });

  it('returns deterministic results for the same (userId, date)', () => {
    const a = pickReverseDiscovery(baseInputs());
    const b = pickReverseDiscovery(baseInputs());
    expect(a.map((c) => c.canonical)).toEqual(b.map((c) => c.canonical));
  });

  it('rotates results across days for the same user', () => {
    const day1 = pickReverseDiscovery(
      baseInputs({ asOfDate: new Date('2026-05-08') })
    );
    const day2 = pickReverseDiscovery(
      baseInputs({ asOfDate: new Date('2026-05-09') })
    );
    // Not asserting strict inequality — with only 5 candidates, two
    // adjacent days might pick the same first. Assert at least one shifts
    // across a longer window.
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date('2026-05-08');
      d.setDate(d.getDate() + i);
      return pickReverseDiscovery(baseInputs({ asOfDate: d }));
    });
    const allFirstPicks = new Set(days.map((d) => d[0]?.canonical));
    expect(allFirstPicks.size).toBeGreaterThan(1);
    // Sanity that the simple test isn't constant
    expect(day1).toBeDefined();
    expect(day2).toBeDefined();
  });

  it('returns empty when the user has cooked every common ingredient', () => {
    const cookedCanonicals = new Set(['kale', 'cassava', 'acai', 'plantain', 'cilantro']);
    const out = pickReverseDiscovery(baseInputs({ cookedCanonicals }));
    expect(out).toEqual([]);
  });

  it('honors the `limit` parameter', () => {
    const out = pickReverseDiscovery(baseInputs({ limit: 1 }));
    expect(out).toHaveLength(1);
  });

  it('returns empty when the catalog has no entries for the locale', () => {
    const out = pickReverseDiscovery(baseInputs({ locale: 'jp-JP' }));
    expect(out).toEqual([]);
  });

  it('handles empty catalog cleanly (no throw)', () => {
    const out = pickReverseDiscovery(baseInputs({ catalog: [] }));
    expect(out).toEqual([]);
  });

  it('different users on the same day see different ordering', () => {
    const a = pickReverseDiscovery(baseInputs({ userId: 'user-A' }));
    const b = pickReverseDiscovery(baseInputs({ userId: 'user-B' }));
    // Same day, different users — at least one should diverge across a
    // sample of users (proves user-id participates in the seed).
    const samples = ['u1', 'u2', 'u3', 'u4', 'u5'].map((u) =>
      pickReverseDiscovery(baseInputs({ userId: u }))[0]?.canonical
    );
    expect(new Set(samples).size).toBeGreaterThan(1);
    expect(a).toBeDefined();
    expect(b).toBeDefined();
  });
});

describe('composeDiscoveryCopy — lifestyle voice', () => {
  const sampleCandidate = (): ReverseDiscoveryCandidate => ({
    canonical: 'cassava',
    locale: 'pt-BR',
    localName: 'mandioca',
    availabilityTier: 'common',
    notes: null,
  });

  it('leads with the local name, not the canonical', () => {
    const copy = composeDiscoveryCopy(sampleCandidate());
    expect(copy.headline).toMatch(/mandioca/);
    expect(copy.headline).not.toMatch(/\bcassava\b/i);
  });

  it('does NOT use banned trainer vocabulary', () => {
    const copy = composeDiscoveryCopy(sampleCandidate());
    const blob = `${copy.eyebrow} ${copy.headline} ${copy.body}`.toLowerCase();
    for (const banned of ['cut', 'bulk', 'maintain', 'macro-friendly']) {
      expect(blob).not.toMatch(new RegExp(`\\b${banned}\\b`));
    }
  });

  it('has a stable eyebrow and a CTA label', () => {
    const copy = composeDiscoveryCopy(sampleCandidate());
    expect(copy.eyebrow).toMatch(/YOUR MARKET HAS/i);
    expect(copy.cta.length).toBeGreaterThan(0);
  });
});
