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
  /** Personalization rationale shown to the user when viewerUserId was provided. */
  reason?: string;
}

interface PlateRanked {
  plate: { id: string; userId: string; componentIds: string };
  saveCount: number;
  pantryMatchPct: number;
  cuisineBonus: number;
  finalScore: number;
}

const TOP_N_CANDIDATES = 10;

/**
 * Plate of the week — N=1 personalization.
 *
 * When `viewerUserId` is provided, the top-N most-saved plates are re-ranked by:
 *   1. Pantry coverage of the viewer's pantry (primary signal)
 *   2. Cuisine preference match against the viewer's likedCuisines
 *   3. Save count (tiebreak — keeps the social signal as a floor)
 *
 * Plates containing components that match the viewer's banned ingredients or
 * conflict with their dietary restrictions are filtered out entirely.
 *
 * When `viewerUserId` is omitted (anonymous home screen), falls back to the
 * generic global most-saved plate.
 */
export const getPlateOfTheWeek = async (
  viewerUserId?: string,
): Promise<PlateOfTheWeek | null> => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const groups = await prisma.plateSave.groupBy({
    by: ['plateId'],
    where: { createdAt: { gt: sevenDaysAgo } },
    _count: { plateId: true },
    orderBy: { _count: { plateId: 'desc' } },
    take: viewerUserId ? TOP_N_CANDIDATES : 1,
  });
  if (!groups || groups.length === 0) return null;

  if (!viewerUserId) {
    const top = groups[0];
    const plate = await prisma.composedPlate.findUnique({ where: { id: top.plateId } });
    if (!plate) return null;
    return { plate, saveCount: top._count.plateId };
  }

  // Personalized ranking — load the candidate plates + viewer profile in parallel.
  const candidateIds = groups.map((g) => g.plateId);
  const [plates, pantryItems, preferences] = await Promise.all([
    prisma.composedPlate.findMany({ where: { id: { in: candidateIds } } }),
    prisma.pantryItem.findMany({ where: { userId: viewerUserId } }),
    prisma.userPreferences.findUnique({
      where: { userId: viewerUserId },
      include: { likedCuisines: true, bannedIngredients: true },
    }),
  ]);
  if (plates.length === 0) return null;

  const pantryNames = pantryItems.map((p) => p.name);
  const likedCuisines = new Set(
    (preferences?.likedCuisines ?? []).map((c) => c.name.toLowerCase()),
  );
  const bannedIngredients = new Set(
    (preferences?.bannedIngredients ?? []).map((b) => b.name.toLowerCase()),
  );

  // Bulk-load every component referenced across the candidate plates so we can
  // compute pantry coverage + ingredient bans in one go.
  const allComponentIds = new Set<string>();
  const platesWithParsedIds = plates.map((plate) => {
    let parsed: Array<{ slot?: string; componentId?: string }> = [];
    try {
      const arr = JSON.parse(plate.componentIds);
      if (Array.isArray(arr)) parsed = arr;
    } catch {
      /* skip plate */
    }
    parsed.forEach((c) => {
      if (typeof c?.componentId === 'string') allComponentIds.add(c.componentId);
    });
    return { plate, parsed };
  });

  const components = await prisma.mealComponent.findMany({
    where: { id: { in: Array.from(allComponentIds) } },
    select: { id: true, pantryIngredientNames: true, cuisineTags: true },
  });
  const compsById = new Map(components.map((c) => [c.id, c]));

  const ranked: PlateRanked[] = [];
  for (const { plate, parsed } of platesWithParsedIds) {
    if (parsed.length === 0) continue;
    const componentIds = parsed
      .map((c) => c.componentId)
      .filter((id): id is string => typeof id === 'string');

    let allIngredients: string[] = [];
    let plateCuisines: string[] = [];
    let banned = false;

    for (const id of componentIds) {
      const comp = compsById.get(id);
      if (!comp) continue;
      let ings: string[] = [];
      let cuis: string[] = [];
      try {
        const arr = JSON.parse(comp.pantryIngredientNames);
        if (Array.isArray(arr)) ings = arr.filter((s): s is string => typeof s === 'string');
      } catch {
        /* skip */
      }
      try {
        const arr = JSON.parse(comp.cuisineTags);
        if (Array.isArray(arr)) cuis = arr.filter((s): s is string => typeof s === 'string');
      } catch {
        /* skip */
      }
      if (ings.some((i) => bannedIngredients.has(i.toLowerCase().trim()))) {
        banned = true;
        break;
      }
      allIngredients = allIngredients.concat(ings);
      plateCuisines = plateCuisines.concat(cuis);
    }
    if (banned) continue;

    const pantryMatchPct = allIngredients.length === 0
      ? 0
      : (allIngredients.filter((i) =>
          pantryNames.some((p) => p.toLowerCase().trim() === i.toLowerCase().trim()),
        ).length / allIngredients.length) * 100;

    const cuisineBonus = plateCuisines.some((c) => likedCuisines.has(c.toLowerCase()))
      ? 15
      : 0;

    const saveCount = groups.find((g) => g.plateId === plate.id)?._count.plateId ?? 0;
    const finalScore = pantryMatchPct + cuisineBonus + Math.min(saveCount, 5);

    ranked.push({ plate, saveCount, pantryMatchPct, cuisineBonus, finalScore });
  }

  if (ranked.length === 0) return null;
  ranked.sort((a, b) => b.finalScore - a.finalScore);
  const winner = ranked[0];

  const reasonParts: string[] = [];
  if (winner.pantryMatchPct >= 50) {
    reasonParts.push(`${Math.round(winner.pantryMatchPct)}% in your pantry`);
  }
  if (winner.cuisineBonus > 0) reasonParts.push('cuisine you love');
  if (reasonParts.length === 0 && winner.saveCount > 0) {
    reasonParts.push(`${winner.saveCount} cooks this week`);
  }

  return {
    plate: winner.plate,
    saveCount: winner.saveCount,
    reason: reasonParts.length > 0 ? reasonParts.join(' · ') : undefined,
  };
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
