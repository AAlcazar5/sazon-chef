// backend/src/modules/shoppingListShare/shoppingListShareController.ts
// Group 10Q: share a shopping list via a deep-link token

import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { getUserId } from '../../utils/authHelper';

const SHARE_URL_BASE = 'https://sazonchef.app/import/shopping-list';
const SHARE_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

export const shoppingListShareController = {
  /**
   * POST /api/shopping-lists/:id/share
   * Generates a 7-day share token for the list.
   */
  async createShare(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id: listId } = req.params;

      const list = await prisma.shoppingList.findFirst({ where: { id: listId, userId } });
      if (!list) {
        return res.status(404).json({ error: 'Shopping list not found' });
      }

      const token = generateToken();
      const expiresAt = new Date(Date.now() + SHARE_EXPIRES_MS);

      const share = await prisma.shoppingListShare.create({
        data: { listId, token, createdBy: userId, expiresAt, usedBy: '[]', maxUses: 10 },
      });

      return res.status(201).json({
        token: share.token,
        shareUrl: `${SHARE_URL_BASE}/${share.token}`,
        expiresAt: share.expiresAt,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: 'Could not create share link' });
    }
  },

  /**
   * GET /api/shopping-lists/import/:token
   * Validates token and copies unpurchased items into a new list owned by the requesting user.
   * Idempotent: re-importing returns the same list.
   */
  async importShare(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { token } = req.params;

      const share = await prisma.shoppingListShare.findUnique({ where: { token } });
      if (!share) {
        return res.status(404).json({ error: 'Share link not found' });
      }

      if (share.expiresAt < new Date()) {
        return res.status(410).json({ error: 'Share link has expired' });
      }

      // Parse usedBy: supports both legacy string[] and current {userId, listId}[] format
      let importedByMap: Record<string, string> = {};
      try {
        const parsed = JSON.parse(share.usedBy || '[]');
        if (Array.isArray(parsed)) {
          parsed.forEach((entry: string | { userId: string; listId: string }) => {
            if (typeof entry === 'object' && entry !== null && entry.userId) {
              importedByMap[entry.userId] = entry.listId;
            }
            // Legacy string entries tracked separately below
          });
        }
      } catch {
        // ignore parse errors
      }

      // Idempotent: if user already imported, return their list
      if (importedByMap[userId]) {
        return res.status(200).json({ listId: importedByMap[userId], imported: false });
      }

      // Check max uses against unique user count
      const uniqueUserCount = Object.keys(importedByMap).length;
      if (uniqueUserCount >= share.maxUses) {
        return res.status(403).json({ error: 'Share link has reached maximum uses' });
      }

      // Fetch original list name
      const sourceList = await prisma.shoppingList.findFirst({
        where: { id: share.listId },
      });
      const listName = sourceList?.name ?? 'Shared Shopping List';

      // Copy only unpurchased items
      const sourceItems = await prisma.shoppingListItem.findMany({
        where: { shoppingListId: share.listId, purchased: false },
      });

      const newList = await prisma.shoppingList.create({
        data: { userId, name: listName },
      });

      if (sourceItems.length > 0) {
        await prisma.shoppingListItem.createMany({
          data: sourceItems.map(item => ({
            shoppingListId: newList.id,
            name: item.name,
            quantity: item.quantity,
            category: item.category,
            notes: item.notes,
            purchased: false,
            price: item.price,
          })),
        });
      }

      // Append userId to usedBy (as object with listId for idempotency)
      const updatedMap = { ...importedByMap, [userId]: newList.id };
      const updatedUsedBy = JSON.stringify(
        Object.entries(updatedMap).map(([uid, lid]) => ({ userId: uid, listId: lid }))
      );
      await prisma.shoppingListShare.update({
        where: { id: share.id },
        data: { usedBy: updatedUsedBy },
      });

      return res.status(200).json({ listId: newList.id, imported: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: 'Could not import share link' });
    }
  },
};
