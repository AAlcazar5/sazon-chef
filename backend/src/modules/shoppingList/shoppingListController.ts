// backend/src/modules/shoppingList/shoppingListController.ts
// Shopping list + item CRUD. Generation, history, and budget preview live
// in shoppingListGenerationController. Merge + terminal-state UX lives in
// shoppingListMergeController.

import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { getUserId } from '../../utils/authHelper';
import { categorizeItem } from '../../utils/aisleCategorizer';
import { setActiveList, getActiveList } from '../../services/shoppingListLifecycleService';
import { resolveVoiceUtterance } from '../../services/voiceRecipeResolver';
import { shoppingListGenerationController } from './shoppingListGenerationController';
import { logger } from '../../utils/logger';

/**
 * Auto-stock pantry when a shopping item is marked purchased.
 * Upserts a PantryItem with source='shopping'. Non-blocking.
 */
async function syncPantryForPurchase(userId: string, itemName: string, category: string | null) {
  const normalizedName = itemName.toLowerCase().trim();
  if (!normalizedName) return;
  try {
    const existing = await prisma.pantryItem.findUnique({
      where: { userId_name: { userId, name: normalizedName } },
    });
    // Never overwrite a manual pantry entry
    if (existing && existing.source === 'manual') return;
    await prisma.pantryItem.upsert({
      where: { userId_name: { userId, name: normalizedName } },
      create: { userId, name: normalizedName, category: category ?? null, source: 'shopping' },
      update: { category: category ?? existing?.category ?? null, source: 'shopping' },
    });
  } catch (error) {
    logger.error({ err: error }, '[PANTRY_SYNC] Error auto-stocking pantry:');
  }
}

/**
 * Remove an auto-stocked pantry item when a shopping item is untoggled back to unpurchased.
 * Only deletes entries with source='shopping' — manual entries are preserved.
 */
async function unsyncPantryForPurchase(userId: string, itemName: string) {
  const normalizedName = itemName.toLowerCase().trim();
  if (!normalizedName) return;
  try {
    const existing = await prisma.pantryItem.findUnique({
      where: { userId_name: { userId, name: normalizedName } },
    });
    if (existing && existing.source === 'shopping') {
      await prisma.pantryItem.delete({ where: { id: existing.id } });
    }
  } catch (error) {
    logger.error({ err: error }, '[PANTRY_SYNC] Error unstocking pantry:');
  }
}

/**
 * Record a purchase to history. Uses upsert to increment count on duplicates.
 * Non-blocking -- errors are logged but don't fail the caller.
 */
async function recordPurchase(userId: string, itemName: string, quantity: string, category: string | null, price?: number | null) {
  const normalizedName = itemName.toLowerCase().trim();
  try {
    await prisma.purchaseHistory.upsert({
      where: {
        userId_itemName: { userId, itemName: normalizedName },
      },
      create: {
        userId,
        itemName: normalizedName,
        quantity,
        category,
        purchaseCount: 1,
        lastPurchasedAt: new Date(),
        lastPrice: price ?? null,
      },
      update: {
        purchaseCount: { increment: 1 },
        lastPurchasedAt: new Date(),
        quantity,
        category,
        ...(price != null ? { lastPrice: price } : {}),
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[PURCHASE_HISTORY] Error recording purchase:');
  }
}

export const shoppingListController = {
  /**
   * Get all shopping lists for a user
   * GET /api/shopping-lists
   */
  async getShoppingLists(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      logger.info(`[SHOPPING_LIST] GET /api/shopping-lists - User: ${userId}`);

      // Single query — include items to avoid N+1 (one query per list)
      const shoppingLists = await prisma.shoppingList.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              recipe: {
                select: {
                  id: true,
                  title: true,
                  imageUrl: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      logger.debug({ count: shoppingLists.length }, 'shopping_list.list.success');
      res.json(shoppingLists);
    } catch (error: any) {
      logger.error({ err: error }, 'shopping_list.list.failed');
      res.status(500).json({
        error: 'Failed to get shopping lists',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Get a single shopping list
   * GET /api/shopping-lists/:id
   */
  async getShoppingList(req: Request, res: Response) {
    const startTime = Date.now();
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      logger.debug({ listId: id }, 'shopping_list.get.start');

      const shoppingList = await prisma.shoppingList.findFirst({
        where: { id, userId },
      });

      if (!shoppingList) {
        logger.debug({ listId: id }, 'shopping_list.get.not_found');
        return res.status(404).json({ error: 'Shopping list not found' });
      }

      // Fetch items with recipe relation
      const items = await prisma.shoppingListItem.findMany({
        where: { shoppingListId: id },
        include: {
          recipe: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const shoppingListWithItems = { ...shoppingList, items };

      const duration = Date.now() - startTime;
      logger.debug({ listId: id, duration, itemCount: items.length }, 'shopping_list.get.success');
      res.json(shoppingListWithItems);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error({ err: error, listId: req.params.id, duration }, 'shopping_list.get.failed');
      res.status(500).json({ 
        error: 'Failed to get shopping list',
        code: error.code || 'SHOPPING_LIST_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Create a new shopping list
   * POST /api/shopping-lists
   * Body: { name?: string, items?: Array<{ name: string, quantity?: string, category?: string, notes?: string }> }
   */
  async createShoppingList(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { name, items } = req.body;

      // Build the create data
      const createData: any = {
        userId,
        name: name || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };

      // Add items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        createData.items = {
          create: items.map((item: { name: string; quantity?: string; category?: string; notes?: string }) => ({
            name: item.name,
            quantity: item.quantity || '1',
            category: item.category || null,
            notes: item.notes || null,
            purchased: false,
          })),
        };
      }

      const shoppingList = await prisma.shoppingList.create({
        data: createData,
        include: {
          items: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      res.status(201).json(shoppingList);
    } catch (error: any) {
      logger.error({ err: error }, 'Error creating shopping list:');
      res.status(500).json({ error: 'Failed to create shopping list' });
    }
  },

  /**
   * Update a shopping list
   * PUT /api/shopping-lists/:id
   */
  async updateShoppingList(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const { name, isActive } = req.body;

      const shoppingList = await prisma.shoppingList.findFirst({
        where: { id, userId },
      });

      if (!shoppingList) {
        return res.status(404).json({ error: 'Shopping list not found' });
      }

      const updated = await prisma.shoppingList.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(isActive !== undefined && { isActive }),
        },
        include: {
          items: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      res.json(updated);
    } catch (error: any) {
      logger.error({ err: error }, 'Error updating shopping list:');
      res.status(500).json({ error: 'Failed to update shopping list' });
    }
  },

  /**
   * Delete a shopping list
   * DELETE /api/shopping-lists/:id
   */
  async deleteShoppingList(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const shoppingList = await prisma.shoppingList.findFirst({
        where: { id, userId },
      });

      if (!shoppingList) {
        return res.status(404).json({ error: 'Shopping list not found' });
      }

      await prisma.shoppingList.delete({
        where: { id },
      });

      res.json({ message: 'Shopping list deleted successfully' });
    } catch (error: any) {
      logger.error({ err: error }, 'Error deleting shopping list:');
      res.status(500).json({ error: 'Failed to delete shopping list' });
    }
  },

  /**
   * Add item to shopping list
   * POST /api/shopping-lists/:id/items
   */
  async addItem(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const { name, quantity, category, notes, price } = req.body;

      if (!name || !quantity) {
        return res.status(400).json({ error: 'Name and quantity are required' });
      }

      const shoppingList = await prisma.shoppingList.findFirst({
        where: { id, userId },
      });

      if (!shoppingList) {
        return res.status(404).json({ error: 'Shopping list not found' });
      }

      const item = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: id,
          name,
          quantity,
          category,
          notes,
          price: price ?? null,
        },
      });

      res.status(201).json(item);
    } catch (error: any) {
      logger.error({ err: error }, 'Error adding item to shopping list:');
      res.status(500).json({ error: 'Failed to add item to shopping list' });
    }
  },

  /**
   * Voice-add: route a transcribed utterance through the recipe-fuzzy-match resolver.
   * High-confidence recipe match → generate-from-recipes flow. Otherwise add as a literal item.
   * POST /api/shopping-lists/voice-add
   */
  async voiceAdd(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { utterance } = req.body;

      if (!utterance || typeof utterance !== 'string' || !utterance.trim()) {
        return res.status(400).json({ error: 'Utterance is required' });
      }

      const resolved = await resolveVoiceUtterance(userId, utterance);

      if (resolved.matchType === 'recipe' && resolved.recipeId) {
        // Forward to generate-from-recipes via a prototype-based shadow that
        // overrides `body` only — avoids mutating the original request,
        // which is unsafe when async code elsewhere holds a reference to
        // req.body or when downstream middleware (logging, tracing) reads
        // the body after the handler returns.
        const forwardedReq = Object.create(req, {
          body: { value: { recipeIds: [resolved.recipeId] }, writable: true, enumerable: true, configurable: true },
        }) as Request;
        await shoppingListGenerationController.generateFromRecipes(forwardedReq, res);
        return;
      }

      // Literal: add as a single item to the user's active list
      const activeList = await getActiveList(userId);
      const item = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: activeList.id,
          name: resolved.name,
          quantity: '1',
          category: categorizeItem(resolved.name),
        },
      });

      return res.status(201).json({
        matchType: resolved.matchType,
        confidence: resolved.confidence,
        listId: activeList.id,
        itemId: item.id,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Error in voice-add:');
      res.status(500).json({ error: 'Failed to process voice add' });
    }
  },

  /**
   * Update shopping list item
   * PUT /api/shopping-lists/:listId/items/:itemId
   */
  async updateItem(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { listId, itemId } = req.params;
      const { name, quantity, category, purchased, notes, price, photoUrl } = req.body;

      const shoppingList = await prisma.shoppingList.findFirst({
        where: { id: listId, userId },
      });

      if (!shoppingList) {
        return res.status(404).json({ error: 'Shopping list not found' });
      }

      const item = await prisma.shoppingListItem.findFirst({
        where: { id: itemId, shoppingListId: listId },
      });

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      const updated = await prisma.shoppingListItem.update({
        where: { id: itemId, shoppingListId: listId },
        data: {
          ...(name && { name }),
          ...(quantity && { quantity }),
          ...(category !== undefined && { category }),
          ...(purchased !== undefined && { purchased }),
          ...(notes !== undefined && { notes }),
          ...(price !== undefined && { price }),
          ...(photoUrl !== undefined && { photoUrl }),
        },
      });

      // Record to purchase history when item is newly marked as purchased
      if (purchased === true && !item.purchased) {
        const finalPrice = price !== undefined ? price : item.price;
        recordPurchase(userId, item.name, item.quantity, item.category, finalPrice);
        syncPantryForPurchase(userId, item.name, item.category);
      } else if (purchased === false && item.purchased) {
        unsyncPantryForPurchase(userId, item.name);
      }

      res.json(updated);
    } catch (error: any) {
      logger.error({ err: error }, 'Error updating shopping list item:');
      res.status(500).json({ error: 'Failed to update shopping list item' });
    }
  },

  /**
   * Batch update shopping list items
   * PUT /api/shopping-lists/:listId/items/batch
   */
  async batchUpdateItems(req: Request, res: Response) {
    const startTime = Date.now();
    try {
      const userId = getUserId(req);
      const { listId } = req.params;
      const { updates } = req.body; // Array of { itemId, purchased, name, quantity, category, notes }

      logger.info(`[SHOPPING_LIST] PUT /api/shopping-lists/${listId}/items/batch - User: ${userId} - Updates: ${updates?.length || 0} - Start: ${new Date().toISOString()}`);

      if (!Array.isArray(updates) || updates.length === 0) {
        logger.info(`[SHOPPING_LIST] PUT /api/shopping-lists/${listId}/items/batch - Invalid request: updates array empty or missing`);
        return res.status(400).json({ error: 'Updates array is required and must not be empty' });
      }

      const shoppingList = await prisma.shoppingList.findFirst({
        where: { id: listId, userId },
      });

      if (!shoppingList) {
        logger.info(`[SHOPPING_LIST] PUT /api/shopping-lists/${listId}/items/batch - List not found`);
        return res.status(404).json({ error: 'Shopping list not found' });
      }

      // Verify all items exist and belong to this list before updating
      const itemIds = updates.map((u: { itemId: string }) => u.itemId);
      const existingItems = await prisma.shoppingListItem.findMany({
        where: {
          id: { in: itemIds },
          shoppingListId: listId,
        },
        select: { id: true, name: true, quantity: true, category: true, purchased: true, price: true },
      });

      const existingItemMap = new Map(existingItems.map(item => [item.id, item]));
      const existingItemIds = new Set(existingItems.map(item => item.id));
      const missingItemIds = itemIds.filter(id => !existingItemIds.has(id));

      if (missingItemIds.length > 0) {
        logger.info({ err: missingItemIds }, `[SHOPPING_LIST] PUT /api/shopping-lists/${listId}/items/batch - Some items not found:`);
        // Continue with items that exist, but log the missing ones
      }

      // Update only items that exist, using Promise.allSettled to handle individual failures gracefully
      const validUpdates = updates.filter((u: { itemId: string }) => existingItemIds.has(u.itemId));
      
      const updateResults = await Promise.allSettled(
        validUpdates.map(async (update: { itemId: string; purchased?: boolean; name?: string; quantity?: string; category?: string | null; notes?: string | null; price?: number | null }) => {
          try {
            const { itemId, ...data } = update;
            
            // Remove undefined values
            const updateData: any = {};
            if (data.purchased !== undefined) updateData.purchased = data.purchased;
            if (data.name !== undefined) updateData.name = data.name;
            if (data.quantity !== undefined) updateData.quantity = data.quantity;
            if (data.category !== undefined) updateData.category = data.category;
            if (data.notes !== undefined) updateData.notes = data.notes;
            if (data.price !== undefined) updateData.price = data.price;

            return await prisma.shoppingListItem.update({
              where: { id: itemId },
              data: updateData,
            });
          } catch (error: any) {
            // Handle Prisma errors (e.g., P2025 - record not found)
            // This can happen if an item is deleted between validation and update (race condition)
            logger.info({ code: error.code, message: error.message }, `[SHOPPING_LIST] Failed to update item ${update.itemId}`);
            throw error; // Re-throw so Promise.allSettled can catch it
          }
        })
      );

      // Extract successful updates
      const updatedItems = updateResults
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);

      const failedUpdates = updateResults.filter(result => result.status === 'rejected');
      if (failedUpdates.length > 0) {
        logger.info(
          { failedReasons: failedUpdates.map((f: any) => f.reason?.message || f.reason) },
          `[SHOPPING_LIST] PUT /api/shopping-lists/${listId}/items/batch - ${failedUpdates.length} items failed to update`,
        );
      }

      // If some items were missing, include that in the response
      if (missingItemIds.length > 0) {
        logger.info(`[SHOPPING_LIST] PUT /api/shopping-lists/${listId}/items/batch - Updated ${updatedItems.length} items, ${missingItemIds.length} items were missing`);
      }

      // Record purchases for items newly marked as purchased and sync pantry
      for (const update of validUpdates) {
        const originalItem = existingItemMap.get(update.itemId);
        if (!originalItem) continue;
        if (update.purchased === true && !originalItem.purchased) {
          const finalPrice = update.price !== undefined ? update.price : originalItem.price;
          recordPurchase(userId, originalItem.name, originalItem.quantity, originalItem.category, finalPrice);
          syncPantryForPurchase(userId, originalItem.name, originalItem.category);
        } else if (update.purchased === false && originalItem.purchased) {
          unsyncPantryForPurchase(userId, originalItem.name);
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`[SHOPPING_LIST] PUT /api/shopping-lists/${listId}/items/batch - Success - Duration: ${duration}ms - Updated: ${updatedItems.length} items, Missing: ${missingItemIds.length}, Failed: ${failedUpdates.length}`);
      
      // Return success response even if some items were missing or failed (partial success)
      res.json({ 
        updated: updatedItems.length, 
        items: updatedItems,
        missing: missingItemIds.length > 0 ? missingItemIds : undefined,
        failed: failedUpdates.length > 0 ? failedUpdates.length : undefined
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(
        {
          err: { message: error.message, code: error.code, status: error.status, stack: error.stack },
          name: error.name,
          isQuotaError: error.code === 'insufficient_quota' || error.status === 429,
          isPrismaError: error.code?.startsWith('P'),
          fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        },
        `[SHOPPING_LIST] PUT /api/shopping-lists/${req.params.listId}/items/batch - ERROR after ${duration}ms`,
      );
      
      // Never return 404 from batch endpoint - always return 500 with details
      // 404s should be handled internally as missing items
      res.status(500).json({ 
        error: 'Failed to batch update shopping list items',
        code: error.code || 'BATCH_UPDATE_ERROR',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Delete shopping list item
   * DELETE /api/shopping-lists/:listId/items/:itemId
   */
  async deleteItem(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { listId, itemId } = req.params;

      const shoppingList = await prisma.shoppingList.findFirst({
        where: { id: listId, userId },
      });

      if (!shoppingList) {
        return res.status(404).json({ error: 'Shopping list not found' });
      }

      const deleted = await prisma.shoppingListItem.deleteMany({
        where: { id: itemId, shoppingListId: listId },
      });

      if (deleted.count === 0) {
        return res.status(404).json({ error: 'Item not found in this list' });
      }

      res.json({ message: 'Item deleted successfully' });
    } catch (error: any) {
      logger.error({ err: error }, 'Error deleting shopping list item:');
      res.status(500).json({ error: 'Failed to delete shopping list item' });
    }
  },

  /**
   * Generate shopping list from recipes
   * POST /api/shopping-lists/generate-from-recipes
   */

  /**
   * Restore an archived shopping list, making it the active list.
   * POST /api/shopping-lists/:id/restore
   */
  async restoreList(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const result = await setActiveList(userId, id);
      res.json(result);
    } catch (error: any) {
      if (error.message && error.message.toLowerCase().includes('not found')) {
        return res.status(404).json({ error: 'Shopping list not found' });
      }
      logger.error({ err: error }, '[SHOPPING_LIST] Error restoring list:');
      res.status(500).json({ error: 'Unable to restore shopping list' });
    }
  },
};
