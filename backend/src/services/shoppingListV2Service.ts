// ROADMAP 4.0 IG5.1 — Smart shopping-list v2 (3-layer composer).
//
// Replaces the implicit "scan recipes, dump ingredients" path with a
// deliberate 3-layer compose:
//
//   1. Meal-plan ingredients for the upcoming N days, dedup'd + scaled by
//      serving count   (source: 'meal-plan')
//   2. Minus pantry (quantity-aware via IG0.1 PantryItem.quantity / unit)
//   3. Plus IG3.2 running-low suggestions tagged "you might also need"
//      (source: 'cadence')
//
// Pure-ish service: takes the resolved meal-plan recipe ids + day window
// and returns a structured composition. Caller decides whether to persist
// to a ShoppingList or render preview chips.
//
// Cross-tier dovetail: predictRunningLow (IG3.2) handles the cadence
// pulls. PantryItem.quantity feeds the subtraction; null-quantity rows
// fall back to binary "have it / don't" subtraction so legacy rows stay
// valid.

import { prisma } from '../lib/prisma';
import { predictRunningLow } from './ingredientCadenceService';
import { extractIngredientName } from '../utils/ingredientNameExtractor';
import { normalizeIngredientName } from '../utils/ingredientNormalizer';

export type ShoppingItemSource = 'meal-plan' | 'cadence' | 'co-purchase';

export interface ShoppingItemV2 {
  /** Display name (canonical, lowercased + trimmed). */
  name: string;
  /** Aggregated quantity (sum across recipes). null when nothing measurable. */
  quantity: number | null;
  unit: string | null;
  source: ShoppingItemSource;
  /** Ratio overdue (cadence rows only). */
  cadenceRatio?: number;
}

export interface ComposeShoppingListInput {
  userId: string;
  /** Recipe IDs from the user's meal plan for the upcoming N days. */
  mealPlanRecipeIds: string[];
  /** Servings multiplier per recipe (default 1). */
  servingsByRecipe?: Record<string, number>;
  /** Reference time for cadence math. */
  now?: Date;
}

export interface ComposeShoppingListResult {
  /** Items the user needs to buy. */
  items: ShoppingItemV2[];
  /** Pantry items that subtracted from the list (transparency surface). */
  pantryCovered: Array<{ name: string; quantityCovered: number | null; unit: string | null }>;
  /** Running-low cadence suggestions appended to the list. */
  runningLowAppended: ShoppingItemV2[];
  /** Total raw ingredient slots before pantry subtraction (for telemetry). */
  totalRawSlots: number;
}

interface RecipeIngredientRow {
  text: string;
  recipeId: string;
}

interface PantryRow {
  name: string;
  quantity: number | null;
  unit: string | null;
}

interface AggregateSlot {
  name: string;
  quantity: number | null;
  unit: string | null;
  originalTexts: string[];
}

const MAX_RECIPE_IDS = 50;

/** Lazy import — keeps the dependency chain quiet for callers that don't compose. */
async function loadRecipeIngredients(
  userId: string,
  recipeIds: string[],
): Promise<Array<{ id: string; ingredients: Array<{ text: string }> }>> {
  if (recipeIds.length === 0) return [];
  return (await (prisma as any).recipe.findMany({
    where: { id: { in: recipeIds }, userId },
    select: { id: true, ingredients: { select: { text: true } } },
  })) as Array<{ id: string; ingredients: Array<{ text: string }> }>;
}

async function loadPantry(userId: string): Promise<PantryRow[]> {
  return (await (prisma as any).pantryItem.findMany({
    where: { userId },
    select: { name: true, quantity: true, unit: true },
  })) as PantryRow[];
}

function aggregateMealPlanSlots(
  rows: RecipeIngredientRow[],
  servingsByRecipe: Record<string, number>,
): AggregateSlot[] {
  // Lazy import — `parseIngredientQuantity` is heavy.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const parser = require('../utils/ingredientQuantityParser');
  const slots = new Map<string, AggregateSlot>();
  for (const row of rows) {
    const parsed = parser.parseIngredientQuantity(row.text);
    const multiplier = servingsByRecipe[row.recipeId] ?? 1;
    const name = parsed
      ? extractIngredientName(row.text, parsed.unit)
      : extractIngredientName(row.text, '');
    const canonical = normalizeIngredientName(name || row.text);
    if (!canonical) continue;
    const slot = slots.get(canonical) ?? {
      name: canonical,
      quantity: null,
      unit: null,
      originalTexts: [],
    };
    slot.originalTexts.push(row.text);
    if (parsed && typeof parsed.amount === 'number' && Number.isFinite(parsed.amount)) {
      const scaled = parsed.amount * multiplier;
      if (slot.quantity == null) {
        slot.quantity = scaled;
        slot.unit = parsed.unit ?? slot.unit;
      } else if (slot.unit && parsed.unit && slot.unit === parsed.unit) {
        slot.quantity += scaled;
      } else if (slot.unit == null) {
        slot.quantity = scaled;
        slot.unit = parsed.unit ?? null;
      }
      // Mismatched units → leave at the first parsed slot's quantity. The
      // existing controller uses the same defensive default; quantity-unit
      // unification is a future step.
    }
    slots.set(canonical, slot);
  }
  return [...slots.values()];
}

/**
 * Subtract pantry quantities from a meal-plan slot. Returns the residual
 * slot (or null when fully covered). Quantity-aware when both pantry and
 * slot have matching units; falls back to binary "have it" semantics
 * otherwise (legacy rows without quantity stay valid).
 */
function subtractPantry(
  slot: AggregateSlot,
  pantry: PantryRow[],
): { residual: AggregateSlot | null; covered: PantryRow | null } {
  const match = pantry.find(
    (p) => normalizeIngredientName(p.name) === slot.name,
  );
  if (!match) return { residual: slot, covered: null };
  // Quantity-aware path
  if (
    match.quantity != null &&
    slot.quantity != null &&
    match.unit &&
    slot.unit &&
    match.unit === slot.unit
  ) {
    if (match.quantity >= slot.quantity) {
      return { residual: null, covered: match };
    }
    const remainingQty = slot.quantity - match.quantity;
    return {
      residual: { ...slot, quantity: remainingQty },
      covered: { ...match, quantity: match.quantity },
    };
  }
  // Binary path — pantry has it, drop the slot entirely.
  return { residual: null, covered: match };
}

export async function composeShoppingList(
  input: ComposeShoppingListInput,
): Promise<ComposeShoppingListResult> {
  if (!input.userId) {
    return {
      items: [],
      pantryCovered: [],
      runningLowAppended: [],
      totalRawSlots: 0,
    };
  }
  const recipeIds = input.mealPlanRecipeIds.slice(0, MAX_RECIPE_IDS);
  const servingsByRecipe = input.servingsByRecipe ?? {};
  const now = input.now ?? new Date();

  const [recipes, pantry, runningLow] = await Promise.all([
    loadRecipeIngredients(input.userId, recipeIds),
    loadPantry(input.userId),
    predictRunningLow({ userId: input.userId, asOfDate: now }),
  ]);

  // Layer 1: meal-plan ingredients
  const flatRows: RecipeIngredientRow[] = [];
  for (const r of recipes) {
    for (const ing of r.ingredients) flatRows.push({ text: ing.text, recipeId: r.id });
  }
  const slots = aggregateMealPlanSlots(flatRows, servingsByRecipe);
  const totalRawSlots = slots.length;

  // Layer 2: minus pantry
  const items: ShoppingItemV2[] = [];
  const pantryCovered: ComposeShoppingListResult['pantryCovered'] = [];
  for (const slot of slots) {
    const { residual, covered } = subtractPantry(slot, pantry);
    if (residual) {
      items.push({
        name: residual.name,
        quantity: residual.quantity,
        unit: residual.unit,
        source: 'meal-plan',
      });
    }
    if (covered) {
      pantryCovered.push({
        name: covered.name,
        quantityCovered: covered.quantity,
        unit: covered.unit,
      });
    }
  }

  // Layer 3: cadence suggestions (running-low). Skip names already in items.
  const itemNameSet = new Set(items.map((i) => normalizeIngredientName(i.name)));
  const runningLowAppended: ShoppingItemV2[] = [];
  for (const r of runningLow) {
    const canonical = normalizeIngredientName(r.ingredientName);
    if (itemNameSet.has(canonical)) continue;
    const cadenceItem: ShoppingItemV2 = {
      name: canonical,
      quantity: null,
      unit: null,
      source: 'cadence',
      cadenceRatio: r.ratio,
    };
    runningLowAppended.push(cadenceItem);
    items.push(cadenceItem);
    itemNameSet.add(canonical);
  }

  return { items, pantryCovered, runningLowAppended, totalRawSlots };
}
