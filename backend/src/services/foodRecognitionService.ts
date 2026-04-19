// backend/src/services/foodRecognitionService.ts
// Food recognition and macro estimation from photos
// Primary: Claude (Anthropic) — Fallback: Gemini (Google)

import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface FoodRecognitionResult {
  foods: Array<{
    name: string;
    confidence: number;
    estimatedCalories: number;
    estimatedProtein: number;
    estimatedCarbs: number;
    estimatedFat: number;
    estimatedFiber: number;
    estimatedPortion?: string; // e.g., "1 cup", "1 serving", "200g"
    portionGrams?: number;
    ingredients?: string[];
  }>;
  totalEstimatedCalories: number;
  totalEstimatedProtein: number;
  totalEstimatedCarbs: number;
  totalEstimatedFat: number;
  mealDescription: string;
  confidence: number;
}

export interface BarcodeScanResult {
  productName: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  servingSize?: string;
  ingredients?: string[];
  imageUrl?: string;
  barcode: string;
}

// Shared prompt for all vision providers
const SYSTEM_PROMPT = `You are a nutrition expert. Analyze food photos and provide a full macro breakdown.

For each food item visible in the photo, estimate:
- calories (kcal)
- protein (g)
- carbs (g)
- fat (g)
- fiber (g)
- portion size description (e.g., "1 cup", "1 medium breast")
- portion weight in grams

Be accurate and conservative with estimates. Consider:
- Portion size relative to common serving sizes
- Cooking methods (fried foods have more calories and fat)
- Visible ingredients and their typical macro densities

Return ONLY valid JSON with this exact shape (no markdown, no code fences):
{
  "foods": [{ "name": "string", "confidence": 0.0-1.0, "estimatedCalories": number, "estimatedProtein": number, "estimatedCarbs": number, "estimatedFat": number, "estimatedFiber": number, "estimatedPortion": "string", "portionGrams": number }],
  "totalEstimatedCalories": number,
  "totalEstimatedProtein": number,
  "totalEstimatedCarbs": number,
  "totalEstimatedFat": number,
  "mealDescription": "string",
  "confidence": 0.0-1.0
}`;

const USER_PROMPT = 'Analyze this food photo. For each food item, estimate calories, protein (g), carbs (g), fat (g), and fiber (g) per the visible portion. Include estimated portion size in grams.';

type VisionProvider = 'claude' | 'gemini';

export class FoodRecognitionService {
  private anthropic: Anthropic | null = null;
  private gemini: GoogleGenerativeAI | null = null;
  private providerOrder: VisionProvider[] = [];

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      this.providerOrder.push('claude');
      console.log('✅ Food Recognition: Claude configured (primary)');
    }

    if (process.env.GOOGLE_AI_API_KEY) {
      this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
      this.providerOrder.push('gemini');
      console.log('✅ Food Recognition: Gemini configured (fallback)');
    }

    if (this.providerOrder.length === 0) {
      console.log('⚠️  Food Recognition: No vision providers configured (set ANTHROPIC_API_KEY or GOOGLE_AI_API_KEY)');
    }
  }

  /**
   * Recognize food from photo with automatic provider fallback.
   * Tries Claude first, falls back to Gemini on failure.
   */
  async recognizeFoodFromPhoto(imageBase64: string, imageMimeType: string = 'image/jpeg'): Promise<FoodRecognitionResult> {
    if (this.providerOrder.length === 0) {
      throw new FoodRecognitionError(
        'No vision API configured. Set ANTHROPIC_API_KEY or GOOGLE_AI_API_KEY.',
        'no_provider',
      );
    }

    let lastError: Error | null = null;

    for (const provider of this.providerOrder) {
      try {
        console.log(`🍽️  Recognizing food via ${provider}...`);
        const raw = provider === 'claude'
          ? await this.recognizeWithClaude(imageBase64, imageMimeType)
          : await this.recognizeWithGemini(imageBase64, imageMimeType);

        return this.normalizeResult(raw);
      } catch (error: any) {
        console.warn(`⚠️  ${provider} food recognition failed: ${error.message}`);
        lastError = error;
        // Continue to next provider
      }
    }

    // All providers failed
    const isAuth = lastError?.message?.includes('401') || lastError?.message?.includes('deactivated') || lastError?.message?.includes('Unauthorized');
    const isQuota = lastError?.message?.includes('429') || lastError?.message?.includes('quota') || lastError?.message?.includes('rate');
    const isNotFood = lastError?.message?.includes('not food') || lastError?.message?.includes('cannot identify');

    if (isNotFood) {
      throw new FoodRecognitionError(
        'Could not identify food in this image. Try a clearer photo with the food in focus.',
        'not_food',
      );
    }
    if (isAuth) {
      throw new FoodRecognitionError(
        'Vision API authentication failed. Please check your API keys.',
        'auth_error',
      );
    }
    if (isQuota) {
      throw new FoodRecognitionError(
        'Vision API rate limit reached. Please try again in a moment.',
        'rate_limit',
      );
    }

    throw new FoodRecognitionError(
      `Food recognition failed: ${lastError?.message || 'Unknown error'}`,
      'provider_error',
    );
  }

  // ─── Claude (Anthropic) ──────────────────────────────────────────────

  private async recognizeWithClaude(imageBase64: string, imageMimeType: string): Promise<any> {
    if (!this.anthropic) throw new Error('Claude not configured');

    const mediaType = imageMimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageBase64 },
            },
            { type: 'text', text: `${SYSTEM_PROMPT}\n\n${USER_PROMPT}` },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    return this.parseJsonResponse(textBlock.text);
  }

  // ─── Gemini (Google) ─────────────────────────────────────────────────

  private async recognizeWithGemini(imageBase64: string, imageMimeType: string): Promise<any> {
    if (!this.gemini) throw new Error('Gemini not configured');

    const model = this.gemini.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent([
      { text: `${SYSTEM_PROMPT}\n\n${USER_PROMPT}` },
      {
        inlineData: {
          mimeType: imageMimeType,
          data: imageBase64,
        },
      },
    ]);

    const text = result.response.text();
    return this.parseJsonResponse(text);
  }

  // ─── Response parsing ────────────────────────────────────────────────

  private parseJsonResponse(content: string): any {
    // Try direct JSON parse first
    try {
      return JSON.parse(content);
    } catch {
      // Strip markdown code fences if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch { /* fall through */ }
      }

      // Text fallback
      console.warn('⚠️  Could not parse JSON response, using text extraction fallback');
      return this.parseTextResponse(content);
    }
  }

  private parseTextResponse(text: string): any {
    const foods: any[] = [];
    let totalCalories = 0;

    const foodPattern = /([^:]+):\s*(\d+)\s*calories?/gi;
    let match;
    while ((match = foodPattern.exec(text)) !== null) {
      const name = match[1].trim();
      const calories = parseInt(match[2], 10);
      foods.push({ name, estimatedCalories: calories, confidence: 0.6 });
      totalCalories += calories;
    }

    return {
      foods,
      totalEstimatedCalories: totalCalories,
      totalEstimatedProtein: 0,
      totalEstimatedCarbs: 0,
      totalEstimatedFat: 0,
      mealDescription: foods.map((f) => f.name).join(', ') || 'Food items',
      confidence: 0.6,
    };
  }

  private normalizeResult(parsed: any): FoodRecognitionResult {
    const foods = Array.isArray(parsed.foods) ? parsed.foods : [];
    const totalCalories = parsed.totalEstimatedCalories ||
      foods.reduce((s: number, f: any) => s + (f.estimatedCalories || 0), 0);
    const totalProtein = parsed.totalEstimatedProtein ??
      foods.reduce((s: number, f: any) => s + (f.estimatedProtein || 0), 0);
    const totalCarbs = parsed.totalEstimatedCarbs ??
      foods.reduce((s: number, f: any) => s + (f.estimatedCarbs || 0), 0);
    const totalFat = parsed.totalEstimatedFat ??
      foods.reduce((s: number, f: any) => s + (f.estimatedFat || 0), 0);

    return {
      foods: foods.map((f: any) => ({
        name: f.name || 'Unknown',
        confidence: f.confidence || 0.7,
        estimatedCalories: f.estimatedCalories || 0,
        estimatedProtein: f.estimatedProtein || 0,
        estimatedCarbs: f.estimatedCarbs || 0,
        estimatedFat: f.estimatedFat || 0,
        estimatedFiber: f.estimatedFiber || 0,
        estimatedPortion: f.estimatedPortion || f.portion,
        portionGrams: f.portionGrams || undefined,
        ingredients: f.ingredients || [],
      })),
      totalEstimatedCalories: Math.round(totalCalories),
      totalEstimatedProtein: Math.round(totalProtein * 10) / 10,
      totalEstimatedCarbs: Math.round(totalCarbs * 10) / 10,
      totalEstimatedFat: Math.round(totalFat * 10) / 10,
      mealDescription: parsed.mealDescription || foods.map((f: any) => f.name).join(', ') || 'Food items',
      confidence: parsed.confidence || 0.7,
    };
  }

  // ─── Barcode scanning (unchanged) ────────────────────────────────────

  async scanBarcode(barcode: string): Promise<BarcodeScanResult | null> {
    try {
      console.log('📱 Scanning barcode:', barcode);

      const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
        timeout: 5000,
      });

      if (response.data.status === 0 || !response.data.product) {
        console.log('⚠️  Product not found in OpenFoodFacts database');
        return null;
      }

      const product = response.data.product;
      const nutriments = product.nutriments || {};
      const servingSize = product.serving_size || product.quantity || '100g';

      return {
        productName: product.product_name || product.product_name_en || 'Unknown Product',
        brand: product.brands || product.brand,
        calories: Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0),
        protein: Math.round((nutriments['proteins_100g'] || nutriments['proteins'] || 0) * 10) / 10,
        carbs: Math.round((nutriments['carbohydrates_100g'] || nutriments['carbohydrates'] || 0) * 10) / 10,
        fat: Math.round((nutriments['fat_100g'] || nutriments['fat'] || 0) * 10) / 10,
        fiber: nutriments['fiber_100g'] || nutriments['fiber'] || undefined,
        sugar: nutriments['sugars_100g'] || nutriments['sugars'] || undefined,
        servingSize,
        ingredients: product.ingredients_text ? [product.ingredients_text] : undefined,
        imageUrl: product.image_url || product.image_front_url,
        barcode,
      };
    } catch (error: any) {
      console.error('❌ Barcode scan error:', error);

      if (process.env.NUTRITIONIX_API_KEY && process.env.NUTRITIONIX_APP_ID) {
        return this.scanBarcodeNutritionix(barcode);
      }

      throw new Error(`Failed to scan barcode: ${error.message}`);
    }
  }

  private async scanBarcodeNutritionix(barcode: string): Promise<BarcodeScanResult | null> {
    try {
      const response = await axios.post(
        'https://trackapi.nutritionix.com/v2/search/item',
        { upc: barcode },
        {
          headers: {
            'x-app-id': process.env.NUTRITIONIX_APP_ID!,
            'x-app-key': process.env.NUTRITIONIX_API_KEY!,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        },
      );

      if (!response.data.foods || response.data.foods.length === 0) {
        return null;
      }

      const food = response.data.foods[0];

      return {
        productName: food.food_name || 'Unknown Product',
        brand: food.brand_name,
        calories: Math.round(food.nf_calories || 0),
        protein: Math.round((food.nf_protein || 0) * 10) / 10,
        carbs: Math.round((food.nf_total_carbohydrate || 0) * 10) / 10,
        fat: Math.round((food.nf_total_fat || 0) * 10) / 10,
        fiber: food.nf_dietary_fiber || undefined,
        sugar: food.nf_sugars || undefined,
        servingSize: food.serving_weight_grams ? `${food.serving_weight_grams}g` : '1 serving',
        barcode,
      };
    } catch (error: any) {
      console.error('❌ Nutritionix barcode scan error:', error);
      return null;
    }
  }
}

// Typed error class for better frontend handling
export class FoodRecognitionError extends Error {
  constructor(
    message: string,
    public readonly code: 'no_provider' | 'not_food' | 'auth_error' | 'rate_limit' | 'provider_error',
  ) {
    super(message);
    this.name = 'FoodRecognitionError';
  }
}

export const foodRecognitionService = new FoodRecognitionService();
