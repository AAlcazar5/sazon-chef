// Google Gemini Provider Implementation
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, RecipeGenerationRequest, AIProviderError } from './AIProvider';
import type { GeneratedRecipe } from '../aiRecipeService';

export class GeminiProvider extends AIProvider {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    super('Gemini (Google)');
    if (this.isConfigured) {
      const apiKey = process.env.GOOGLE_AI_API_KEY;
      this.genAI = new GoogleGenerativeAI(apiKey!);
    }
  }

  checkConfiguration(): boolean {
    // Gemini API key exists but models are not accessible (404 errors)
    // Disabling until account has proper access
    return false; // Changed from: !!process.env.GOOGLE_AI_API_KEY
  }

  async generateRecipe(request: RecipeGenerationRequest): Promise<GeneratedRecipe> {
    if (!this.genAI) {
      throw new Error('Gemini is not configured');
    }

    try {
      // Use gemini-1.5-flash-latest or gemini-pro (more widely available)
      // gemini-1.5-pro might not be available in all regions/API versions
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash-latest', // More widely available, fast and cost-effective
        generationConfig: {
          temperature: Math.min(request.temperature || 1.1, 2.0), // Gemini allows up to 2.0
          maxOutputTokens: request.maxTokens || 8192,
          responseMimeType: 'application/json',
        },
      });

      const fullPrompt = `${request.systemPrompt}\n\n${request.prompt}`;
      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      const text = response.text();

      // Gemini returns JSON directly when responseMimeType is set
      const recipe = JSON.parse(text) as GeneratedRecipe;
      console.log(`✅ [Gemini] Recipe generated: ${recipe.title}`);
      return recipe;
    } catch (error: any) {
      throw this.normalizeError(error, 'generateRecipe');
    }
  }
}

