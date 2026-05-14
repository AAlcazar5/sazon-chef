import { logger } from '../../utils/logger';
// backend/src/modules/shoppingListShare/shoppingListShareController.ts
// Group 10Q: share a shopping list via a deep-link token

import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { getUserId } from '../../utils/authHelper';
import { parseJsonColumn } from '../../utils/jsonColumns';

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

      // Cheap format guard before hitting the DB
      if (!token || typeof token !== 'string' || !/^[A-Za-z0-9_\-]{10,64}$/.test(token)) {
        return res.status(400).json({ error: 'Invalid share token format' });
      }

      // Wrap the entire read-check-create-update sequence in a transaction so two
      // concurrent imports cannot both pass the maxUses check on stale state.
      const result = await prisma.$transaction(async (tx) => {
        const share = await tx.shoppingListShare.findUnique({ where: { token } });
        if (!share) {
          return { kind: 'not_found' as const };
        }
        if (share.expiresAt < new Date()) {
          return { kind: 'expired' as const };
        }

        // Parse usedBy: supports both legacy string[] and current
        // {userId, listId}[] format. Corrupt JSON → fail closed (treat as
        // exhausted) rather than silently resetting to zero.
        let importedByMap: Record<string, string> = {};
        try {
          const parsed = parseJsonColumn('usedBy', share.usedBy);
          if (!Array.isArray(parsed)) {
            return { kind: 'corrupt' as const };
          }
          parsed.forEach((entry: string | { userId: string; listId: string }) => {
            if (typeof entry === 'object' && entry !== null && entry.userId) {
              importedByMap[entry.userId] = entry.listId;
            }
          });
        } catch {
          return { kind: 'corrupt' as const };
        }

        // Idempotent: if user already imported, return their list
        if (importedByMap[userId]) {
          return { kind: 'idempotent' as const, listId: importedByMap[userId] };
        }

        // Check max uses against unique user count
        const uniqueUserCount = Object.keys(importedByMap).length;
        if (uniqueUserCount >= share.maxUses) {
          return { kind: 'max_uses' as const };
        }

        // Fetch original list name
        const sourceList = await tx.shoppingList.findFirst({
          where: { id: share.listId },
        });
        const listName = sourceList?.name ?? 'Shared Shopping List';

        // Copy only unpurchased items
        const sourceItems = await tx.shoppingListItem.findMany({
          where: { shoppingListId: share.listId, purchased: false },
        });

        const newList = await tx.shoppingList.create({
          data: { userId, name: listName },
        });

        if (sourceItems.length > 0) {
          await tx.shoppingListItem.createMany({
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

        const updatedMap = { ...importedByMap, [userId]: newList.id };
        const updatedUsedBy = JSON.stringify(
          Object.entries(updatedMap).map(([uid, lid]) => ({ userId: uid, listId: lid }))
        );
        await tx.shoppingListShare.update({
          where: { id: share.id },
          data: { usedBy: updatedUsedBy },
        });

        return { kind: 'imported' as const, listId: newList.id };
      });

      switch (result.kind) {
        case 'not_found':
          return res.status(404).json({ error: 'Share link not found' });
        case 'expired':
          return res.status(410).json({ error: 'Share link has expired' });
        case 'corrupt':
          logger.error({ err: token }, '[shoppingListShare] usedBy column is corrupt for token');
          return res.status(500).json({ error: 'Share link is in an invalid state' });
        case 'max_uses':
          return res.status(403).json({ error: 'Share link has reached maximum uses' });
        case 'idempotent':
          return res.status(200).json({ listId: result.listId, imported: false });
        case 'imported':
          return res.status(200).json({ listId: result.listId, imported: true });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ err: msg }, '[shoppingListShare] importShare failed:');
      return res.status(500).json({ error: 'Could not import share link' });
    }
  },
};
