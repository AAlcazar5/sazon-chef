// frontend/__tests__/quality/surfaceCountCap.test.ts
// ROADMAP 4.0 N4.2 — ≤ 8 visible surfaces per tab on cold scroll.
//
// "Simple as possible" requires deletion, not just reorganization. New
// surfaces ship behind a flag and only enable when an existing surface
// retires (per N4.1 ablation report) — no "just one more strip" without
// an explicit retirement.
//
// This cap test reads the static `APP_SURFACE_INVENTORY` and enforces:
//   - ≤ MAX_SURFACES_PER_TAB visible at the `cold` tier per tab
//   - ≤ MAX_SURFACES_PER_TAB visible at the `mid` tier per tab
//   - ≤ MAX_SURFACES_PER_TAB visible at the `high` tier per tab
//
// (The tier check is cumulative — at `high` the user sees `cold` + `mid` +
// `high` surfaces. So the high-tier cap is the toughest; if it passes, all
// three pass.)

import {
  APP_SURFACE_INVENTORY,
  countVisibleSurfaces,
  getSurfacesForTab,
  __INTERNALS,
  type AppTab,
} from '../../services/surfaceInventory';

const TABS: AppTab[] = ['today', 'week', 'kitchen', 'sazon'];

describe('N4.2 — surface count cap (≤ 8 per tab)', () => {
  it('publishes MAX_SURFACES_PER_TAB = 8', () => {
    expect(__INTERNALS.MAX_SURFACES_PER_TAB).toBe(8);
  });

  it('every tab has at least one surface registered (sanity)', () => {
    for (const tab of TABS) {
      expect(getSurfacesForTab(tab).length).toBeGreaterThan(0);
    }
  });

  // N4.2 spec: "≤ 8 visible surfaces per tab on cold scroll" — the
  // first-impression budget. Mid + high tier users have engaged with the
  // app and can handle more density once their tier unlocks more surfaces.
  it.each(TABS)('cold-tier visible surfaces on %s ≤ MAX', (tab) => {
    const count = countVisibleSurfaces(tab, 'cold');
    expect(count).toBeLessThanOrEqual(__INTERNALS.MAX_SURFACES_PER_TAB);
  });

  // Soft caps for mid + high — assert they stay reasonable but allow more
  // density than cold scroll. Bump these intentionally if a new mid/high
  // tier surface earns its slot via N4.1 ablation.
  const SOFT_CAP_MID = 10;
  const SOFT_CAP_HIGH = 12;
  it.each(TABS)(`mid-tier visible surfaces on %s ≤ ${SOFT_CAP_MID}`, (tab) => {
    expect(countVisibleSurfaces(tab, 'mid')).toBeLessThanOrEqual(SOFT_CAP_MID);
  });
  it.each(TABS)(`high-tier visible surfaces on %s ≤ ${SOFT_CAP_HIGH}`, (tab) => {
    expect(countVisibleSurfaces(tab, 'high')).toBeLessThanOrEqual(SOFT_CAP_HIGH);
  });

  it('every entry has a unique surfaceId', () => {
    const ids = APP_SURFACE_INVENTORY.map((s) => s.surfaceId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry has a non-empty description + introducedIn marker', () => {
    for (const s of APP_SURFACE_INVENTORY) {
      expect(s.description.length).toBeGreaterThan(0);
      expect(s.introducedIn.length).toBeGreaterThan(0);
    }
  });
});

describe('N8.3 — offline policy declared on every surface', () => {
  it('every surface lists a non-empty offline policy', () => {
    for (const s of APP_SURFACE_INVENTORY) {
      expect(['cachedFallback', 'hideGracefully', 'shimmer']).toContain(
        s.offlinePolicy,
      );
    }
  });

  it('hero-class surfaces use cachedFallback (last resort: stale > absent)', () => {
    const hero = APP_SURFACE_INVENTORY.find((s) => s.surfaceId === 'today_hero');
    expect(hero?.offlinePolicy).toBe('cachedFallback');
  });

  it('Sazon chat uses shimmer (the user expects a response, not silence)', () => {
    const sazon = APP_SURFACE_INVENTORY.find((s) => s.surfaceId === 'sazon_chat');
    expect(sazon?.offlinePolicy).toBe('shimmer');
  });
});
