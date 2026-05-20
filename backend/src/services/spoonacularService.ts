import { logger } from '../utils/logger';
// backend/src/services/spoonacularService.ts
import axios from 'axios';

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com';

/** Dice/Sørensen bigram similarity on lowercased alnum chars. Same
 *  algorithm the frontend wedge uses to rank catalog candidates —
 *  applied here to filter Spoonacular's fuzzy results down to titles
 *  that actually resemble what the user asked for. Returns [0, 1]. */
function titleDice(a: string, b: string): number {
  const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const bigrams = (s: string): string[] => {
    const out: string[] = [];
    for (let i = 0; i < s.length - 1; i += 1) out.push(s.slice(i, i + 2));
    return out;
  };
  const A = bigrams(norm(a));
  const B = bigrams(norm(b));
  if (A.length === 0 || B.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const g of B) counts.set(g, (counts.get(g) ?? 0) + 1);
  let matches = 0;
  for (const g of A) {
    const c = counts.get(g) ?? 0;
    if (c > 0) {
      matches += 1;
      counts.set(g, c - 1);
    }
  }
  return (2 * matches) / (A.length + B.length);
}

export interface SpoonacularRecipeInfo {
  id: number;
  title: string;
  image: string;
  imageType: string;
  servings: number;
  readyInMinutes: number;
  healthScore: number;
  spoonacularScore: number;
  pricePerServing: number;
  cuisines: string[];
  diets: string[];
  aggregateLikes: number;
  creditsText?: string;
  sourceName?: string;
  sourceUrl?: string;
}

export interface SpoonacularNutrition {
  calories: number;
  protein: string;
  fat: string;
  carbs: string;
  fiber: string;
  sugar: string;
}

export interface SpoonacularSearchResult {
  results: {
    id: number;
    title: string;
    image: string;
    imageType: string;
  }[];
  offset: number;
  number: number;
  totalResults: number;
}

export interface ExternalRecipeData {
  externalId?: string;
  externalSource?: string;
  qualityScore?: number;
  popularityScore?: number;
  healthScore?: number;
  aggregateLikes?: number;
  spoonacularScore?: number;
  pricePerServing?: number;
  sourceUrl?: string;
  sourceName?: string;
}

class SpoonacularService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = SPOONACULAR_API_KEY || '';
    this.baseUrl = SPOONACULAR_BASE_URL;

    if (!this.apiKey) {
      logger.warn('⚠️  Spoonacular API key not found. External recipe enrichment will be disabled.');
    }
  }

  /**
   * Check if the API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Search for recipes by name
   */
  async searchRecipes(query: string, options?: {
    cuisine?: string;
    diet?: string;
    maxReadyTime?: number;
    number?: number;
  }): Promise<SpoonacularSearchResult | null> {
    if (!this.isConfigured()) {
      logger.warn('⚠️  Spoonacular API not configured');
      return null;
    }

    try {
      const params: any = {
        apiKey: this.apiKey,
        query,
        number: options?.number || 10,
        addRecipeInformation: true,
        fillIngredients: false,
      };

      if (options?.cuisine) params.cuisine = options.cuisine;
      if (options?.diet) params.diet = options.diet;
      if (options?.maxReadyTime) params.maxReadyTime = options.maxReadyTime;

      const response = await axios.get(`${this.baseUrl}/recipes/complexSearch`, { params });
      return response.data;
    } catch (error: any) {
      logger.error({ data: error.response?.data || error.message }, '❌ Error searching Spoonacular recipes:');
      return null;
    }
  }

  /**
   * Get detailed information about a recipe by Spoonacular ID
   */
  async getRecipeInformation(spoonacularId: number): Promise<SpoonacularRecipeInfo | null> {
    if (!this.isConfigured()) {
      logger.warn('⚠️  Spoonacular API not configured');
      return null;
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/recipes/${spoonacularId}/information`,
        {
          params: {
            apiKey: this.apiKey,
            includeNutrition: false,
          }
        }
      );
      return response.data;
    } catch (error: any) {
      logger.error({ data: error.response?.data || error.message }, '❌ Error fetching Spoonacular recipe info:');
      return null;
    }
  }

  /**
   * Get nutrition information for a recipe
   */
  async getRecipeNutrition(spoonacularId: number): Promise<any | null> {
    if (!this.isConfigured()) {
      logger.warn('⚠️  Spoonacular API not configured');
      return null;
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/recipes/${spoonacularId}/nutritionWidget.json`,
        {
          params: { apiKey: this.apiKey }
        }
      );
      return response.data;
    } catch (error: any) {
      logger.error({ data: error.response?.data || error.message }, '❌ Error fetching nutrition info:');
      return null;
    }
  }

  /**
   * Tier Y wedge photos (founder 2026-05-20): given a recipe title /
   * description, return UP TO `count` representative photo URLs ranked
   * by title-similarity to the query. Used to populate the in-chat
   * card's 3-photo collage (kitchen-mode parity).
   *
   * Why we rank locally instead of trusting Spoonacular's order:
   * complexSearch is fuzzy — "Grilled Chicken" matches "Chicken Gyro"
   * (returns tacos!) because both share tokens. Pulling 10 candidates
   * and ranking by Dice on the title against the original query gives
   * us much sharper results than `number: 1` ever could.
   *
   * Optional `cuisine` further narrows the search server-side (e.g.
   * "American" for "Grilled Chicken Breast" — excludes Mediterranean
   * gyro variants entirely).
   */
  async findRecipeImages(
    query: string,
    count: number = 3,
    cuisine?: string,
  ): Promise<string[]> {
    if (!this.isConfigured()) return [];
    // Pull more than `count` so the title-Dice ranker has options to
    // pick from. 20 covers most queries; cheap on Spoonacular's points
    // (each complexSearch costs 1 point regardless of `number` up to ~100).
    const POOL_SIZE = 20;

    // Founder report 2026-05-20 round 8: cuisine filter ('American'
    // etc.) overly restricts Spoonacular's result pool — many queries
    // returned only 1 candidate, so the carousel collapsed to a single
    // image. Title-Dice on a larger pool gives better relevance than
    // cuisine + Dice on a tiny pool. Try cuisine-filtered first only
    // if explicitly requested; fall back to unfiltered when the pool
    // is thin.
    const tryRank = (items: SpoonacularSearchResult['results']) => {
      type Scored = { image: string; score: number };
      const scored: Scored[] = [];
      for (const r of items) {
        if (typeof r.image !== 'string' || r.image.length === 0) continue;
        if (typeof r.title !== 'string' || r.title.length === 0) continue;
        scored.push({ image: r.image, score: titleDice(r.title, query) });
      }
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, count).map((s) => s.image);
    };

    let images: string[] = [];
    if (cuisine) {
      const filtered = await this.searchRecipes(query, {
        number: POOL_SIZE,
        cuisine,
      });
      images = tryRank(filtered?.results ?? []);
    }
    // Cuisine filter returned too few — re-search without the filter
    // and rank from the larger pool. Title-Dice still ensures
    // relevance.
    if (images.length < count) {
      const unfiltered = await this.searchRecipes(query, { number: POOL_SIZE });
      const fromUnfiltered = tryRank(unfiltered?.results ?? []);
      // Merge: prefer cuisine-filtered (more relevant cuisine-wise),
      // backfill with unfiltered top picks. Dedup by URL.
      const seen = new Set(images);
      for (const url of fromUnfiltered) {
        if (images.length >= count) break;
        if (!seen.has(url)) {
          images.push(url);
          seen.add(url);
        }
      }
    }
    return images;
  }

  /** @deprecated kept for the single-image legacy path; new callers
   *  should use findRecipeImages. */
  async findRecipeImage(query: string): Promise<string | null> {
    const images = await this.findRecipeImages(query, 1);
    return images[0] ?? null;
  }

  /**
   * Search for a recipe by title to find potential match
   * Returns the best match based on title similarity
   */
  async findRecipeByTitle(title: string): Promise<SpoonacularRecipeInfo | null> {
    const searchResults = await this.searchRecipes(title, { number: 5 });
    
    if (!searchResults || searchResults.results.length === 0) {
      return null;
    }

    // Get the first result (most relevant)
    const bestMatch = searchResults.results[0];
    
    // Fetch detailed information
    return await this.getRecipeInformation(bestMatch.id);
  }

  /**
   * Enrich recipe data with external metrics
   * This fetches quality scores, popularity, and other external data
   */
  async enrichRecipeData(recipeTitle: string): Promise<ExternalRecipeData | null> {
    if (!this.isConfigured()) {
      logger.warn({ data: recipeTitle }, '⚠️  Spoonacular API not configured, skipping enrichment for:');
      return null;
    }

    try {
      logger.info(`🔍 Searching for external data for recipe: "${recipeTitle}"`);
      
      const recipeInfo = await this.findRecipeByTitle(recipeTitle);
      
      if (!recipeInfo) {
        logger.info(`❌ No match found on Spoonacular for: "${recipeTitle}"`);
        return null;
      }

      logger.info(`✅ Found match: "${recipeInfo.title}" (ID: ${recipeInfo.id})`);

      // Calculate quality score (0-100) based on health score and spoonacular score
      const qualityScore = Math.round(
        (recipeInfo.healthScore * 0.5) + 
        (recipeInfo.spoonacularScore * 0.5)
      );

      // Normalize popularity score (0-100) based on aggregate likes
      // Assuming 500+ likes is very popular (100), adjust as needed
      const popularityScore = Math.min(100, Math.round((recipeInfo.aggregateLikes / 500) * 100));

      const enrichedData: ExternalRecipeData = {
        externalId: recipeInfo.id.toString(),
        externalSource: 'spoonacular',
        qualityScore,
        popularityScore,
        healthScore: recipeInfo.healthScore,
        aggregateLikes: recipeInfo.aggregateLikes,
        spoonacularScore: recipeInfo.spoonacularScore,
        pricePerServing: recipeInfo.pricePerServing,
        sourceUrl: recipeInfo.sourceUrl,
        sourceName: recipeInfo.sourceName,
      };

      logger.info({
        title: recipeInfo.title,
        qualityScore,
        popularityScore,
        healthScore: recipeInfo.healthScore,
        likes: recipeInfo.aggregateLikes,
      }, '📊 Enriched data');

      return enrichedData;
    } catch (error: any) {
      logger.error({ data: error.message }, '❌ Error enriching recipe data:');
      return null;
    }
  }

  /**
   * Batch enrich multiple recipes
   * Note: Be mindful of API rate limits
   */
  async batchEnrichRecipes(recipeTitles: string[], delayMs: number = 200): Promise<Map<string, ExternalRecipeData | null>> {
    const results = new Map<string, ExternalRecipeData | null>();

    for (const title of recipeTitles) {
      const enrichedData = await this.enrichRecipeData(title);
      results.set(title, enrichedData);
      
      // Delay to respect rate limits
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }

  /**
   * Get random recipes from Spoonacular
   */
  async getRandomRecipes(options?: {
    number?: number;
    tags?: string[];
  }): Promise<any | null> {
    if (!this.isConfigured()) {
      logger.warn('⚠️  Spoonacular API not configured');
      return null;
    }

    try {
      const params: any = {
        apiKey: this.apiKey,
        number: options?.number || 10,
      };

      if (options?.tags && options.tags.length > 0) {
        params.tags = options.tags.join(',');
      }

      const response = await axios.get(`${this.baseUrl}/recipes/random`, { params });
      return response.data;
    } catch (error: any) {
      logger.error({ data: error.response?.data || error.message }, '❌ Error fetching random recipes:');
      return null;
    }
  }
}

// Export singleton instance
export const spoonacularService = new SpoonacularService();
