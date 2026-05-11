// BAP0.2: plateRationaleBuilder — "why these slots" rationale.

import { buildPlateRationale } from '../../src/services/plateRationaleBuilder';

describe('BAP0.2: plateRationaleBuilder', () => {
  it('returns null on cold-start (no signal strong enough)', () => {
    expect(buildPlateRationale({})).toBeNull();
    expect(
      buildPlateRationale({
        leftoverContinuityCount: 1, // below threshold
        pantryCoverage: 0.1, // below threshold
        macroFitScore: 0.4, // below threshold
      }),
    ).toBeNull();
  });

  it('caps the primary reason at ≤90 chars', () => {
    const result = buildPlateRationale({
      leftoverContinuityCount: 3,
      topProteinName: 'A very long protein name that goes on and on and on and on and beyond',
    });
    expect(result).not.toBeNull();
    expect(result!.primaryReason.length).toBeLessThanOrEqual(90);
  });

  it('leftover continuity wins the primary slot when ≥2 leftovers exist', () => {
    const result = buildPlateRationale({
      leftoverContinuityCount: 3,
      pantryCoverage: 0.9, // would otherwise win
      topProteinName: 'roast chicken',
    });
    expect(result).not.toBeNull();
    expect(result!.primaryReason).toMatch(/roast chicken/i);
    expect(result!.primaryReason).toMatch(/already half a plate/i);
    expect(result!.signals[0]).toBe('leftover_continuity');
  });

  it('strips banned vocabulary (cut/bulk/maintain/macro-friendly)', () => {
    // Direct test of the cleaner via a contrived top-protein name.
    const result = buildPlateRationale({
      leftoverContinuityCount: 2,
      // Even if upstream code passes banned phrases by accident, the cleaner
      // strips them before they hit the UI.
      topProteinName: 'cut beef macro-friendly',
    });
    expect(result).not.toBeNull();
    expect(result!.primaryReason).not.toMatch(/\b(cut|bulk|maintain|macro-friendly)\b/i);
  });

  it('caps secondaries at ≤3', () => {
    const result = buildPlateRationale({
      leftoverContinuityCount: 3,
      pantryCoverage: 0.9,
      macroFitScore: 0.92,
      cuisineCadenceDays: 21,
      cuisineLabel: 'Thai',
      topPantryIngredient: 'fish sauce',
      topProteinName: 'salmon',
    });
    expect(result).not.toBeNull();
    expect(result!.secondaryReasons.length).toBeLessThanOrEqual(3);
  });

  it('truncates primary lines beyond 90 chars with an ellipsis', () => {
    const result = buildPlateRationale({
      leftoverContinuityCount: 5,
      topProteinName:
        'overflowingproteinname'.repeat(10), // ~220 chars
    });
    expect(result).not.toBeNull();
    expect(result!.primaryReason.length).toBeLessThanOrEqual(90);
    expect(result!.primaryReason).toMatch(/…$/);
  });

  it('pantry-coverage wins the primary when leftovers absent + coverage ≥60%', () => {
    const result = buildPlateRationale({
      leftoverContinuityCount: 0,
      pantryCoverage: 0.75,
      topPantryIngredient: 'quinoa',
    });
    expect(result).not.toBeNull();
    expect(result!.primaryReason).toMatch(/quinoa/i);
    expect(result!.signals).toContain('pantry_coverage_high');
  });

  it('partial pantry coverage (35-59%) without a stronger signal does NOT qualify for primary', () => {
    // Partial pantry only contributes a secondary line — without a
    // primary candidate from another signal, the rationale is null.
    expect(
      buildPlateRationale({
        leftoverContinuityCount: 0,
        pantryCoverage: 0.45,
      }),
    ).toBeNull();
  });

  it('signals array carries the structured tags ordered by priority', () => {
    const result = buildPlateRationale({
      leftoverContinuityCount: 3,
      pantryCoverage: 0.8,
      macroFitScore: 0.9,
      topProteinName: 'tofu',
      topPantryIngredient: 'rice',
    });
    expect(result).not.toBeNull();
    expect(result!.signals[0]).toBe('leftover_continuity');
    // pantry_coverage_high should follow (priority 80), then macro_fit (60)
    expect(result!.signals).toContain('pantry_coverage_high');
    expect(result!.signals).toContain('macro_fit');
  });
});
