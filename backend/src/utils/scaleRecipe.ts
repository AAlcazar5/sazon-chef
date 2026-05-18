// backend/src/utils/scaleRecipe.ts
//
// W-A2 — deterministic recipe scaling. The LLM must NEVER compute ingredient
// quantities (cooking-mode office-hours acceptance criterion 1); this pure,
// immutable module owns the math. Operates on the structured ingredient
// shape used by GeneratedRecipe. Parsing free-text RecipeIngredient.text
// into this shape is a separate (heuristic) concern, out of W-A2 scope.

export interface ScalableIngredient {
  name: string;
  amount: number;
  unit: string;
}

// Mass units expressed in grams. Anything not here (cup, tbsp, tsp, piece…)
// is volume/count and intentionally NOT cross-convertible — scaling those
// requires a same-unit target, never an inferred mass conversion.
const MASS_G: Readonly<Record<string, number>> = {
  oz: 28.349523125,
  lb: 453.59237,
  g: 1,
  kg: 1000,
};

/**
 * Convert a mass quantity between units. Identity units pass through.
 * Returns null when either unit is not a known mass unit (callers treat
 * null as "incompatible — cannot infer").
 */
export function convertMass(
  amount: number,
  fromUnit: string,
  toUnit: string,
): number | null {
  const from = fromUnit.trim().toLowerCase();
  const to = toUnit.trim().toLowerCase();
  if (from === to) return amount;
  const f = MASS_G[from];
  const t = MASS_G[to];
  if (f === undefined || t === undefined) return null;
  return (amount * f) / t;
}

function assertFactor(factor: number): void {
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new Error(
      `scale factor must be a finite positive number, got ${factor}`,
    );
  }
}

/**
 * Scale every ingredient amount by `factor`. Immutable: returns a new array
 * of new objects; inputs are never mutated. `factor === 1` is a value no-op
 * but still returns fresh objects.
 */
export function scaleIngredients(
  ingredients: readonly ScalableIngredient[],
  factor: number,
): ScalableIngredient[] {
  assertFactor(factor);
  return ingredients.map((ing) => ({
    name: ing.name,
    amount: ing.amount * factor,
    unit: ing.unit,
  }));
}

/**
 * Derive the scale factor that takes `reference` to the requested target.
 * Same unit → plain ratio. Cross-unit → mass conversion only; throws when
 * the units are not mass-compatible (e.g. cups → lb cannot be inferred).
 */
export function scaleFactorForTarget(
  reference: ScalableIngredient,
  target: { amount: number; unit: string },
): number {
  if (reference.amount <= 0 || !Number.isFinite(reference.amount)) {
    throw new Error(
      `reference ingredient "${reference.name}" has a non-positive amount`,
    );
  }
  const refUnit = reference.unit.trim().toLowerCase();
  const tgtUnit = target.unit.trim().toLowerCase();
  if (refUnit === tgtUnit) return target.amount / reference.amount;

  const targetInRefUnit = convertMass(target.amount, tgtUnit, refUnit);
  if (targetInRefUnit === null) {
    throw new Error(
      `cannot scale: incompatible units "${target.unit}" → "${reference.unit}" (no mass conversion)`,
    );
  }
  return targetInRefUnit / reference.amount;
}

/**
 * End-to-end: scale the whole list off a named reference ingredient's
 * target quantity (the "scale this recipe to 2 lb of salmon" moment).
 * Immutable. Throws if the reference ingredient is absent.
 */
export function scaleRecipeToTarget(
  ingredients: readonly ScalableIngredient[],
  referenceName: string,
  target: { amount: number; unit: string },
): ScalableIngredient[] {
  const key = referenceName.trim().toLowerCase();
  const reference = ingredients.find(
    (ing) => ing.name.trim().toLowerCase() === key,
  );
  if (!reference) {
    throw new Error(
      `reference ingredient "${referenceName}" not found in recipe`,
    );
  }
  const factor = scaleFactorForTarget(reference, target);
  return scaleIngredients(ingredients, factor);
}
