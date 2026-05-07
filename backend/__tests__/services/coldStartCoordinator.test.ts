// ROADMAP 4.0 N2.1 — coldStartCoordinator test.

import {
  registerSurface,
  getPolicy,
  isSurfaceVisible,
  getVisibilityMap,
  tierForCookCount,
  tierForEventCount,
  tierMeetsRequirement,
  SIGNAL_COVERAGE_THRESHOLDS,
  __resetRegistryForTests,
  __listRegisteredSurfacesForTests,
} from '../../src/services/coldStartCoordinator';

beforeEach(() => __resetRegistryForTests());

describe('N2.1 — canonical thresholds', () => {
  it('cookBased: cold ≤ 2, mid 3–6, high ≥ 7', () => {
    expect(tierForCookCount(0)).toBe('cold');
    expect(tierForCookCount(2)).toBe('cold');
    expect(tierForCookCount(3)).toBe('mid');
    expect(tierForCookCount(6)).toBe('mid');
    expect(tierForCookCount(7)).toBe('high');
    expect(tierForCookCount(50)).toBe('high');
  });

  it('eventBased: cold ≤ 4, mid 5–14, high ≥ 15', () => {
    expect(tierForEventCount(0)).toBe('cold');
    expect(tierForEventCount(4)).toBe('cold');
    expect(tierForEventCount(5)).toBe('mid');
    expect(tierForEventCount(14)).toBe('mid');
    expect(tierForEventCount(15)).toBe('high');
    expect(tierForEventCount(99)).toBe('high');
  });

  it('publishes thresholds for cap-test inspection', () => {
    expect(SIGNAL_COVERAGE_THRESHOLDS.cookBased.cold.max).toBe(2);
    expect(SIGNAL_COVERAGE_THRESHOLDS.cookBased.mid.min).toBe(3);
    expect(SIGNAL_COVERAGE_THRESHOLDS.eventBased.high.min).toBe(15);
  });
});

describe('N2.1 — tierMeetsRequirement', () => {
  it('high meets cold/mid/high', () => {
    expect(tierMeetsRequirement('high', 'cold')).toBe(true);
    expect(tierMeetsRequirement('high', 'mid')).toBe(true);
    expect(tierMeetsRequirement('high', 'high')).toBe(true);
  });
  it('mid meets cold/mid but not high', () => {
    expect(tierMeetsRequirement('mid', 'cold')).toBe(true);
    expect(tierMeetsRequirement('mid', 'mid')).toBe(true);
    expect(tierMeetsRequirement('mid', 'high')).toBe(false);
  });
  it('cold only meets cold', () => {
    expect(tierMeetsRequirement('cold', 'cold')).toBe(true);
    expect(tierMeetsRequirement('cold', 'mid')).toBe(false);
    expect(tierMeetsRequirement('cold', 'high')).toBe(false);
  });
});

describe('N2.1 — surface registry', () => {
  it('registerSurface persists the policy', () => {
    registerSurface('pantry_iq', { showAt: 'mid' });
    expect(getPolicy('pantry_iq')).toEqual({
      showAt: 'mid',
      signal: 'cookBased',
    });
  });

  it('rejects empty surfaceId', () => {
    expect(() => registerSurface('', { showAt: 'cold' })).toThrow(/surfaceId/);
  });

  it('idempotent (last write wins)', () => {
    registerSurface('pantry_iq', { showAt: 'mid' });
    registerSurface('pantry_iq', { showAt: 'high' });
    expect(getPolicy('pantry_iq')!.showAt).toBe('high');
  });

  it('getPolicy returns null for unregistered surfaces', () => {
    expect(getPolicy('mystery')).toBeNull();
  });
});

describe('N2.1 — isSurfaceVisible', () => {
  it('hides cold-tier user from a mid-only surface', () => {
    registerSurface('pantry_iq', { showAt: 'mid' });
    expect(isSurfaceVisible('pantry_iq', { userTier: 'cold' })).toBe(false);
    expect(isSurfaceVisible('pantry_iq', { userTier: 'mid' })).toBe(true);
    expect(isSurfaceVisible('pantry_iq', { userTier: 'high' })).toBe(true);
  });

  it('eventBased surface uses eventCount when provided', () => {
    registerSurface('quick_action_chip_order', {
      showAt: 'mid',
      signal: 'eventBased',
    });
    // userTier='high' but eventCount=2 → eventBased resolves cold → hidden
    expect(
      isSurfaceVisible('quick_action_chip_order', {
        userTier: 'high',
        eventCount: 2,
      }),
    ).toBe(false);
    // eventCount=10 → mid → visible
    expect(
      isSurfaceVisible('quick_action_chip_order', {
        userTier: 'high',
        eventCount: 10,
      }),
    ).toBe(true);
  });

  it('unregistered surfaces default to visible (legacy graceful)', () => {
    expect(isSurfaceVisible('legacy_surface', { userTier: 'cold' })).toBe(true);
  });
});

describe('N2.1 — getVisibilityMap', () => {
  it('returns a per-surface boolean map for the given tier', () => {
    registerSurface('today_hero', { showAt: 'cold' });
    registerSurface('pantry_iq', { showAt: 'mid' });
    registerSurface('plan_iq', { showAt: 'high' });

    expect(getVisibilityMap({ userTier: 'cold' })).toEqual({
      today_hero: true,
      pantry_iq: false,
      plan_iq: false,
    });
    expect(getVisibilityMap({ userTier: 'mid' })).toEqual({
      today_hero: true,
      pantry_iq: true,
      plan_iq: false,
    });
    expect(getVisibilityMap({ userTier: 'high' })).toEqual({
      today_hero: true,
      pantry_iq: true,
      plan_iq: true,
    });
  });

  it('reflects only registered surfaces', () => {
    registerSurface('today_hero', { showAt: 'cold' });
    const map = getVisibilityMap({ userTier: 'cold' });
    expect(Object.keys(map)).toEqual(['today_hero']);
  });

  it('registry registry exposes ids for cap-test inspection', () => {
    registerSurface('a', { showAt: 'cold' });
    registerSurface('b', { showAt: 'mid' });
    expect(__listRegisteredSurfacesForTests().sort()).toEqual(['a', 'b']);
  });
});
