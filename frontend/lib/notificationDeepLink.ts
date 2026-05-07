// frontend/lib/notificationDeepLink.ts
// ROADMAP 4.0 N9.1 — Notification → in-app surface deep-link map.
//
// Every C12 notification deep-links to a confirming in-app surface. When
// the "running low" notification fires, tapping it lands on Today with
// the IG4.3 UseItUpStrip auto-scrolled into view + a small "Sazon noticed
// your milk's been quiet" intro. Notifications and in-app feel like one
// mind speaking through two channels.
//
// The frontend `_layout.tsx` (or notification handler) calls
// `mapNotificationToDeepLink(template, payload?)` on tap and pushes the
// returned route. Backward-compat: unknown / missing templates fall back
// to plain Today open without throwing.

export type NotificationTemplate =
  // C12 templates currently shipped:
  | 'expiring-pantry'
  | 'no-plan-tonight'
  | 'fiber-gap'
  | 'low-variety'
  // C12 templates planned (N9.1 ships the surface map now so they wire
  // cleanly when their host tier lands):
  | 'running-low'
  | 'nutrient-gap'
  | 'week-recap'
  | 'near-miss-discovery'
  | 'pantry-iq-weekly';

export interface DeepLinkTarget {
  /** expo-router pathname. */
  pathname: string;
  /** Query parameters to append. */
  params: Record<string, string>;
  /**
   * Surface anchor — the in-app component the route handler should scroll
   * to and highlight. Routes consume this via the `notification` query param
   * (preserved for backward-compat with existing handlers).
   */
  anchor: string;
}

/**
 * Canonical mapping. New templates land in BOTH the type union above and
 * this map; the cap test (backend/__tests__/quality/notificationSurfaceMap.test.ts)
 * pins the enumeration so silent additions fail.
 *
 * Anchor strings are stable identifiers consumed by Today / Week / Kitchen
 * screen handlers — they scroll the matching surface into view.
 */
const SURFACE_MAP: Record<NotificationTemplate, DeepLinkTarget> = {
  // C12-shipped surfaces
  'expiring-pantry': {
    pathname: '/(tabs)',
    params: { notification: 'expiring-pantry' },
    anchor: 'use-it-up-strip',
  },
  'no-plan-tonight': {
    pathname: '/(tabs)',
    params: { notification: 'no-plan-tonight' },
    anchor: 'today-hero',
  },
  'fiber-gap': {
    pathname: '/(tabs)',
    params: { notification: 'fiber-gap' },
    anchor: 'nutrition-strip',
  },
  'low-variety': {
    pathname: '/(tabs)',
    params: { notification: 'low-variety' },
    anchor: 'today-discovery-card',
  },

  // Planned templates (host tier ships the anchor when the surface lands)
  'running-low': {
    pathname: '/(tabs)',
    params: { notification: 'running-low' },
    anchor: 'running-low-chip',
  },
  'nutrient-gap': {
    pathname: '/(tabs)',
    params: { notification: 'nutrient-gap' },
    anchor: 'nutrition-strip',
  },
  'week-recap': {
    pathname: '/(tabs)/meal-plan',
    params: { notification: 'week-recap' },
    anchor: 'plan-iq-card',
  },
  'near-miss-discovery': {
    pathname: '/(tabs)',
    params: { notification: 'near-miss-discovery' },
    anchor: 'almost-made-it',
  },
  'pantry-iq-weekly': {
    pathname: '/(tabs)/cookbook',
    params: { notification: 'pantry-iq-weekly', view: 'discover' },
    anchor: 'pantry-iq-card',
  },
};

const FALLBACK_TARGET: DeepLinkTarget = {
  pathname: '/(tabs)',
  params: {},
  anchor: 'today-hero',
};

/**
 * Map a notification template (and optional payload) to a deep-link target.
 * Unknown / missing templates return the FALLBACK_TARGET so legacy
 * notifications never crash.
 */
export function mapNotificationToDeepLink(
  template: string | null | undefined,
  payload?: Record<string, string>,
): DeepLinkTarget {
  if (!template) return FALLBACK_TARGET;
  const target = SURFACE_MAP[template as NotificationTemplate];
  if (!target) return FALLBACK_TARGET;
  return {
    pathname: target.pathname,
    params: { ...target.params, ...(payload ?? {}) },
    anchor: target.anchor,
  };
}

/** Build the full URL string ready for `router.push`. */
export function buildDeepLinkUrl(target: DeepLinkTarget): string {
  const qp = new URLSearchParams(target.params).toString();
  return qp ? `${target.pathname}?${qp}` : target.pathname;
}

/**
 * Test / cap-test entry: returns the canonical surface map keys so backend
 * and frontend cap tests can enumerate them.
 */
export function getMappedTemplates(): NotificationTemplate[] {
  return Object.keys(SURFACE_MAP) as NotificationTemplate[];
}

export const __SURFACE_MAP_FOR_TESTS = SURFACE_MAP;
