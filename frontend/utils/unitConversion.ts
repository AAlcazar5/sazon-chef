// frontend/utils/unitConversion.ts
// Client-side imperial ↔ metric conversion for display-only (does NOT mutate API payload)
// Mirrors the conversion table in backend/src/utils/unitConversion.ts

export type UnitSystem = 'imperial' | 'metric';

export interface ConversionResult {
  amount: number;
  unit: string;
}

// Units that cannot be meaningfully converted between systems
export const NON_CONVERTIBLE_UNITS: string[] = [
  'bunch', 'bunches', 'can', 'cans', 'pinch', 'pinches',
  'clove', 'cloves', 'piece', 'pieces', 'count',
  'slice', 'slices', 'package', 'pkg',
];

// Volume: imperial → ml multipliers
const IMPERIAL_VOLUME_TO_ML: Record<string, number> = {
  tsp: 4.92892,
  teaspoon: 4.92892,
  teaspoons: 4.92892,
  tbsp: 14.7868,
  tablespoon: 14.7868,
  tablespoons: 14.7868,
  'fl oz': 29.5735,
  cup: 236.588,
  cups: 236.588,
  pint: 473.176,
  pints: 473.176,
  quart: 946.353,
  quarts: 946.353,
  gallon: 3785.41,
  gallons: 3785.41,
};

// Weight: imperial → g multipliers
const IMPERIAL_WEIGHT_TO_G: Record<string, number> = {
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
};

// Metric volume units (ml → human-readable)
const METRIC_VOLUME_UNITS = new Set(['ml', 'l', 'liter', 'liters', 'litre', 'litres']);
// Metric weight units
const METRIC_WEIGHT_UNITS = new Set(['g', 'kg', 'gram', 'grams', 'kilogram', 'kilograms']);

function isImperialVolume(unit: string): boolean {
  return unit.toLowerCase() in IMPERIAL_VOLUME_TO_ML;
}

function isImperialWeight(unit: string): boolean {
  return unit.toLowerCase() in IMPERIAL_WEIGHT_TO_G;
}

function isMetricVolume(unit: string): boolean {
  return METRIC_VOLUME_UNITS.has(unit.toLowerCase());
}

function isMetricWeight(unit: string): boolean {
  return METRIC_WEIGHT_UNITS.has(unit.toLowerCase());
}

function isNonConvertible(unit: string): boolean {
  return NON_CONVERTIBLE_UNITS.includes(unit.toLowerCase());
}

function roundSmart(value: number): number {
  if (value >= 100) return Math.round(value);
  if (value >= 10) return Math.round(value * 10) / 10;
  return Math.round(value * 100) / 100;
}

/**
 * Convert an amount+unit for display-only in the target unit system.
 * Returns the original values unchanged if the unit is non-convertible or already in the target system.
 */
export function convertForDisplay(
  amount: number,
  unit: string,
  targetSystem: UnitSystem
): ConversionResult {
  const lowerUnit = unit.toLowerCase();

  // Non-convertible units pass through unchanged
  if (isNonConvertible(lowerUnit)) {
    return { amount, unit };
  }

  if (targetSystem === 'metric') {
    // Already metric: pass through
    if (isMetricVolume(lowerUnit) || isMetricWeight(lowerUnit)) {
      return { amount, unit };
    }

    // Imperial volume → ml
    if (isImperialVolume(lowerUnit)) {
      const ml = amount * IMPERIAL_VOLUME_TO_ML[lowerUnit];
      return { amount: roundSmart(ml), unit: 'ml' };
    }

    // Imperial weight → g
    if (isImperialWeight(lowerUnit)) {
      const g = amount * IMPERIAL_WEIGHT_TO_G[lowerUnit];
      return { amount: roundSmart(g), unit: 'g' };
    }
  }

  if (targetSystem === 'imperial') {
    // Already imperial: pass through
    if (isImperialVolume(lowerUnit) || isImperialWeight(lowerUnit)) {
      return { amount, unit };
    }

    // ml → cups
    if (lowerUnit === 'ml') {
      const cups = amount / IMPERIAL_VOLUME_TO_ML['cups'];
      return { amount: roundSmart(cups), unit: 'cups' };
    }

    // l → cups
    if (lowerUnit === 'l' || lowerUnit === 'liter' || lowerUnit === 'liters' || lowerUnit === 'litre' || lowerUnit === 'litres') {
      const cups = (amount * 1000) / IMPERIAL_VOLUME_TO_ML['cups'];
      return { amount: roundSmart(cups), unit: 'cups' };
    }

    // g → oz
    if (lowerUnit === 'g' || lowerUnit === 'gram' || lowerUnit === 'grams') {
      const oz = amount / IMPERIAL_WEIGHT_TO_G['oz'];
      return { amount: roundSmart(oz), unit: 'oz' };
    }

    // kg → lbs
    if (lowerUnit === 'kg' || lowerUnit === 'kilogram' || lowerUnit === 'kilograms') {
      const lbs = (amount * 1000) / IMPERIAL_WEIGHT_TO_G['oz'];
      return { amount: roundSmart(lbs), unit: 'lbs' };
    }
  }

  // Unknown unit — pass through unchanged
  return { amount, unit };
}
