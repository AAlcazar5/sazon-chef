// backend/__tests__/services/authenticityGateService.test.ts
// ROADMAP 4.0 Tier D11 — Authenticity tier + surface gate.

import {
  canSurface,
  countByTier,
  isValidTier,
  AUTHENTICITY_TIERS,
} from '../../src/services/authenticityGateService';

describe('isValidTier', () => {
  it('accepts the three valid tiers', () => {
    for (const t of AUTHENTICITY_TIERS) {
      expect(isValidTier(t)).toBe(true);
    }
  });
  it('rejects everything else', () => {
    expect(isValidTier('AUTHENTIC')).toBe(false);
    expect(isValidTier(null)).toBe(false);
    expect(isValidTier(undefined)).toBe(false);
    expect(isValidTier(42)).toBe(false);
    expect(isValidTier('fake')).toBe(false);
  });
});

describe('canSurface — required slots', () => {
  // Persian × weekend_project is required per D4 matrix
  it('authentic recipe always surfaces (no peers needed)', () => {
    const r = canSurface(
      {
        recipeId: 'r1',
        canonicalCuisine: 'persian',
        archetype: 'weekend_project',
        authenticityTier: 'authentic',
      },
      [],
    );
    expect(r.ok).toBe(true);
  });

  it('inspired recipe blocked when no authentic peer in same slot', () => {
    const r = canSurface(
      {
        recipeId: 'r1',
        canonicalCuisine: 'persian',
        archetype: 'weekend_project',
        authenticityTier: 'inspired',
      },
      [
        { authenticityTier: 'inspired' },
        { authenticityTier: 'adapted' },
      ],
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('authentic_missing');
  });

  it('inspired recipe surfaces once any authentic peer exists', () => {
    const r = canSurface(
      {
        recipeId: 'r1',
        canonicalCuisine: 'persian',
        archetype: 'weekend_project',
        authenticityTier: 'inspired',
      },
      [{ authenticityTier: 'authentic' }],
    );
    expect(r.ok).toBe(true);
  });

  it('adapted recipe blocked when no authentic peer (required slot)', () => {
    const r = canSurface(
      {
        recipeId: 'r1',
        canonicalCuisine: 'persian',
        archetype: 'weekend_project',
        authenticityTier: 'adapted',
      },
      [],
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('authentic_missing');
  });
});

describe('canSurface — optional slots', () => {
  // Persian × breakfast is optional per D4 matrix (no override → default optional for non-mexican)
  it('inspired recipe surfaces freely on optional slots', () => {
    const r = canSurface(
      {
        recipeId: 'r1',
        canonicalCuisine: 'persian',
        archetype: 'breakfast',
        authenticityTier: 'inspired',
      },
      [],
    );
    expect(r.ok).toBe(true);
  });
});

describe('canSurface — untagged (null) recipes', () => {
  it('surface freely (legacy backfill not required to block)', () => {
    const r = canSurface(
      {
        recipeId: 'r1',
        canonicalCuisine: 'persian',
        archetype: 'weekend_project',
        authenticityTier: null,
      },
      [],
    );
    expect(r.ok).toBe(true);
  });
});

describe('canSurface — invalid metadata', () => {
  it('cuisine_missing when canonicalCuisine is null', () => {
    const r = canSurface(
      {
        recipeId: 'r1',
        canonicalCuisine: null,
        archetype: 'weekend_project',
        authenticityTier: 'inspired',
      },
      [],
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('cuisine_missing');
  });

  it('archetype_missing when archetype is null', () => {
    const r = canSurface(
      {
        recipeId: 'r1',
        canonicalCuisine: 'persian',
        archetype: null,
        authenticityTier: 'inspired',
      },
      [],
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('archetype_missing');
  });

  it('unknown canonical → ok (no-gate fallback)', () => {
    const r = canSurface(
      {
        recipeId: 'r1',
        canonicalCuisine: 'klingon',
        archetype: 'weekend_project',
        authenticityTier: 'inspired',
      },
      [],
    );
    // Unknown canonical → status null → gate does not fire
    expect(r.ok).toBe(true);
  });
});

describe('canSurface — per-archetype granularity', () => {
  it('blocks inspired in required Mexican breakfast slot but not optional Mexican slot', () => {
    // Mexican × breakfast is required; Mexican × sweet_or_dessert is optional (default)
    const required = canSurface(
      {
        recipeId: 'r1',
        canonicalCuisine: 'mexican',
        archetype: 'breakfast',
        authenticityTier: 'inspired',
      },
      [{ authenticityTier: 'adapted' }],
    );
    expect(required.ok).toBe(false);

    const optional = canSurface(
      {
        recipeId: 'r2',
        canonicalCuisine: 'mexican',
        archetype: 'sweet_or_dessert',
        authenticityTier: 'inspired',
      },
      [],
    );
    expect(optional.ok).toBe(true);
  });
});

describe('countByTier', () => {
  it('counts recipes by tier', () => {
    const counts = countByTier([
      { authenticityTier: 'authentic' },
      { authenticityTier: 'authentic' },
      { authenticityTier: 'adapted' },
      { authenticityTier: 'inspired' },
      { authenticityTier: null },
    ]);
    expect(counts).toEqual({
      authentic: 2,
      adapted: 1,
      inspired: 1,
      untagged: 1,
    });
  });

  it('handles empty input', () => {
    expect(countByTier([])).toEqual({
      authentic: 0,
      adapted: 0,
      inspired: 0,
      untagged: 0,
    });
  });
});
