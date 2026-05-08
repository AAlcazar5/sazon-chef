// backend/src/services/reverseDiscoveryService.ts
// ROADMAP 4.0 I2.4 — Reverse-discovery surface.
//
// "Your market stocks X today, you've never cooked it." The N=1 inversion:
// not "what does this user want?" but "what does this user's neighborhood
// offer that they're missing?" This is the discovery angle no US app can
// match — built directly on top of I2.1's locale-aware catalog.
//
// Pure function. Caller hands in the catalog + user's cookedCanonicals
// set + locale + asOfDate seed; service filters and rotates deterministi-
// cally. Output stays the same per (userId, date) until tomorrow — caller
// can cache by that key without coordination.
//
// The ranking heuristic is intentionally simple in v1: filter to common-
// tier ingredients in the user's locale that the user has never cooked,
// shuffle deterministically by (userId, date) hash. Adjacency-engine fit
// (ingredient ↔ user's cuisine affinity) is a richer ranking layer to
// add in v2 — keeping v1 simple lets the surface ship + telemetry on
// engagement before tuning.

import type { LocalEquivalent, AvailabilityTier } from '../data/ingredientLocalEquivalents';

export interface ReverseDiscoveryInputs {
  userId: string;
  /** BCP 47 locale, e.g. 'pt-BR'. */
  locale: string;
  /** Local-equivalent catalog (typically STARTER_LOCAL_EQUIVALENTS). */
  catalog: ReadonlyArray<LocalEquivalent>;
  /**
   * Set of canonical (en-US, normalized) ingredient names the user has
   * cooked at any point. The service excludes these from the candidate
   * pool — discovery is by definition something the user hasn't tried.
   */
  cookedCanonicals: ReadonlySet<string>;
  /** Date seed for deterministic rotation (typically `new Date()`). */
  asOfDate: Date;
  /** Max candidates to return. Defaults to 2. */
  limit?: number;
}

export interface ReverseDiscoveryCandidate {
  canonical: string;
  locale: string;
  localName: string;
  availabilityTier: AvailabilityTier;
  notes: string | null;
}

const DEFAULT_LIMIT = 2;

/**
 * Stable string hash → small integer. djb2-style, sufficient for sort
 * tiebreaking. NOT cryptographic — just rotation seed.
 */
function stableHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function dateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function pickReverseDiscovery(
  inputs: ReverseDiscoveryInputs
): ReverseDiscoveryCandidate[] {
  const limit = inputs.limit ?? DEFAULT_LIMIT;
  if (limit <= 0) return [];

  const candidates = inputs.catalog.filter(
    (row) =>
      row.locale === inputs.locale &&
      row.availabilityTier === 'common' &&
      !inputs.cookedCanonicals.has(row.canonical)
  );

  if (candidates.length === 0) return [];

  // Deterministic rotation: order by hash(userId + date + canonical) asc.
  // Same user same day → same order. Different days → different ordering
  // because the date string changes; same day across users → diverges
  // because userId varies.
  const seed = `${inputs.userId}::${dateKey(inputs.asOfDate)}`;
  const sorted = [...candidates].sort((a, b) => {
    const ha = stableHash(`${seed}::${a.canonical}`);
    const hb = stableHash(`${seed}::${b.canonical}`);
    if (ha !== hb) return ha - hb;
    return a.canonical.localeCompare(b.canonical);
  });

  return sorted.slice(0, limit).map((row) => ({
    canonical: row.canonical,
    locale: row.locale,
    localName: row.localName,
    availabilityTier: row.availabilityTier,
    notes: row.notes ?? null,
  }));
}

// ─── Copy composition (lifestyle voice) ────────────────────────────────────

export interface DiscoveryCopy {
  /** Eyebrow text, e.g. 'YOUR MARKET HAS'. */
  eyebrow: string;
  /** Hero line — leads with the local name. */
  headline: string;
  /** One-line invitation. */
  body: string;
  /** CTA label — opens Sazon seeded with the ingredient. */
  cta: string;
}

const EYEBROW = 'YOUR MARKET HAS';

const INVITATIONS = [
  'A new ingredient on your shelf — fancy a dish around it?',
  'Local kitchens cook with this all the time. Want a way in?',
  'In season, on every shelf, never on your stove yet.',
  'A regular at the market here — let\'s find a recipe.',
];

export function composeDiscoveryCopy(
  candidate: ReverseDiscoveryCandidate
): DiscoveryCopy {
  // Deterministic invitation pick by canonical hash so the same candidate
  // always gets the same body line.
  const idx = stableHash(candidate.canonical) % INVITATIONS.length;
  return {
    eyebrow: EYEBROW,
    headline: candidate.localName,
    body: INVITATIONS[idx],
    cta: 'Show me how',
  };
}
