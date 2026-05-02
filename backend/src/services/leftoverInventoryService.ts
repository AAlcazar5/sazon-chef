// backend/src/services/leftoverInventoryService.ts
// Group 10X Phase 6 — leftover continuity service.
//
// Persists leftover components after a user marks a plate "cooked", surfaces
// them on the next composer open, and decrements quantity when a plate
// containing leftovers is cooked again.

import { prisma } from '../lib/prisma';

export type ComponentSlot = 'protein' | 'base' | 'vegetable' | 'sauce' | 'garnish';

export const TTL_DAYS_BY_SLOT: Record<ComponentSlot, number> = {
  protein: 3,
  base: 5,
  vegetable: 3,
  sauce: 7,
  garnish: 2,
};

const DEFAULT_TTL_DAYS = 3;

export interface LeftoverInput {
  componentId: string;
  slot: string;
  portionsRemaining: number;
}

export interface AddLeftoversInput {
  userId: string;
  sourcePlateId: string | null;
  leftovers: LeftoverInput[];
}

export interface DecrementLeftoverInput {
  userId: string;
  componentId: string;
  portionsUsed: number;
}

export interface PlateComponentRef {
  componentId: string;
  portionMultiplier: number;
}

export interface ConsumePlateInput {
  userId: string;
  plateComponents: PlateComponentRef[];
}

const ttlForSlot = (slot: string): number => {
  if (slot in TTL_DAYS_BY_SLOT) return TTL_DAYS_BY_SLOT[slot as ComponentSlot];
  return DEFAULT_TTL_DAYS;
};

const expiresAtFor = (slot: string): Date => {
  const days = ttlForSlot(slot);
  const now = new Date();
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
};

export const addLeftoversFromPlate = async (input: AddLeftoversInput): Promise<void> => {
  const valid = input.leftovers.filter((l) => l.portionsRemaining > 0);
  if (valid.length === 0) return;

  const data = valid.map((l) => ({
    userId: input.userId,
    componentId: l.componentId,
    slot: l.slot,
    portionsRemaining: l.portionsRemaining,
    sourcePlateId: input.sourcePlateId,
    expiresAt: expiresAtFor(l.slot),
  }));

  await (prisma as any).leftoverInventory.createMany({ data });
};

export const getActiveLeftovers = async (userId: string): Promise<unknown[]> => {
  return (prisma as any).leftoverInventory.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
      portionsRemaining: { gt: 0 },
    },
    orderBy: { createdAt: 'desc' },
  });
};

const findActiveLeftover = (userId: string, componentId: string) =>
  (prisma as any).leftoverInventory.findFirst({
    where: {
      userId,
      componentId,
      expiresAt: { gt: new Date() },
      portionsRemaining: { gt: 0 },
    },
  });

export const decrementLeftover = async (input: DecrementLeftoverInput): Promise<void> => {
  const row = await findActiveLeftover(input.userId, input.componentId);
  if (!row) return;

  if (input.portionsUsed >= row.portionsRemaining) {
    await (prisma as any).leftoverInventory.delete({ where: { id: row.id } });
    return;
  }

  await (prisma as any).leftoverInventory.update({
    where: { id: row.id },
    data: { portionsRemaining: row.portionsRemaining - input.portionsUsed },
  });
};

export const consumeLeftoversForPlate = async (input: ConsumePlateInput): Promise<void> => {
  for (const pc of input.plateComponents) {
    await decrementLeftover({
      userId: input.userId,
      componentId: pc.componentId,
      portionsUsed: pc.portionMultiplier,
    });
  }
};

export const purgeExpiredLeftovers = async (userId: string): Promise<number> => {
  const result = await (prisma as any).leftoverInventory.deleteMany({
    where: { userId, expiresAt: { lte: new Date() } },
  });
  return result.count ?? 0;
};
