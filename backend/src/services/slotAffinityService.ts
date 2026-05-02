// backend/src/services/slotAffinityService.ts
// Group 10X Phase 4 — Slot-level and pair taste affinity learning loop.

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

const upsertSlotAffinity = async (
  userId: string,
  componentId: string,
  slot: string,
  delta: number
): Promise<void> => {
  // Read-then-upsert with the clamp applied in JS so scores stay inside [-2, +2]
  // on every event. Prisma's `{ increment }` shortcut runs in SQL and would let
  // long-tail accumulators drift past the bound.
  const existing = await (prisma as any).slotAffinity.findUnique({
    where: { userId_componentId: { userId, componentId } },
    select: { score: true },
  });
  const nextScore = clamp((existing?.score ?? 0) + delta);
  await (prisma as any).slotAffinity.upsert({
    where: { userId_componentId: { userId, componentId } },
    create: { userId, componentId, slot, score: nextScore, sampleCount: 1 },
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
    await upsertSlotAffinity(event.userId, event.componentId, slot, delta);
    return;
  }

  const { userId, componentIds } = event;
  const slotMap = await resolveSlots(componentIds);

  await Promise.all(
    componentIds.map((cId) =>
      upsertSlotAffinity(userId, cId, slotMap.get(cId) ?? 'unknown', delta)
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

export async function getSlotAffinity(
  userId: string,
  componentId: string
): Promise<{ score: number; sampleCount: number } | null> {
  const row = await (prisma as any).slotAffinity.findFirst({
    where: { userId, componentId },
    select: { score: true, sampleCount: true },
  });
  if (!row) return null;
  return { score: row.score, sampleCount: row.sampleCount };
}

export async function getTopComponentsForSlot(
  userId: string,
  slot: ComponentSlot,
  limit: number
): Promise<{ componentId: string; score: number }[]> {
  const rows = await (prisma as any).slotAffinity.findMany({
    where: { userId, slot },
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
