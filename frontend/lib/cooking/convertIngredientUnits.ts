// Tier Y-5 — change-units toggle (screenshot #4: As written / US / Metric).
//
// Pure conversion over the structured ingredient list. "as-written" is an
// identity. US↔metric uses the canonical factor table mirrored from
// VisualIngredientList (kept duplicated rather than refactoring that
// working component — codebase convention is per-surface tables; the
// numbers are the single conceptual source). Unknown / unconvertible
// units (cloves, pinch, piece…) pass through unchanged.

import type { ScalableIngredientLite } from './rescaleStepText';

export type UnitMode = 'as-written' | 'us' | 'metric';

type System = 'us' | 'metric';

const UNIT_CONVERSIONS: Record<
  string,
  { to: string; factor: number; system: System }
> = {
  cup: { to: 'ml', factor: 240, system: 'us' },
  cups: { to: 'ml', factor: 240, system: 'us' },
  tbsp: { to: 'ml', factor: 15, system: 'us' },
  tablespoon: { to: 'ml', factor: 15, system: 'us' },
  tablespoons: { to: 'ml', factor: 15, system: 'us' },
  tsp: { to: 'ml', factor: 5, system: 'us' },
  teaspoon: { to: 'ml', factor: 5, system: 'us' },
  teaspoons: { to: 'ml', factor: 5, system: 'us' },
  oz: { to: 'g', factor: 28.35, system: 'us' },
  ounce: { to: 'g', factor: 28.35, system: 'us' },
  ounces: { to: 'g', factor: 28.35, system: 'us' },
  lb: { to: 'g', factor: 453.6, system: 'us' },
  lbs: { to: 'g', factor: 453.6, system: 'us' },
  pound: { to: 'g', factor: 453.6, system: 'us' },
  pounds: { to: 'g', factor: 453.6, system: 'us' },
  ml: { to: 'cup', factor: 1 / 240, system: 'metric' },
  l: { to: 'cup', factor: 1000 / 240, system: 'metric' },
  g: { to: 'oz', factor: 1 / 28.35, system: 'metric' },
  kg: { to: 'lb', factor: 1000 / 453.6, system: 'metric' },
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function convertIngredientUnits(
  ingredients: ReadonlyArray<ScalableIngredientLite>,
  mode: UnitMode,
): ScalableIngredientLite[] {
  if (mode === 'as-written') {
    return ingredients.map((i) => ({ ...i }));
  }
  return ingredients.map((ing) => {
    const conv = UNIT_CONVERSIONS[ing.unit.toLowerCase()];
    if (!conv) return { ...ing }; // unconvertible — pass through
    // Convert only when the unit's own system differs from the target.
    const convert =
      (mode === 'metric' && conv.system === 'us') ||
      (mode === 'us' && conv.system === 'metric');
    if (!convert) return { ...ing };
    return {
      name: ing.name,
      amount: round1(ing.amount * conv.factor),
      unit: conv.to,
    };
  });
}
