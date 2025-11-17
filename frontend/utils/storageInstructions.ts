/**
 * Utility functions for generating storage instructions for meal prep recipes
 */

import type { Recipe } from '../types';

export interface StorageInfo {
  instructions: string;
  fridgeDays?: number;
  freezerMonths?: number;
  shelfStable: boolean;
}

/**
 * Generate storage instructions for a recipe based on meal prep suitability flags
 */
export function generateStorageInstructions(recipe: Recipe): StorageInfo {
  // If explicit storage instructions exist, use them
  if (recipe.storageInstructions) {
    return {
      instructions: recipe.storageInstructions,
      fridgeDays: recipe.fridgeStorageDays,
      freezerMonths: recipe.freezerStorageMonths,
      shelfStable: recipe.shelfStable || false,
    };
  }

  // Generate instructions based on meal prep flags
  const parts: string[] = [];
  let fridgeDays: number | undefined = recipe.fridgeStorageDays;
  let freezerMonths: number | undefined = recipe.freezerStorageMonths;

  if (recipe.freezerStorageMonths) {
    parts.push(`Freeze for up to ${recipe.freezerStorageMonths} month${recipe.freezerStorageMonths !== 1 ? 's' : ''}`);
    freezerMonths = recipe.freezerStorageMonths;
  } else if (recipe.freezable) {
    parts.push('Freeze for up to 3 months');
    freezerMonths = 3;
  }

  if (recipe.fridgeStorageDays) {
    parts.push(`Refrigerate for up to ${recipe.fridgeStorageDays} day${recipe.fridgeStorageDays !== 1 ? 's' : ''}`);
    fridgeDays = recipe.fridgeStorageDays;
  } else if (recipe.weeklyPrepFriendly) {
    parts.push('Refrigerate for up to 5 days');
    fridgeDays = 5;
  }

  if (recipe.shelfStable) {
    parts.push('Can be stored at room temperature');
  }

  const instructions = parts.length > 0 
    ? parts.join('. ') + '.'
    : 'Store according to standard food safety guidelines.';

  return {
    instructions,
    fridgeDays,
    freezerMonths,
    shelfStable: recipe.shelfStable || false,
  };
}

/**
 * Get storage method indicators (freezer, fridge, shelf-stable)
 */
export function getStorageMethods(recipe: Recipe): Array<'freezer' | 'fridge' | 'shelf'> {
  const methods: Array<'freezer' | 'fridge' | 'shelf'> = [];

  if (recipe.freezable || recipe.freezerStorageMonths) {
    methods.push('freezer');
  }

  if (recipe.weeklyPrepFriendly || recipe.fridgeStorageDays) {
    methods.push('fridge');
  }

  if (recipe.shelfStable) {
    methods.push('shelf');
  }

  return methods;
}

