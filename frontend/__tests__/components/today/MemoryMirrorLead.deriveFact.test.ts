// X-C2 (founder roadmap Tier X — Moat Hardening) — deriveFact tests
// for the new substitution-fingerprint slot in MemoryMirrorLead. Pins:
//   - Fingerprint wins over all existing CookLog-type facts (priority)
//   - W-D1 invariant: no counts in user-facing copy
//   - Empty insight + empty types → null (no fabricated memory)
//   - Existing CookLog-type fallback still works

import { deriveFact } from '../../../components/today/MemoryMirrorLead';
import type { CookMemoryInsightPayload } from '../../../lib/api/cook';

const EMPTY_INSIGHT: CookMemoryInsightPayload = {
  cadence: { dominantDay: null, dominantDayName: null, totalCooks: 0 },
  cuisineCadence: null,
  substitutions: [],
  flopsRecent: 0,
};

const WITH_SUBS: CookMemoryInsightPayload = {
  ...EMPTY_INSIGHT,
  substitutions: [
    { from: 'butter', to: 'olive oil', count: 3 },
    { from: 'sour cream', to: 'yogurt', count: 1 },
  ],
};

describe('deriveFact — substitution fingerprint priority', () => {
  it('returns the substitution copy when ≥1 swap pair exists', () => {
    const fact = deriveFact(new Set(['made_it']), WITH_SUBS);
    expect(fact).toMatch(/butter → olive oil/);
    expect(fact).toMatch(/fingerprint/);
  });

  it('uses the TOP-ranked swap pair (not a later one)', () => {
    const fact = deriveFact(new Set(), WITH_SUBS);
    expect(fact).toMatch(/butter → olive oil/);
    expect(fact).not.toMatch(/sour cream/);
  });

  it('beats every existing CookLog-type fact when present', () => {
    const fact = deriveFact(
      new Set(['scale', 'swap', 'outcome', 'made_it']),
      WITH_SUBS,
    );
    expect(fact).toMatch(/fingerprint/);
    expect(fact).not.toMatch(/batch-cook/);
    expect(fact).not.toMatch(/learning your swaps/);
  });

  it('W-D1 invariant: no count appears in the copy', () => {
    const fact = deriveFact(new Set(), WITH_SUBS) ?? '';
    expect(fact).not.toMatch(/\b\d+\b/); // no digits anywhere
    expect(fact.toLowerCase()).not.toMatch(/times|count|total/);
  });
});

describe('deriveFact — fallback chain (insight null or empty)', () => {
  it('null insight → falls back to scale fact', () => {
    expect(deriveFact(new Set(['scale']), null)).toMatch(/batch-cook/);
  });

  it('null insight → falls back to swap fact when no scale', () => {
    expect(deriveFact(new Set(['swap']), null)).toMatch(/learning your swaps/);
  });

  it('null insight → falls back to outcome fact', () => {
    expect(deriveFact(new Set(['outcome']), null)).toMatch(/ratings/);
  });

  it('null insight → falls back to made_it fact', () => {
    expect(deriveFact(new Set(['made_it']), null)).toMatch(
      /getting to know how you cook/,
    );
  });

  it('insight present but no substitutions → falls through to existing facts', () => {
    expect(deriveFact(new Set(['scale']), EMPTY_INSIGHT)).toMatch(/batch-cook/);
  });

  it('no types + null insight → null (no fabricated memory)', () => {
    expect(deriveFact(new Set(), null)).toBeNull();
  });

  it('no types + empty insight → null (no fabricated memory)', () => {
    expect(deriveFact(new Set(), EMPTY_INSIGHT)).toBeNull();
  });
});
