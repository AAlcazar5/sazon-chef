// backend/src/utils/priceComparison.ts
// Price comparison and savings suggestions

import { prisma } from '../lib/prisma';
import { calculateRecipeCost } from './costCalculator';
import { findBestStoreFromEstimates } from '../services/priceLookupService';

export interface PriceComparison {
  ingredientName: string;
  currentPrice: number;
  currentStore?: string;
  alternatives: Array<{
    store: string;
    location?: string;
    price: number;
    savings: number;
    savingsPercent: number;
  }>;
  bestPrice: number;
  potentialSavings: number;
  potentialSavingsPercent: number;
}

export interface RecipeSavingsSuggestion {
  recipeId: string;
  recipeName: string;
  currentCost: number;
  optimizedCost: number;
  potentialSavings: number;
  savingsPercent: number;
  ingredientComparisons: PriceComparison[];
  recommendations: string[];
}

/**
 * Compare prices for a specific ingredient across different stores
 */
export async function compareIngredientPrices(
  ingredientName: string,
  userId: string
): Promise<PriceComparison | null> {
  // Get all costs for this ingredient (across different stores/locations)
  const costs = await prisma.ingredientCost.findMany({
    where: {
      userId,
      ingredientName: ingredientName.toLowerCase().trim(),
    },
    orderBy: { unitCost: 'asc' }, // Cheapest first
  });

  if (costs.length === 0) {
    return null;
  }

  // Use the most recent cost as "current"
  const currentCost = costs.sort((a, b) => 
    b.lastUpdated.getTime() - a.lastUpdated.getTime()
  )[0];

  // Find alternatives (other stores/locations)
  const alternatives = costs
    .filter(c => c.id !== currentCost.id)
    .map(cost => {
      const savings = currentCost.unitCost - cost.unitCost;
      const savingsPercent = (savings / currentCost.unitCost) * 100;

      return {
        store: cost.store || 'Unknown Store',
        location: cost.location || undefined,
        price: cost.unitCost,
        savings,
        savingsPercent,
      };
    })
    .filter(alt => alt.savings > 0) // Only show cheaper alternatives
    .sort((a, b) => b.savings - a.savings); // Best savings first

  const bestPrice = costs[0].unitCost; // Already sorted by price
  const potentialSavings = currentCost.unitCost - bestPrice;
  const potentialSavingsPercent = (potentialSavings / currentCost.unitCost) * 100;

  return {
    ingredientName,
    currentPrice: currentCost.unitCost,
    currentStore: currentCost.store || undefined,
    alternatives,
    bestPrice,
    potentialSavings,
    potentialSavingsPercent,
  };
}

/**
 * Find price comparison opportunities for a recipe
 */
export async function findRecipeSavings(
  recipeId: string,
  userId: string
): Promise<RecipeSavingsSuggestion | null> {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: true,
    },
  });

  if (!recipe) {
    return null;
  }

  // Calculate current recipe cost
  const currentCostResult = await calculateRecipeCost(recipeId, userId);
  const currentCost = currentCostResult.estimatedCost || 0;

  // Get user's ingredient costs
  const ingredientCosts = await prisma.ingredientCost.findMany({
    where: { userId },
  });

  const costMap = new Map(
    ingredientCosts.map((ic) => [ic.ingredientName.toLowerCase(), ic])
  );

  // Find price comparisons for each ingredient
  const ingredientComparisons: PriceComparison[] = [];
  const recommendations: string[] = [];

  for (const ingredient of recipe.ingredients) {
    const text = ingredient.text.toLowerCase();
    
    // Try to match ingredient name
    let matchedIngredient: string | null = null;
    for (const [name] of costMap.entries()) {
      if (text.includes(name) || name.includes(text.split(' ').pop() || '')) {
        matchedIngredient = name;
        break;
      }
    }

    if (matchedIngredient) {
      const comparison = await compareIngredientPrices(matchedIngredient, userId);
      if (comparison && comparison.potentialSavings > 0) {
        ingredientComparisons.push(comparison);

        // Add recommendation
        if (comparison.potentialSavingsPercent > 10) {
          recommendations.push(
            `Save ${comparison.potentialSavingsPercent.toFixed(0)}% on ${matchedIngredient} by shopping at ${comparison.alternatives[0]?.store || 'a different store'}`
          );
        }
      }
    }
  }

  // Calculate optimized cost (using best prices)
  let optimizedCost = 0;
  for (const comparison of ingredientComparisons) {
    // Estimate savings based on ingredient usage
    // This is a simplified calculation - in reality, we'd need to know exact quantities
    optimizedCost += comparison.potentialSavings * 0.5; // Rough estimate
  }
  optimizedCost = Math.max(0, currentCost - optimizedCost);

  const potentialSavings = currentCost - optimizedCost;
  const savingsPercent = currentCost > 0 ? (potentialSavings / currentCost) * 100 : 0;

  // Add general recommendations
  if (ingredientComparisons.length > 0) {
    recommendations.push(
      `You could save up to $${potentialSavings.toFixed(2)} (${savingsPercent.toFixed(0)}%) by shopping at different stores`
    );
  }

  return {
    recipeId,
    recipeName: recipe.title,
    currentCost,
    optimizedCost,
    potentialSavings,
    savingsPercent,
    ingredientComparisons,
    recommendations: recommendations.length > 0 ? recommendations : ['No significant savings opportunities found'],
  };
}

/**
 * Get price comparison for multiple ingredients
 */
export async function compareMultipleIngredients(
  ingredientNames: string[],
  userId: string
): Promise<PriceComparison[]> {
  const comparisons = await Promise.all(
    ingredientNames.map(name => compareIngredientPrices(name, userId))
  );

  return comparisons.filter((c): c is PriceComparison => c !== null);
}

/**
 * Find best store for shopping list based on total cost
 * @param ingredientNames - List of ingredient names
 * @param userId - User ID
 * @param nearbyStores - Optional list of nearby stores to filter by
 */
export async function findBestStoreForShoppingList(
  ingredientNames: string[],
  userId: string,
  nearbyStores?: Array<{ store: string; distance: number; address?: string }>
): Promise<{
  store: string;
  location?: string;
  totalCost: number;
  savings: number;
  savingsPercent: number;
} | null> {
  const comparisons = await compareMultipleIngredients(ingredientNames, userId);

  // If no user price data, fall back to estimated prices from 3rd party data
  if (comparisons.length === 0) {
    const { findBestStoreFromEstimates } = await import('../services/priceLookupService');
    const estimatedResult = await findBestStoreFromEstimates(ingredientNames, nearbyStores);
    if (estimatedResult) {
      return {
        store: estimatedResult.store,
        location: estimatedResult.location,
        totalCost: estimatedResult.totalCost,
        savings: estimatedResult.savings,
        savingsPercent: estimatedResult.savingsPercent,
      };
    }
    return null;
  }
  
  // Filter comparisons by nearby stores if provided
  if (nearbyStores) {
    const availableStores = new Set(nearbyStores.map(s => s.store.toLowerCase()));
    for (const comparison of comparisons) {
      comparison.alternatives = comparison.alternatives.filter(alt =>
        availableStores.has(alt.store.toLowerCase())
      );
    }
  }

  // Group by store and calculate totals
  const storeTotals = new Map<string, { cost: number; location?: string }>();

  for (const comparison of comparisons) {
    // Use current price as baseline
    const baselineCost = comparison.currentPrice;

    // Check each alternative store
    for (const alt of comparison.alternatives) {
      const storeKey = alt.store;
      const current = storeTotals.get(storeKey) || { cost: 0, location: alt.location };
      current.cost += alt.price;
      if (alt.location) current.location = alt.location;
      storeTotals.set(storeKey, current);
    }
  }

  // Find store with lowest total
  let bestStore: { store: string; location?: string; totalCost: number } | null = null;
  let baselineTotal = 0;

  for (const comparison of comparisons) {
    baselineTotal += comparison.currentPrice;
  }

  for (const [store, data] of storeTotals.entries()) {
    // Skip if store is not nearby (when filtering by location)
    if (nearbyStores) {
      const availableStores = new Set(nearbyStores.map(s => s.store.toLowerCase()));
      if (!availableStores.has(store.toLowerCase())) {
        continue;
      }
      // Add location info from nearby stores
      const nearbyStore = nearbyStores.find(s => s.store.toLowerCase() === store.toLowerCase());
      if (nearbyStore) {
        data.location = nearbyStore.address || `${nearbyStore.distance} miles away`;
      }
    }
    
    if (!bestStore || data.cost < bestStore.totalCost) {
      bestStore = {
        store,
        location: data.location,
        totalCost: data.cost,
      };
    }
  }

  if (!bestStore) {
    return null;
  }

  const savings = baselineTotal - bestStore.totalCost;
  const savingsPercent = baselineTotal > 0 ? (savings / baselineTotal) * 100 : 0;

  return {
    store: bestStore.store,
    location: bestStore.location,
    totalCost: bestStore.totalCost,
    savings,
    savingsPercent,
  };
}

