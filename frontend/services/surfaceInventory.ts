// frontend/services/surfaceInventory.ts
// ROADMAP 4.0 N4.1 + N4.2 + N8.3 — App surface inventory.
//
// Single source of truth for every user-visible surface across the 4 tabs
// (Today / Week / Kitchen / Sazon). Each entry carries:
//   - tab + surfaceId
//   - coldStartTier (min N2.1 tier required to show)
//   - offlinePolicy (cachedFallback | hideGracefully | shimmer)
//   - introduced/retired metadata
//
// Three N tiers consume this catalog:
//   N4.1 — counterfactual ablation infra reads (impressions / interactions
//          per surface from the unified RecommenderEvent log) and flags
//          any surface < 1.5% interaction rate after 14d for retirement.
//   N4.2 — cap test enforces ≤ 8 visible surfaces per tab on cold scroll.
//   N8.3 — offline degradation policy lookup; every surface that calls
//          sazonBrain MUST declare an offline behavior here.

// N2.1 cold-start tier — mirrored locally to avoid crossing the
// frontend/backend boundary at type-resolution time. Keep in sync with
// `backend/src/services/coldStartCoordinator.ts`.
export type SignalCoverageTier = 'cold' | 'mid' | 'high';

export type AppTab = 'today' | 'week' | 'kitchen' | 'sazon';

export type OfflinePolicy =
  /** Render the last cached payload from local storage. Best for high-value
   *  surfaces (today's hero) where stale > absent. */
  | 'cachedFallback'
  /** Hide the surface entirely while offline. Best for surfaces whose value
   *  depends on fresh network data (Pantry IQ, near-miss). */
  | 'hideGracefully'
  /** Render a shimmer placeholder + reconnect prompt. Best for editorial
   *  cards (Plan IQ) where letting the user know it's coming back has value. */
  | 'shimmer';

export interface SurfaceEntry {
  /** Stable identifier used in the unified RecommenderEvent log + cap tests. */
  surfaceId: string;
  tab: AppTab;
  /** Minimum N2.1 cold-start tier required to render. */
  coldStartTier: SignalCoverageTier;
  offlinePolicy: OfflinePolicy;
  /** Roadmap section that introduced the surface. */
  introducedIn: string;
  /** Optional retirement marker — set when N4.1 ablation flags low-engagement. */
  retiredIn?: string;
  /** One-line summary for the inventory report. */
  description: string;
}

/**
 * Canonical inventory. New surfaces add their entry here at definition time
 * (NOT at runtime — the inventory is static so cap tests + ablation reports
 * can read it without booting the app).
 *
 * Per N4.2: visible-surface count per tab on a cold-tier user must be ≤ 8.
 * The cap test (`__tests__/quality/surfaceCountCap.test.ts`) enforces it.
 *
 * Per N8.3: every surface lists its offline policy. Surfaces calling
 * sazonBrain (today_hero, recipe_detail_*) MUST declare a non-default policy.
 */
export const APP_SURFACE_INVENTORY: SurfaceEntry[] = [
  // ── Today tab ─────────────────────────────────────────────────────────────
  {
    surfaceId: 'today_hero',
    tab: 'today',
    coldStartTier: 'cold',
    offlinePolicy: 'cachedFallback',
    introducedIn: 'A1-a',
    description: 'One hero plate — full-bleed image + cuisine eyebrow + CTA.',
  },
  {
    surfaceId: 'first_of_day_note',
    tab: 'today',
    coldStartTier: 'cold',
    offlinePolicy: 'hideGracefully',
    introducedIn: 'J11',
    description: 'First-of-day greeting note above the hero.',
  },
  {
    surfaceId: 'sunday_polaroid',
    tab: 'today',
    coldStartTier: 'mid',
    offlinePolicy: 'hideGracefully',
    introducedIn: 'J4',
    description: 'Sunday recap polaroid drop.',
  },
  {
    surfaceId: 'nutrition_strip',
    tab: 'today',
    coldStartTier: 'cold',
    offlinePolicy: 'cachedFallback',
    introducedIn: 'D14',
    description: 'Daily nutrition discovery strip.',
  },
  {
    surfaceId: 'today_discovery_card',
    tab: 'today',
    coldStartTier: 'cold',
    offlinePolicy: 'hideGracefully',
    introducedIn: 'A1-c',
    description: 'Day-of-year rotating discovery card.',
  },
  {
    surfaceId: 'quick_action_row',
    tab: 'today',
    coldStartTier: 'cold',
    offlinePolicy: 'cachedFallback',
    introducedIn: 'A1-d',
    description: 'Voice / Snap / Build-a-plate / Find-me-a-meal quick chips.',
  },
  {
    surfaceId: 'use_it_up_strip',
    tab: 'today',
    coldStartTier: 'mid',
    offlinePolicy: 'hideGracefully',
    introducedIn: 'IG4.3',
    description: 'Soon-to-expire pantry items + recipe suggestion.',
  },
  {
    surfaceId: 'try_this_ingredient',
    tab: 'today',
    coldStartTier: 'mid',
    offlinePolicy: 'hideGracefully',
    introducedIn: 'IG8.2',
    description: 'Weekly cultural-discovery ingredient suggestion.',
  },
  {
    surfaceId: 'activation_card',
    tab: 'today',
    coldStartTier: 'cold',
    offlinePolicy: 'hideGracefully',
    introducedIn: 'N12',
    description: 'Day-3 / Day-7 activation surface for users with 0 cooks.',
  },
  // ── Week tab ──────────────────────────────────────────────────────────────
  {
    surfaceId: 'week_day_grid',
    tab: 'week',
    coldStartTier: 'cold',
    offlinePolicy: 'cachedFallback',
    introducedIn: 'A2-a',
    description: '7-day visual meal grid.',
  },
  {
    surfaceId: 'shop_this_week_pill',
    tab: 'week',
    coldStartTier: 'cold',
    offlinePolicy: 'hideGracefully',
    introducedIn: 'A2-b',
    description: 'Header pill that opens shopping mode.',
  },
  {
    surfaceId: 'pantry_inline_strip',
    tab: 'week',
    coldStartTier: 'cold',
    offlinePolicy: 'cachedFallback',
    introducedIn: 'A2-c',
    description: 'Bottom-of-week pantry summary strip.',
  },
  {
    surfaceId: 'weekly_nutrition_glance',
    tab: 'week',
    coldStartTier: 'cold',
    offlinePolicy: 'cachedFallback',
    introducedIn: 'A2-e',
    description: 'Weekly cuisine + ingredient + nutrient glance.',
  },
  // ── Kitchen tab ───────────────────────────────────────────────────────────
  {
    surfaceId: 'kitchen_mode_bar',
    tab: 'kitchen',
    coldStartTier: 'cold',
    offlinePolicy: 'cachedFallback',
    introducedIn: 'A3-a',
    description: '5-pill mode nav (Saved / Collections / Discover / Journey / Stories).',
  },
  {
    surfaceId: 'kitchen_journey_view',
    tab: 'kitchen',
    coldStartTier: 'mid',
    offlinePolicy: 'cachedFallback',
    introducedIn: 'A3-c',
    description: 'Cuisine map + stats + skill tier + arc.',
  },
  {
    surfaceId: 'kitchen_stories_view',
    tab: 'kitchen',
    coldStartTier: 'mid',
    offlinePolicy: 'cachedFallback',
    introducedIn: 'A3-d',
    description: 'Weekly + monthly Wrapped-style recap cards.',
  },
  {
    surfaceId: 'pantry_iq_card',
    tab: 'kitchen',
    coldStartTier: 'mid',
    offlinePolicy: 'hideGracefully',
    introducedIn: 'IG10.1',
    description: 'Pantry IQ editorial card (cuisine lean + most-used + underused).',
  },
  // ── Sazon tab ─────────────────────────────────────────────────────────────
  {
    surfaceId: 'sazon_chat',
    tab: 'sazon',
    coldStartTier: 'cold',
    offlinePolicy: 'shimmer',
    introducedIn: 'A4-a',
    description: 'Conversational coach surface.',
  },
];

/** Return all surfaces registered for a tab. */
export function getSurfacesForTab(tab: AppTab): SurfaceEntry[] {
  return APP_SURFACE_INVENTORY.filter((s) => s.tab === tab && !s.retiredIn);
}

/**
 * Return the count of surfaces visible at a given cold-start tier on a tab.
 * Used by the N4.2 cap test to enforce ≤ 8.
 */
export function countVisibleSurfaces(tab: AppTab, tier: SignalCoverageTier): number {
  return APP_SURFACE_INVENTORY.filter(
    (s) => s.tab === tab && !s.retiredIn && tierMeets(tier, s.coldStartTier),
  ).length;
}

const TIER_ORDER: Record<SignalCoverageTier, number> = {
  cold: 0,
  mid: 1,
  high: 2,
};

function tierMeets(
  userTier: SignalCoverageTier,
  required: SignalCoverageTier,
): boolean {
  return TIER_ORDER[userTier] >= TIER_ORDER[required];
}

/** Look up an entry by surfaceId. Returns null when unregistered. */
export function getSurfaceEntry(surfaceId: string): SurfaceEntry | null {
  return (
    APP_SURFACE_INVENTORY.find((s) => s.surfaceId === surfaceId && !s.retiredIn) ??
    null
  );
}

/** Lookup the offline policy for a surface. Defaults to 'hideGracefully' for unknown ids. */
export function getOfflinePolicy(surfaceId: string): OfflinePolicy {
  return getSurfaceEntry(surfaceId)?.offlinePolicy ?? 'hideGracefully';
}

export const __INTERNALS = {
  MAX_SURFACES_PER_TAB: 8,
};
