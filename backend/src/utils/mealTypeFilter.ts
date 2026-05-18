// Sauce scoring guard. Sauces/condiments are a browsable catalog category,
// not a servable meal. The generic recommendation / plate candidate query
// must exclude them unless the caller explicitly asked for a mealType — a
// 2-tbsp tzatziki has no business in the 70/30 macro/taste plate score.

/**
 * Prisma `where.mealType` clause for the candidate-recipe query.
 * - explicit mealType (incl. 'sauce') → that value, unchanged
 * - no/blank mealType → exclude sauces so they don't pollute meal scoring
 */
export function mealTypeWhereClause(
  mealType?: string,
): string | { not: string } {
  const trimmed = mealType?.trim();
  if (trimmed) return trimmed;
  return { not: 'sauce' };
}
