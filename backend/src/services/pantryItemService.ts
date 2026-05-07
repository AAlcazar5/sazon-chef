// ROADMAP 4.0 IG0.1 — PantryItem service for the upgraded data model.
//
// New columns: quantity / unit / expiryHint / lastConsumedAt / addedFromRecipeId.
// All nullable so existing rows stay valid. This service exposes the canonical
// add / consume / remove paths so callers don't reach into prisma directly.
//
// Cross-tier dovetail (IG3): cadence model reads `lastConsumedAt`; (IG4):
// use-it-up surface reads `expiryHint + addedAt` to flag expiring items;
// (N2.3): expiringInventoryService prefers `expiryHint` over the category
// heuristic when present.

import { prisma } from '../lib/prisma';
import { normalizeIngredientName } from '../utils/ingredientNormalizer';

/**
 * Days-from-purchase before going bad. Heuristic, not authoritative —
 * sourced from common food-storage references. Per CLAUDE.md voice rules
 * the *surface* never says "expiring soon"; this number is just an input
 * to the use-it-up ranker boost.
 */
export const INGREDIENT_LIFESPAN_DEFAULTS: Record<string, number> = {
  // Fresh produce
  'cilantro': 5,
  'parsley': 5,
  'basil': 4,
  'mint': 5,
  'spinach': 4,
  'arugula': 4,
  'kale': 7,
  'lettuce': 7,
  'tomato': 7,
  'cucumber': 7,
  'bell pepper': 10,
  'avocado': 4,
  'lemon': 21,
  'lime': 21,
  // Dairy
  'milk': 10,
  'yogurt': 14,
  'cheese': 21,
  'cream cheese': 21,
  'butter': 30,
  // Proteins (refrigerated)
  'chicken breast': 4,
  'ground beef': 3,
  'ground turkey': 3,
  'salmon': 2,
  'shrimp': 2,
  'tofu': 7,
  'eggs': 30,
  // Pantry staples (long shelf-life, but track for completeness)
  'rice': 365,
  'pasta': 365,
  'flour': 180,
  'sugar': 365,
  'olive oil': 180,
  'soy sauce': 365,
};

/** Look up the expiry hint for a canonical ingredient name. Returns null when unknown. */
export function lookupExpiryHint(name: string): number | null {
  const canonical = normalizeIngredientName(name);
  return INGREDIENT_LIFESPAN_DEFAULTS[canonical] ?? null;
}

export interface AddPantryItemInput {
  userId: string;
  name: string;
  category?: string | null;
  source?: 'manual' | 'shopping' | 'cooking';
  quantity?: number;
  unit?: string;
  /** Override the auto-resolved expiry hint. */
  expiryHint?: number | null;
  addedFromRecipeId?: string | null;
}

export async function addItem(input: AddPantryItemInput): Promise<unknown> {
  if (!input.userId) throw new Error('addItem: userId required');
  if (!input.name) throw new Error('addItem: name required');

  const expiryHint =
    input.expiryHint !== undefined ? input.expiryHint : lookupExpiryHint(input.name);

  return (prisma as any).pantryItem.upsert({
    where: { userId_name: { userId: input.userId, name: input.name } },
    create: {
      userId: input.userId,
      name: input.name,
      category: input.category ?? null,
      source: input.source ?? 'manual',
      quantity: input.quantity ?? null,
      unit: input.unit ?? null,
      expiryHint,
      addedFromRecipeId: input.addedFromRecipeId ?? null,
    },
    update: {
      // Adding the same item again refreshes the addedAt clock (via updatedAt)
      // but does NOT clear lastConsumedAt or addedFromRecipeId.
      ...(input.quantity != null ? { quantity: input.quantity } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.source !== undefined ? { source: input.source } : {}),
      ...(expiryHint !== undefined ? { expiryHint } : {}),
    },
  });
}

export interface ConsumePantryItemInput {
  id: string;
  amount?: number;
  /** Inject reference time for tests. */
  now?: Date;
}

export async function consumeItem(
  input: ConsumePantryItemInput,
): Promise<unknown> {
  if (!input.id) throw new Error('consumeItem: id required');
  const now = input.now ?? new Date();

  // Read the row to compute the new quantity (decrement when set).
  const current = (await (prisma as any).pantryItem.findUnique({
    where: { id: input.id },
    select: { quantity: true },
  })) as { quantity: number | null } | null;
  if (!current) return null;

  const nextQuantity =
    current.quantity != null && input.amount != null
      ? Math.max(0, current.quantity - input.amount)
      : current.quantity;

  return (prisma as any).pantryItem.update({
    where: { id: input.id },
    data: {
      quantity: nextQuantity,
      lastConsumedAt: now,
    },
  });
}
