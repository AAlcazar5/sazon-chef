// backend/src/services/plateShareService.ts
// Group 10X Phase 8 — social plate sharing.
//
// Public share links → composer pre-fill in another user's app, with their
// pantry/dietary applied to suggest substitutions. Plate of the week =
// most-saved plate in the rolling 7-day window.

import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma';

const SLUG_ADJECTIVES = ['cozy', 'bright', 'smoky', 'spicy', 'fresh', 'crisp', 'silky', 'hearty'];
const SLUG_NOUNS = ['salmon', 'tomato', 'farro', 'tahini', 'broccoli', 'lemon', 'pepper', 'thyme'];

const generateSlug = (): string => {
  const adj = SLUG_ADJECTIVES[Math.floor(Math.random() * SLUG_ADJECTIVES.length)];
  const noun = SLUG_NOUNS[Math.floor(Math.random() * SLUG_NOUNS.length)];
  const hash = randomBytes(2).toString('hex');
  return `${adj}-${noun}-${hash}`;
};

export interface CreateShareInput {
  userId: string;
  plateId: string;
}

export interface ShareLink {
  id: string;
  slug: string;
  plateId: string;
}

export const createShareLink = async (input: CreateShareInput): Promise<ShareLink> => {
  const plate = await (prisma as any).composedPlate.findUnique({
    where: { id: input.plateId },
  });
  if (!plate) throw new Error('Plate not found');
  if (plate.userId !== input.userId) throw new Error('Plate not found or forbidden');

  const existing = await (prisma as any).plateShare.findFirst({
    where: { plateId: input.plateId, createdBy: input.userId },
  });
  if (existing) {
    return { id: existing.id, slug: existing.slug, plateId: existing.plateId };
  }

  const slug = generateSlug();
  const created = await (prisma as any).plateShare.create({
    data: { slug, plateId: input.plateId, createdBy: input.userId },
  });
  return { id: created.id, slug: created.slug, plateId: created.plateId };
};

export interface SlugLookupResult {
  id: string;
  slug: string;
  plate: unknown;
}

export const getPlateBySlug = async (slug: string): Promise<SlugLookupResult | null> => {
  const row = await (prisma as any).plateShare.findUnique({
    where: { slug },
    include: { plate: true },
  });
  if (!row) return null;
  return { id: row.id, slug: row.slug, plate: row.plate };
};

export interface SourceComponent {
  slot: 'protein' | 'base' | 'vegetable' | 'sauce' | 'garnish';
  componentId: string;
  portionMultiplier: number;
}

export interface AdaptedComponent extends SourceComponent {
  needsSubstitution: boolean;
  banned: boolean;
}

export const adaptComponentsToUser = (
  sourceComponents: SourceComponent[],
  userPantryComponentIds: Set<string>,
  userBannedIds: Set<string>
): AdaptedComponent[] => {
  return sourceComponents.map((c) => ({
    ...c,
    needsSubstitution: !userPantryComponentIds.has(c.componentId),
    banned: userBannedIds.has(c.componentId),
  }));
};

export interface PlateOfTheWeek {
  plate: { id: string; userId: string; componentIds: string };
  saveCount: number;
}

export const getPlateOfTheWeek = async (): Promise<PlateOfTheWeek | null> => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const groups = await (prisma as any).plateSave.groupBy({
    by: ['plateId'],
    where: { createdAt: { gt: sevenDaysAgo } },
    _count: { plateId: true },
    orderBy: { _count: { plateId: 'desc' } },
    take: 1,
  });
  if (!groups || groups.length === 0) return null;
  const top = groups[0];
  const plate = await (prisma as any).composedPlate.findUnique({
    where: { id: top.plateId },
  });
  if (!plate) return null;
  return { plate, saveCount: top._count.plateId };
};

export interface SavePlateInput {
  userId: string;
  plateId: string;
}

export const savePlateForUser = async (input: SavePlateInput): Promise<void> => {
  await (prisma as any).plateSave.upsert({
    where: { userId_plateId: { userId: input.userId, plateId: input.plateId } },
    update: {},
    create: { userId: input.userId, plateId: input.plateId },
  });
};
