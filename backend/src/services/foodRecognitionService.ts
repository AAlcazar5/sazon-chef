// backend/src/services/foodRecognitionService.ts
// Food recognition and calorie estimation from photos (Phase 6, Group 13)

import axios from 'axios';
import { OpenAI } from 'openai';

export interface FoodRecognitionResult {
  foods: Array<{
    name: string;
    confidence: number;
    estimatedCalories: number;
    estimatedPortion?: string; // e.g., "1 cup", "1 serving", "200g"
    ingredients?: string[];
  }>;
  totalEstimatedCalories: number;
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

export class FoodRecognitionService {
  private openai: OpenAI | null = null;
  private useOpenFoodFacts = true; // OpenFoodFacts is free and open-source

  constructor() {
    // Initialize OpenAI for vision if available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      console.log('✅ Food Recognition Service: OpenAI Vision configured');
    } else {
      console.log('⚠️  Food Recognition Service: OpenAI not configured, will use OpenFoodFacts for barcodes only');
    }
  }

  /**
   * Recognize food from photo and estimate calories
   * Uses OpenAI Vision API for food recognition
   */
  async recognizeFoodFromPhoto(imageBase64: string, imageMimeType: string = 'image/jpeg'): Promise<FoodRecognitionResult> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY to use food recognition.');
    }

    try {
      console.log('🍽️  Recognizing food from photo...');

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o', // or 'gpt-4-vision-preview' if available
        messages: [
          {
            role: 'system',
            content: `You are a nutrition expert. Analyze food photos and provide:
1. A list of foods/ingredients visible in the photo
2. Estimated portion sizes
3. Estimated calories for each food item
4. Total estimated calories for the meal

Be accurate and conservative with estimates. Consider:
- Portion size relative to common serving sizes
- Cooking methods (fried foods have more calories)
- Visible ingredients and their typical calorie densities

Return your analysis as a structured JSON response.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this food photo and provide detailed calorie estimation. Include all visible foods, estimated portions, and calories per item plus total calories.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${imageMimeType};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.3, // Lower temperature for more accurate estimates
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI Vision API');
      }

      // Try to parse JSON from response
      let parsedResult: any;
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
        const jsonText = jsonMatch ? jsonMatch[1] : content;
        parsedResult = JSON.parse(jsonText);
      } catch (parseError) {
        // If JSON parsing fails, try to extract information from text
        console.warn('⚠️  Could not parse JSON response, attempting text extraction');
        parsedResult = this.parseTextResponse(content);
      }

      // Normalize the response
      const foods = Array.isArray(parsedResult.foods) ? parsedResult.foods : [];
      const totalCalories = parsedResult.totalEstimatedCalories || 
                           foods.reduce((sum: number, f: any) => sum + (f.estimatedCalories || 0), 0);
      const mealDescription = parsedResult.mealDescription || 
                              foods.map((f: any) => f.name).join(', ') || 
                              'Food items';

      return {
        foods: foods.map((f: any) => ({
          name: f.name || 'Unknown',
          confidence: f.confidence || 0.7,
          estimatedCalories: f.estimatedCalories || 0,
          estimatedPortion: f.estimatedPortion || f.portion,
          ingredients: f.ingredients || [],
        })),
        totalEstimatedCalories: Math.round(totalCalories),
        mealDescription,
        confidence: parsedResult.confidence || 0.7,
      };
    } catch (error: any) {
      console.error('❌ Food recognition error:', error);
      throw new Error(`Failed to recognize food: ${error.message}`);
    }
  }

  /**
   * Parse text response if JSON parsing fails
   */
  private parseTextResponse(text: string): any {
    // Try to extract food information from text
    const foods: any[] = [];
    let totalCalories = 0;

    // Look for patterns like "Food Name: X calories"
    const foodPattern = /([^:]+):\s*(\d+)\s*calories?/gi;
    let match;
    while ((match = foodPattern.exec(text)) !== null) {
      const name = match[1].trim();
      const calories = parseInt(match[2], 10);
      foods.push({
        name,
        estimatedCalories: calories,
        confidence: 0.6,
      });
      totalCalories += calories;
    }

    return {
      foods,
      totalEstimatedCalories: totalCalories,
      mealDescription: foods.map(f => f.name).join(', ') || 'Food items',
      confidence: 0.6,
    };
  }

  /**
   * Scan barcode and get nutritional information
   * Uses OpenFoodFacts API (free and open-source)
   */
  async scanBarcode(barcode: string): Promise<BarcodeScanResult | null> {
    try {
      console.log('📱 Scanning barcode:', barcode);

      // OpenFoodFacts API
      const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
        timeout: 5000,
      });

      if (response.data.status === 0 || !response.data.product) {
        console.log('⚠️  Product not found in OpenFoodFacts database');
        return null;
      }

      const product = response.data.product;

      // Extract nutritional information
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
      
      // Try alternative API: Nutritionix (if API key available)
      if (process.env.NUTRITIONIX_API_KEY && process.env.NUTRITIONIX_APP_ID) {
        return this.scanBarcodeNutritionix(barcode);
      }

      throw new Error(`Failed to scan barcode: ${error.message}`);
    }
  }

  /**
   * Alternative barcode scanning using Nutritionix API
   */
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
        }
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

export const foodRecognitionService = new FoodRecognitionService();

