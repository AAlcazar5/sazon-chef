// backend/src/modules/shoppingList/shoppingListMergeController.ts
// R1-2: extracted from shoppingListController.ts as part of the 1956-line
// split. Owns terminal-state list actions and merge-suggestion UX:
//   - markListDone (archive + roll over unpurchased items)
//   - clearItems  (start fresh — preserve list, drop items)
//   - bulkAddItems (used by undo flow)
//   - getMergeSuggestion / dismissMergeSuggestion (Jaccard overlap surface)
//   - archiveOnCompletion (auto-archive after grace period)

import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { getUserId } from '../../utils/authHelper';

export const shoppingListMergeController = {
  /**
   * POST /api/shopping-lists/:id/done
   * Archive the current list and roll any unpurchased items into a new
   * active list. Returns counts so the client can render the rollover toast.
   */
  async markListDone(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const list = await prisma.shoppingList.findFirst({
        where: { id, userId },
      });

      if (!list) {
        return res.status(404).json({ error: 'Shopping list not found' });
      }

      const items = await prisma.shoppingListItem.findMany({
        where: { shoppingListId: id },
      });

      const { archiveList, setActiveList } = await import('../../services/shoppingListLifecycleService');
      await archiveList(userId, id);

      const unpurchasedItems = items.filter((i) => !i.purchased);

      if (unpurchasedItems.length === 0) {
        return res.json({
          archivedListId: id,
          rolledOverItemCount: 0,
        });
      }

      const archiveDate = new Date();
      const dateLabel = archiveDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const newListName = `Unfinished from ${dateLabel}`;

      const newList = await prisma.shoppingList.create({
        data: {
          userId,
          name: newListName,
          isActive: false,
          tier: 'archived',
          items: {
            create: unpurchasedItems.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              category: item.category ?? null,
              notes: item.notes ?? null,
              price: item.price ?? null,
              purchased: false,
            })),
          },
        },
      });

      await setActiveList(userId, newList.id);

      return res.json({
        archivedListId: id,
        newActiveListId: newList.id,
        rolledOverItemCount: unpurchasedItems.length,
      });
    } catch (error: any) {
      console.error('[SHOPPING_LIST] POST /:id/done - ERROR:', error.message);
      res.status(500).json({ error: 'Unable to complete shopping session' });
    }
  },

  /**
   * POST /api/shopping-lists/:id/clear
   * "Start fresh" — deletes all items from the list, list itself remains.
   */
  async clearItems(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const list = await prisma.shoppingList.findFirst({
        where: { id, userId },
      });

      if (!list) {
        return res.status(404).json({ error: 'Shopping list not found' });
      }

      const result = await prisma.shoppingListItem.deleteMany({
        where: { shoppingListId: id },
      });

      return res.json({ success: true, deletedCount: result.count });
    } catch (error: any) {
      console.error('[SHOPPING_LIST] POST /:id/clear - ERROR:', error.message);
      res.status(500).json({ error: 'Unable to clear shopping list' });
    }
  },

  /**
   * POST /api/shopping-lists/:id/bulk-add
   * Adds multiple items to a list (used by undo restore after Start Fresh).
   */
  async bulkAddItems(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Items array is required' });
      }

      const list = await prisma.shoppingList.findFirst({
        where: { id, userId },
      });

      if (!list) {
        return res.status(404).json({ error: 'Shopping list not found' });
      }

      await prisma.shoppingListItem.createMany({
        data: items.map((item: any) => ({
          shoppingListId: id,
          name: item.name,
          quantity: item.quantity || '1',
          category: item.category ?? null,
          notes: item.notes ?? null,
          price: item.price ?? null,
          purchased: false,
        })),
      });

      return res.json({ success: true, addedCount: items.length });
    } catch (error: any) {
      console.error('[SHOPPING_LIST] POST /:id/bulk-add - ERROR:', error.message);
      res.status(500).json({ error: 'Unable to add items' });
    }
  },

  /**
   * GET /api/shopping-lists/active/merge-suggestion
   * Returns the top merge suggestion (≥70% Jaccard overlap with a list archived in last 48h)
   * that hasn't been dismissed by the user. Returns null if no suggestion found.
   */
  async getMergeSuggestion(req: Request, res: Response) {
    try {
      const userId = getUserId(req);

      const activeList = await prisma.shoppingList.findFirst({
        where: { userId, isActive: true },
      });

      if (!activeList) {
        return res.json(null);
      }

      const activeItems = await prisma.shoppingListItem.findMany({
        where: { shoppingListId: activeList.id },
        select: { name: true },
      });

      if (activeItems.length === 0) {
        return res.json(null);
      }

      const activeSet = new Set(activeItems.map((i) => i.name.toLowerCase().trim()));

      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - 48);

      const recentArchived = await prisma.shoppingList.findMany({
        where: {
          userId,
          isActive: false,
          archivedAt: { gte: cutoff },
        },
        orderBy: { archivedAt: 'desc' },
      });

      if (recentArchived.length === 0) {
        return res.json(null);
      }

      const candidateIds = recentArchived.map((l) => l.id);

      const [dismissals, allItems] = await Promise.all([
        prisma.mergeDismissal.findMany({
          where: {
            userId,
            sourceListId: { in: candidateIds },
            targetListId: activeList.id,
          },
          select: { sourceListId: true },
        }),
        prisma.shoppingListItem.findMany({
          where: { shoppingListId: { in: candidateIds } },
          select: { shoppingListId: true, name: true },
        }),
      ]);

      const dismissedSet = new Set(dismissals.map((d) => d.sourceListId));
      const itemsByList = new Map<string, Set<string>>();
      for (const item of allItems) {
        let set = itemsByList.get(item.shoppingListId);
        if (!set) {
          set = new Set();
          itemsByList.set(item.shoppingListId, set);
        }
        set.add(item.name.toLowerCase().trim());
      }

      for (const candidate of recentArchived) {
        if (dismissedSet.has(candidate.id)) continue;

        const candidateSet = itemsByList.get(candidate.id) ?? new Set<string>();

        let intersectionCount = 0;
        for (const name of activeSet) {
          if (candidateSet.has(name)) intersectionCount++;
        }
        const unionCount = activeSet.size + candidateSet.size - intersectionCount;
        const overlap = unionCount === 0 ? 0 : intersectionCount / unionCount;

        if (overlap >= 0.7) {
          return res.json({
            suggestionId: candidate.id,
            name: candidate.name,
            overlap,
          });
        }
      }

      return res.json(null);
    } catch (error: any) {
      console.error('[SHOPPING_LIST] GET /active/merge-suggestion - ERROR:', error.message);
      res.status(500).json({ error: 'Unable to fetch merge suggestion' });
    }
  },

  /**
   * POST /api/shopping-lists/active/dismiss-merge-suggestion
   * Body: { suggestionId: string }
   * Records a MergeDismissal so the pair is never re-suggested.
   */
  async dismissMergeSuggestion(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { suggestionId } = req.body;

      if (!suggestionId || typeof suggestionId !== 'string') {
        return res.status(400).json({ error: 'suggestionId is required' });
      }

      const sourceList = await prisma.shoppingList.findFirst({
        where: { id: suggestionId, userId },
        select: { id: true },
      });
      if (!sourceList) {
        return res.status(404).json({ error: 'Suggestion list not found' });
      }

      const activeList = await prisma.shoppingList.findFirst({
        where: { userId, isActive: true },
      });

      if (!activeList) {
        return res.status(404).json({ error: 'No active shopping list found' });
      }

      try {
        await prisma.mergeDismissal.create({
          data: {
            userId,
            sourceListId: suggestionId,
            targetListId: activeList.id,
          },
        });
      } catch (err: any) {
        if (err?.code !== 'P2002') throw err;
      }

      return res.json({ success: true });
    } catch (error: any) {
      console.error('[SHOPPING_LIST] POST /active/dismiss-merge-suggestion - ERROR:', error.message);
      res.status(500).json({ error: 'Unable to dismiss merge suggestion' });
    }
  },

  /**
   * POST /api/shopping-lists/:id/archive-on-completion
   * Called by the frontend auto-archive hook after the 10-second grace period.
   * Delegates to lifecycle service.
   */
  async archiveOnCompletion(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const { archiveOnCompletion } = await import('../../services/shoppingListLifecycleService');
      const result = await archiveOnCompletion(userId, id);

      return res.json(result);
    } catch (error: any) {
      if (error.message?.includes('not all items are purchased') || error.message?.includes('unpurchased items')) {
        return res.status(409).json({ error: 'List has unpurchased items' });
      }
      if (error.message?.includes('not found')) {
        return res.status(404).json({ error: 'Shopping list not found' });
      }
      console.error('[SHOPPING_LIST] POST /:id/archive-on-completion - ERROR:', error.message);
      res.status(500).json({ error: 'Unable to archive shopping list' });
    }
  },
};
