// frontend/lib/foodIntelAction.ts
//
// Decides what tapping a Food Intel tip should do.
//
// Superfood / nutrient / pairing / ingredient tips carry an ingredient name
// in `trigger` — tapping the card runs a recipe search against that name so
// the user can immediately find a recipe to cook with it. Technique / myth-
// bust / cultural / arc tips don't map to a recipe search; they stay no-op
// (engagement recorded, no navigation) so a future card-detail expansion can
// take over without re-wiring the tap surface.
//
// Keeping this as a pure function makes both callsites (TodayDiscoveryCard
// on Home, DidYouKnowCard on Discover) testable in isolation and prevents
// either screen from drifting in its own direction.

import type { FoodIntelTip, FoodIntelCategory } from './foodIntelTips';

const SEARCHABLE_CATEGORIES: ReadonlySet<FoodIntelCategory> = new Set<FoodIntelCategory>([
  'superfood',
  'nutrient',
  'pairing',
]);

export function isSearchableTip(tip: Pick<FoodIntelTip, 'category' | 'trigger'>): boolean {
  if (!SEARCHABLE_CATEGORIES.has(tip.category)) return false;
  const t = (tip.trigger ?? '').trim();
  return t.length > 0;
}

/**
 * The query string to feed into the home tab's `?search=` URL param. Returns
 * null for non-searchable tips so the caller can branch cleanly.
 */
export function getTipSearchQuery(tip: Pick<FoodIntelTip, 'category' | 'trigger'>): string | null {
  if (!isSearchableTip(tip)) return null;
  return tip.trigger.trim();
}
