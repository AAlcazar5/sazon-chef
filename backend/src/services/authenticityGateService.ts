// backend/src/services/authenticityGateService.ts
// ROADMAP 4.0 Tier D11 — Authenticity tier + surface gate.
//
// Every cuisine must ship at least one `authentic` recipe per
// *required* archetype slot before any `adapted` or `inspired`
// versions are surfaced. `inspired` recipes (e.g., "Persian-style
// weekday bowl") are fine to include in the catalog — but never the
// default for that cuisine.
//
// Pure rule engine + adapter-injectable surfacing helper so tests run
// without Prisma. The current default (no `authenticityTier` set,
// i.e., null) is treated as `adapted` — neither blocks surfacing nor
// counts as `authentic`. Caller migration backfills authentic flags
// per cultural review.

import {
  Archetype,
  getCuisineArchetypeStatus,
} from '../data/cuisineArchetypeMatrix';

export type AuthenticityTier = 'authentic' | 'adapted' | 'inspired';

export const AUTHENTICITY_TIERS: readonly AuthenticityTier[] = [
  'authentic',
  'adapted',
  'inspired',
];

export interface AuthenticityCandidate {
  recipeId: string;
  canonicalCuisine: string | null;
  archetype: Archetype | null;
  authenticityTier: AuthenticityTier | null;
}

export interface AuthenticityPeer {
  authenticityTier: AuthenticityTier | null;
}

export interface SurfaceGateResult {
  ok: boolean;
  /** Populated when ok=false. */
  reason?: 'authentic_missing' | 'cuisine_missing' | 'archetype_missing';
}

/**
 * Decide whether a single recipe is surfaceable given its peers (other
 * recipes in the same canonicalCuisine × archetype slot).
 *
 * Rules:
 *  - `authentic` always surfaces (it IS the authentic).
 *  - `adapted`/`inspired` surface only when slot is **optional** OR
 *    has ≥1 `authentic` peer.
 *  - `null` (untagged legacy) surfaces freely; treated as `adapted`-ish.
 *  - Missing canonicalCuisine or archetype → cuisine_missing /
 *    archetype_missing reason.
 */
export function canSurface(
  candidate: AuthenticityCandidate,
  peers: readonly AuthenticityPeer[],
): SurfaceGateResult {
  if (!candidate.canonicalCuisine) {
    return { ok: false, reason: 'cuisine_missing' };
  }
  if (!candidate.archetype) {
    return { ok: false, reason: 'archetype_missing' };
  }

  // Authentic always passes.
  if (candidate.authenticityTier === 'authentic') {
    return { ok: true };
  }

  // null (untagged) surfaces freely — caller-side tagging is a separate
  // backfill task. Once a recipe is explicitly marked adapted/inspired,
  // the gate enforces.
  if (candidate.authenticityTier === null) {
    return { ok: true };
  }

  const status = getCuisineArchetypeStatus(
    candidate.canonicalCuisine,
    candidate.archetype,
  );

  // Optional / n/a slots: gate does not fire.
  if (status === 'optional' || status === 'n/a' || status === null) {
    return { ok: true };
  }

  // Required slot — demand an authentic peer (excluding self if it appears).
  const hasAuthenticPeer = peers.some(
    (p) => p.authenticityTier === 'authentic',
  );
  if (hasAuthenticPeer) return { ok: true };

  return { ok: false, reason: 'authentic_missing' };
}

export interface AuthenticityCounts {
  authentic: number;
  adapted: number;
  inspired: number;
  untagged: number;
}

export function countByTier(
  recipes: readonly AuthenticityPeer[],
): AuthenticityCounts {
  const counts: AuthenticityCounts = {
    authentic: 0,
    adapted: 0,
    inspired: 0,
    untagged: 0,
  };
  for (const r of recipes) {
    switch (r.authenticityTier) {
      case 'authentic':
        counts.authentic++;
        break;
      case 'adapted':
        counts.adapted++;
        break;
      case 'inspired':
        counts.inspired++;
        break;
      default:
        counts.untagged++;
    }
  }
  return counts;
}

export function isValidTier(value: unknown): value is AuthenticityTier {
  return (
    typeof value === 'string' &&
    (AUTHENTICITY_TIERS as readonly string[]).includes(value)
  );
}
