// backend/src/services/shoppingListArchiveTiering.ts
// Group 10Q-ListMgmt: Archive tiering — collapses 90-day-old archived lists
// into "older" tier, computing summaryStats and deleting item rows.

import { prisma } from '../lib/prisma';
import { categorizeItem } from '../utils/aisleCategorizer';

const TIER_THRESHOLD_DAYS = 90;

interface SummaryStats {
  itemCount: number;
  totalSpentCents: number;
  dominantAisle: string | null;
  archivedAt: Date | null;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function computeDominantAisle(
  items: Array<{ name: string; category: string | null }>,
): string | null {
  if (items.length === 0) return null;

  const aisleCounts = new Map<string, number>();

  for (const item of items) {
    // Prefer the stored category; fall back to categorizeItem
    const aisle = item.category ?? categorizeItem(item.name) ?? 'Other';
    aisleCounts.set(aisle, (aisleCounts.get(aisle) ?? 0) + 1);
  }

  let dominant: string | null = null;
  let maxCount = 0;

  for (const [aisle, count] of aisleCounts) {
    if (count > maxCount) {
      maxCount = count;
      dominant = aisle;
    }
  }

  return dominant;
}

function computeTotalSpentCents(items: Array<{ price: number | null }>): number {
  return Math.round(
    items.reduce((sum, item) => sum + (item.price ?? 0), 0) * 100,
  );
}

// ---------------------------------------------------------------------------
// tierArchivedList
// ---------------------------------------------------------------------------

export async function tierArchivedList(listId: string): Promise<void> {
  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
  });

  if (!list) {
    throw new Error(`Shopping list ${listId} not found`);
  }

  // Idempotent: already tiered
  if (list.tier === 'older') {
    return;
  }

  const items = await prisma.shoppingListItem.findMany({
    where: { shoppingListId: listId },
    select: { name: true, category: true, price: true },
  });

  const summaryStats: SummaryStats = {
    itemCount: items.length,
    totalSpentCents: computeTotalSpentCents(items),
    dominantAisle: computeDominantAisle(items),
    archivedAt: list.archivedAt,
  };

  await prisma.$transaction(async (tx) => {
    await (tx as typeof prisma).shoppingListItem.deleteMany({
      where: { shoppingListId: listId },
    });

    await (tx as typeof prisma).shoppingList.update({
      where: { id: listId },
      data: {
        tier: 'older',
        summaryStats: JSON.stringify(summaryStats),
      },
    });
  });
}

// ---------------------------------------------------------------------------
// tierArchivedListsForUser
// ---------------------------------------------------------------------------

export async function tierArchivedListsForUser(
  userId: string,
): Promise<{ tieredCount: number }> {
  const cutoff = daysAgo(TIER_THRESHOLD_DAYS);

  const eligibleLists = await prisma.shoppingList.findMany({
    where: {
      userId,
      tier: 'archived',
      archivedAt: { lt: cutoff },
    },
    select: { id: true },
  });

  for (const { id } of eligibleLists) {
    await tierArchivedList(id);
  }

  return { tieredCount: eligibleLists.length };
}
