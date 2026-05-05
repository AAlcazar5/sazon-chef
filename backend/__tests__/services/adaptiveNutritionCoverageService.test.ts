// backend/__tests__/services/adaptiveNutritionCoverageService.test.ts
// ROADMAP 4.0 Tier C6 — Adaptive nutrition coverage (TDD).

import {
  detectGaps,
  buildInvitations,
  suggestMacroAdjustment,
  type CoverageInputs,
} from '../../src/services/adaptiveNutritionCoverageService';

const baseInputs: CoverageInputs = {
  period: 14,
  caloriesAdherence: 0.95,
  proteinAdherence: 0.95,
  fiberAdherence: 0.95,
  cuisineVarietyLast14: 6,
  weightTrendLbsPerWeek: 0,
  goalPhase: 'maintain',
  nutritionUIDensity: 'macros',
};

describe('detectGaps', () => {
  it('detects fiber gap when adherence is well below target', () => {
    const gaps = detectGaps({ ...baseInputs, fiberAdherence: 0.4 });
    expect(gaps).toContain('fiber');
  });

  it('detects protein gap when adherence is below target', () => {
    const gaps = detectGaps({ ...baseInputs, proteinAdherence: 0.6 });
    expect(gaps).toContain('protein');
  });

  it('detects variety gap when last 14d cuisine count is below 4', () => {
    const gaps = detectGaps({ ...baseInputs, cuisineVarietyLast14: 2 });
    expect(gaps).toContain('variety');
  });

  it('detects calorie consistency gap when adherence is well below 80%', () => {
    const gaps = detectGaps({ ...baseInputs, caloriesAdherence: 0.5 });
    expect(gaps).toContain('consistency');
  });

  it('returns empty array when all adherences are healthy', () => {
    expect(detectGaps(baseInputs)).toEqual([]);
  });

  it('returns multiple gaps when multiple inputs are deficient', () => {
    const gaps = detectGaps({
      ...baseInputs,
      proteinAdherence: 0.6,
      fiberAdherence: 0.5,
      cuisineVarietyLast14: 2,
    });
    expect(gaps).toContain('protein');
    expect(gaps).toContain('fiber');
    expect(gaps).toContain('variety');
  });
});

describe('buildInvitations — lifestyle voice', () => {
  it('returns invitational copy for fiber gap (no verdict tone)', () => {
    const invs = buildInvitations(['fiber'], baseInputs);
    expect(invs).toHaveLength(1);
    expect(invs[0].toLowerCase()).not.toMatch(/missed|under your|fell short/);
    expect(invs[0].toLowerCase()).toMatch(/want|fancy|try/);
  });

  it('returns invitational copy for protein gap', () => {
    const invs = buildInvitations(['protein'], baseInputs);
    expect(invs).toHaveLength(1);
    expect(invs[0].toLowerCase()).toMatch(/protein/);
    expect(invs[0].toLowerCase()).not.toMatch(/missed|under target/);
  });

  it('references named cuisines for variety gap', () => {
    const invs = buildInvitations(['variety'], baseInputs);
    expect(invs).toHaveLength(1);
    expect(invs[0].toLowerCase()).toMatch(/persian|salvadorean|burmese|adventurous|new/);
  });

  it('returns one invitation per detected gap', () => {
    const invs = buildInvitations(['fiber', 'variety'], baseInputs);
    expect(invs).toHaveLength(2);
  });

  it('returns empty array when given an empty gap list', () => {
    expect(buildInvitations([], baseInputs)).toEqual([]);
  });

  it('returns empty when nutritionUIDensity = "minimal" (no nudges)', () => {
    expect(
      buildInvitations(['fiber'], { ...baseInputs, nutritionUIDensity: 'minimal' })
    ).toEqual([]);
  });
});

describe('suggestMacroAdjustment — power-user mode (MacroFactor pattern)', () => {
  it('returns null for non-power-user density (default lifestyle)', () => {
    expect(
      suggestMacroAdjustment({ ...baseInputs, nutritionUIDensity: 'macros' })
    ).toBeNull();
  });

  it('returns null when goal is maintain and weight is stable', () => {
    expect(
      suggestMacroAdjustment({
        ...baseInputs,
        nutritionUIDensity: 'power-user',
        goalPhase: 'maintain',
        weightTrendLbsPerWeek: 0,
      })
    ).toBeNull();
  });

  it('suggests calorie cut when goal=cut but trending +0.3 lb/week', () => {
    const adj = suggestMacroAdjustment({
      ...baseInputs,
      nutritionUIDensity: 'power-user',
      goalPhase: 'cut',
      weightTrendLbsPerWeek: 0.3,
    });
    expect(adj).not.toBeNull();
    expect(adj!.calories).toBeLessThan(0);
    expect(adj!.reason.toLowerCase()).toMatch(/trending up|gaining/);
  });

  it('suggests calorie add when goal=bulk but trending −0.2 lb/week', () => {
    const adj = suggestMacroAdjustment({
      ...baseInputs,
      nutritionUIDensity: 'power-user',
      goalPhase: 'bulk',
      weightTrendLbsPerWeek: -0.2,
    });
    expect(adj).not.toBeNull();
    expect(adj!.calories).toBeGreaterThan(0);
    expect(adj!.reason.toLowerCase()).toMatch(/trending down|losing/);
  });

  it('returns null when adherence < 0.7 (insufficient signal to trust the trend)', () => {
    expect(
      suggestMacroAdjustment({
        ...baseInputs,
        nutritionUIDensity: 'power-user',
        goalPhase: 'cut',
        weightTrendLbsPerWeek: 0.3,
        caloriesAdherence: 0.4,
      })
    ).toBeNull();
  });
});
