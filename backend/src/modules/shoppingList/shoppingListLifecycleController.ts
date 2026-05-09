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

// K11: shared try/catch wrapper for the 6 lifecycle handlers — eliminates
// 4 clones of the same error-shape pattern. `errorStatus` differs by route
// (400 for user-actionable, 500 for sweepers); `includeData` flips between
// `{success}` and `{success, data}` payloads.
async function runLifecycleAction<T>(
  req: Request,
  res: Response,
  errorStatus: number,
  action: (userId: string) => Promise<T>,
  includeData = true,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const result = await action(userId);
    res.json(includeData ? { success: true, data: result } : { success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(errorStatus).json({ success: false, error: message });
  }
}

export const shoppingListLifecycleController = {
  /**
   * POST /api/shopping-lists/:id/set-active
   * Atomically makes the given list the active list for the user.
   */
  async setActive(req: Request, res: Response) {
    await runLifecycleAction(req, res, 400, (userId) =>
      setActiveList(userId, req.params.id),
    );
  },

  /**
   * POST /api/shopping-lists/:id/archive
   * Explicitly archives a list (not via active swap).
   */
  async archive(req: Request, res: Response) {
    await runLifecycleAction(
      req,
      res,
      400,
      (userId) => archiveList(userId, req.params.id),
      false,
    );
  },

  /**
   * POST /api/shopping-lists/:id/complete
   * Archives a list after final item check-off (all items must be purchased).
   * Creates a fresh empty active list automatically.
   */
  async archiveOnCompletion(req: Request, res: Response) {
    await runLifecycleAction(
      req,
      res,
      400,
      (userId) => archiveOnCompletion(userId, req.params.id),
      false,
    );
  },

  /**
   * POST /api/shopping-lists/auto-archive-stale
   * Archives non-active lists that haven't been touched for 14+ days.
   * Returns { archivedIds } for toast payload.
   */
  async autoArchiveStale(req: Request, res: Response) {
    await runLifecycleAction(req, res, 500, (userId) => autoArchiveStale(userId));
  },

  /**
   * POST /api/shopping-lists/cleanup-orphans
   * Deletes empty non-active lists older than 7 days. Silent — no notification.
   * Returns { deletedCount }.
   */
  async cleanupOrphans(req: Request, res: Response) {
    await runLifecycleAction(req, res, 500, (userId) => cleanupOrphans(userId));
  },

  /**
   * POST /api/shopping-lists/tier-archived
   * Collapses archived lists older than 90 days into "older" tier with summaryStats.
   * Deletes item rows for tiered lists. Returns { tieredCount }.
   */
  async tierArchived(req: Request, res: Response) {
    await runLifecycleAction(req, res, 500, (userId) =>
      tierArchivedListsForUser(userId),
    );
  },
};
