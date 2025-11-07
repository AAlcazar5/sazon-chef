// backend/src/utils/packageSizeCalculator.ts
// Calculate how much to buy based on package sizes available at stores

import { IngredientQuantity } from './ingredientQuantityParser';

export interface PackageSize {
  size: number;
  unit: string;
  commonSizes?: number[]; // Multiple common package sizes (e.g., [1, 2, 5] for 1lb, 2lb, 5lb bags)
  storeSpecific?: Record<string, number[]>; // Store-specific sizes (e.g., { "walmart": [1, 2], "kroger": [1, 3, 5] })
}

// Common package sizes for ingredients (in their typical store units)
// This is a simplified database - in production, this would come from a database or API
export const COMMON_PACKAGE_SIZES: Record<string, PackageSize> = {
  // Flours & Grains
  'flour': { size: 5, unit: 'lb', commonSizes: [1, 2, 5, 10] },
  'sugar': { size: 4, unit: 'lb', commonSizes: [1, 2, 4, 10] },
  'brown sugar': { size: 2, unit: 'lb', commonSizes: [1, 2] },
  'rice': { size: 2, unit: 'lb', commonSizes: [1, 2, 5, 10, 20] },
  'quinoa': { size: 1, unit: 'lb', commonSizes: [0.5, 1, 2] },
  'pasta': { size: 1, unit: 'lb', commonSizes: [0.5, 1, 2] },
  
  // Proteins
  'chicken breast': { size: 1, unit: 'lb', commonSizes: [1, 2, 3, 5] },
  'chicken': { size: 1, unit: 'lb', commonSizes: [1, 2, 3, 5] },
  'ground beef': { size: 1, unit: 'lb', commonSizes: [1, 2, 3] },
  'beef': { size: 1, unit: 'lb', commonSizes: [1, 2, 3] },
  'salmon': { size: 1, unit: 'lb', commonSizes: [0.5, 1, 1.5, 2] },
  'fish': { size: 1, unit: 'lb', commonSizes: [0.5, 1, 1.5, 2] },
  'shrimp': { size: 1, unit: 'lb', commonSizes: [0.5, 1, 2] },
  'tofu': { size: 14, unit: 'oz', commonSizes: [14, 16, 20] },
  
  // Dairy
  'milk': { size: 1, unit: 'gallon', commonSizes: [0.5, 1] },
  'butter': { size: 1, unit: 'lb', commonSizes: [0.25, 0.5, 1] },
  'cheese': { size: 8, unit: 'oz', commonSizes: [4, 8, 16, 32] },
  'feta cheese': { size: 4, unit: 'oz', commonSizes: [4, 8, 16] },
  'yogurt': { size: 32, unit: 'oz', commonSizes: [6, 16, 32] },
  
  // Vegetables
  'onion': { size: 1, unit: 'piece', commonSizes: [1] },
  'onions': { size: 1, unit: 'piece', commonSizes: [1] },
  'garlic': { size: 1, unit: 'piece', commonSizes: [1] },
  'bell pepper': { size: 1, unit: 'piece', commonSizes: [1] },
  'bell peppers': { size: 1, unit: 'piece', commonSizes: [1] },
  'tomato': { size: 1, unit: 'piece', commonSizes: [1] },
  'tomatoes': { size: 1, unit: 'piece', commonSizes: [1] },
  'cherry tomatoes': { size: 1, unit: 'piece', commonSizes: [1] },
  'mushroom': { size: 8, unit: 'oz', commonSizes: [8, 16] },
  'mushrooms': { size: 8, unit: 'oz', commonSizes: [8, 16] },
  'portobello mushroom': { size: 1, unit: 'piece', commonSizes: [1] },
  'portobello mushrooms': { size: 1, unit: 'piece', commonSizes: [1] },
  'lettuce': { size: 1, unit: 'head', commonSizes: [1] },
  'spinach': { size: 5, unit: 'oz', commonSizes: [5, 10, 16] },
  'carrot': { size: 1, unit: 'lb', commonSizes: [1, 2] },
  'carrots': { size: 1, unit: 'lb', commonSizes: [1, 2] },
  'broccoli': { size: 1, unit: 'lb', commonSizes: [1] },
  'cucumber': { size: 1, unit: 'piece', commonSizes: [1] },
  'cucumbers': { size: 1, unit: 'piece', commonSizes: [1] },
  
  // Oils & Condiments
  'olive oil': { size: 16, unit: 'fl oz', commonSizes: [8, 16, 32] },
  'vegetable oil': { size: 48, unit: 'fl oz', commonSizes: [16, 32, 48] },
  'soy sauce': { size: 10, unit: 'fl oz', commonSizes: [5, 10, 15] },
  'sesame oil': { size: 5, unit: 'fl oz', commonSizes: [5, 8] },
  
  // Spices & Herbs (typically sold in small containers)
  'salt': { size: 16, unit: 'oz', commonSizes: [4, 8, 16, 26] },
  'pepper': { size: 2, unit: 'oz', commonSizes: [1, 2, 4] },
  'garlic powder': { size: 3, unit: 'oz', commonSizes: [2.5, 3, 5] },
  'cumin': { size: 2, unit: 'oz', commonSizes: [1, 2, 4] },
  'paprika': { size: 2, unit: 'oz', commonSizes: [1, 2, 4] },
  
  // Canned Goods
  'black beans': { size: 15, unit: 'oz', commonSizes: [15, 29] },
  'tomato sauce': { size: 8, unit: 'oz', commonSizes: [8, 15, 29] },
  'coconut milk': { size: 13.5, unit: 'fl oz', commonSizes: [13.5, 14] },
};

/**
 * Find package size info for an ingredient
 */
export function getPackageSize(ingredientName: string): PackageSize | null {
  const normalized = ingredientName.toLowerCase().trim();
  
  // Direct match
  if (COMMON_PACKAGE_SIZES[normalized]) {
    return COMMON_PACKAGE_SIZES[normalized];
  }
  
  // Partial match (e.g., "chicken breast" matches "chicken")
  for (const [key, value] of Object.entries(COMMON_PACKAGE_SIZES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  return null;
}

/**
 * Calculate how much to buy based on needed amount and package sizes
 */
export function calculatePurchaseQuantity(
  needed: IngredientQuantity,
  storeName?: string
): {
  quantityToBuy: number;
  unit: string;
  packageSize: number;
  packagesNeeded: number;
  totalAmount: number;
  displayText: string;
} {
  const packageInfo = getPackageSize(needed.name);
  
  if (!packageInfo) {
    // No package info, just use the needed amount rounded up
    const rounded = Math.ceil(needed.totalAmount);
    return {
      quantityToBuy: rounded,
      unit: needed.totalUnit,
      packageSize: 1,
      packagesNeeded: rounded,
      totalAmount: rounded,
      displayText: `${rounded} ${needed.totalUnit}`,
    };
  }

  // Get available package sizes (store-specific or common)
  const availableSizes = storeName && packageInfo.storeSpecific?.[storeName]
    ? packageInfo.storeSpecific[storeName]
    : packageInfo.commonSizes || [packageInfo.size];

  // Convert needed amount to package unit if needed
  const { convertUnit } = require('./ingredientQuantityParser');
  let neededInPackageUnit = needed.totalAmount;
  
  if (needed.totalUnit !== packageInfo.unit) {
    const converted = convertUnit(needed.totalAmount, needed.totalUnit, packageInfo.unit, needed.name);
    if (converted !== null) {
      neededInPackageUnit = converted;
    } else {
      // If conversion fails, try to estimate (rough fallback)
      // For now, just use the needed amount and let the user adjust
      console.warn(`⚠️ Could not convert ${needed.totalAmount} ${needed.totalUnit} to ${packageInfo.unit} for ${needed.name}`);
    }
  }

  // Find the best package size(s) to buy
  // Strategy: Find the smallest package size that covers the need, or combine smaller packages
  const sortedSizes = [...availableSizes].sort((a, b) => a - b);
  
  let packagesNeeded = 0;
  let totalAmount = 0;
  let packageSize = sortedSizes[0];
  
  // Simple strategy: use the smallest package that covers the need
  for (const size of sortedSizes) {
    if (size >= neededInPackageUnit) {
      packageSize = size;
      packagesNeeded = 1;
      totalAmount = size;
      break;
    }
  }
  
  // If no single package covers it, use multiple of the largest package
  if (packagesNeeded === 0) {
    const largestSize = sortedSizes[sortedSizes.length - 1];
    packagesNeeded = Math.ceil(neededInPackageUnit / largestSize);
    packageSize = largestSize;
    totalAmount = packagesNeeded * largestSize;
  }

  // Format display text
  let displayText: string;
  if (packagesNeeded === 1) {
    displayText = `${packageSize} ${packageInfo.unit}`;
  } else {
    displayText = `${packagesNeeded} × ${packageSize} ${packageInfo.unit} (${totalAmount} ${packageInfo.unit} total)`;
  }

  return {
    quantityToBuy: totalAmount,
    unit: packageInfo.unit,
    packageSize,
    packagesNeeded,
    totalAmount,
    displayText,
  };
}

