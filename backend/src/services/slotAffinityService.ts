// backend/src/services/slotAffinityService.ts
// Group 10X Phase 4 — Slot-level and pair taste affinity learning loop.
// Phase 7+ — optional householdMemberId narrows affinity to *this* kid/adult,
// so the kid plate adapts to *this* kid's accepted components, not a generic
// kid template (N=1 north star).

import { prisma } from '../lib/prisma';
import type { ComponentSlot } from './mealComponentService';

export type AffinityEvent =
  | { type: 'plate_saved'; userId: string; componentIds: string[] }
  | { type: 'plate_cooked'; userId: string; componentIds: string[] }
  | { type: 'plate_rated'; userId: string; componentIds: string[]; stars: 1 | 2 | 3 | 4 | 5 }
  | { type: 'swap_away'; userId: string; componentId: string };

const SCORE_MIN = -2;
const SCORE_MAX = 2;

const clamp = (v: number): number => Math.max(SCORE_MIN, Math.min(SCORE_MAX, v));

const deltaForEvent = (event: AffinityEvent): number | null => {
  switch (event.type) {
    case 'plate_saved': return 0.1;
    case 'plate_cooked': return 0.2;
    case 'plate_rated': {
      if (event.stars >= 4) return 0.3;
      if (event.stars <= 2) return -0.4;
      return null; // 3★ — neutral, no update
    }
    case 'swap_away': return -0.05;
  }
};

export interface RecordSlotAffinityInput {
  userId: string;
  componentId: string;
  slot: string;
  delta: number;
  householdMemberId?: string | null;
}

// Low-level upsert keyed on (userId, householdMemberId, componentId).
// householdMemberId === null means "the account holder's own affinity" — the
// row used by every existing user-level read path. A non-null memberId scopes
// the row to *this* kid/adult so family-meal cooks don't bleed across rosters.
export const recordSlotAffinity = async (input: RecordSlotAffinityInput): Promise<void> => {
  const { userId, componentId, slot, delta } = input;
  const householdMemberId = input.householdMemberId ?? null;

  // Read-then-upsert with the clamp applied in JS so scores stay inside [-2, +2]
  // on every event. Prisma's `{ increment }` shortcut runs in SQL and would let
  // long-tail accumulators drift past the bound.
  const existing = await (prisma as any).slotAffinity.findUnique({
    where: { userId_householdMemberId_componentId: { userId, householdMemberId, componentId } },
    select: { score: true },
  });
  const nextScore = clamp((existing?.score ?? 0) + delta);
  await (prisma as any).slotAffinity.upsert({
    where: { userId_householdMemberId_componentId: { userId, householdMemberId, componentId } },
    create: { userId, householdMemberId, componentId, slot, score: nextScore, sampleCount: 1 },
    update: {
      score: nextScore,
      sampleCount: { increment: 1 },
    },
  });
};

const upsertPairAffinity = async (
  userId: string,
  idA: string,
  idB: string,
  delta: number
): Promise<void> => {
  const [componentIdA, componentIdB] = [idA, idB].sort();
  const existing = await (prisma as any).pairAffinity.findUnique({
    where: { userId_componentIdA_componentIdB: { userId, componentIdA, componentIdB } },
    select: { score: true },
  });
  const nextScore = clamp((existing?.score ?? 0) + delta);
  await (prisma as any).pairAffinity.upsert({
    where: { userId_componentIdA_componentIdB: { userId, componentIdA, componentIdB } },
    create: { userId, componentIdA, componentIdB, score: nextScore, sampleCount: 1 },
    update: {
      score: nextScore,
      sampleCount: { increment: 1 },
    },
  });
};

const resolveSlots = async (
  componentIds: string[]
): Promise<Map<string, string>> => {
  const rows = await (prisma as any).mealComponent.findMany({
    where: { id: { in: componentIds } },
    select: { id: true, slot: true },
  });
  return new Map(rows.map((r: any) => [r.id, r.slot]));
};

export async function recordAffinityEvent(event: AffinityEvent): Promise<void> {
  const delta = deltaForEvent(event);
  if (delta === null) return;

  if (event.type === 'swap_away') {
    const slotMap = await resolveSlots([event.componentId]);
    const slot = slotMap.get(event.componentId) ?? 'unknown';
    await recordSlotAffinity({ userId: event.userId, componentId: event.componentId, slot, delta });
    return;
  }

  const { userId, componentIds } = event;
  const slotMap = await resolveSlots(componentIds);

  await Promise.all(
    componentIds.map((cId) =>
      recordSlotAffinity({ userId, componentId: cId, slot: slotMap.get(cId) ?? 'unknown', delta })
    )
  );

  const pairUpserts: Promise<void>[] = [];
  for (let i = 0; i < componentIds.length; i++) {
    for (let j = i + 1; j < componentIds.length; j++) {
      pairUpserts.push(upsertPairAffinity(userId, componentIds[i], componentIds[j], delta));
    }
  }
  await Promise.all(pairUpserts);
}

// ─── Phase 7+: family-meal cooked → per-member + shared affinity ─────────────

export interface FamilyMealCookedPlate {
  plateId: string;
  componentIds: string[];
  householdMemberId?: string | null;
}

export interface RecordFamilyMealCookedInput {
  userId: string;
  plates: FamilyMealCookedPlate[];
}

const COOK_DELTA = 0.2;

/**
 * Family-meal cook event. For each plate that has a `householdMemberId`, write
 * a per-member SlotAffinity row AND a shared (NULL-keyed) row so the household
 * head's own affinity context still updates. Plates without a memberId only
 * write the shared row.
 */
export async function recordFamilyMealCookedAffinity(
  input: RecordFamilyMealCookedInput,
): Promise<void> {
  const allComponentIds = Array.from(
    new Set(input.plates.flatMap((p) => p.componentIds)),
  );
  if (allComponentIds.length === 0) return;
  const slotMap = await resolveSlots(allComponentIds);

  const writes: Promise<void>[] = [];
  for (const plate of input.plates) {
    for (const componentId of plate.componentIds) {
      const slot = slotMap.get(componentId) ?? 'unknown';
      // Shared (account-level) row — household head's own context still learns.
      writes.push(
        recordSlotAffinity({
          userId: input.userId,
          componentId,
          slot,
          delta: COOK_DELTA,
          householdMemberId: null,
        }),
      );
      // Per-member row — *this* kid/adult's affinity, isolated.
      if (plate.householdMemberId) {
        writes.push(
          recordSlotAffinity({
            userId: input.userId,
            componentId,
            slot,
            delta: COOK_DELTA,
            householdMemberId: plate.householdMemberId,
          }),
        );
      }
    }
  }
  await Promise.all(writes);
}

// ─── Reads ───────────────────────────────────────────────────────────────────

export async function getSlotAffinity(
  userId: string,
  componentId: string,
  householdMemberId: string | null = null,
): Promise<{ score: number; sampleCount: number } | null> {
  const row = await (prisma as any).slotAffinity.findFirst({
    where: { userId, componentId, householdMemberId },
    select: { score: true, sampleCount: true },
  });
  if (!row) return null;
  return { score: row.score, sampleCount: row.sampleCount };
}

export async function getTopComponentsForSlot(
  userId: string,
  slot: ComponentSlot,
  limit: number,
  householdMemberId: string | null = null,
): Promise<{ componentId: string; score: number }[]> {
  const rows = await (prisma as any).slotAffinity.findMany({
    where: { userId, slot, householdMemberId },
    select: { componentId: true, score: true, sampleCount: true },
  });

  return (rows as Array<{ componentId: string; score: number; sampleCount: number }>)
    .filter((r) => r.sampleCount >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ componentId, score }) => ({ componentId, score }));
}

export async function getPairAffinity(
  userId: string,
  componentIdA: string,
  componentIdB: string
): Promise<{ score: number; sampleCount: number } | null> {
  const [a, b] = [componentIdA, componentIdB].sort();
  const row = await (prisma as any).pairAffinity.findFirst({
    where: { userId, componentIdA: a, componentIdB: b },
    select: { score: true, sampleCount: true },
  });
  if (!row) return null;
  return { score: row.score, sampleCount: row.sampleCount };
}
