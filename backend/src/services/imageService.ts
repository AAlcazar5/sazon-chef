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
      // Build search query
      const searchTerms = [params.recipeName];
      if (params.cuisine) {
        searchTerms.push(params.cuisine);
      }
      searchTerms.push('food'); // Always include 'food' to get relevant results

      const query = searchTerms.join(' ');

      console.log('🖼️  Searching for image:', query, `(page: ${page}, index: ${resultIndex})`);

      // If no API key, use a fallback approach (less reliable)
      if (!this.unsplashAccessKey) {
        console.log('⚠️  No Unsplash API key - using fallback image URL');
        return this.getFallbackPhoto(params.recipeName, params.cuisine, resultIndex);
      }

      // Search Unsplash with API key (GUIDELINE #1: Use API endpoints)
      // Fetch up to 30 results per page to have variety
      const response = await axios.get(`${this.baseUrl}/search/photos`, {
        params: {
          query,
          per_page: 30, // Fetch multiple results per page
          page,
          orientation: 'landscape',
          content_filter: 'high', // Family-friendly content only
        },
        headers: {
          Authorization: `Client-ID ${this.unsplashAccessKey}`,
        },
        timeout: 3000, // 3 second timeout for faster response
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

        console.log(`✅ Found image [${photoIndex}]:`, imageUrl);
        console.log('📸 Photographer:', photographer.name);

        return {
          id: photo.id,
          url: imageUrl,
          downloadLocation,
          photographer,
          attributionText,
          unsplashUrl,
        };
      }

      console.log('⚠️  No image found, using fallback');
      return this.getFallbackPhoto(params.recipeName, params.cuisine, resultIndex);
    } catch (error: any) {
      console.error('❌ Error fetching image from Unsplash:', error.message);
      return this.getFallbackPhoto(params.recipeName, params.cuisine, resultIndex);
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
      console.log('📸 Triggering Unsplash download endpoint:', downloadLocation);
      await axios.get(downloadLocation, {
        headers: {
          Authorization: `Client-ID ${this.unsplashAccessKey}`,
        },
        timeout: 3000, 
      });
      console.log('✅ Download event triggered successfully for Unsplash');
    } catch (error: any) {
      console.error('⚠️  Failed to trigger download event:', error.message);
      // Non-critical error, don't throw
    }
  }

  /**
   * Get a fallback photo (no API key required)
   * Returns minimal attribution data
   */
  private getFallbackPhoto(recipeName: string, cuisine?: string, resultIndex: number = 0): UnsplashPhoto | null {
    // Unsplash Source provides random images based on keywords
    // Format: https://source.unsplash.com/800x600/?food,pasta
    const keywords = ['food'];

    if (cuisine) {
      keywords.push(cuisine.toLowerCase());
    }

    // Add first word of recipe name as additional context
    const firstWord = recipeName.split(' ')[0].toLowerCase();
    if (firstWord && !['the', 'a', 'an'].includes(firstWord)) {
      keywords.push(firstWord);
    }

    const keywordString = keywords.join(',');
    // Add resultIndex and timestamp to prevent caching and get variety
    const randomSeed = Date.now() + resultIndex;
    const fallbackUrl = `https://source.unsplash.com/800x600/?${keywordString}&sig=${randomSeed}`;

    console.log('🖼️  Using fallback image URL:', fallbackUrl);

    // Return minimal photo object
    return {
      id: `fallback-${randomSeed}`,
      url: fallbackUrl,
      downloadLocation: '',
      photographer: {
        name: 'Unsplash',
        username: 'unsplash',
        profileUrl: `https://unsplash.com?utm_source=${this.appName}&utm_medium=referral`,
      },
      attributionText: 'Photo from Unsplash',
      unsplashUrl: `https://unsplash.com?utm_source=${this.appName}&utm_medium=referral`,
    };
  }
}

export const imageService = new ImageService();

