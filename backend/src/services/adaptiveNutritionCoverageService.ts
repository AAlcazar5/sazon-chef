// backend/src/services/adaptiveNutritionCoverageService.ts
// ROADMAP 4.0 Tier C6 — Adaptive nutrition coverage.
//
// Reads 14d adherence + variety signals; surfaces gaps as INVITATIONS, never
// corrections. Lifestyle voice. Power-user mode (opt-in via
// nutritionUIDensity = 'power-user') also returns a macro-target delta in
// the MacroFactor pattern — but only when adherence is high enough to trust
// the trend.

export type CoverageGap = 'fiber' | 'protein' | 'variety' | 'consistency';

export interface CoverageInputs {
  /** Window size in days. Typically 14. */
  period: number;
  /** Fraction of daily calorie target hit, averaged. 0..1. */
  caloriesAdherence: number;
  /** Fraction of daily protein target hit, averaged. */
  proteinAdherence: number;
  /** Fraction of daily fiber target hit, averaged. */
  fiberAdherence: number;
  /** Distinct cuisines cooked in the last 14 days. */
  cuisineVarietyLast14: number;
  /** Weight trend in lbs/week (positive = gaining). */
  weightTrendLbsPerWeek: number;
  goalPhase: 'cut' | 'maintain' | 'bulk' | 'recomp';
  /** Drives whether we surface invitations + macro-adjustment. */
  nutritionUIDensity: 'minimal' | 'macros' | 'macros + micros' | 'power-user';
}

const FIBER_GAP_THRESHOLD = 0.7;
const PROTEIN_GAP_THRESHOLD = 0.8;
const CALORIE_CONSISTENCY_THRESHOLD = 0.7;
const VARIETY_LOW_THRESHOLD = 3; // <4 cuisines = variety gap

export function detectGaps(inputs: CoverageInputs): CoverageGap[] {
  const gaps: CoverageGap[] = [];
  if (inputs.fiberAdherence < FIBER_GAP_THRESHOLD) gaps.push('fiber');
  if (inputs.proteinAdherence < PROTEIN_GAP_THRESHOLD) gaps.push('protein');
  if (inputs.caloriesAdherence < CALORIE_CONSISTENCY_THRESHOLD) gaps.push('consistency');
  if (inputs.cuisineVarietyLast14 <= VARIETY_LOW_THRESHOLD) gaps.push('variety');
  return gaps;
}

const VARIETY_CUISINES = [
  'Persian',
  'Salvadorean',
  'Burmese',
  'Ethiopian',
  'Vietnamese',
  'Lebanese',
  'Peruvian',
];

export function buildInvitations(
  gaps: ReadonlyArray<CoverageGap>,
  inputs: CoverageInputs
): string[] {
  if (inputs.nutritionUIDensity === 'minimal') return [];
  const out: string[] = [];
  for (const gap of gaps) {
    switch (gap) {
      case 'fiber':
        out.push(
          'Want to try something with lentils, kale, or oats this week? Your fiber has been quiet.'
        );
        break;
      case 'protein':
        out.push(
          "Fancy a protein-forward week? Salmon, lentils, or a nice bean stew would do it."
        );
        break;
      case 'variety':
        out.push(
          `Feeling adventurous? You've been cooking close to home — maybe ${VARIETY_CUISINES[Math.floor(Math.random() * VARIETY_CUISINES.length)]} or ${VARIETY_CUISINES[Math.floor(Math.random() * VARIETY_CUISINES.length)]} this week?`
        );
        break;
      case 'consistency':
        out.push(
          "Some days have been very different from others — want to plan a steady week?"
        );
        break;
    }
  }
  return out;
}

export interface MacroAdjustment {
  calories: number;
  protein?: number;
  reason: string;
}

const MIN_ADHERENCE_FOR_TREND_TRUST = 0.7;

export function suggestMacroAdjustment(inputs: CoverageInputs): MacroAdjustment | null {
  if (inputs.nutritionUIDensity !== 'power-user') return null;
  if (inputs.caloriesAdherence < MIN_ADHERENCE_FOR_TREND_TRUST) return null;
  if (inputs.goalPhase === 'maintain' || inputs.goalPhase === 'recomp') {
    // No automatic adjustment for these phases.
    return null;
  }
  // Cut: weight should be trending DOWN. If trending up, cut calories.
  if (inputs.goalPhase === 'cut' && inputs.weightTrendLbsPerWeek > 0.1) {
    return {
      calories: -Math.round(inputs.weightTrendLbsPerWeek * 350),
      reason: `You're cutting but trending up ${inputs.weightTrendLbsPerWeek.toFixed(2)} lb/week — gently lowering daily calories.`,
    };
  }
  // Bulk: weight should be trending UP. If trending down, add calories.
  if (inputs.goalPhase === 'bulk' && inputs.weightTrendLbsPerWeek < -0.1) {
    return {
      calories: Math.round(Math.abs(inputs.weightTrendLbsPerWeek) * 350),
      reason: `You're bulking but trending down ${Math.abs(inputs.weightTrendLbsPerWeek).toFixed(2)} lb/week — losing rather than gaining; adding daily calories.`,
    };
  }
  return null;
}
