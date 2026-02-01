/**
 * Runtime image variation utilities
 * Ensures unique images for paginated recipe results WITHOUT database updates
 * Perfect for ensuring variety in UI without permanent changes
 */

/**
 * Adds variety to image URLs for the current page view
 * Uses URL parameters to get different cached versions from Unsplash
 * This is a lightweight approach that doesn't require new API calls
 *
 * @param recipes - Array of recipes in the current page
 * @param pageOffset - Starting index for this page (page * limit)
 * @returns Recipes with varied image URLs
 */
export function varyImageUrlsForPage<T extends { imageUrl?: string | null }>(
  recipes: T[],
  pageOffset: number = 0
): T[] {
  // TEMPORARILY DISABLED: Return recipes unchanged to test if URL variation is breaking images
  // TODO: Re-enable after confirming images load without variation
  console.log(`🖼️  Image variation: Processing ${recipes.length} recipes (DISABLED - returning unchanged)`);
  return recipes.map((recipe) => {
    // Just ensure imageUrl is trimmed, but don't modify URLs
    if (recipe.imageUrl) {
      return {
        ...recipe,
        imageUrl: recipe.imageUrl.trim(),
      };
    }
    return recipe;
  });

  /* ORIGINAL CODE - DISABLED FOR TESTING
  // Track seen URLs to ensure uniqueness
  const seenUrls = new Map<string, number>();

  return recipes.map((recipe, index) => {
    if (!recipe.imageUrl || recipe.imageUrl.trim() === '') {
      // Recipe has no imageUrl - return as-is
      return recipe;
    }

    const globalIndex = pageOffset + index;

    // Try to parse the URL, but handle errors gracefully
    let url: URL;
    try {
      url = new URL(recipe.imageUrl.trim());
    } catch (error) {
      // If URL is malformed, return recipe unchanged (don't break it)
      const recipeTitle = (recipe as any).title || 'Unknown';
      console.warn(`⚠️  Malformed image URL for recipe "${recipeTitle}": ${recipe.imageUrl}`);
      // Return recipe with original imageUrl intact
      return {
        ...recipe,
        imageUrl: recipe.imageUrl.trim(), // Ensure imageUrl is preserved and trimmed
      };
    }

    // Track how many times we've seen this base URL (without params)
    const baseUrl = `${url.protocol}//${url.hostname}${url.pathname}`;
    const occurrenceCount = seenUrls.get(baseUrl) || 0;
    seenUrls.set(baseUrl, occurrenceCount + 1);

    // Handle source.unsplash.com URLs FIRST (before general unsplash check)
    // These URLs have a different format: https://source.unsplash.com/800x600/?keywords&sig=123
    if (url.hostname === 'source.unsplash.com') {
      // For source.unsplash.com, update the sig parameter to vary the image
      // The URL format is: https://source.unsplash.com/800x600/?keywords&sig=timestamp
      const newSig = Date.now() + globalIndex + occurrenceCount;

      // Replace or append the sig parameter in the URL
      const urlStr = recipe.imageUrl;
      let newUrl: string;
      if (urlStr.includes('sig=')) {
        // Replace existing sig parameter
        newUrl = urlStr.replace(/sig=\d+/, `sig=${newSig}`);
      } else if (urlStr.includes('?')) {
        // Add sig to existing query string
        newUrl = `${urlStr}&sig=${newSig}`;
      } else {
        // Add sig as first query parameter
        newUrl = `${urlStr}?sig=${newSig}`;
      }

      return {
        ...recipe,
        imageUrl: newUrl,
      };
    }

    // For images.unsplash.com URLs, be very conservative
    // If the URL already has query parameters, don't modify it to avoid breaking valid URLs
    // Only modify URLs that are "clean" (no query params or minimal params)
    if (url.hostname === 'images.unsplash.com') {
      const hasQueryParams = url.searchParams.toString().length > 0;
      
      // If URL already has query params, preserve it exactly as-is
      // Many Unsplash URLs have required params that we shouldn't modify
      if (hasQueryParams) {
        // Just return the URL unchanged - it's already valid
        return {
          ...recipe,
          imageUrl: recipe.imageUrl.trim(), // Just ensure it's trimmed
        };
      }
      
      // URL has no query params - safe to add crop/size params for variety
      const cropModes = ['edges', 'entropy', 'faces', 'focalpoint'];
      const cropMode = cropModes[(globalIndex + occurrenceCount) % cropModes.length];

      url.searchParams.set('w', '800');
      url.searchParams.set('h', '600');
      url.searchParams.set('fit', 'crop');
      url.searchParams.set('crop', cropMode);
      url.searchParams.set('q', String(85 + (occurrenceCount % 5)));

      return {
        ...recipe,
        imageUrl: url.toString(),
      };
    }

    // For other image sources (including standard Unsplash CDN URLs like images.unsplash.com/photo-...)
    // or if URL parsing succeeded but hostname doesn't match our known patterns, return unchanged
    // This preserves URLs from other sources or standard Unsplash URLs that don't need modification
    // Ensure imageUrl is preserved and trimmed
    return {
      ...recipe,
      imageUrl: recipe.imageUrl.trim(), // Explicitly preserve imageUrl, ensure it's trimmed
    };
  });
  */
}

/**
 * Detects if multiple recipes in a batch have the same image URL
 * Returns the indices of duplicates
 *
 * @param recipes - Array of recipes to check
 * @returns Map of imageUrl to array of recipe indices
 */
export function detectDuplicateImages<T extends { imageUrl?: string | null }>(
  recipes: T[]
): Map<string, number[]> {
  const imageMap = new Map<string, number[]>();

  recipes.forEach((recipe, index) => {
    if (recipe.imageUrl) {
      const indices = imageMap.get(recipe.imageUrl) || [];
      indices.push(index);
      imageMap.set(recipe.imageUrl, indices);
    }
  });

  // Filter to only return URLs that appear more than once
  const duplicates = new Map<string, number[]>();
  imageMap.forEach((indices, url) => {
    if (indices.length > 1) {
      duplicates.set(url, indices);
    }
  });

  return duplicates;
}

/**
 * Logs duplicate image statistics for debugging
 *
 * @param recipes - Array of recipes to analyze
 * @param pageNumber - Current page number for logging
 */
export function logImageDuplicateStats<T extends { imageUrl?: string | null; title?: string }>(
  recipes: T[],
  pageNumber: number = 0
): void {
  const duplicates = detectDuplicateImages(recipes);

  if (duplicates.size === 0) {
    console.log(`✅ Page ${pageNumber}: All ${recipes.length} recipes have unique images`);
    return;
  }

  console.log(`⚠️  Page ${pageNumber}: Found ${duplicates.size} duplicate image(s):`);
  duplicates.forEach((indices, url) => {
    const recipeNames = indices
      .map((i) => recipes[i]?.title || 'Unknown')
      .join(', ');
    console.log(`   - ${url.substring(0, 50)}... used by: ${recipeNames}`);
  });
}
