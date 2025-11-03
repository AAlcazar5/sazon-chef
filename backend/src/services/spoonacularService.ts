// backend/src/services/spoonacularService.ts
import axios from 'axios';

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com';

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
      console.warn('⚠️  Spoonacular API key not found. External recipe enrichment will be disabled.');
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
      console.warn('⚠️  Spoonacular API not configured');
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
      console.error('❌ Error searching Spoonacular recipes:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Get detailed information about a recipe by Spoonacular ID
   */
  async getRecipeInformation(spoonacularId: number): Promise<SpoonacularRecipeInfo | null> {
    if (!this.isConfigured()) {
      console.warn('⚠️  Spoonacular API not configured');
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
      console.error('❌ Error fetching Spoonacular recipe info:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Get nutrition information for a recipe
   */
  async getRecipeNutrition(spoonacularId: number): Promise<any | null> {
    if (!this.isConfigured()) {
      console.warn('⚠️  Spoonacular API not configured');
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
      console.error('❌ Error fetching nutrition info:', error.response?.data || error.message);
      return null;
    }
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
      console.warn('⚠️  Spoonacular API not configured, skipping enrichment for:', recipeTitle);
      return null;
    }

    try {
      console.log(`🔍 Searching for external data for recipe: "${recipeTitle}"`);
      
      const recipeInfo = await this.findRecipeByTitle(recipeTitle);
      
      if (!recipeInfo) {
        console.log(`❌ No match found on Spoonacular for: "${recipeTitle}"`);
        return null;
      }

      console.log(`✅ Found match: "${recipeInfo.title}" (ID: ${recipeInfo.id})`);

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

      console.log(`📊 Enriched data:`, {
        title: recipeInfo.title,
        qualityScore,
        popularityScore,
        healthScore: recipeInfo.healthScore,
        likes: recipeInfo.aggregateLikes,
      });

      return enrichedData;
    } catch (error: any) {
      console.error('❌ Error enriching recipe data:', error.message);
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
      console.warn('⚠️  Spoonacular API not configured');
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
      console.error('❌ Error fetching random recipes:', error.response?.data || error.message);
      return null;
    }
  }
}

// Export singleton instance
export const spoonacularService = new SpoonacularService();
