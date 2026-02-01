/**
 * Helper utilities to ensure unique images for recipes
 * Particularly useful when fetching paginated results
 */

import { imageService } from '../services/imageService';
import { Recipe } from '@prisma/client';

/**
 * Assigns unique Unsplash images to a batch of recipes
 * Uses the recipe's position in the batch to vary the image
 *
 * @param recipes - Array of recipes to assign images to
 * @param startIndex - Starting index for this batch (e.g., page * limit)
 * @returns Updated recipes with unique imageUrl and Unsplash attribution
 */
export async function assignUniqueImagesToRecipes<T extends Recipe>(
  recipes: T[],
  startIndex: number = 0
): Promise<T[]> {
  const updatedRecipes: T[] = [];

  for (let i = 0; i < recipes.length; i++) {
    const recipe = recipes[i];
    const globalIndex = startIndex + i;

    // Calculate page and result index for variety
    // Each page has 30 results from Unsplash, so we cycle through them
    const unsplashPage = Math.floor(globalIndex / 30) + 1;
    const resultIndex = globalIndex % 30;

    try {
      // Fetch unique image based on recipe details and index
      const photoData = await imageService.searchFoodImage({
        recipeName: recipe.title,
        cuisine: recipe.cuisine,
        page: unsplashPage,
        resultIndex,
      });

      if (photoData) {
        // Update recipe with new image data
        updatedRecipes.push({
          ...recipe,
          imageUrl: photoData.url,
          unsplashPhotoId: photoData.id,
          unsplashDownloadLocation: photoData.downloadLocation,
          unsplashPhotographerName: photoData.photographer.name,
          unsplashPhotographerUsername: photoData.photographer.username,
          unsplashAttributionText: photoData.attributionText,
          unsplashUrl: photoData.unsplashUrl,
        });
      } else {
        // Keep original recipe if image fetch fails
        updatedRecipes.push(recipe);
      }
    } catch (error) {
      console.error(`Failed to fetch image for recipe ${recipe.id}:`, error);
      // Keep original recipe if error occurs
      updatedRecipes.push(recipe);
    }
  }

  return updatedRecipes;
}

/**
 * Generates a unique result index based on recipe properties
 * This ensures consistent but varied images for the same recipe
 *
 * @param recipe - Recipe object
 * @param seed - Optional seed value to vary the index
 * @returns A result index between 0-29
 */
export function getUniqueResultIndex(recipe: Recipe, seed: number = 0): number {
  // Create a simple hash from recipe properties
  const hashString = `${recipe.title}${recipe.cuisine}${seed}`;
  let hash = 0;

  for (let i = 0; i < hashString.length; i++) {
    const char = hashString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Return a value between 0-29
  return Math.abs(hash) % 30;
}

/**
 * Refreshes images for a batch of recipes that have duplicate images
 * Useful for cleaning up database after bulk imports
 *
 * @param recipes - Array of recipes to check and refresh
 * @returns Updated recipes with unique images
 */
export async function refreshDuplicateImages<T extends Recipe>(
  recipes: T[]
): Promise<T[]> {
  const imageUrlCounts = new Map<string, number>();
  const updatedRecipes: T[] = [];

  // Count occurrences of each image URL
  recipes.forEach((recipe) => {
    if (recipe.imageUrl) {
      const count = imageUrlCounts.get(recipe.imageUrl) || 0;
      imageUrlCounts.set(recipe.imageUrl, count + 1);
    }
  });

  // Refresh images for duplicates
  for (let i = 0; i < recipes.length; i++) {
    const recipe = recipes[i];
    const isDuplicate =
      recipe.imageUrl && (imageUrlCounts.get(recipe.imageUrl) || 0) > 1;

    if (isDuplicate) {
      try {
        // Use recipe index to get a different image
        const resultIndex = getUniqueResultIndex(recipe, i);
        const photoData = await imageService.searchFoodImage({
          recipeName: recipe.title,
          cuisine: recipe.cuisine,
          resultIndex,
        });

        if (photoData) {
          updatedRecipes.push({
            ...recipe,
            imageUrl: photoData.url,
            unsplashPhotoId: photoData.id,
            unsplashDownloadLocation: photoData.downloadLocation,
            unsplashPhotographerName: photoData.photographer.name,
            unsplashPhotographerUsername: photoData.photographer.username,
            unsplashAttributionText: photoData.attributionText,
            unsplashUrl: photoData.unsplashUrl,
          });
          console.log(`✅ Refreshed duplicate image for: ${recipe.title}`);
        } else {
          updatedRecipes.push(recipe);
        }
      } catch (error) {
        console.error(`Failed to refresh image for recipe ${recipe.id}:`, error);
        updatedRecipes.push(recipe);
      }
    } else {
      // Keep original recipe if not a duplicate
      updatedRecipes.push(recipe);
    }
  }

  return updatedRecipes;
}
