// backend/src/services/priceLookupService.ts
// Service for fetching ingredient prices from 3rd party APIs and providing fallback estimates

import axios from 'axios';

export interface PriceEstimate {
  ingredientName: string;
  unit: string;
  priceRange: {
    min: number;
    max: number;
    average: number;
  };
  stores: Array<{
    store: string;
    price: number;
    location?: string;
  }>;
  source: 'api' | 'estimated' | 'user';
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Estimated price ranges for common ingredients (per unit)
 * Based on average US grocery store prices (2024)
 */
const ESTIMATED_PRICES: Record<string, { min: number; max: number; average?: number; unit: string }> = {
  // Produce
  'tomato': { min: 0.5, max: 2.0, unit: 'piece' },
  'tomatoes': { min: 0.5, max: 2.0, unit: 'piece' },
  'onion': { min: 0.5, max: 1.5, unit: 'piece' },
  'onions': { min: 0.5, max: 1.5, unit: 'piece' },
  'garlic': { min: 0.1, max: 0.3, unit: 'clove' },
  'garlic clove': { min: 0.1, max: 0.3, unit: 'clove' },
  'bell pepper': { min: 1.0, max: 2.5, unit: 'piece' },
  'bell peppers': { min: 1.0, max: 2.5, unit: 'piece' },
  'lettuce': { min: 1.5, max: 3.0, unit: 'head' },
  'carrot': { min: 0.2, max: 0.5, unit: 'piece' },
  'carrots': { min: 0.2, max: 0.5, unit: 'piece' },
  'celery': { min: 1.5, max: 3.0, unit: 'bunch' },
  'potato': { min: 0.3, max: 0.8, unit: 'piece' },
  'potatoes': { min: 0.3, max: 0.8, unit: 'piece' },
  'sweet potato': { min: 0.5, max: 1.2, unit: 'piece' },
  'mushroom': { min: 3.0, max: 6.0, unit: 'lb' },
  'mushrooms': { min: 3.0, max: 6.0, unit: 'lb' },
  'spinach': { min: 2.0, max: 4.0, unit: 'bunch' },
  'broccoli': { min: 1.5, max: 3.0, unit: 'head' },
  'cauliflower': { min: 2.0, max: 4.0, unit: 'head' },
  'cucumber': { min: 0.5, max: 1.5, unit: 'piece' },
  'zucchini': { min: 1.0, max: 2.5, unit: 'lb' },
  
  // Proteins
  'chicken breast': { min: 4.0, max: 8.0, unit: 'lb' },
  'chicken': { min: 3.0, max: 7.0, unit: 'lb' },
  'ground beef': { min: 4.0, max: 8.0, unit: 'lb' },
  'beef': { min: 5.0, max: 12.0, unit: 'lb' },
  'pork': { min: 3.0, max: 7.0, unit: 'lb' },
  'salmon': { min: 8.0, max: 15.0, unit: 'lb' },
  'fish': { min: 6.0, max: 14.0, unit: 'lb' },
  'shrimp': { min: 8.0, max: 15.0, unit: 'lb' },
  'eggs': { min: 2.0, max: 5.0, unit: 'dozen' },
  'egg': { min: 0.2, max: 0.4, unit: 'piece' },
  'tofu': { min: 2.0, max: 4.0, unit: 'package' },
  
  // Dairy
  'milk': { min: 3.0, max: 5.0, unit: 'gallon' },
  'cheese': { min: 4.0, max: 8.0, unit: 'lb' },
  'butter': { min: 3.0, max: 6.0, unit: 'lb' },
  'yogurt': { min: 1.0, max: 2.5, unit: 'container' },
  'sour cream': { min: 2.0, max: 4.0, unit: 'container' },
  
  // Grains & Pantry
  'rice': { min: 1.0, max: 3.0, unit: 'lb' },
  'pasta': { min: 1.0, max: 2.5, unit: 'lb' },
  'flour': { min: 0.5, max: 1.5, unit: 'lb' },
  'sugar': { min: 0.5, max: 1.5, unit: 'lb' },
  'salt': { min: 0.5, max: 2.0, unit: 'container' },
  'black pepper': { min: 2.0, max: 5.0, unit: 'container' },
  'ground pepper': { min: 2.0, max: 5.0, unit: 'container' },
  'olive oil': { min: 6.0, max: 12.0, unit: 'bottle' },
  'vegetable oil': { min: 3.0, max: 6.0, unit: 'bottle' },
  'vinegar': { min: 2.0, max: 4.0, unit: 'bottle' },
  'quinoa': { min: 4.0, max: 8.0, unit: 'lb' },
  'oats': { min: 1.5, max: 3.0, unit: 'lb' },
  'bread': { min: 2.0, max: 5.0, unit: 'loaf' },
  
  // Canned & Packaged
  'black beans': { min: 1.0, max: 2.0, unit: 'can' },
  'kidney beans': { min: 1.0, max: 2.0, unit: 'can' },
  'chickpeas': { min: 1.0, max: 2.0, unit: 'can' },
  'tomato sauce': { min: 1.0, max: 2.5, unit: 'can' },
  'diced tomatoes': { min: 1.0, max: 2.5, unit: 'can' },
  'chicken broth': { min: 1.5, max: 3.0, unit: 'container' },
  'vegetable broth': { min: 1.5, max: 3.0, unit: 'container' },
  
  // Herbs & Spices
  'basil': { min: 2.0, max: 4.0, unit: 'bunch' },
  'cilantro': { min: 1.0, max: 2.0, unit: 'bunch' },
  'parsley': { min: 1.0, max: 2.5, unit: 'bunch' },
  'oregano': { min: 2.0, max: 5.0, unit: 'container' },
  'thyme': { min: 2.0, max: 4.0, unit: 'bunch' },
  'rosemary': { min: 2.0, max: 4.0, unit: 'bunch' },
};

/**
 * Store price variations (multipliers for different stores)
 */
const STORE_MULTIPLIERS: Record<string, number> = {
  'walmart': 0.85,      // Typically 15% cheaper
  'kroger': 1.0,       // Baseline
  'target': 1.1,       // 10% more expensive
  'whole foods': 1.3,  // 30% more expensive
  'safeway': 1.05,     // 5% more expensive
  'aldi': 0.75,        // 25% cheaper
  'costco': 0.8,       // 20% cheaper (bulk)
  'trader joes': 0.95, // 5% cheaper
};

/**
 * Get price estimate for an ingredient
 */
export async function getPriceEstimate(
  ingredientName: string,
  unit?: string
): Promise<PriceEstimate | null> {
  const normalizedName = ingredientName.toLowerCase().trim();
  
  // Try to find exact match in estimated prices
  let priceData: { min: number; max: number; average?: number; unit: string } | null = ESTIMATED_PRICES[normalizedName] || null;
  
  // Try partial matches (e.g., "chicken breast" matches "chicken")
  if (!priceData) {
    for (const [key, value] of Object.entries(ESTIMATED_PRICES)) {
      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        priceData = value;
        break;
      }
    }
  }
  
  // If still no match, use category-based estimates
  if (!priceData) {
    priceData = getCategoryEstimate(normalizedName);
  }
  
  if (!priceData) {
    return null;
  }
  
  // Calculate average if not provided
  const average = priceData.average || (priceData.min + priceData.max) / 2;
  
  // Generate store prices based on multipliers
  const stores = Object.entries(STORE_MULTIPLIERS).map(([store, multiplier]) => ({
    store: store.charAt(0).toUpperCase() + store.slice(1),
    price: average * multiplier,
    location: undefined,
  }));
  
  // Sort stores by price
  stores.sort((a, b) => a.price - b.price);
  
  return {
    ingredientName,
    unit: unit || priceData.unit,
    priceRange: {
      min: priceData.min,
      max: priceData.max,
      average: average,
    },
    stores,
    source: 'estimated',
    confidence: 'medium',
  };
}

/**
 * Get price estimate based on ingredient category
 */
function getCategoryEstimate(ingredientName: string): { min: number; max: number; average: number; unit: string } | null {
  const name = ingredientName.toLowerCase();
  
  // Protein category
  if (name.includes('chicken') || name.includes('beef') || name.includes('pork') || 
      name.includes('fish') || name.includes('salmon') || name.includes('shrimp') ||
      name.includes('turkey') || name.includes('lamb')) {
    return { min: 4.0, max: 12.0, average: 7.0, unit: 'lb' };
  }
  
  // Vegetable category
  if (name.includes('vegetable') || name.includes('veggie') || name.includes('green')) {
    return { min: 1.5, max: 4.0, average: 2.5, unit: 'lb' };
  }
  
  // Fruit category
  if (name.includes('fruit') || name.includes('apple') || name.includes('banana') ||
      name.includes('berry') || name.includes('orange') || name.includes('lemon')) {
    return { min: 1.0, max: 4.0, average: 2.0, unit: 'lb' };
  }
  
  // Grain category
  if (name.includes('grain') || name.includes('cereal') || name.includes('wheat')) {
    return { min: 1.0, max: 3.0, average: 2.0, unit: 'lb' };
  }
  
  // Spice/Herb category
  if (name.includes('spice') || name.includes('herb') || name.includes('seasoning')) {
    return { min: 2.0, max: 5.0, average: 3.5, unit: 'container' };
  }
  
  // Generic fallback
  return { min: 1.0, max: 5.0, average: 3.0, unit: 'piece' };
}

/**
 * Get price estimates for multiple ingredients
 */
export async function getPriceEstimates(
  ingredientNames: string[]
): Promise<PriceEstimate[]> {
  const estimates = await Promise.all(
    ingredientNames.map(name => getPriceEstimate(name))
  );
  
  return estimates.filter((e): e is PriceEstimate => e !== null);
}

/**
 * Find best store based on estimated prices
 * @param ingredientNames - List of ingredient names
 * @param nearbyStores - Optional list of nearby stores to filter by
 */
export async function findBestStoreFromEstimates(
  ingredientNames: string[],
  nearbyStores?: Array<{ store: string; distance: number; address?: string }>
): Promise<{
  store: string;
  location?: string;
  totalCost: number;
  savings: number;
  savingsPercent: number;
  priceBreakdown: Array<{
    ingredient: string;
    price: number;
  }>;
} | null> {
  const estimates = await getPriceEstimates(ingredientNames);
  
  if (estimates.length === 0) {
    return null;
  }
  
  // Calculate totals for each store
  const storeTotals = new Map<string, { cost: number; breakdown: Array<{ ingredient: string; price: number }> }>();
  
  for (const estimate of estimates) {
    for (const store of estimate.stores) {
      const current = storeTotals.get(store.store) || { cost: 0, breakdown: [] };
      current.cost += store.price;
      current.breakdown.push({
        ingredient: estimate.ingredientName,
        price: store.price,
      });
      storeTotals.set(store.store, current);
    }
  }
  
  // Filter stores by nearby stores if provided
  const availableStores = nearbyStores
    ? new Set(nearbyStores.map(s => s.store.toLowerCase()))
    : null;
  
  // Find store with lowest total
  let bestStore: { store: string; cost: number; breakdown: Array<{ ingredient: string; price: number }>; location?: string } | null = null;
  let baselineTotal = 0;
  
  // Use average of all stores as baseline
  for (const estimate of estimates) {
    baselineTotal += estimate.priceRange.average;
  }
  
  for (const [store, data] of storeTotals.entries()) {
    // Skip if store is not nearby (when filtering by location)
    if (availableStores && !availableStores.has(store.toLowerCase())) {
      continue;
    }
    
    if (!bestStore || data.cost < bestStore.cost) {
      // Find location info from nearby stores
      const nearbyStore = nearbyStores?.find(s => s.store.toLowerCase() === store.toLowerCase());
      
      bestStore = {
        store,
        cost: data.cost,
        breakdown: data.breakdown,
        location: nearbyStore?.address || nearbyStore ? `${nearbyStore.distance} miles away` : undefined,
      };
    }
  }
  
  if (!bestStore) {
    return null;
  }
  
  const savings = baselineTotal - bestStore.cost;
  const savingsPercent = (savings / baselineTotal) * 100;
  
  return {
    store: bestStore.store,
    location: bestStore.location,
    totalCost: bestStore.cost,
    savings: Math.max(0, savings),
    savingsPercent: Math.max(0, savingsPercent),
    priceBreakdown: bestStore.breakdown,
  };
}

