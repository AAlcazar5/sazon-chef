// ROADMAP 4.0 IG10.1 — Pantry IQ aggregator.
//
// "Your pantry leans Mediterranean — 4 cooks/week from this shelf."
// "Most-used this month: lemon (8 cooks)."
// "Underused: chickpeas — last cooked 23 days ago."
//
// Driven by:
//   - CookingLog last 30d → dominant cuisine ("lean")
//   - IngredientEvent (eventType: 'consumed') last 30d → most-used + frequency
//   - PantryItem rows with no consumed signal in 14+d → underused
//
// Lifestyle voice — copy generation lives in `sazonVoiceService` (N3.2).
// This service emits structured signals; frontend renders via the shared
// `<EngineVisibilityCard>` shell (N4.3).
//
// Cold-start: returns `null` when the user has too little signal. Caller
// should also gate via N2.1 `coldStartCoordinator` for surface visibility.

import { prisma } from '../lib/prisma';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30;
const UNDERUSED_DAYS = 14;
const MIN_COOK_COUNT = 5; // cold-start floor (per N2.1 cookBased thresholds)
const MIN_DOMINANT_RATIO = 0.4; // top cuisine must be ≥ 40% of cooks

export interface PantryIQTopCuisine {
  cuisine: string;
  cookCount: number;
  /** Approximate cooks per week (over the 30d window). */
  perWeek: number;
}

export interface PantryIQMostUsed {
  ingredientName: string;
  cookCount: number;
}

export interface PantryIQUnderused {
  ingredientName: string;
  daysSinceLastUse: number;
}

export interface PantryIQ {
  topCuisine: PantryIQTopCuisine | null;
  mostUsed: PantryIQMostUsed | null;
  underused: PantryIQUnderused | null;
  totalCooksInWindow: number;
}

export interface ComputePantryIQInput {
  userId: string;
  /** Reference time. Defaults to `new Date()`. */
  now?: Date;
}

interface CookRow {
  recipe: { cuisine: string | null } | null;
}

interface ConsumedEventRow {
  ingredientName: string;
  occurredAt: Date;
}

interface PantryItemLite {
  name: string;
  createdAt: Date;
  lastConsumedAt: Date | null;
}

function pickDominantCuisine(
  cooks: CookRow[],
): PantryIQTopCuisine | null {
  if (cooks.length < MIN_COOK_COUNT) return null;
  const counts = new Map<string, number>();
  let total = 0;
  for (const c of cooks) {
    const cuisine = c.recipe?.cuisine?.trim();
    if (!cuisine) continue;
    counts.set(cuisine, (counts.get(cuisine) ?? 0) + 1);
    total += 1;
  }
  if (total === 0) return null;
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return null;
  // Tie at the top → return null (no card per spec).
  if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) return null;
  const [cuisine, cookCount] = sorted[0];
  if (cookCount / total < MIN_DOMINANT_RATIO) return null;
  return {
    cuisine,
    cookCount,
    perWeek: Math.round((cookCount / WINDOW_DAYS) * 7 * 10) / 10,
  };
}

function pickMostUsed(
  events: ConsumedEventRow[],
): PantryIQMostUsed | null {
  if (events.length === 0) return null;
  const counts = new Map<string, number>();
  for (const e of events) {
    counts.set(e.ingredientName, (counts.get(e.ingredientName) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  // Tie at the top → return null (no card per spec).
  if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) return null;
  const [ingredientName, cookCount] = sorted[0];
  return { ingredientName, cookCount };
}

function pickUnderused(
  pantry: PantryItemLite[],
  consumedEvents: ConsumedEventRow[],
  now: Date,
): PantryIQUnderused | null {
  if (pantry.length === 0) return null;
  const lastConsumed = new Map<string, Date>();
  for (const e of consumedEvents) {
    const prev = lastConsumed.get(e.ingredientName);
    if (!prev || e.occurredAt > prev) lastConsumed.set(e.ingredientName, e.occurredAt);
  }
  let mostUnderused: { name: string; days: number } | null = null;
  for (const p of pantry) {
    const lastFromEvents = lastConsumed.get(p.name);
    const lastFromColumn = p.lastConsumedAt;
    const lastUsed = [lastFromEvents, lastFromColumn]
      .filter((d): d is Date => d instanceof Date)
      .reduce<Date | null>(
        (acc, d) => (acc == null || d > acc ? d : acc),
        null,
      );
    const referenceDate = lastUsed ?? p.createdAt;
    const days = Math.floor((now.getTime() - referenceDate.getTime()) / MS_PER_DAY);
    if (days < UNDERUSED_DAYS) continue;
    if (!mostUnderused || days > mostUnderused.days) {
      mostUnderused = { name: p.name, days };
    }
  }
  if (!mostUnderused) return null;
  return {
    ingredientName: mostUnderused.name,
    daysSinceLastUse: mostUnderused.days,
  };
}

export async function computePantryIQ(
  input: ComputePantryIQInput,
): Promise<PantryIQ | null> {
  if (!input.userId) return null;
  const now = input.now ?? new Date();
  const since = new Date(now.getTime() - WINDOW_DAYS * MS_PER_DAY);

  const [cooks, consumedEvents, pantry] = await Promise.all([
    (prisma as any).cookingLog.findMany({
      where: { userId: input.userId, cookedAt: { gte: since } },
      include: { recipe: { select: { cuisine: true } } },
    }) as Promise<CookRow[]>,
    (prisma as any).ingredientEvent.findMany({
      where: {
        userId: input.userId,
        eventType: 'consumed',
        occurredAt: { gte: since },
      },
      select: { ingredientName: true, occurredAt: true },
    }) as Promise<ConsumedEventRow[]>,
    (prisma as any).pantryItem.findMany({
      where: { userId: input.userId },
      select: { name: true, createdAt: true, lastConsumedAt: true },
    }) as Promise<PantryItemLite[]>,
  ]);

  if (cooks.length < MIN_COOK_COUNT) {
    // Cold-start — caller should hide the card via N2.1 anyway. Return null
    // here too so a misconfigured caller still sees graceful degradation.
    return null;
  }

  return {
    topCuisine: pickDominantCuisine(cooks),
    mostUsed: pickMostUsed(consumedEvents),
    underused: pickUnderused(pantry, consumedEvents, now),
    totalCooksInWindow: cooks.length,
  };
}

export const __INTERNALS = {
  WINDOW_DAYS,
  UNDERUSED_DAYS,
  MIN_COOK_COUNT,
  MIN_DOMINANT_RATIO,
};
