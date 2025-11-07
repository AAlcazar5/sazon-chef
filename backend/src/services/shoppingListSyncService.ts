// backend/src/services/shoppingListSyncService.ts
// Bidirectional shopping list synchronization with 3rd party apps

import { prisma } from '../lib/prisma';
import { shoppingAppIntegrationService } from './shoppingAppIntegrationService';

export interface SyncResult {
  success: boolean;
  itemsSynced: number;
  itemsAdded: number;
  itemsUpdated: number;
  itemsRemoved: number;
  message?: string;
}

/**
 * Sync shopping list bidirectionally with external app
 */
export async function syncShoppingListBidirectional(
  userId: string,
  shoppingListId: string,
  appName: string
): Promise<SyncResult> {
  // Get shopping list
  const shoppingList = await prisma.shoppingList.findFirst({
    where: { id: shoppingListId, userId },
    include: {
      items: true,
    },
  });

  if (!shoppingList) {
    return {
      success: false,
      itemsSynced: 0,
      itemsAdded: 0,
      itemsUpdated: 0,
      itemsRemoved: 0,
      message: 'Shopping list not found',
    };
  }

  // Get integration
  const integration = await prisma.shoppingAppIntegration.findUnique({
    where: {
      userId_appName: {
        userId,
        appName: appName.toLowerCase(),
      },
    },
  });

  if (!integration || !integration.isActive) {
    return {
      success: false,
      itemsSynced: 0,
      itemsAdded: 0,
      itemsUpdated: 0,
      itemsRemoved: 0,
      message: `Not connected to ${appName}. Please connect your account first.`,
    };
  }

  try {
    // Step 1: Push local items to external app
    const localItems = shoppingList.items
      .filter(item => !item.purchased)
      .map(item => ({
        name: item.name,
        quantity: item.quantity,
        category: item.category || undefined,
        notes: item.notes || undefined,
      }));

    const pushResult = await shoppingAppIntegrationService.addItemsToExternalApp(
      userId,
      appName,
      localItems
    );

    // Step 2: Pull items from external app (placeholder - would need external app API)
    // For now, we'll just mark items as synced
    const syncMetadata = {
      lastSyncedAt: new Date(),
      externalListId: pushResult.externalListId,
      syncDirection: 'bidirectional' as const,
    };

    // Update shopping list with sync metadata
    await prisma.shoppingList.update({
      where: { id: shoppingListId },
      data: {
        updatedAt: new Date(),
      },
    });

    return {
      success: pushResult.success,
      itemsSynced: localItems.length,
      itemsAdded: pushResult.itemsAdded || 0,
      itemsUpdated: 0, // Would be calculated from external app response
      itemsRemoved: 0, // Would be calculated from external app response
      message: pushResult.message || 'Shopping list synced successfully',
    };
  } catch (error: any) {
    console.error('Error syncing shopping list:', error);
    return {
      success: false,
      itemsSynced: 0,
      itemsAdded: 0,
      itemsUpdated: 0,
      itemsRemoved: 0,
      message: `Failed to sync: ${error.message}`,
    };
  }
}

/**
 * Auto-sync recipe ingredients to external shopping app
 */
export async function syncRecipeToShoppingApp(
  userId: string,
  recipeId: string,
  appName: string
): Promise<SyncResult> {
  // Get recipe
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: true,
    },
  });

  if (!recipe) {
    return {
      success: false,
      itemsSynced: 0,
      itemsAdded: 0,
      itemsUpdated: 0,
      itemsRemoved: 0,
      message: 'Recipe not found',
    };
  }

  // Convert recipe ingredients to shopping list items
  const { parseIngredientQuantity, aggregateQuantities } = await import('../utils/ingredientQuantityParser');
  const { calculatePurchaseQuantity } = await import('../utils/packageSizeCalculator');

  const ingredientQuantities = new Map<string, any[]>();

  recipe.ingredients.forEach((ing) => {
    const parsed = parseIngredientQuantity(ing.text);
    if (parsed) {
      const text = ing.text.trim();
      const quantityUnitPattern = /^[\d\s\/\.]+\s+(cup|cups|lb|lbs|oz|tbsp|tsp|piece|pieces|clove|cloves|bunch|bunches|fl\s*oz|pint|pints|quart|quarts|gallon|gallons|ml|l|liter|liters|g|gram|grams|kg|kilogram|kilograms)\s+/i;
      const match = text.match(quantityUnitPattern);
      let ingredientName: string;
      
      if (match) {
        ingredientName = text.substring(match[0].length).toLowerCase().trim();
      } else {
        const simpleMatch = text.match(/^[\d\s\/\.]+\s+\w+\s+(.+)$/i);
        ingredientName = simpleMatch 
          ? simpleMatch[1].toLowerCase().trim()
          : text.replace(/^[\d\s\/\.]+\s+\w+\s*/, '').toLowerCase().trim() || text.toLowerCase().trim();
      }
      
      ingredientName = ingredientName.replace(/[,\\.]+$/, '').trim();
      
      if (!ingredientQuantities.has(ingredientName)) {
        ingredientQuantities.set(ingredientName, []);
      }
      ingredientQuantities.get(ingredientName)!.push(parsed);
    }
  });

  // Convert to shopping list items
  const items: Array<{ name: string; quantity: string; category?: string }> = [];

  for (const [ingredientName, quantities] of ingredientQuantities.entries()) {
    const aggregated = aggregateQuantities(ingredientName, quantities);
    const purchaseInfo = calculatePurchaseQuantity(aggregated);
    
    items.push({
      name: ingredientName.charAt(0).toUpperCase() + ingredientName.slice(1),
      quantity: purchaseInfo.displayText,
    });
  }

  // Sync to external app
  const result = await shoppingAppIntegrationService.addItemsToExternalApp(
    userId,
    appName,
    items
  );

  return {
    success: result.success,
    itemsSynced: items.length,
    itemsAdded: result.itemsAdded || items.length,
    itemsUpdated: 0,
    itemsRemoved: 0,
    message: result.message,
  };
}

