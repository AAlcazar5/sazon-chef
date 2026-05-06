// backend/src/services/composedPlateService.ts
// ROADMAP 4.0 Tier J17.2 — "A few small things" plate archetype.
//
// Generates a ComposedPlate using the `few_small_things` archetype: 4–6
// small components instead of the standard 3-slot composition. Surfaced
// as a STYLE — izakaya / mezze / banchan / antipasti — never a health
// pitch.
//
// Falls back to a 3-slot standard plate when the catalog has insufficient
// component variety (<4 unique slot types available to the user).
//
// Persona discipline: copy lives on the frontend; this service emits
// no user-visible strings beyond the plate `name` (which is composed
// from component names, not health framing).

import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';

export type PlateArchetype = 'few_small_things' | 'standard';

const FEW_SMALL_THINGS_MIN_SLOTS = 4;
const FEW_SMALL_THINGS_MAX_SLOTS = 6;
const STANDARD_SLOT_COUNT = 3;
const SLOT_PRIORITY = ['protein', 'base', 'vegetable', 'sauce', 'garnish'] as const;

export interface GenerateFewSmallThingsInput {
  userId: string;
  /** Optional override for the archetype tag — defaults to 'few_small_things'. */
  archetype?: PlateArchetype;
}

export interface PlateComponentSelection {
  slot: string;
  componentId: string;
  portionMultiplier: number;
}

export interface FewSmallThingsResult {
  /** Created ComposedPlate row (or null when no components were available). */
  plate: Record<string, unknown> | null;
  /** Resolved archetype — falls back to 'standard' when variety is too thin. */
  archetype: PlateArchetype;
  /** Selected components in slot order. */
  components: PlateComponentSelection[];
}

interface ComponentRow {
  id: string;
  slot: string;
  name: string;
  caloriesPerPortion: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  estimatedCostPerPortion: number | null;
  pantryIngredientNames: string;
}

const safeJsonArray = (raw: string | null | undefined): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

/**
 * Pick up to `cap` components, prioritising slot diversity (one of every
 * available slot first), then filling additional small components from the
 * remaining catalog.
 */
function selectFewSmallThingsComponents(
  rows: ComponentRow[],
  cap: number,
): ComponentRow[] {
  const bySlot = new Map<string, ComponentRow[]>();
  for (const row of rows) {
    if (!bySlot.has(row.slot)) bySlot.set(row.slot, []);
    bySlot.get(row.slot)!.push(row);
  }

  const picked: ComponentRow[] = [];
  // Pass 1: one component per slot in priority order.
  for (const slot of SLOT_PRIORITY) {
    if (picked.length >= cap) break;
    const candidates = bySlot.get(slot);
    if (candidates && candidates.length > 0) {
      picked.push(candidates[0]);
    }
  }
  // Pass 2: pad remaining slots not in the priority list (custom slots).
  for (const [slot, candidates] of bySlot.entries()) {
    if (picked.length >= cap) break;
    if ((SLOT_PRIORITY as readonly string[]).includes(slot)) continue;
    if (candidates.length > 0) picked.push(candidates[0]);
  }
  // Pass 3: fill remaining capacity with second components from the most
  // populous slots — keeps the archetype's "small things" texture.
  if (picked.length < cap) {
    const pool: ComponentRow[] = [];
    for (const list of bySlot.values()) {
      pool.push(...list.slice(1));
    }
    for (const row of pool) {
      if (picked.length >= cap) break;
      picked.push(row);
    }
  }

  return picked;
}

function selectStandardComponents(rows: ComponentRow[]): ComponentRow[] {
  return selectFewSmallThingsComponents(rows, STANDARD_SLOT_COUNT);
}

function generatePlateName(rows: ComponentRow[]): string {
  if (rows.length === 0) return 'A small plate';
  return rows.map((r) => r.name).join(' + ');
}

export async function generateFewSmallThingsPlate(
  input: GenerateFewSmallThingsInput,
): Promise<FewSmallThingsResult> {
  if (!input.userId) {
    throw new Error('userId is required');
  }

  const rows = (await prisma.mealComponent.findMany({
    where: { OR: [{ userId: null }, { userId: input.userId }] },
  })) as unknown as ComponentRow[];

  if (rows.length === 0) {
    return { plate: null, archetype: 'standard', components: [] };
  }

  const distinctSlots = new Set(rows.map((r) => r.slot));
  const meetsVarietyFloor = distinctSlots.size >= FEW_SMALL_THINGS_MIN_SLOTS;

  const archetype: PlateArchetype = meetsVarietyFloor ? 'few_small_things' : 'standard';

  const cap = meetsVarietyFloor ? FEW_SMALL_THINGS_MAX_SLOTS : STANDARD_SLOT_COUNT;
  const picked = meetsVarietyFloor
    ? selectFewSmallThingsComponents(rows, cap)
    : selectStandardComponents(rows);

  const components: PlateComponentSelection[] = picked.map((r) => ({
    slot: r.slot,
    componentId: r.id,
    portionMultiplier: 1,
  }));

  const totals = picked.reduce(
    (acc, r) => ({
      cal: acc.cal + r.caloriesPerPortion,
      protein: acc.protein + r.proteinG,
      carbs: acc.carbs + r.carbsG,
      fat: acc.fat + r.fatG,
      cost: acc.cost + (r.estimatedCostPerPortion ?? 0),
    }),
    { cal: 0, protein: 0, carbs: 0, fat: 0, cost: 0 },
  );

  // Pantry coverage — best-effort, defaults to 0 on failure.
  let pantryCoverage = 0;
  try {
    const pantryItems = (await prisma.pantryItem.findMany({
      where: { userId: input.userId },
    })) as unknown as Array<{ name: string }>;
    const pantrySet = new Set(pantryItems.map((p) => p.name.trim().toLowerCase()));
    const allIngredients = picked.flatMap((r) => safeJsonArray(r.pantryIngredientNames));
    if (allIngredients.length > 0) {
      const matches = allIngredients.filter((i) =>
        pantrySet.has(i.trim().toLowerCase()),
      ).length;
      pantryCoverage = Math.round((matches / allIngredients.length) * 1000) / 10;
    }
  } catch (err: unknown) {
    logger.warn(
      { err },
      '[composedPlateService] pantry coverage failed (non-fatal)',
    );
  }

  const plate = await (prisma as unknown as {
    composedPlate: {
      create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
    };
  }).composedPlate.create({
    data: {
      userId: input.userId,
      name: generatePlateName(picked),
      componentIds: JSON.stringify(components),
      totalCalories: totals.cal,
      totalProtein: totals.protein,
      totalCarbs: totals.carbs,
      totalFat: totals.fat,
      totalCost: totals.cost,
      pantryCoveragePercent: pantryCoverage,
      archetype,
    },
  });

  return { plate, archetype, components };
}
