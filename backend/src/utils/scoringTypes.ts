// backend/src/utils/scoringTypes.ts
//
// Shared structural shapes for the scoring layer (advancedScoring,
// temporalScoring, collaborativeFiltering, et al.). These intentionally do
// NOT come from `@prisma/client` — Prisma's Recipe model is the *storage*
// shape (with ~80 fields, JSON-stringified columns, relation arrays the
// scorers don't need). The scorers want a small, permissive read-only view
// that any recipe-ish object can satisfy: full Prisma rows, partial
// `select`-narrowed rows, AI-generated drafts pre-persistence, and test
// fixtures.
//
// All fields optional + nullable on purpose — scoring code already handles
// missing data gracefully and we don't want a `select: { id, calories }`
// row to be rejected at the type level.

export interface ScoringIngredient {
  text?: string | null;
  name?: string | null;
}

export interface ScoringInstruction {
  text?: string | null;
  instruction?: string | null;
}

export interface ScoringRecipe {
  id?: string;
  title?: string | null;
  description?: string | null;
  cuisine?: string | null;
  difficulty?: string | null;
  cookTime?: number | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  ingredients?: ScoringIngredient[] | null;
  instructions?: ScoringInstruction[] | null;
}

// Meal-history rows fed into temporal pattern analysis. `recipe` is the
// joined recipe row (when included); `date` is the scheduled/cooked
// timestamp.
export interface ScoringMealHistoryEntry {
  date: string | Date;
  recipe?: { cuisine?: string | null } | null;
}
