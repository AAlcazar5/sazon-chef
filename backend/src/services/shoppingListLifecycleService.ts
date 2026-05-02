// backend/src/services/shoppingListLifecycleService.ts
// Group 10Q-ListMgmt: Shopping list lifecycle — singleton active invariant,
// auto-archive on completion, stale auto-archive, and orphan cleanup.

import { ShoppingList } from '@prisma/client';
import { prisma } from '../lib/prisma';

const DEFAULT_LIST_NAME = 'Shopping List';
const STALE_THRESHOLD_DAYS = 14;
const ORPHAN_THRESHOLD_DAYS = 7;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ---------------------------------------------------------------------------
// setActiveList
// ---------------------------------------------------------------------------

export async function setActiveList(
  userId: string,
  listId: string,
): Promise<{ previousActiveId: string | null; newActiveId: string }> {
  return prisma.$transaction(async (tx) => {
    const currentActive = await (tx as typeof prisma).shoppingList.findFirst({
      where: { userId, isActive: true },
    });

    const target = await (tx as typeof prisma).shoppingList.findFirst({
      where: { id: listId, userId },
    });

    if (!target) {
      throw new Error(`Shopping list ${listId} not found for user ${userId}`);
    }

    const isSameList = currentActive?.id === listId;

    if (currentActive && !isSameList) {
      await (tx as typeof prisma).shoppingList.update({
        where: { id: currentActive.id },
        data: {
          isActive: false,
          tier: 'archived',
          archivedAt: new Date(),
        },
      });
    }

    await (tx as typeof prisma).shoppingList.update({
      where: { id: listId },
      data: {
        isActive: true,
        tier: 'active',
        archivedAt: null,
      },
    });

    return {
      previousActiveId: currentActive?.id ?? null,
      newActiveId: listId,
    };
  });
}

// ---------------------------------------------------------------------------
// getActiveList
// ---------------------------------------------------------------------------

export async function getActiveList(userId: string): Promise<ShoppingList> {
  const existing = await prisma.shoppingList.findFirst({
    where: { userId, isActive: true },
  });

  if (existing) {
    return existing;
  }

  return prisma.shoppingList.create({
    data: {
      userId,
      name: DEFAULT_LIST_NAME,
      isActive: true,
      tier: 'active',
      archivedAt: null,
    },
  });
}

// ---------------------------------------------------------------------------
// archiveList
// ---------------------------------------------------------------------------

export async function archiveList(userId: string, listId: string): Promise<void> {
  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, userId },
  });

  if (!list) {
    throw new Error(`Shopping list ${listId} not found for user ${userId}`);
  }

  await prisma.shoppingList.update({
    where: { id: listId },
    data: {
      isActive: false,
      tier: 'archived',
      archivedAt: new Date(),
    },
  });
}

// ---------------------------------------------------------------------------
// archiveOnCompletion
// ---------------------------------------------------------------------------

export async function archiveOnCompletion(userId: string, listId: string): Promise<void> {
  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, userId },
  });

  if (!list) {
    throw new Error(`Shopping list ${listId} not found for user ${userId}`);
  }

  const items = await prisma.shoppingListItem.findMany({
    where: { shoppingListId: listId },
  });

  if (items.length === 0) {
    throw new Error(`Cannot archive empty list ${listId}`);
  }

  const allPurchased = items.every((item) => item.purchased);
  if (!allPurchased) {
    throw new Error(`List ${listId} has unpurchased items — cannot archive on completion`);
  }

  // Record purchase history for each item (best-effort, non-blocking errors)
  for (const item of items) {
    try {
      await prisma.purchaseHistory.upsert({
        where: { userId_itemName: { userId, itemName: item.name.toLowerCase().trim() } },
        create: {
          userId,
          itemName: item.name.toLowerCase().trim(),
          quantity: item.quantity,
          category: item.category ?? null,
          purchaseCount: 1,
          lastPurchasedAt: new Date(),
          lastPrice: item.price ?? null,
        },
        update: {
          purchaseCount: { increment: 1 },
          lastPurchasedAt: new Date(),
          quantity: item.quantity,
          ...(item.price != null ? { lastPrice: item.price } : {}),
        },
      });
    } catch {
      // Non-blocking — purchase history failure does not prevent archiving
    }
  }

  await prisma.shoppingList.update({
    where: { id: listId },
    data: {
      isActive: false,
      tier: 'archived',
      archivedAt: new Date(),
    },
  });

  // Auto-create a fresh empty active list if no other active list exists
  const hasOtherActive = await prisma.shoppingList.findFirst({
    where: { userId, isActive: true },
  });

  if (!hasOtherActive) {
    await prisma.shoppingList.create({
      data: {
        userId,
        name: DEFAULT_LIST_NAME,
        isActive: true,
        tier: 'active',
        archivedAt: null,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// autoArchiveStale
// ---------------------------------------------------------------------------

export async function autoArchiveStale(userId: string): Promise<{ archivedIds: string[] }> {
  const cutoff = daysAgo(STALE_THRESHOLD_DAYS);

  // Find lists that were deactivated (isActive=false) but never formally archived
  // (tier != 'archived') and haven't been touched in 14+ days.
  const staleLists = await prisma.shoppingList.findMany({
    where: {
      userId,
      isActive: false,
      tier: { not: 'archived' },
      updatedAt: { lt: cutoff },
    },
    select: { id: true },
  });

  if (staleLists.length === 0) {
    return { archivedIds: [] };
  }

  const ids = staleLists.map((l) => l.id);

  await prisma.shoppingList.updateMany({
    where: { id: { in: ids } },
    data: {
      tier: 'archived',
      archivedAt: new Date(),
    },
  });

  return { archivedIds: ids };
}

// ---------------------------------------------------------------------------
// cleanupOrphans
// ---------------------------------------------------------------------------

export async function cleanupOrphans(userId: string): Promise<{ deletedCount: number }> {
  const cutoff = daysAgo(ORPHAN_THRESHOLD_DAYS);

  // Only consider non-active lists older than the threshold
  const candidates = await prisma.shoppingList.findMany({
    where: {
      userId,
      isActive: false,
      updatedAt: { lt: cutoff },
    },
    select: { id: true },
  });

  let deletedCount = 0;

  for (const candidate of candidates) {
    const itemCount = await prisma.shoppingListItem.count({
      where: { shoppingListId: candidate.id },
    });

    if (itemCount === 0) {
      await prisma.shoppingList.delete({ where: { id: candidate.id } });
      deletedCount++;
    }
  }

  return { deletedCount };
}
