// ROADMAP 4.0 N2.1 — coldStartCoordinator + canonical thresholds.
//
// Single source of truth for "what does Today look like for a user with
// zero cooks?" Per-tier ad-hoc `loaded < 5` checks scattered across 12+
// surfaces collapse into one registry. Each surface registers a
// `coldStartPolicy: { showAt: 'cold' | 'mid' | 'high' }` at boot; the
// coordinator reads the user's signal-coverage snapshot and decides
// per-surface visibility.
//
// Canonical signal-coverage tiers (every per-feature threshold binds
// to these — no hand-picked numeric thresholds outside this file):
//
//   Cook-based:
//     cold = 0–2 cooks
//     mid  = 3–6 cooks
//     high = 7+ cooks
//
//   Non-cook (chip taps, filter toggles, cadence events):
//     cold = 0–4 events
//     mid  = 5–14 events
//     high = 15+ events
//
// Cross-tier dovetail (rebinds): IG3.1 / IG10.1 / WK5.1 / WK14.1 / HX4.1 /
// FX3.4 / IG4.3 / RD4.2 / WK1.2 / WK2.2 — every surface that previously
// had a hand-picked count threshold rebinds to a tier name here.

export type SignalCoverageTier = 'cold' | 'mid' | 'high';

export const SIGNAL_COVERAGE_THRESHOLDS = {
  cookBased: {
    cold: { max: 2 },
    mid: { min: 3, max: 6 },
    high: { min: 7 },
  },
  eventBased: {
    cold: { max: 4 },
    mid: { min: 5, max: 14 },
    high: { min: 15 },
  },
} as const;

export function tierForCookCount(count: number): SignalCoverageTier {
  if (count <= SIGNAL_COVERAGE_THRESHOLDS.cookBased.cold.max) return 'cold';
  if (count <= SIGNAL_COVERAGE_THRESHOLDS.cookBased.mid.max) return 'mid';
  return 'high';
}

export function tierForEventCount(count: number): SignalCoverageTier {
  if (count <= SIGNAL_COVERAGE_THRESHOLDS.eventBased.cold.max) return 'cold';
  if (count <= SIGNAL_COVERAGE_THRESHOLDS.eventBased.mid.max) return 'mid';
  return 'high';
}

const TIER_ORDER: Record<SignalCoverageTier, number> = {
  cold: 0,
  mid: 1,
  high: 2,
};

/** True iff the user's tier has reached or exceeded the surface's `showAt`. */
export function tierMeetsRequirement(
  userTier: SignalCoverageTier,
  showAt: SignalCoverageTier,
): boolean {
  return TIER_ORDER[userTier] >= TIER_ORDER[showAt];
}

// ── Surface registry ────────────────────────────────────────────────────────

export interface ColdStartPolicy {
  /** Minimum tier at which this surface becomes visible. */
  showAt: SignalCoverageTier;
  /**
   * Counter the surface polls. `cookBased` surfaces gate on cook count;
   * `eventBased` surfaces gate on chip-tap / filter-toggle / cadence events.
   * Defaults to `cookBased` when omitted.
   */
  signal?: 'cookBased' | 'eventBased';
}

const registry = new Map<string, ColdStartPolicy>();

/** Register a surface's cold-start policy. Idempotent — last write wins. */
export function registerSurface(
  surfaceId: string,
  policy: ColdStartPolicy,
): void {
  if (!surfaceId) {
    throw new Error('registerSurface: surfaceId required');
  }
  registry.set(surfaceId, { signal: 'cookBased', ...policy });
}

/** Look up a surface's registered policy, or null if unregistered. */
export function getPolicy(surfaceId: string): ColdStartPolicy | null {
  return registry.get(surfaceId) ?? null;
}

/** Test helper — clear the registry between tests. */
export function __resetRegistryForTests(): void {
  registry.clear();
}

export interface VisibilityInput {
  userTier: SignalCoverageTier;
  /** When the surface is event-based, pass the event count for tier resolution. */
  eventCount?: number;
}

/**
 * Returns true iff the surface should render given the user's tier(s).
 * Unregistered surfaces default to visible (showAt = 'cold') so legacy
 * surfaces don't disappear silently — but this keeps registration as the
 * canonical path; the cap test below pins which surfaces must register.
 */
export function isSurfaceVisible(
  surfaceId: string,
  input: VisibilityInput,
): boolean {
  const policy = registry.get(surfaceId);
  if (!policy) return true; // unregistered → default-visible (legacy)
  const tier =
    policy.signal === 'eventBased'
      ? input.eventCount != null
        ? tierForEventCount(input.eventCount)
        : input.userTier
      : input.userTier;
  return tierMeetsRequirement(tier, policy.showAt);
}

/**
 * Returns the visibility map for every registered surface given the user's
 * tier. Used by Today / Kitchen / Week / Sazon screens to render the
 * surface stack in one pass.
 */
export function getVisibilityMap(input: VisibilityInput): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [surfaceId] of registry) {
    out[surfaceId] = isSurfaceVisible(surfaceId, input);
  }
  return out;
}

/** Test helper — list registered surface ids. */
export function __listRegisteredSurfacesForTests(): string[] {
  return [...registry.keys()];
}
