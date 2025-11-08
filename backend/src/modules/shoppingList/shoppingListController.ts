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

      const shoppingLists = await prisma.shoppingList.findMany({
        where: { userId },
        include: {
          items: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      res.json(shoppingLists);
    } catch (error: any) {
      console.error('Error getting shopping lists:', error);
      res.status(500).json({ error: 'Failed to get shopping lists' });
    }
  },

  /**
   * Get a single shopping list
   * GET /api/shopping-lists/:id
   */
  async getShoppingList(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const shoppingList = await prisma.shoppingList.findFirst({
        where: { id, userId },
        include: {
          items: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!shoppingList) {
        return res.status(404).json({ error: 'Shopping list not found' });
      }

      res.json(shoppingList);
    } catch (error: any) {
      console.error('Error getting shopping list:', error);
      res.status(500).json({ error: 'Failed to get shopping list' });
    }
  },

  /**
   * Create a new shopping list
   * POST /api/shopping-lists
   */
  async createShoppingList(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { name } = req.body;

      const shoppingList = await prisma.shoppingList.create({
        data: {
          userId,
          name: name || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        },
        include: {
          items: true,
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

        // Aggregate ingredients from recipes using smart quantity parser
        const { parseIngredientQuantity, aggregateQuantities } = await import('../../utils/ingredientQuantityParser');
        const { calculatePurchaseQuantity } = await import('../../utils/packageSizeCalculator');
        
        const ingredientQuantities = new Map<string, Array<{ amount: number; unit: string; originalText: string }>>();

        recipes.forEach((recipe) => {
          recipe.ingredients.forEach((ing) => {
            const parsed = parseIngredientQuantity(ing.text);
            if (parsed) {
              // Extract ingredient name (remove quantity from text)
              const nameMatch = ing.text.replace(/^[\d\s\/\.]+/, '').trim();
              const ingredientName = nameMatch.toLowerCase().trim();
              
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

      // Aggregate ingredients from all recipes in the meal plan using smart quantity parser
      const { parseIngredientQuantity, aggregateQuantities } = await import('../../utils/ingredientQuantityParser');
      const { calculatePurchaseQuantity } = await import('../../utils/packageSizeCalculator');
      
      const ingredientQuantities = new Map<string, Array<{ amount: number; unit: string; originalText: string }>>();

      mealPlan.meals.forEach((meal) => {
        if (!meal.recipe) return;

        const recipe = meal.recipe;
        recipe.ingredients.forEach((ing) => {
          const parsed = parseIngredientQuantity(ing.text);
          if (parsed) {
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

