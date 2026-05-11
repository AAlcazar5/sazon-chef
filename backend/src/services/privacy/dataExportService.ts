// backend/src/services/privacy/dataExportService.ts
// Tier Q10 — GDPR/CCPA data-export service.
//
// Enumerates every model in `prisma/schema.prisma` that carries a `userId`
// field, fetches the caller's rows, and returns a structured JSON
// envelope ready to ship as a download or attach to an email.
//
// Coverage contract: the EXPORTED_MODELS allowlist below MUST match the
// schema. The paired static test
// (`backend/__tests__/quality/privacyCompliance.test.ts`) parses the
// schema and asserts every userId-bearing model is present here. Adding
// a new userId model to the schema without updating this list will fail
// CI — exactly the behavior GDPR compliance needs.

import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';

/**
 * Every Prisma model that carries `userId String` (or `userId String?` for
 * Recipe). Schema audit 2026-05-10 → 60 models.
 *
 * If a new userId-bearing model lands in `prisma/schema.prisma`, the
 * paired privacyCompliance.test.ts will fail until it's added here.
 */
export const EXPORTED_MODELS = [
  'AdaptiveNotificationLog',
  'CancellationSurvey',
  'CoachConversation',
  'CoachMemory',
  'CoachMessage',
  'Collection',
  'ComposedFamilyMeal',
  'ComposedPlate',
  'CookingLog',
  'CravingSearchEvent',
  'DailyCheckIn',
  'DailyNutrientSnapshot',
  'HealthIntegration',
  'HouseholdMember',
  'IngredientCadence',
  'IngredientCoOccurrence',
  'IngredientCost',
  'IngredientEvent',
  'IngredientRecommenderDaily',
  'LeftoverInventory',
  'LocalCurationTask',
  'MacroGoals',
  'MealComponent',
  'MealHistory',
  'MealPlan',
  'MealPlanTemplate',
  'MealPrepPortion',
  'MealPrepSession',
  'MealPrepTemplate',
  'MergeDismissal',
  'MissingIngredient',
  'NotificationSettings',
  'NutritionCoverageSnapshot',
  'PairAffinity',
  'PantryItem',
  'PlateSave',
  'ProfilePreset',
  'PurchaseHistory',
  'PushToken',
  'Recipe',
  'RecipeFeedback',
  'RecipeView',
  'RecommenderEvent',
  'RecurringMeal',
  'RefreshToken',
  'RevenueCatWebhookEvent',
  'SavedRecipe',
  'SearchQuery',
  'ShoppingAppIntegration',
  'ShoppingList',
  'SlotAffinity',
  'StripeWebhookEvent',
  'SurfaceEvent',
  'TravelJournalEntry',
  'UserCuisineAdjacencyWeight',
  'UserPhysicalProfile',
  'UserPreferences',
  'UserSignalSnapshot',
  'WeightGoal',
  'WeightLog',
] as const;

export type ExportedModel = (typeof EXPORTED_MODELS)[number];

/**
 * Models that legitimately do NOT carry user data we'd return on export.
 * Documented here so the schema-coverage test can subtract them rather
 * than failing on unrelated tables.
 *
 * Why excluded:
 *   - PrismaMigrations: framework table
 *   - HealthMetric: aggregate table, no userId column
 */
export const EXPORT_EXCLUDED_MODELS = new Set<string>([]);

export interface DataExportResult {
  userId: string;
  exportedAt: string;
  models: Record<string, unknown[]>;
  /** Models that produced zero rows for this user (kept for completeness). */
  emptyModels: string[];
  /** Models that threw on findMany — listed for debugging, not fatal. */
  failedModels: Array<{ model: string; reason: string }>;
}

export interface DataExportOptions {
  /** Inject prisma for tests. Defaults to the shared client. */
  client?: typeof prisma;
}

/**
 * Walk every EXPORTED_MODELS entry and fetch the caller's rows. Returns
 * a structured envelope. Models with no Prisma delegate (case mismatch,
 * removed but allowlist not updated) are flagged in `failedModels` rather
 * than throwing — the export should always produce SOMETHING the user
 * can read.
 */
export async function exportUserData(
  userId: string,
  options: DataExportOptions = {},
): Promise<DataExportResult> {
  if (!userId) {
    throw new Error('exportUserData requires a userId');
  }
  const client = options.client ?? prisma;
  const models: Record<string, unknown[]> = {};
  const emptyModels: string[] = [];
  const failedModels: Array<{ model: string; reason: string }> = [];

  for (const modelName of EXPORTED_MODELS) {
    // Prisma client delegates use camelCase: User → user, MealHistory → mealHistory.
    const delegateName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const delegate = (client as Record<string, any>)[delegateName];
    if (!delegate || typeof delegate.findMany !== 'function') {
      failedModels.push({ model: modelName, reason: 'no-delegate' });
      continue;
    }
    try {
      const rows = await delegate.findMany({ where: { userId }, take: 10_000 });
      if (Array.isArray(rows) && rows.length > 0) {
        models[modelName] = rows;
      } else {
        emptyModels.push(modelName);
      }
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : 'unknown';
      failedModels.push({ model: modelName, reason });
      logger.warn({ err, modelName, userId }, 'privacy.export.modelFailed');
    }
  }

  // Also fetch the User row itself (canonical profile data).
  try {
    const user = await (client as any).user.findUnique({ where: { id: userId } });
    if (user) {
      models['User'] = [user];
    }
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : 'unknown';
    failedModels.push({ model: 'User', reason });
  }

  return {
    userId,
    exportedAt: new Date().toISOString(),
    models,
    emptyModels,
    failedModels,
  };
}

/**
 * Summary stats for the audit log — counts only, no row content.
 */
export function summarizeExport(result: DataExportResult): {
  totalRows: number;
  modelsWithData: number;
  modelsEmpty: number;
  modelsFailed: number;
} {
  let totalRows = 0;
  for (const arr of Object.values(result.models)) {
    if (Array.isArray(arr)) totalRows += arr.length;
  }
  return {
    totalRows,
    modelsWithData: Object.keys(result.models).length,
    modelsEmpty: result.emptyModels.length,
    modelsFailed: result.failedModels.length,
  };
}
