// ROADMAP 4.0 IG0.2 — Ingredient event stream.
//
// Single append-only log of pantry / shopping / cooking ingredient events.
// Replaces the implicit "infer from `PurchaseHistory.lastPurchasedAt`" approach
// and powers IG2 (co-purchase), IG3 (depletion cadence), IG6 (swap learning),
// IG9 (logging + counterfactual).
//
// Ingredient names are normalized at write time (canonical form) so downstream
// aggregations don't double-count "Cilantro" vs "cilantro".

import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { normalizeIngredientName } from '../utils/ingredientNormalizer';

export type IngredientEventType =
  | 'addedToPantry'
  | 'addedToShoppingList'
  | 'purchased'
  | 'consumed'
  | 'expired'
  | 'swappedIn'
  | 'swappedOut'
  | 'removedManually';

const KNOWN_TYPES: ReadonlySet<IngredientEventType> = new Set([
  'addedToPantry',
  'addedToShoppingList',
  'purchased',
  'consumed',
  'expired',
  'swappedIn',
  'swappedOut',
  'removedManually',
]);

const PII_FIELD_KEYS = new Set([
  'note',
  'notes',
  'searchQuery',
  'cravingQuery',
  'message',
]);

export interface IngredientEventInput {
  userId: string;
  ingredientName: string;
  eventType: IngredientEventType;
  quantity?: number | null;
  unit?: string | null;
  recipeId?: string | null;
  /** For swappedIn/Out events: the partner ingredient name. */
  swapTargetName?: string | null;
  occurredAt?: Date;
}

function validate(input: IngredientEventInput): void {
  if (!input.userId) throw new Error('record: userId required');
  if (!input.ingredientName) throw new Error('record: ingredientName required');
  if (!KNOWN_TYPES.has(input.eventType)) {
    throw new Error(`record: unknown eventType "${input.eventType}"`);
  }
  // PII guard: reject any keys that look like free-text fields. Future
  // additions to the input shape go through this guard.
  for (const k of Object.keys(input)) {
    if (PII_FIELD_KEYS.has(k)) {
      throw new Error(`record: PII-shaped field "${k}" is rejected`);
    }
  }
}

function toData(input: IngredientEventInput): Record<string, unknown> {
  return {
    userId: input.userId,
    ingredientName: normalizeIngredientName(input.ingredientName),
    eventType: input.eventType,
    quantity: input.quantity ?? null,
    unit: input.unit ?? null,
    recipeId: input.recipeId ?? null,
    swapTargetName: input.swapTargetName
      ? normalizeIngredientName(input.swapTargetName)
      : null,
    occurredAt: input.occurredAt ?? new Date(),
  };
}

/** Persist a single ingredient event. Returns the row id, or null on failure. */
export async function record(
  input: IngredientEventInput,
): Promise<string | null> {
  try {
    validate(input);
  } catch (err) {
    logger.warn(
      { err, eventType: input.eventType },
      'IG0.2 record rejected — invalid input',
    );
    throw err;
  }
  try {
    const row = (await (prisma as any).ingredientEvent.create({
      data: toData(input),
    })) as { id: string };
    return row.id;
  } catch (err) {
    logger.warn({ err, userId: input.userId }, 'IG0.2 record persist failed');
    return null;
  }
}

/**
 * Persist multiple events in a single transaction. All-or-nothing — any
 * validation failure rejects the whole batch (no partial writes).
 */
export async function recordMany(
  inputs: IngredientEventInput[],
): Promise<number> {
  if (inputs.length === 0) return 0;
  for (const input of inputs) validate(input);
  try {
    const result = (await (prisma as any).ingredientEvent.createMany({
      data: inputs.map(toData),
    })) as { count: number };
    return result.count;
  } catch (err) {
    logger.warn(
      { err, batchSize: inputs.length },
      'IG0.2 recordMany persist failed',
    );
    return 0;
  }
}

export interface GetEventsForUserInput {
  userId: string;
  /** Earliest event to include. Defaults to "no lower bound". */
  since?: Date;
  /** Restrict to a subset of event types. */
  types?: IngredientEventType[];
  /** Cap the result count. */
  limit?: number;
}

export interface IngredientEventRow {
  id: string;
  userId: string;
  ingredientName: string;
  eventType: IngredientEventType;
  quantity: number | null;
  unit: string | null;
  recipeId: string | null;
  swapTargetName: string | null;
  occurredAt: Date;
}

/**
 * Query the event stream for a user. Ordered by `occurredAt` DESC so the
 * caller can stream most-recent-first.
 */
export async function getEventsForUser(
  input: GetEventsForUserInput,
): Promise<IngredientEventRow[]> {
  if (!input.userId) return [];
  const where: Record<string, unknown> = { userId: input.userId };
  if (input.since) where.occurredAt = { gte: input.since };
  if (input.types && input.types.length > 0) {
    where.eventType = { in: input.types };
  }
  const rows = (await (prisma as any).ingredientEvent.findMany({
    where,
    orderBy: { occurredAt: 'desc' },
    ...(input.limit ? { take: input.limit } : {}),
  })) as IngredientEventRow[];
  return rows;
}
