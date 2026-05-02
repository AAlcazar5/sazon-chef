// backend/src/services/shoppingListDuplicateAtCreation.ts
// Detect near-duplicate shopping lists at creation time using item-overlap (Jaccard).

import { prisma } from '../lib/prisma';
import { normalizeIngredientName } from '../utils/ingredientNormalizer';

const OVERLAP_THRESHOLD = 0.70;
const ARCHIVE_WINDOW_DAYS = 7;

interface CandidateItem {
  name: string;
}

interface DuplicateResult {
  duplicateOf: string;
  overlap: number;
  suggestedAction: 'merge';
}

function normalizeSet(names: string[]): Set<string> {
  return new Set(names.map(normalizeIngredientName));
}

function jaccardOverlap(setA: Set<string>, setB: Set<string>): number {
  const denominator = Math.max(setA.size, setB.size);
  if (denominator === 0) return 0;

  let intersectionSize = 0;
  for (const item of setA) {
    if (setB.has(item)) intersectionSize++;
  }

  return intersectionSize / denominator;
}

export async function findDuplicateAtCreation(
  userId: string,
  candidateItems: CandidateItem[],
): Promise<DuplicateResult | null> {
  const windowCutoff = new Date();
  windowCutoff.setDate(windowCutoff.getDate() - ARCHIVE_WINDOW_DAYS);

  // Fetch: user's active list + archived lists within 7-day window
  const candidateLists = await prisma.shoppingList.findMany({
    where: {
      userId,
      OR: [
        { isActive: true },
        {
          isActive: false,
          archivedAt: { gte: windowCutoff },
        },
      ],
    },
    include: {
      items: {
        select: { name: true },
      },
    },
  } as any);

  const incomingNormalized = normalizeSet(candidateItems.map(i => i.name));

  let bestOverlap = 0;
  let bestListId: string | null = null;

  for (const list of candidateLists as any[]) {
    const existingNames: string[] = list.items.map((i: { name: string }) => i.name);
    const existingNormalized = normalizeSet(existingNames);
    const overlap = jaccardOverlap(incomingNormalized, existingNormalized);

    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestListId = list.id;
    }
  }

  if (bestOverlap >= OVERLAP_THRESHOLD && bestListId !== null) {
    return {
      duplicateOf: bestListId,
      overlap: bestOverlap,
      suggestedAction: 'merge',
    };
  }

  return null;
}

export async function mergeIntoExisting(
  targetListId: string,
  candidateItems: CandidateItem[],
): Promise<void> {
  const existingItems = await prisma.shoppingListItem.findMany({
    where: { shoppingListId: targetListId },
    select: { name: true, purchased: true },
  });

  const existingNormalized = normalizeSet(existingItems.map(i => i.name));

  const newItems = candidateItems.filter(
    item => !existingNormalized.has(normalizeIngredientName(item.name)),
  );

  await prisma.shoppingListItem.createMany({
    data: newItems.map(item => ({
      shoppingListId: targetListId,
      name: item.name,
      quantity: '1',
      purchased: false,
    })),
  });
}
