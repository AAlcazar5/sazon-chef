// backend/src/modules/shoppingList/shoppingListController.ts
// Shopping list management and 3rd party app integration

import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { getUserId } from '../../utils/authHelper';
import { notificationTriggerService } from '../../services/notificationTriggerService';
import { categorizeItem } from '../../utils/aisleCategorizer';
import { setActiveList, getActiveList } from '../../services/shoppingListLifecycleService';
import { resolveVoiceUtterance } from '../../services/voiceRecipeResolver';

// Cap on how many recipes can be processed in a single generate-from-recipes /
// budget-preview call. Prevents DoS via massive IN(...) queries + unbounded item creation.
const MAX_RECIPE_IDS = 50;

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
    console.error('[PANTRY_SYNC] Error auto-stocking pantry:', error);
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
    console.error('[PANTRY_SYNC] Error unstocking pantry:', error);
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
    console.error('[PURCHASE_HISTORY] Error recording purchase:', error);
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
      console.log(`[SHOPPING_LIST] GET /api/shopping-lists - User: ${userId}`);

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

      console.log(`[SHOPPING_LIST] GET /api/shopping-lists - Success - Found ${shoppingLists.length} lists`);
      res.json(shoppingLists);
    } catch (error: any) {
      console.error('[SHOPPING_LIST] GET /api/shopping-lists - ERROR:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        name: error.name,
      });
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

      console.log(`[SHOPPING_LIST] GET /api/shopping-lists/${id} - User: ${userId} - Start: ${new Date().toISOString()}`);

      const shoppingList = await prisma.shoppingList.findFirst({
        where: { id, userId },
      });

      if (!shoppingList) {
        console.log(`[SHOPPING_LIST] GET /api/shopping-lists/${id} - Not found`);
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
      console.log(`[SHOPPING_LIST] GET /api/shopping-lists/${id} - Success - Duration: ${duration}ms - Items: ${items.length}`);
      res.json(shoppingListWithItems);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[SHOPPING_LIST] GET /api/shopping-lists/${req.params.id} - ERROR after ${duration}ms:`, {
        message: error.message,
        code: error.code,
        status: error.status,
        stack: error.stack,
        name: error.name,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
      });
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
      console.error('Error creating shopping list:', error);
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
      console.error('Error updating shopping list:', error);
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
      console.error('Error deleting shopping list:', error);
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
      console.error('Error adding item to shopping list:', error);
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
        // Forward to generate-from-recipes. Stash and restore the original
        // body so we don't leave a mutated body for downstream middleware
        // (logging, request tracing).
        const originalBody = req.body;
        req.body = { recipeIds: [resolved.recipeId] };
        try {
          await shoppingListController.generateFromRecipes(req, res);
        } finally {
          req.body = originalBody;
        }
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
      console.error('Error in voice-add:', error);
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
      console.error('Error updating shopping list item:', error);
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

      console.log(`[SHOPPING_LIST] PUT /api/shopping-lists/${listId}/items/batch - User: ${userId} - Updates: ${updates?.length || 0} - Start: ${new Date().toISOString()}`);

      if (!Array.isArray(updates) || updates.length === 0) {
        console.log(`[SHOPPING_LIST] PUT /api/shopping-lists/${listId}/items/batch - Invalid request: updates array empty or missing`);
        return res.status(400).json({ error: 'Updates array is required and must not be empty' });
      }

      const shoppingList = await prisma.shoppingList.findFirst({
        where: { id: listId, userId },
      });

      if (!shoppingList) {
        console.log(`[SHOPPING_LIST] PUT /api/shopping-lists/${listId}/items/batch - List not found`);
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
        console.log(`[SHOPPING_LIST] PUT /api/shopping-lists/${listId}/items/batch - Some items not found:`, missingItemIds);
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
            console.log(`[SHOPPING_LIST] Failed to update item ${update.itemId}:`, error.code, error.message);
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
        console.log(`[SHOPPING_LIST] PUT /api/shopping-lists/${listId}/items/batch - ${failedUpdates.length} items failed to update:`, 
          failedUpdates.map((f: any) => f.reason?.message || f.reason));
      }

      // If some items were missing, include that in the response
      if (missingItemIds.length > 0) {
        console.log(`[SHOPPING_LIST] PUT /api/shopping-lists/${listId}/items/batch - Updated ${updatedItems.length} items, ${missingItemIds.length} items were missing`);
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
      console.log(`[SHOPPING_LIST] PUT /api/shopping-lists/${listId}/items/batch - Success - Duration: ${duration}ms - Updated: ${updatedItems.length} items, Missing: ${missingItemIds.length}, Failed: ${failedUpdates.length}`);
      
      // Return success response even if some items were missing or failed (partial success)
      res.json({ 
        updated: updatedItems.length, 
        items: updatedItems,
        missing: missingItemIds.length > 0 ? missingItemIds : undefined,
        failed: failedUpdates.length > 0 ? failedUpdates.length : undefined
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[SHOPPING_LIST] PUT /api/shopping-lists/${req.params.listId}/items/batch - ERROR after ${duration}ms:`, {
        message: error.message,
        code: error.code,
        status: error.status,
        stack: error.stack,
        name: error.name,
        isQuotaError: error.code === 'insufficient_quota' || error.status === 429,
        isPrismaError: error.code?.startsWith('P'),
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
      });
      
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
      console.error('Error deleting shopping list item:', error);
      res.status(500).json({ error: 'Failed to delete shopping list item' });
    }
  },

  /**
   * Generate shopping list from recipes
   * POST /api/shopping-lists/generate-from-recipes
   */
  async generateFromRecipes(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { recipeIds, shoppingListId, name, subtractPantry, servingsByRecipe } = req.body;

      if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
        return res.status(400).json({ error: 'Recipe IDs are required' });
      }
      if (recipeIds.length > MAX_RECIPE_IDS) {
        return res.status(400).json({ error: `Cannot generate from more than ${MAX_RECIPE_IDS} recipes at once` });
      }

      // Get recipes with ingredients — userId-scoped to prevent cross-user IDOR
      const recipes = await prisma.recipe.findMany({
        where: { id: { in: recipeIds }, userId },
        include: {
          ingredients: true,
        },
      });

      if (recipes.length === 0) {
        return res.status(404).json({ error: 'Recipes not found' });
      }

      // Aggregate ingredients using smart quantity parser
      const { parseIngredientQuantity, aggregateQuantities } = await import('../../utils/ingredientQuantityParser');
      const { calculatePurchaseQuantity } = await import('../../utils/packageSizeCalculator');
      const { normalizeIngredientName } = await import('../../utils/ingredientNormalizer');

      const ingredientQuantities = new Map<string, Array<{ amount: number; unit: string; originalText: string }>>();
      // Group 10Q: track which recipe IDs contributed each ingredient
      const ingredientSourceRecipes = new Map<string, Set<string>>();

        recipes.forEach((recipe) => {
          const multiplier = servingsByRecipe?.[recipe.id] ?? 1;
          recipe.ingredients.forEach((ing) => {
            const rawParsed = parseIngredientQuantity(ing.text);
            const parsed = rawParsed ? { ...rawParsed, amount: rawParsed.amount * multiplier } : null;
            if (parsed) {
              // Extract ingredient name from the original text
              // The parsed.originalText contains the full match, so we need to extract the ingredient name
              const text = ing.text.trim();
              let ingredientName: string = '';

              // Build a pattern to match the quantity and unit we parsed
              const unitStr = parsed.unit;

              // Try to match and remove the quantity + unit from the beginning
              // Handle various formats: "2 cups", "1/2 cup", "2.5 cups", etc.
              const patterns = [
                // Pattern with unit: "2 cups flour" or "1/2 cup milk"
                new RegExp(`^[\\d\\s\\/\\.]+\\s+${unitStr}\\s+(.+)$`, 'i'),
                // Pattern without explicit unit (for "2 chicken breasts" where unit is "piece")
                /^[\d\s\/\.]+\s+(.+)$/i,
              ];

              let matched = false;
              for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                  ingredientName = match[1].toLowerCase().trim();
                  matched = true;
                  break;
                }
              }

              if (!matched) {
                // Fallback: remove quantity and common unit words
                ingredientName = text
                  .replace(/^[\d\s\/\.]+/, '')
                  .replace(/^\s*(cup|cups|lb|lbs|oz|tbsp|tsp|piece|pieces|clove|cloves|bunch|bunches|fl\s*oz|pint|pints|quart|quarts|gallon|gallons|ml|l|liter|liters|g|gram|grams|kg|kilogram|kilograms)\s+/i, '')
                  .toLowerCase()
                  .trim() || text.toLowerCase().trim();
              }

              // Clean up: remove trailing commas, periods, etc.
              if (ingredientName) {
                ingredientName = ingredientName.replace(/[,\\.]+$/, '').trim();
              }

              if (!ingredientQuantities.has(ingredientName)) {
                ingredientQuantities.set(ingredientName, []);
              }
              ingredientQuantities.get(ingredientName)!.push(parsed);

              // Group 10Q: track source recipe
              if (!ingredientSourceRecipes.has(ingredientName)) {
                ingredientSourceRecipes.set(ingredientName, new Set());
              }
              ingredientSourceRecipes.get(ingredientName)!.add(recipe.id);
            }
          });
        });

      // --- Duplicate list detection (Jaccard >= 0.8 over recipeIds within 7d) ---
      if (!shoppingListId) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentLists = await prisma.shoppingList.findMany({
          where: { userId, createdAt: { gte: sevenDaysAgo } },
          select: { id: true, name: true, sourceRecipeIds: true },
        });

        const incomingSet = new Set<string>(recipeIds);
        let bestSimilarity = 0;
        let bestList: { id: string; name: string } | null = null;

        for (const existing of recentLists) {
          if (!existing.sourceRecipeIds) continue;
          let existingIds: string[] = [];
          try { existingIds = JSON.parse(existing.sourceRecipeIds as string); } catch { continue; }
          const existingSet = new Set<string>(existingIds);
          const intersectionSize = [...incomingSet].filter(id => existingSet.has(id)).length;
          const unionSize = new Set([...incomingSet, ...existingSet]).size;
          const similarity = unionSize === 0 ? 0 : intersectionSize / unionSize;
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestList = { id: existing.id, name: existing.name };
          }
        }

        if (bestSimilarity >= 0.8 && bestList) {
          return res.json({
            duplicateOf: bestList.id,
            similarity: bestSimilarity,
            existingListName: bestList.name,
          });
        }
      }

      // Get or create shopping list
      let shoppingList;
      if (shoppingListId) {
        shoppingList = await prisma.shoppingList.findFirst({
          where: { id: shoppingListId, userId },
        });

        if (!shoppingList) {
          return res.status(404).json({ error: 'Shopping list not found' });
        }
      } else {
        // Use provided name or default to date
        const listName = name || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        shoppingList = await prisma.shoppingList.create({
          data: {
            userId,
            name: listName,
            sourceRecipeIds: JSON.stringify(recipeIds),
          },
        });
      }

      // Exclude pantry items
      const pantryItems = await prisma.pantryItem.findMany({
        where: { userId },
        select: { name: true },
      });

      if (subtractPantry === true) {
        // Smart subtraction: normalize both sides and match on full name equality only
        const pantryNormalized = new Set(pantryItems.map(p => normalizeIngredientName(p.name)));
        for (const ingredientName of ingredientQuantities.keys()) {
          if (pantryNormalized.has(normalizeIngredientName(ingredientName))) {
            ingredientQuantities.delete(ingredientName);
          }
        }
      } else {
        // Existing behavior: simple lowercase match (backward compat)
        const pantrySet = new Set(pantryItems.map(p => p.name.toLowerCase().trim()));
        for (const ingredientName of ingredientQuantities.keys()) {
          if (pantrySet.has(ingredientName.toLowerCase().trim())) {
            ingredientQuantities.delete(ingredientName);
          }
        }
      }

      // Calculate smart purchase quantities and add items to shopping list
      const itemsToCreate: Array<{
        shoppingListId: string;
        name: string;
        quantity: string;
        category?: string;
        sourceRecipeIds?: string;
      }> = [];

      for (const [ingredientName, quantities] of ingredientQuantities.entries()) {
        // Aggregate quantities
        const aggregated = aggregateQuantities(ingredientName, quantities);

        // Calculate how much to actually buy (based on package sizes)
        const purchaseInfo = calculatePurchaseQuantity(aggregated);

        // Format quantity display
        const displayQuantity = purchaseInfo.displayText;

        // Group 10Q: attach category and source recipe IDs
        const category = categorizeItem(ingredientName) ?? undefined;
        const sourceIds = ingredientSourceRecipes.get(ingredientName);
        const sourceRecipeIds = sourceIds && sourceIds.size > 0
          ? JSON.stringify([...sourceIds])
          : undefined;

        itemsToCreate.push({
          shoppingListId: shoppingList.id,
          name: ingredientName.charAt(0).toUpperCase() + ingredientName.slice(1),
          quantity: displayQuantity,
          category,
          sourceRecipeIds,
        });
      }

      const items = await Promise.all(
        itemsToCreate.map((itemData) =>
          prisma.shoppingListItem.create({
            data: itemData,
          })
        )
      );

      const updatedList = await prisma.shoppingList.findUnique({
        where: { id: shoppingList.id },
        include: {
          items: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      res.status(201).json({
        shoppingList: updatedList,
        itemsAdded: items.length,
      });
    } catch (error: any) {
      console.error('Error generating shopping list from recipes:', error);
      res.status(500).json({ error: 'Failed to generate shopping list from recipes' });
    }
  },

  /**
   * Generate shopping list from meal plan
   * POST /api/shopping-lists/generate-from-meal-plan
   */
  async generateFromMealPlan(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { mealPlanId, shoppingListId, startDate, endDate, recipeIds, name } = req.body;

      // If recipe IDs are provided directly, use them instead of looking for meal plan
      if (recipeIds && Array.isArray(recipeIds) && recipeIds.length > 0) {
        if (recipeIds.length > MAX_RECIPE_IDS) {
          return res.status(400).json({ error: `Cannot generate from more than ${MAX_RECIPE_IDS} recipes at once` });
        }
        const recipes = await prisma.recipe.findMany({
          where: { id: { in: recipeIds }, userId },
          include: {
            ingredients: true,
          },
        });

        if (recipes.length === 0) {
          return res.status(404).json({ error: 'No recipes found with provided IDs' });
        }

        // Check for meal prep portions for these recipes (to get scaled quantities)
        const mealPrepPortions = await prisma.mealPrepPortion.findMany({
          where: {
            userId,
            recipeId: { in: recipeIds },
            // Only include portions that haven't been fully consumed
            OR: [
              { freshServingsRemaining: { gt: 0 } },
              { frozenServingsRemaining: { gt: 0 } },
            ],
          },
        });

        // Create a map of recipe ID to meal prep scale factor
        const recipeScaleFactors = new Map<string, number>();
        mealPrepPortions.forEach((portion) => {
          const recipe = recipes.find(r => r.id === portion.recipeId);
          if (recipe) {
            const originalServings = recipe.servings || 1;
            const scaleFactor = portion.totalServings / originalServings;
            // If multiple portions exist for same recipe, use the maximum scale factor
            const existingFactor = recipeScaleFactors.get(portion.recipeId) || 1;
            recipeScaleFactors.set(portion.recipeId, Math.max(existingFactor, scaleFactor));
          }
        });

        // Aggregate ingredients from recipes using smart quantity parser
        const { parseIngredientQuantity, aggregateQuantities } = await import('../../utils/ingredientQuantityParser');
        const { calculatePurchaseQuantity } = await import('../../utils/packageSizeCalculator');
        
        const ingredientQuantities = new Map<string, Array<{ amount: number; unit: string; originalText: string }>>();
        // Group 10Q: track which recipes contributed each ingredient
        const ingredientSourceRecipesMP = new Map<string, Set<string>>();

        recipes.forEach((recipe) => {
          const scaleFactor = recipeScaleFactors.get(recipe.id) || 1;

          recipe.ingredients.forEach((ing) => {
            const parsed = parseIngredientQuantity(ing.text);
            if (parsed) {
              // Scale the amount if this recipe has meal prep portions
              const scaledAmount = parsed.amount * scaleFactor;
              const scaledParsed = {
                ...parsed,
                amount: scaledAmount,
              };

              // Extract ingredient name (remove quantity from text)
              const nameMatch = ing.text.replace(/^[\d\s\/\.]+/, '').trim();
              const ingredientName = nameMatch.toLowerCase().trim();

              if (!ingredientQuantities.has(ingredientName)) {
                ingredientQuantities.set(ingredientName, []);
              }
              ingredientQuantities.get(ingredientName)!.push(scaledParsed);

              // Group 10Q: track source recipe
              if (!ingredientSourceRecipesMP.has(ingredientName)) {
                ingredientSourceRecipesMP.set(ingredientName, new Set());
              }
              ingredientSourceRecipesMP.get(ingredientName)!.add(recipe.id);
            }
          });
        });

        // Get or create shopping list
        let shoppingList;
        if (shoppingListId) {
          shoppingList = await prisma.shoppingList.findFirst({
            where: { id: shoppingListId, userId },
          });

          if (!shoppingList) {
            return res.status(404).json({ error: 'Shopping list not found' });
          }
        } else {
          // Use provided name, meal plan name, or default to date
          const listName = name || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          shoppingList = await prisma.shoppingList.create({
            data: {
              userId,
              name: listName,
            },
          });
        }

        // Exclude pantry items (staples user always has on hand)
        const pantryItems = await prisma.pantryItem.findMany({
          where: { userId },
          select: { name: true },
        });
        const pantrySet = new Set(pantryItems.map(p => p.name.toLowerCase().trim()));

        for (const ingredientName of ingredientQuantities.keys()) {
          if (pantrySet.has(ingredientName.toLowerCase().trim())) {
            ingredientQuantities.delete(ingredientName);
          }
        }

        // Calculate smart purchase quantities for each ingredient
        const itemsToCreate: Array<{
          shoppingListId: string;
          name: string;
          quantity: string;
          category?: string;
          sourceRecipeIds?: string;
        }> = [];

        for (const [ingredientName, quantities] of ingredientQuantities.entries()) {
          // Aggregate quantities
          const aggregated = aggregateQuantities(ingredientName, quantities);

          // Calculate how much to actually buy (based on package sizes)
          const purchaseInfo = calculatePurchaseQuantity(aggregated);

          // Format quantity display
          const displayQuantity = purchaseInfo.displayText;

          const sourceIds = ingredientSourceRecipesMP.get(ingredientName);
          const sourceRecipeIds = sourceIds && sourceIds.size > 0
            ? JSON.stringify([...sourceIds])
            : undefined;

          itemsToCreate.push({
            shoppingListId: shoppingList.id,
            name: ingredientName.charAt(0).toUpperCase() + ingredientName.slice(1),
            quantity: displayQuantity,
            category: categorizeItem(ingredientName) ?? undefined,
            sourceRecipeIds,
          });
        }

        // Avoid duplicates
        const existingItems = await prisma.shoppingListItem.findMany({
          where: { shoppingListId: shoppingList.id },
        });

        const existingNames = new Set(
          existingItems.map(item => item.name.toLowerCase().trim())
        );

        const itemsToCreateFiltered = itemsToCreate.filter(
          (item) => !existingNames.has(item.name.toLowerCase().trim())
        );

        const items = await Promise.all(
          itemsToCreateFiltered.map((itemData) =>
            prisma.shoppingListItem.create({
              data: itemData,
            })
          )
        );

        const updatedList = await prisma.shoppingList.findUnique({
          where: { id: shoppingList.id },
          include: {
            items: {
              orderBy: { createdAt: 'asc' },
            },
          },
        });

        // Calculate estimated cost
        let estimatedCost = null;
        try {
          const { calculateRecipeCost } = await import('../../utils/costCalculator');
          let totalCost = 0;
          let costCount = 0;

          for (const recipe of recipes) {
            try {
              const costResult = await calculateRecipeCost(recipe.id, userId);
              if (costResult.estimatedCost) {
                totalCost += costResult.estimatedCost;
                costCount++;
              }
            } catch (error) {
              // Skip if cost calculation fails
            }
          }

          if (costCount > 0) {
            estimatedCost = totalCost;
          }
        } catch (error) {
          // Cost calculation is optional
        }

        return res.status(201).json({
          shoppingList: updatedList,
          itemsAdded: items.length,
          totalItems: updatedList?.items.length || 0,
          estimatedCost,
          source: 'recipes',
        });
      }

      // Get meal plan with meals
      let mealPlan;
      if (mealPlanId) {
        mealPlan = await prisma.mealPlan.findFirst({
          where: { id: mealPlanId, userId },
          include: {
            meals: {
              where: {
                recipeId: { not: null }, // Only meals with recipes
                ...(startDate && endDate ? {
                  date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                  },
                } : {}),
              },
              include: {
                recipe: {
                  include: {
                    ingredients: true,
                  },
                },
              },
            },
          },
        });

        if (!mealPlan) {
          return res.status(404).json({ error: 'Meal plan not found' });
        }
      } else {
        // If no meal plan ID, get active meal plan for the week
        const start = startDate ? new Date(startDate) : new Date();
        const end = endDate ? new Date(endDate) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

        mealPlan = await prisma.mealPlan.findFirst({
          where: {
            userId,
            isActive: true,
            startDate: { lte: end },
            endDate: { gte: start },
          },
          include: {
            meals: {
              where: {
                recipeId: { not: null },
                date: {
                  gte: start,
                  lte: end,
                },
              },
              include: {
                recipe: {
                  include: {
                    ingredients: true,
                  },
                },
              },
            },
          },
        });

        if (!mealPlan) {
          return res.status(404).json({ error: 'No active meal plan found for the specified period' });
        }
      }

      if (!mealPlan.meals || mealPlan.meals.length === 0) {
        return res.status(400).json({ error: 'Meal plan has no meals with recipes' });
      }

      // Get recipe IDs from meal plan
      const mealPlanRecipeIds = mealPlan.meals
        .filter(meal => meal.recipeId)
        .map(meal => meal.recipeId!);

      // Check for meal prep portions for these recipes (to get scaled quantities)
      const mealPrepPortions = await prisma.mealPrepPortion.findMany({
        where: {
          userId,
          recipeId: { in: mealPlanRecipeIds },
          // Only include portions that haven't been fully consumed
          OR: [
            { freshServingsRemaining: { gt: 0 } },
            { frozenServingsRemaining: { gt: 0 } },
          ],
        },
      });

      // Create a map of recipe ID to meal prep scale factor
      const recipeScaleFactors = new Map<string, number>();
      mealPrepPortions.forEach((portion) => {
        const meal = mealPlan.meals.find(m => m.recipeId === portion.recipeId);
        if (meal && meal.recipe) {
          const originalServings = meal.recipe.servings || 1;
          const scaleFactor = portion.totalServings / originalServings;
          // If multiple portions exist for same recipe, use the maximum scale factor
          const existingFactor = recipeScaleFactors.get(portion.recipeId) || 1;
          recipeScaleFactors.set(portion.recipeId, Math.max(existingFactor, scaleFactor));
        }
      });

      // Aggregate ingredients from all recipes in the meal plan using smart quantity parser
      const { parseIngredientQuantity, aggregateQuantities } = await import('../../utils/ingredientQuantityParser');
      const { calculatePurchaseQuantity } = await import('../../utils/packageSizeCalculator');
      
      const ingredientQuantities = new Map<string, Array<{ amount: number; unit: string; originalText: string }>>();
      const ingredientSourceRecipesMealPlan = new Map<string, Set<string>>();

      mealPlan.meals.forEach((meal) => {
        if (!meal.recipe) return;

        const recipe = meal.recipe;
        const scaleFactor = recipeScaleFactors.get(recipe.id) || 1;

        recipe.ingredients.forEach((ing) => {
          const parsed = parseIngredientQuantity(ing.text);
          if (parsed) {
            // Scale the amount if this recipe has meal prep portions
            const scaledAmount = parsed.amount * scaleFactor;
            const scaledParsed = {
              ...parsed,
              amount: scaledAmount,
            };

            // Extract ingredient name (remove quantity and unit from text)
            // Pattern: "2 cups flour" -> extract "flour"
            const text = ing.text.trim();
            // Remove the parsed quantity and unit from the beginning
            const quantityUnitPattern = /^[\d\s\/\.]+\s+(cup|cups|lb|lbs|oz|tbsp|tsp|piece|pieces|clove|cloves|bunch|bunches|fl\s*oz|pint|pints|quart|quarts|gallon|gallons|ml|l|liter|liters|g|gram|grams|kg|kilogram|kilograms)\s+/i;
            const match = text.match(quantityUnitPattern);
            let ingredientName: string = '';

            if (match) {
              // Extract everything after the quantity and unit
              ingredientName = text.substring(match[0].length).toLowerCase().trim();
            } else {
              // Fallback: try simpler pattern
              const simpleMatch = text.match(/^[\d\s\/\.]+\s+\w+\s+(.+)$/i);
              ingredientName = simpleMatch
                ? simpleMatch[1].toLowerCase().trim()
                : text.replace(/^[\d\s\/\.]+\s+\w+\s*/, '').toLowerCase().trim() || text.toLowerCase().trim();
            }

            // Clean up: remove trailing commas, periods, etc.
            if (ingredientName) {
              ingredientName = ingredientName.replace(/[,\\.]+$/, '').trim();
            }

            if (!ingredientQuantities.has(ingredientName)) {
              ingredientQuantities.set(ingredientName, []);
            }
            ingredientQuantities.get(ingredientName)!.push(scaledParsed);

            if (!ingredientSourceRecipesMealPlan.has(ingredientName)) {
              ingredientSourceRecipesMealPlan.set(ingredientName, new Set());
            }
            ingredientSourceRecipesMealPlan.get(ingredientName)!.add(recipe.id);
          }
        });
      });

      // Get or create shopping list
      let shoppingList;
      if (shoppingListId) {
        shoppingList = await prisma.shoppingList.findFirst({
          where: { id: shoppingListId, userId },
        });

        if (!shoppingList) {
          return res.status(404).json({ error: 'Shopping list not found' });
        }
      } else {
        // Use provided name, meal plan name, or default to date
        const listName = name || (mealPlan.name
          ? mealPlan.name
          : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));

        shoppingList = await prisma.shoppingList.create({
          data: {
            userId,
            name: listName,
          },
        });
      }

      // Exclude pantry items (staples user always has on hand)
      const pantryItemsForExclusion = await prisma.pantryItem.findMany({
        where: { userId },
        select: { name: true },
      });
      const pantrySetForExclusion = new Set(pantryItemsForExclusion.map(p => p.name.toLowerCase().trim()));

      for (const ingredientName of ingredientQuantities.keys()) {
        if (pantrySetForExclusion.has(ingredientName.toLowerCase().trim())) {
          ingredientQuantities.delete(ingredientName);
        }
      }

      // Calculate smart purchase quantities for each ingredient
      const itemsToCreate: Array<{
        shoppingListId: string;
        name: string;
        quantity: string;
        category?: string;
        sourceRecipeIds?: string;
      }> = [];

      for (const [ingredientName, quantities] of ingredientQuantities.entries()) {
        // Aggregate quantities
        const aggregated = aggregateQuantities(ingredientName, quantities);

        // Calculate how much to actually buy (based on package sizes)
        const purchaseInfo = calculatePurchaseQuantity(aggregated);

        // Format quantity display
        const displayQuantity = purchaseInfo.displayText;

        const sourceIdsMPlan = ingredientSourceRecipesMealPlan.get(ingredientName);
        const sourceRecipeIds = sourceIdsMPlan && sourceIdsMPlan.size > 0
          ? JSON.stringify([...sourceIdsMPlan])
          : undefined;

        itemsToCreate.push({
          shoppingListId: shoppingList.id,
          name: ingredientName.charAt(0).toUpperCase() + ingredientName.slice(1),
          quantity: displayQuantity,
          category: categorizeItem(ingredientName) ?? undefined,
          sourceRecipeIds,
        });
      }

      // Avoid duplicates
      const existingItems = await prisma.shoppingListItem.findMany({
        where: { shoppingListId: shoppingList.id },
      });

      const existingNames = new Set(
        existingItems.map(item => item.name.toLowerCase().trim())
      );

      const itemsToCreateFiltered = itemsToCreate.filter(
        (item) => !existingNames.has(item.name.toLowerCase().trim())
      );

      const items = await Promise.all(
        itemsToCreateFiltered.map((itemData) =>
          prisma.shoppingListItem.create({
            data: itemData,
          })
        )
      );

      const updatedList = await prisma.shoppingList.findUnique({
        where: { id: shoppingList.id },
        include: {
          items: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      // Calculate estimated cost if cost tracking is available
      let estimatedCost = null;
      try {
        const { calculateRecipeCost } = await import('../../utils/costCalculator');
        let totalCost = 0;
        let costCount = 0;

        for (const meal of mealPlan.meals) {
          if (meal.recipe) {
            try {
              const costResult = await calculateRecipeCost(meal.recipe.id, userId);
              if (costResult.estimatedCost) {
                totalCost += costResult.estimatedCost;
                costCount++;
              }
            } catch (error) {
              // Skip if cost calculation fails
            }
          }
        }

        if (costCount > 0) {
          estimatedCost = totalCost;
        }
      } catch (error) {
        // Cost calculation is optional
      }

      res.status(201).json({
        shoppingList: updatedList,
        itemsAdded: items.length,
        totalItems: updatedList?.items.length || 0,
        estimatedCost,
        mealPlan: {
          id: mealPlan.id,
          name: mealPlan.name,
          startDate: mealPlan.startDate,
          endDate: mealPlan.endDate,
          mealsCount: mealPlan.meals.length,
        },
      });

      // Fire-and-forget: notify user their shopping list is ready
      notificationTriggerService.onShoppingListReady(userId, items.length).catch(console.error);
    } catch (error: any) {
      console.error('Error generating shopping list from meal plan:', error);
      res.status(500).json({ error: 'Failed to generate shopping list from meal plan' });
    }
  },

  /**
   * Get purchase history for a user
   * GET /api/shopping-lists/purchase-history
   * Query: ?limit=20&favorites=true&since=2025-01-01
   */
  async getPurchaseHistory(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const limit = parseInt(req.query.limit as string) || 20;
      const favoritesOnly = req.query.favorites === 'true';
      const since = req.query.since ? new Date(req.query.since as string) : undefined;

      const where: any = { userId };
      if (favoritesOnly) where.isFavorite = true;
      if (since) where.lastPurchasedAt = { gte: since };

      const items = await prisma.purchaseHistory.findMany({
        where,
        orderBy: [
          { isFavorite: 'desc' },
          { purchaseCount: 'desc' },
          { lastPurchasedAt: 'desc' },
        ],
        take: limit,
      });

      res.json(items);
    } catch (error: any) {
      console.error('Error getting purchase history:', error);
      res.status(500).json({ error: 'Failed to get purchase history' });
    }
  },

  /**
   * Get items purchased in the last N days
   * GET /api/shopping-lists/purchase-history/recent?days=7
   */
  async getRecentPurchases(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const days = parseInt(req.query.days as string) || 7;
      const since = new Date();
      since.setDate(since.getDate() - days);

      const items = await prisma.purchaseHistory.findMany({
        where: {
          userId,
          lastPurchasedAt: { gte: since },
        },
        orderBy: { lastPurchasedAt: 'desc' },
      });

      res.json(items);
    } catch (error: any) {
      console.error('Error getting recent purchases:', error);
      res.status(500).json({ error: 'Failed to get recent purchases' });
    }
  },

  /**
   * Toggle favorite status on a purchase history item
   * PUT /api/shopping-lists/purchase-history/:id/favorite
   */
  async togglePurchaseHistoryFavorite(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const item = await prisma.purchaseHistory.findFirst({
        where: { id, userId },
      });

      if (!item) {
        return res.status(404).json({ error: 'Purchase history item not found' });
      }

      const updated = await prisma.purchaseHistory.update({
        where: { id },
        data: { isFavorite: !item.isFavorite },
      });

      res.json(updated);
    } catch (error: any) {
      console.error('Error toggling purchase history favorite:', error);
      res.status(500).json({ error: 'Failed to toggle favorite' });
    }
  },

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
      console.error('[SHOPPING_LIST] Error restoring list:', error);
      res.status(500).json({ error: 'Unable to restore shopping list' });
    }
  },

  /**
   * Budget preview for a set of recipes
   * POST /api/shopping-lists/budget-preview
   * Body: { recipeIds: string[], servingsByRecipe?: Record<recipeId, number> }
   * (legacy alias `servingsMultiplier` is also accepted)
   * Returns: { items: [{ name, quantity, unit, estimatedCents, hasUserHistory }], totalCents }
   */
  async getBudgetPreview(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { recipeIds, servingsByRecipe, servingsMultiplier: legacyServings } = req.body;
      const servingsMultiplier = servingsByRecipe ?? legacyServings;

      if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
        return res.status(400).json({ error: 'Recipe IDs are required' });
      }
      if (recipeIds.length > MAX_RECIPE_IDS) {
        return res.status(400).json({ error: `Cannot preview more than ${MAX_RECIPE_IDS} recipes at once` });
      }

      const DEFAULT_AISLE_PRICE_CENTS: Record<string, number> = {
        Produce: 250,
        Meat: 800,
        Dairy: 400,
        Pantry: 350,
        Frozen: 500,
        Other: 300,
      };

      // Determine aisle from category string
      function categoryToAisle(category: string | null | undefined): string {
        if (!category) return 'Other';
        const lower = (category || '').toLowerCase();
        if (lower.includes('produce') || lower.includes('vegetable') || lower.includes('fruit')) return 'Produce';
        if (lower.includes('meat') || lower.includes('poultry') || lower.includes('seafood') || lower.includes('fish')) return 'Meat';
        if (lower.includes('dairy') || lower.includes('cheese') || lower.includes('milk') || lower.includes('egg')) return 'Dairy';
        if (lower.includes('frozen')) return 'Frozen';
        if (lower.includes('pantry') || lower.includes('baking') || lower.includes('grain') || lower.includes('spice') || lower.includes('condiment')) return 'Pantry';
        return 'Other';
      }

      // Infer ingredient aisle from name
      function ingredientNameToAisle(name: string): string {
        const lower = name.toLowerCase();
        if (/flour|sugar|salt|pepper|spice|oil|vinegar|sauce|paste|broth|stock|can|canned|bread|rice|pasta|cereal|grain|bean|lentil|nut|seed/.test(lower)) return 'Pantry';
        if (/milk|cream|butter|cheese|yogurt|egg/.test(lower)) return 'Dairy';
        if (/chicken|beef|pork|turkey|fish|shrimp|salmon|tuna|meat|steak|ground/.test(lower)) return 'Meat';
        if (/frozen|ice/.test(lower)) return 'Frozen';
        if (/apple|banana|berry|tomato|onion|garlic|potato|carrot|spinach|kale|lettuce|pepper|vegetable|fruit|herb|parsley|cilantro|basil|lemon|lime|orange/.test(lower)) return 'Produce';
        return 'Other';
      }

      const { parseIngredientQuantity } = await import('../../utils/ingredientQuantityParser');
      const { normalizeIngredientName } = await import('../../utils/ingredientNormalizer');

      // Get recipes with ingredients — userId-scoped to prevent cross-user IDOR
      const recipes = await prisma.recipe.findMany({
        where: { id: { in: recipeIds }, userId },
        include: { ingredients: true },
      });

      // Aggregate ingredients (with optional servingsMultiplier)
      const ingredientMap = new Map<string, { amount: number; unit: string; rawName: string }>();

      // Broad unit words to strip when extracting ingredient name
      const UNIT_WORDS = 'cups?|tablespoons?|tbsps?|teaspoons?|tsps?|pounds?|lbs?|ounces?|oz|grams?|g|kilograms?|kg|milliliters?|ml|liters?|l|fl\\.?\\s*oz|pints?|quarts?|gallons?|pieces?|items?|each|whole|heads?|bunches?|cloves?';

      for (const recipe of recipes) {
        const multiplier = servingsMultiplier?.[recipe.id] ?? 1;
        for (const ing of recipe.ingredients) {
          const parsed = parseIngredientQuantity(ing.text);
          if (!parsed) continue;

          const text = ing.text.trim();
          let ingredientName = '';

          // Try to strip leading quantity + any known unit word
          const unitMatch = text.match(new RegExp(`^[\\d\\s\\/\\.]+\\s+(?:${UNIT_WORDS})\\s+(.+)$`, 'i'));
          if (unitMatch?.[1]) {
            ingredientName = unitMatch[1].toLowerCase().trim();
          } else {
            // Strip just leading numbers (count-only items like "2 eggs")
            const countMatch = text.match(/^[\d\s\/\.]+\s+(.+)$/i);
            if (countMatch?.[1]) {
              ingredientName = countMatch[1].toLowerCase().trim();
            } else {
              ingredientName = text.toLowerCase().trim();
            }
          }
          ingredientName = ingredientName.replace(/[,\.]+$/, '').trim();

          const existing = ingredientMap.get(ingredientName);
          const scaledAmount = parsed.amount * multiplier;
          if (existing && existing.unit === parsed.unit) {
            ingredientMap.set(ingredientName, { amount: existing.amount + scaledAmount, unit: parsed.unit, rawName: ingredientName });
          } else {
            ingredientMap.set(ingredientName, { amount: scaledAmount, unit: parsed.unit, rawName: ingredientName });
          }
        }
      }

      // Query user purchase history (90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const purchaseHistory = await prisma.purchaseHistory.findMany({
        where: { userId, lastPurchasedAt: { gte: ninetyDaysAgo } },
      });

      // Build per-item price map: normalizedName → priceCents[]
      const userPriceMap = new Map<string, number[]>();
      const aisleHistoryMap = new Map<string, number[]>(); // aisle → priceCents[]

      for (const ph of purchaseHistory) {
        if (ph.lastPrice == null) continue;
        const priceCents = Math.round(ph.lastPrice * 100);
        const normName = normalizeIngredientName(ph.itemName);
        if (!userPriceMap.has(normName)) userPriceMap.set(normName, []);
        userPriceMap.get(normName)!.push(priceCents);

        const aisle = categoryToAisle(ph.category);
        if (!aisleHistoryMap.has(aisle)) aisleHistoryMap.set(aisle, []);
        aisleHistoryMap.get(aisle)!.push(priceCents);
      }

      function median(values: number[]): number {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
          ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
          : sorted[mid];
      }

      // Build result items
      const items: Array<{ name: string; quantity: number; unit: string; estimatedCents: number; hasUserHistory: boolean }> = [];

      for (const [ingredientName, { amount, unit }] of ingredientMap) {
        const normName = normalizeIngredientName(ingredientName);
        const userPrices = userPriceMap.get(normName);
        let estimatedCents: number;
        let hasUserHistory: boolean;

        if (userPrices && userPrices.length > 0) {
          estimatedCents = median(userPrices);
          hasUserHistory = true;
        } else {
          const aisle = ingredientNameToAisle(ingredientName);
          const aisleHistory = aisleHistoryMap.get(aisle);
          if (aisleHistory && aisleHistory.length > 0) {
            estimatedCents = median(aisleHistory);
          } else {
            estimatedCents = DEFAULT_AISLE_PRICE_CENTS[aisle] ?? DEFAULT_AISLE_PRICE_CENTS.Other;
          }
          hasUserHistory = false;
        }

        items.push({ name: ingredientName, quantity: amount, unit, estimatedCents, hasUserHistory });
      }

      const totalCents = items.reduce((sum, i) => sum + i.estimatedCents, 0);

      res.json({ items, totalCents });
    } catch (error: any) {
      console.error('Error generating budget preview:', error);
      res.status(500).json({ error: 'Failed to generate budget preview' });
    }
  },

  // ─── Group 10Q-ListMgmt ──────────────────────────────────────────────────

  /**
   * POST /api/shopping-lists/:id/done
   * "I'm done shopping" explicit action.
   * Archives the current list, rolls un-purchased items into a new list named
   * "Unfinished from <MMM d>", sets the new list as active, returns counts.
   * If all items are purchased, no new list is created.
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

      // Archive the current list via lifecycle service
      const { archiveList, setActiveList } = await import('../../services/shoppingListLifecycleService');
      await archiveList(userId, id);

      const unpurchasedItems = items.filter((i) => !i.purchased);

      if (unpurchasedItems.length === 0) {
        return res.json({
          archivedListId: id,
          rolledOverItemCount: 0,
        });
      }

      // Format archive date as "MMM d" (e.g., "Apr 30")
      const archiveDate = new Date();
      const dateLabel = archiveDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const newListName = `Unfinished from ${dateLabel}`;

      // Create new list with rolled-over items
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

      // Set new list as active
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

      // Find lists archived in the last 48 hours
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

      // Pre-load dismissals + items in 2 queries instead of 2N
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

      // Find best overlap candidate that hasn't been dismissed
      for (const candidate of recentArchived) {
        if (dismissedSet.has(candidate.id)) continue;

        const candidateSet = itemsByList.get(candidate.id) ?? new Set<string>();

        // Jaccard similarity: |A ∩ B| / |A ∪ B|
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

      // Verify the suggestionId is a list owned by this user — prevents
      // creating MergeDismissal records pointing at arbitrary list IDs.
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
        // P2002 = unique constraint violation — already dismissed, idempotent
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

