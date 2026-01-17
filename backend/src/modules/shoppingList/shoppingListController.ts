// backend/src/modules/shoppingList/shoppingListController.ts
// Shopping list management and 3rd party app integration

import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { getUserId } from '../../utils/authHelper';

export const shoppingListController = {
  /**
   * Get all shopping lists for a user
   * GET /api/shopping-lists
   */
  async getShoppingLists(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      console.log(`[SHOPPING_LIST] GET /api/shopping-lists - User: ${userId}`);

      // Try without items first to isolate the issue
      let shoppingLists = await prisma.shoppingList.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      // Fetch items for each list
      shoppingLists = await Promise.all(
        shoppingLists.map(async (list) => {
          const items = await prisma.shoppingListItem.findMany({
            where: { shoppingListId: list.id },
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
          return { ...list, items };
        })
      );

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
      const { name, quantity, category, notes } = req.body;

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
        },
      });

      res.status(201).json(item);
    } catch (error: any) {
      console.error('Error adding item to shopping list:', error);
      res.status(500).json({ error: 'Failed to add item to shopping list' });
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
      const { name, quantity, category, purchased, notes } = req.body;

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
        where: { id: itemId },
        data: {
          ...(name && { name }),
          ...(quantity && { quantity }),
          ...(category !== undefined && { category }),
          ...(purchased !== undefined && { purchased }),
          ...(notes !== undefined && { notes }),
        },
      });

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
        select: { id: true },
      });

      const existingItemIds = new Set(existingItems.map(item => item.id));
      const missingItemIds = itemIds.filter(id => !existingItemIds.has(id));

      if (missingItemIds.length > 0) {
        console.log(`[SHOPPING_LIST] PUT /api/shopping-lists/${listId}/items/batch - Some items not found:`, missingItemIds);
        // Continue with items that exist, but log the missing ones
      }

      // Update only items that exist, using Promise.allSettled to handle individual failures gracefully
      const validUpdates = updates.filter((u: { itemId: string }) => existingItemIds.has(u.itemId));
      
      const updateResults = await Promise.allSettled(
        validUpdates.map(async (update: { itemId: string; purchased?: boolean; name?: string; quantity?: string; category?: string | null; notes?: string | null }) => {
          try {
            const { itemId, ...data } = update;
            
            // Remove undefined values
            const updateData: any = {};
            if (data.purchased !== undefined) updateData.purchased = data.purchased;
            if (data.name !== undefined) updateData.name = data.name;
            if (data.quantity !== undefined) updateData.quantity = data.quantity;
            if (data.category !== undefined) updateData.category = data.category;
            if (data.notes !== undefined) updateData.notes = data.notes;

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

      // Return success even if some items were missing or failed (partial success)
      // This allows the frontend to handle gracefully

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

      await prisma.shoppingListItem.delete({
        where: { id: itemId },
      });

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
      const { recipeIds, shoppingListId, name } = req.body;

      if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
        return res.status(400).json({ error: 'Recipe IDs are required' });
      }

      // Get recipes with ingredients
      const recipes = await prisma.recipe.findMany({
        where: { id: { in: recipeIds } },
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
      
      const ingredientQuantities = new Map<string, Array<{ amount: number; unit: string; originalText: string }>>();

        recipes.forEach((recipe) => {
          recipe.ingredients.forEach((ing) => {
            const parsed = parseIngredientQuantity(ing.text);
            if (parsed) {
              // Extract ingredient name from the original text
              // The parsed.originalText contains the full match, so we need to extract the ingredient name
              const text = ing.text.trim();
              let ingredientName: string = '';
              
              // Build a pattern to match the quantity and unit we parsed
              const quantityStr = parsed.amount.toString();
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
        // Use provided name or default to date
        const listName = name || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        shoppingList = await prisma.shoppingList.create({
          data: {
            userId,
            name: listName,
          },
        });
      }

      // Calculate smart purchase quantities and add items to shopping list
      const itemsToCreate: Array<{
        shoppingListId: string;
        name: string;
        quantity: string;
        category?: string;
      }> = [];

      for (const [ingredientName, quantities] of ingredientQuantities.entries()) {
        // Aggregate quantities
        const aggregated = aggregateQuantities(ingredientName, quantities);
        
        // Calculate how much to actually buy (based on package sizes)
        const purchaseInfo = calculatePurchaseQuantity(aggregated);
        
        // Format quantity display
        const displayQuantity = purchaseInfo.displayText;
        
        itemsToCreate.push({
          shoppingListId: shoppingList.id,
          name: ingredientName.charAt(0).toUpperCase() + ingredientName.slice(1),
          quantity: displayQuantity,
          category: undefined,
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
        const recipes = await prisma.recipe.findMany({
          where: { id: { in: recipeIds } },
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

        // Calculate smart purchase quantities for each ingredient
        const itemsToCreate: Array<{
          shoppingListId: string;
          name: string;
          quantity: string;
          category?: string;
        }> = [];

        for (const [ingredientName, quantities] of ingredientQuantities.entries()) {
          // Aggregate quantities
          const aggregated = aggregateQuantities(ingredientName, quantities);
          
          // Calculate how much to actually buy (based on package sizes)
          const purchaseInfo = calculatePurchaseQuantity(aggregated);
          
          // Format quantity display
          const displayQuantity = purchaseInfo.displayText;
          
          itemsToCreate.push({
            shoppingListId: shoppingList.id,
            name: ingredientName.charAt(0).toUpperCase() + ingredientName.slice(1),
            quantity: displayQuantity,
            category: undefined,
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

      // Calculate smart purchase quantities for each ingredient
      const itemsToCreate: Array<{
        shoppingListId: string;
        name: string;
        quantity: string;
        category?: string;
      }> = [];

      for (const [ingredientName, quantities] of ingredientQuantities.entries()) {
        // Aggregate quantities
        const aggregated = aggregateQuantities(ingredientName, quantities);
        
        // Calculate how much to actually buy (based on package sizes)
        const purchaseInfo = calculatePurchaseQuantity(aggregated);
        
        // Format quantity display
        const displayQuantity = purchaseInfo.displayText;
        
        itemsToCreate.push({
          shoppingListId: shoppingList.id,
          name: ingredientName.charAt(0).toUpperCase() + ingredientName.slice(1),
          quantity: displayQuantity,
          category: undefined,
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
    } catch (error: any) {
      console.error('Error generating shopping list from meal plan:', error);
      res.status(500).json({ error: 'Failed to generate shopping list from meal plan' });
    }
  },
};

