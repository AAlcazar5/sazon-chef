import { logger } from '../utils/logger';
// backend/src/services/imageService.ts
import axios from 'axios';

/**
 * Image Service - Fetches free food images from Unsplash
 * Complies with Unsplash API Guidelines for Production Access
 * 
 * Production Guidelines Implemented:
 * 1. ✅ Hotlinks to original Unsplash URLs (photo.urls properties)
 * 2. ✅ Triggers download endpoint when image is used
 * 3. ✅ Returns attribution data for photographer credit
 * 4. ✅ API key kept confidential on backend
 */

export interface UnsplashPhoto {
  id: string;
  url: string; // Hotlinked URL from photo.urls.regular
  downloadLocation: string; // photo.links.download_location for tracking
  photographer: {
    name: string;
    username: string;
    profileUrl: string; // With UTM parameters
  };
  attributionText: string; // "Photo by {name} on Unsplash"
  unsplashUrl: string; // Link to photo on Unsplash with UTM
}

export class ImageService {
  private unsplashAccessKey: string;
  private baseUrl = 'https://api.unsplash.com';
  private appName = 'sazon_chef'; // Your app name for UTM tracking

  constructor() {
    // Unsplash Access Key (required for production)
    // Get free key at: https://unsplash.com/developers
    this.unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY || '';
  }

  /**
   * Search for a food image based on recipe details
   * Returns full photo data including attribution info for compliance
   *
   * @param params.page - Page number (1-based) to fetch different images from search results
   * @param params.resultIndex - Index within the page (0-based) to select specific result
   */
  async searchFoodImage(params: {
    recipeName: string;
    cuisine?: string;
    mainIngredient?: string;
    page?: number; // 1-based page number for Unsplash API
    resultIndex?: number; // 0-based index to select from results (0-29)
  }): Promise<UnsplashPhoto | null> {
    // Page and result index for getting different images (moved outside try for scope)
    const page = params.page || 1;
    const resultIndex = params.resultIndex || 0;

    try {
      const cleanName = sanitizeForQuery(params.recipeName);
      const primaryQuery = [cleanName, params.cuisine, 'food']
        .filter(Boolean)
        .join(' ');

      logger.info({ query: primaryQuery, page, resultIndex }, '🖼️  Searching for image');

      if (!this.unsplashAccessKey) {
        logger.info('⚠️  No Unsplash API key - no image returned');
        return null;
      }

      const photo = await this.runSearch(primaryQuery, page, resultIndex);
      if (photo) return photo;

      // Retry with a simpler query: cuisine + main ingredient + food
      const ingredient = extractMainIngredient(cleanName, params.mainIngredient);
      const fallbackQuery = [params.cuisine, ingredient, 'food']
        .filter(Boolean)
        .join(' ');

      if (fallbackQuery && fallbackQuery !== primaryQuery) {
        logger.info({ query: fallbackQuery }, '🔁 Retrying with simplified query');
        const retry = await this.runSearch(fallbackQuery, 1, 0);
        if (retry) return retry;
      }

      if (params.cuisine) {
        const cuisineQuery = `${params.cuisine} food`;
        logger.info({ query: cuisineQuery }, '🔁 Retrying with cuisine only');
        const cuisineRetry = await this.runSearch(cuisineQuery, 1, resultIndex);
        if (cuisineRetry) return cuisineRetry;
      }

      // Last resort: ingredient + food, no cuisine (handles niche cuisines)
      if (ingredient) {
        const ingredientQuery = `${ingredient} food`;
        logger.info({ query: ingredientQuery }, '🔁 Retrying with ingredient only');
        const ingredientRetry = await this.runSearch(ingredientQuery, 1, 0);
        if (ingredientRetry) return ingredientRetry;
      }

      logger.info('⚠️  No image found from any query');
      return null;
    } catch (error: any) {
      logger.error({ data: error.message }, '❌ Error fetching image from Unsplash:');
      return null;
    }
  }

  private async runSearch(
    query: string,
    page: number,
    resultIndex: number,
  ): Promise<UnsplashPhoto | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/search/photos`, {
        params: {
          query,
          per_page: 30,
          page,
          orientation: 'landscape',
          content_filter: 'high',
        },
        headers: {
          Authorization: `Client-ID ${this.unsplashAccessKey}`,
        },
        timeout: 3000,
      });

      if (response.data.results && response.data.results.length > 0) {
        // Use resultIndex to select different images (mod to wrap around if needed)
        const photoIndex = resultIndex % response.data.results.length;
        const photo = response.data.results[photoIndex];

        // GUIDELINE #1: Hotlink to photo URLs (required)
        // Use 'full' quality for production (1920px width) - perfect for mobile/tablet displays
        // Falls back to 'regular' if 'full' is not available
        const imageUrl = photo.urls.full || photo.urls.regular;

        // GUIDELINE #2: Store download_location for triggering downloads
        const downloadLocation = photo.links.download_location;

        // GUIDELINE #3: Prepare attribution data
        const photographer = {
          name: photo.user.name,
          username: photo.user.username,
          // Add UTM parameters as required
          profileUrl: `https://unsplash.com/@${photo.user.username}?utm_source=${this.appName}&utm_medium=referral`,
        };

        const unsplashUrl = `https://unsplash.com/photos/${photo.id}?utm_source=${this.appName}&utm_medium=referral`;
        const attributionText = `Photo by ${photographer.name} on Unsplash`;

        logger.info({ data: imageUrl }, `✅ Found image [${photoIndex}]:`);
        logger.info({ data: photographer.name }, '📸 Photographer:');

        return {
          id: photo.id,
          url: imageUrl,
          downloadLocation,
          photographer,
          attributionText,
          unsplashUrl,
        };
      }

      return null;
    } catch (error: any) {
      logger.error({ data: error.message, query }, '❌ Unsplash search error:');
      return null;
    }
  }

  /**
   * GUIDELINE #2: Trigger download endpoint when user uses the photo
   * This must be called when a recipe is viewed/saved/used
   */
  async triggerDownload(downloadLocation: string): Promise<void> {
    if (!this.unsplashAccessKey || !downloadLocation) {
      return;
    }

    try {
      logger.info({ data: downloadLocation }, '📸 Triggering Unsplash download endpoint:');
      await axios.get(downloadLocation, {
        headers: {
          Authorization: `Client-ID ${this.unsplashAccessKey}`,
        },
        timeout: 3000, 
      });
      logger.info('✅ Download event triggered successfully for Unsplash');
    } catch (error: any) {
      logger.error({ data: error.message }, '⚠️  Failed to trigger download event:');
      // Non-critical error, don't throw
    }
  }

}

const QUALIFIER_WORDS = new Set([
  'gluten-free', 'glutenfree', 'gluten', 'free',
  'dairy-free', 'dairyfree', 'dairy',
  'low-carb', 'lowcarb', 'keto',
  'high-protein', 'highprotein',
  'classic', 'authentic', 'modern',
  'real-ingredient', 'realingredient', 'real',
  'from-scratch', 'fromscratch',
]);

export function sanitizeForQuery(title: string): string {
  return title
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[-_/&]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const COMMON_PROTEINS = [
  'tofu', 'tempeh', 'paneer', 'halloumi', 'seitan',
  'salmon', 'shrimp', 'tuna', 'cod', 'tilapia', 'fish',
  'chicken', 'turkey', 'beef', 'steak', 'pork', 'lamb',
  'eggs', 'egg',
  'mushroom', 'mushrooms',
  'lentil', 'lentils', 'chickpeas', 'beans',
];

const COMMON_DISHES = [
  'burrito', 'tacos', 'taco', 'pizza', 'pasta', 'noodles', 'ramen',
  'curry', 'stir-fry', 'stirfry', 'salad', 'soup', 'stew',
  'burger', 'sandwich', 'wrap', 'bowl', 'rice',
  'pancakes', 'waffles', 'omelette', 'scramble',
];

export function extractMainIngredient(cleanTitle: string, hint?: string): string | undefined {
  if (hint) return hint;
  const lower = cleanTitle.toLowerCase();
  for (const protein of COMMON_PROTEINS) {
    if (lower.includes(protein)) return protein;
  }
  for (const dish of COMMON_DISHES) {
    if (lower.includes(dish)) return dish;
  }
  const meaningful = lower
    .split(/\s+/)
    .filter((w) => w.length > 2 && !QUALIFIER_WORDS.has(w));
  return meaningful[meaningful.length - 1];
}

export const imageService = new ImageService();

