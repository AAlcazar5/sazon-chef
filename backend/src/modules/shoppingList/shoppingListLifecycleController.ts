// backend/src/modules/shoppingList/shoppingListLifecycleController.ts
// Group 10Q-ListMgmt: HTTP handlers for shopping list lifecycle endpoints.

import { Request, Response } from 'express';
import { getUserId } from '../../utils/authHelper';
import {
  setActiveList,
  archiveList,
  archiveOnCompletion,
  autoArchiveStale,
  cleanupOrphans,
} from '../../services/shoppingListLifecycleService';
import { tierArchivedListsForUser } from '../../services/shoppingListArchiveTiering';

export const shoppingListLifecycleController = {
  /**
   * POST /api/shopping-lists/:id/set-active
   * Atomically makes the given list the active list for the user.
   */
  async setActive(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const result = await setActiveList(userId, id);
      res.json({ success: true, data: result });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(400).json({ success: false, error: message });
    }
  },

  /**
   * POST /api/shopping-lists/:id/archive
   * Explicitly archives a list (not via active swap).
   */
  async archive(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      await archiveList(userId, id);
      res.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(400).json({ success: false, error: message });
    }
  },

  /**
   * POST /api/shopping-lists/:id/complete
   * Archives a list after final item check-off (all items must be purchased).
   * Creates a fresh empty active list automatically.
   */
  async archiveOnCompletion(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      await archiveOnCompletion(userId, id);
      res.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(400).json({ success: false, error: message });
    }
  },

  /**
   * POST /api/shopping-lists/auto-archive-stale
   * Archives non-active lists that haven't been touched for 14+ days.
   * Returns { archivedIds } for toast payload.
   */
  async autoArchiveStale(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const result = await autoArchiveStale(userId);
      res.json({ success: true, data: result });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  },

  /**
   * POST /api/shopping-lists/cleanup-orphans
   * Deletes empty non-active lists older than 7 days. Silent — no notification.
   * Returns { deletedCount }.
   */
  async cleanupOrphans(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const result = await cleanupOrphans(userId);
      res.json({ success: true, data: result });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  },

  /**
   * POST /api/shopping-lists/tier-archived
   * Collapses archived lists older than 90 days into "older" tier with summaryStats.
   * Deletes item rows for tiered lists. Returns { tieredCount }.
   */
  async tierArchived(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const result = await tierArchivedListsForUser(userId);
      res.json({ success: true, data: result });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  },
};
