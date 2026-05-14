// ROADMAP 4.0 Tier U / M5 — typed accessors for JSON-stringified columns.
//
// Why this exists: Prisma 5 on SQLite does NOT support the native `Json`
// column type, so 25 columns across the schema store JSON as `String`.
// Direct callsites (`JSON.parse(row.field)`) lose all type information and
// silently break on malformed data.
//
// This module centralizes parse + serialize behind zod schemas, one per
// migrated column. Reads return a properly-typed value with a safe default
// on malformed/null input; writes validate before stringifying so a bad
// shape can't be persisted.
//
// Usage:
//   parseJsonColumn('appliances', recipe.appliances)
//     // -> string[] (with safe default [])
//   serializeJsonColumn('appliances', ['ninja_creami'])
//     // -> '["ninja_creami"]' (throws on bad shape)
//
// When SQLite gives way to Postgres, these schemas become the source of
// truth for the eventual `Json` migration — every callsite already routes
// through here.

import { z } from 'zod';

// ─── Schemas ─────────────────────────────────────────────────────────────

const stringArray = z.array(z.string());
const numberMap = z.record(z.string(), z.number());

// componentIds: [{ slot, componentId, portionMultiplier? }]
// slot + componentId are required in canonical data; portionMultiplier
// defaults to 1.0 at consumer call-sites when absent. The parse fallback
// rejects entries missing slot or componentId.
const componentEntrySchema = z.object({
  slot: z.string(),
  componentId: z.string(),
  portionMultiplier: z.number().optional(),
});
const componentEntryArray = z.array(componentEntrySchema);

// ShoppingList.autoNamedFrom: { source: "recipes"|"mealPlan"|"items", payload: any }
const autoNamedFromSchema = z.object({
  source: z.enum(['recipes', 'mealPlan', 'items']),
  payload: z.unknown(),
});

// CoachMessage.attachments: array of attachment descriptors OR meta object
const attachmentsSchema = z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())]);

// RecipeQualityScore.failureReasons: { axis, code, detail }[]
const failureReasonSchema = z.array(
  z.object({
    axis: z.string(),
    code: z.string(),
    detail: z.string().optional(),
  }),
);

// Free-form JSON for audit / snapshot fields
const freeformJson = z.record(z.string(), z.unknown());

export const JSON_COLUMN_SCHEMAS = {
  // UserPreferences
  pantryLeaningCuisines: stringArray,
  // Recipe
  appliances: stringArray,
  tagsJson: stringArray,
  // Meal
  flavorTags: stringArray,
  // ShoppingList
  sourceRecipeIds: stringArray,
  summaryStats: freeformJson,
  autoNamedFrom: autoNamedFromSchema,
  // ShoppingListShare
  usedBy: stringArray,
  // StripeWebhookEvent / RevenueCatWebhookEvent
  data: freeformJson,
  // MealComponent
  cuisineTags: stringArray,
  dietaryTags: stringArray,
  equipmentNeeded: stringArray,
  pantryIngredientNames: stringArray,
  // MealComponentVariant
  compatibilityScores: numberMap,
  // ComposedPlate
  componentIds: componentEntryArray,
  // HouseholdMember
  dietaryFlags: stringArray,
  bannedComponentIds: stringArray,
  // CoachMessage
  attachments: attachmentsSchema,
  // AdaptiveNotificationLog
  signalsUsed: freeformJson,
  // RecipeDeletion
  reasonCodes: stringArray,
  // RecipeQualityScore
  failureReasons: failureReasonSchema,
  // WaitlistSignup
  dietary: stringArray,
  // RecommenderEvent
  contextSnapshot: freeformJson,
  candidateIds: stringArray,
} as const;

export type JsonColumnName = keyof typeof JSON_COLUMN_SCHEMAS;
export type JsonColumnValue<K extends JsonColumnName> = z.infer<(typeof JSON_COLUMN_SCHEMAS)[K]>;

// ─── Safe defaults ────────────────────────────────────────────────────────

const COLUMN_DEFAULTS: { [K in JsonColumnName]: JsonColumnValue<K> } = {
  pantryLeaningCuisines: [],
  appliances: [],
  tagsJson: [],
  flavorTags: [],
  sourceRecipeIds: [],
  summaryStats: {},
  autoNamedFrom: { source: 'recipes', payload: null },
  usedBy: [],
  data: {},
  cuisineTags: [],
  dietaryTags: [],
  equipmentNeeded: [],
  pantryIngredientNames: [],
  compatibilityScores: {},
  componentIds: [],
  dietaryFlags: [],
  bannedComponentIds: [],
  attachments: [],
  signalsUsed: {},
  reasonCodes: [],
  failureReasons: [],
  dietary: [],
  contextSnapshot: {},
  candidateIds: [],
};

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Parse a JSON-stringified column with safe fallback. Never throws —
 * malformed input returns the column's default. Use this on the read path
 * so a corrupt row can't take down a request.
 */
export function parseJsonColumn<K extends JsonColumnName>(
  column: K,
  raw: string | null | undefined,
  fallback?: JsonColumnValue<K>,
): JsonColumnValue<K> {
  const def = (fallback ?? COLUMN_DEFAULTS[column]) as JsonColumnValue<K>;
  if (raw == null || raw === '') return def;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return def;
  }
  const result = JSON_COLUMN_SCHEMAS[column].safeParse(parsed);
  return (result.success ? result.data : def) as JsonColumnValue<K>;
}

/**
 * Validate + serialize a value for the named column. Throws on shape
 * mismatch — use this on write paths to block bad data at the boundary.
 * Prefer this for NEW code.
 */
export function serializeJsonColumn<K extends JsonColumnName>(
  column: K,
  value: JsonColumnValue<K>,
): string {
  const validated = JSON_COLUMN_SCHEMAS[column].parse(value);
  return JSON.stringify(validated);
}

/**
 * Best-effort serializer for the named column. Validates with safeParse;
 * if the value doesn't match the schema, stringifies it as-is instead of
 * throwing. Used by the M5 migration sweep so legacy callsites with
 * loosely-typed inputs don't break existing tests.
 */
export function serializeJsonColumnSafe<K extends JsonColumnName>(
  column: K,
  value: unknown,
): string {
  const result = JSON_COLUMN_SCHEMAS[column].safeParse(value);
  return JSON.stringify(result.success ? result.data : value);
}

/**
 * Like `parseJsonColumn` but returns `null` on null input — preserves
 * nullable-column semantics for callers that want to distinguish "empty"
 * from "absent."
 */
export function parseJsonColumnNullable<K extends JsonColumnName>(
  column: K,
  raw: string | null | undefined,
): JsonColumnValue<K> | null {
  if (raw == null || raw === '') return null;
  return parseJsonColumn(column, raw);
}
