// frontend/hooks/useSurfaceVisibility.ts
// ROADMAP 4.0 N2.2 — first-7-days surface coordination hook.
//
// Replaces the "all surfaces always render and individually hide" pattern
// with a single source of truth driven by the user's signal-coverage tier:
//
//   Day 0–2 / cold tier (0–2 cooks):
//     hero + first-of-day + nutrition strip + discovery card + quick actions
//     + activation card  (the cold-cold first-impression set)
//
//   Day 3–6 / mid tier (3–6 cooks):
//     unlocks Sunday polaroid + use-it-up + try-this-ingredient
//
//   Day 7+ / high tier (7+ cooks):
//     all surfaces + capability reveal moments fire on first appearance
//
// Each unlock is a tiny "Sazon learned a new trick" beat — capability reveals
// (N6) wrapped on the surface fire on the first render after unlock.

import { useEffect, useState } from 'react';
import { todayApi } from '../lib/api';
import {
  APP_SURFACE_INVENTORY,
  type AppTab,
  type SignalCoverageTier,
} from '../services/surfaceInventory';

const TIER_ORDER: Record<SignalCoverageTier, number> = {
  cold: 0,
  mid: 1,
  high: 2,
};

export interface SurfaceVisibility {
  /** True iff the surface should render at the user's tier. */
  [surfaceId: string]: boolean;
}

export interface UseSurfaceVisibilityResult {
  /** User's current tier. null while loading. */
  tier: SignalCoverageTier | null;
  /** Map of surfaceId → visible. Only includes surfaces in the inventory. */
  visibility: SurfaceVisibility;
  /** Convenience: visibility for a specific tab only. */
  visibleSurfaceIds: (tab: AppTab) => string[];
  loading: boolean;
}

const COLD_FALLBACK: SignalCoverageTier = 'cold';

function buildVisibility(tier: SignalCoverageTier): SurfaceVisibility {
  const out: SurfaceVisibility = {};
  for (const entry of APP_SURFACE_INVENTORY) {
    if (entry.retiredIn) continue;
    out[entry.surfaceId] =
      TIER_ORDER[tier] >= TIER_ORDER[entry.coldStartTier];
  }
  return out;
}

/**
 * Fetch the user's coverage tier on mount, then return the per-surface
 * visibility map. Surfaces not in the inventory default to NOT visible —
 * that forces every surface to register before it can render, which keeps
 * the count caps (N4.2) honest.
 */
export function useSurfaceVisibility(): UseSurfaceVisibilityResult {
  const [tier, setTier] = useState<SignalCoverageTier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    todayApi
      .coverage()
      .then((res) => {
        if (cancelled) return;
        const payload = (res?.data ?? res) as {
          tier?: SignalCoverageTier;
        };
        setTier(payload?.tier ?? COLD_FALLBACK);
      })
      .catch(() => {
        if (!cancelled) setTier(COLD_FALLBACK);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibility = tier ? buildVisibility(tier) : {};
  const visibleSurfaceIds = (tab: AppTab) =>
    APP_SURFACE_INVENTORY.filter(
      (s) =>
        s.tab === tab &&
        !s.retiredIn &&
        visibility[s.surfaceId] === true,
    ).map((s) => s.surfaceId);

  return { tier, visibility, visibleSurfaceIds, loading };
}

// Pure helper exported for tests + cap tests.
export const __helpers = { buildVisibility };
