import { logger } from '../../utils/logger';
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
    return !!process.env.GOOGLE_AI_API_KEY;
  }

  async generateRecipe(request: RecipeGenerationRequest): Promise<GeneratedRecipe> {
    if (!this.genAI) {
      throw new Error('Gemini is not configured');
    }

    try {
      // Precedence: per-request override (Path A/B routing) → GOOGLE_AI_MODEL
      // env (per-deploy override) → default. The default stays Flash so
      // legacy callers and seed scripts keep their previous behavior.
      const modelName = request.model ?? process.env.GOOGLE_AI_MODEL ?? 'gemini-2.5-flash';
      const model = this.genAI.getGenerativeModel({
        model: modelName,
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
      logger.info(`✅ [Gemini] Recipe generated: ${recipe.title}`);
      return recipe;
    } catch (error: any) {
      throw this.normalizeError(error, 'generateRecipe');
    }
  }
}

