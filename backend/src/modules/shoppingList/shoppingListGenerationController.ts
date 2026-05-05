import { logger } from '../../utils/logger';
// backend/src/modules/shoppingList/shoppingListGenerationController.ts
// R1-2 stage B: extracted from shoppingListController.ts. Owns the
// recipe-to-list and meal-plan-to-list generation flow plus the purchase
// history surface and the budget preview that piggy-backs on the same
// ingredient aggregation logic. shoppingListController retains pure
// list/item CRUD.

import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { getUserId } from '../../utils/authHelper';
import { categorizeItem } from '../../utils/aisleCategorizer';
import { extractIngredientName } from '../../utils/ingredientNameExtractor';
import { notificationTriggerService } from '../../services/notificationTriggerService';

// Cap on how many recipes can be processed in a single generate-from-recipes /
// budget-preview call. Prevents DoS via massive IN(...) queries + unbounded item creation.
const MAX_RECIPE_IDS = 50;

export const shoppingListGenerationController = {
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
              const ingredientName = extractIngredientName(ing.text, parsed.unit);

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
      logger.error({ err: error }, 'Error generating shopping list from recipes:');
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

              const ingredientName = extractIngredientName(ing.text, scaledParsed.unit);

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
      notificationTriggerService.onShoppingListReady(userId, items.length).catch((err: unknown) => logger.error({ err }, 'shoppingList.notify.failed'));
    } catch (error: any) {
      logger.error({ err: error }, 'Error generating shopping list from meal plan:');
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
      logger.error({ err: error }, 'Error getting purchase history:');
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
      logger.error({ err: error }, 'Error getting recent purchases:');
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
      logger.error({ err: error }, 'Error toggling purchase history favorite:');
      res.status(500).json({ error: 'Failed to toggle favorite' });
    }
  },

  /**
   * Restore an archived shopping list, making it the active list.
   * POST /api/shopping-lists/:id/restore
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
      logger.error({ err: error }, 'Error generating budget preview:');
      res.status(500).json({ error: 'Failed to generate budget preview' });
    }
  },
};
