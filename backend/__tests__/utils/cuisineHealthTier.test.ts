// backend/__tests__/utils/cuisineHealthTier.test.ts
// Group 11 Phase 3 — health-tier classification tests.

import {
  getHealthTierForCuisine,
  getHealthPromptAddendum,
  TIER_PROMPT_ADDENDUM,
  __TIER_BY_CUISINE,
} from '../../src/utils/cuisineHealthTier';

describe('TIER_PROMPT_ADDENDUM', () => {
  it('defines a non-empty addendum for every health tier', () => {
    expect(TIER_PROMPT_ADDENDUM.naturally_healthy.length).toBeGreaterThan(0);
    expect(TIER_PROMPT_ADDENDUM.easily_adapted.length).toBeGreaterThan(0);
    expect(TIER_PROMPT_ADDENDUM.hidden_superfoods.length).toBeGreaterThan(0);
    expect(TIER_PROMPT_ADDENDUM.protein_forward.length).toBeGreaterThan(0);
  });
});

describe('getHealthTierForCuisine', () => {
  it('classifies Okinawan as naturally_healthy', () => {
    expect(getHealthTierForCuisine('Okinawan')).toBe('naturally_healthy');
  });
  it('classifies Soul Food as easily_adapted', () => {
    expect(getHealthTierForCuisine('Soul Food')).toBe('easily_adapted');
  });
  it('classifies Nigerian as hidden_superfoods', () => {
    expect(getHealthTierForCuisine('Nigerian')).toBe('hidden_superfoods');
  });
  it('classifies Argentinian as protein_forward', () => {
    expect(getHealthTierForCuisine('Argentinian')).toBe('protein_forward');
  });
  it('returns null for an unknown cuisine', () => {
    expect(getHealthTierForCuisine('Atlantean')).toBeNull();
  });
  it('does not assign a cuisine to multiple tiers', () => {
    const tierCount = new Map<string, number>();
    for (const cuisine of Object.keys(__TIER_BY_CUISINE)) {
      tierCount.set(cuisine, (tierCount.get(cuisine) ?? 0) + 1);
    }
    for (const count of tierCount.values()) {
      expect(count).toBe(1);
    }
  });
});

describe('getHealthPromptAddendum', () => {
  it('returns the naturally_healthy addendum for Okinawan', () => {
    expect(getHealthPromptAddendum('Okinawan')).toBe(TIER_PROMPT_ADDENDUM.naturally_healthy);
  });
  it('returns the easily_adapted addendum for Soul Food', () => {
    expect(getHealthPromptAddendum('Soul Food')).toBe(TIER_PROMPT_ADDENDUM.easily_adapted);
  });
  it('returns an empty string for an unknown cuisine (graceful fallback)', () => {
    expect(getHealthPromptAddendum('Atlantean')).toBe('');
  });
});
