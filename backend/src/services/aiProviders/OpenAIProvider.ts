// OpenAI Provider Implementation
import OpenAI from 'openai';
import { AIProvider, RecipeGenerationRequest, AIProviderError } from './AIProvider';
import type { GeneratedRecipe } from '../aiRecipeService';

export class OpenAIProvider extends AIProvider {
  private openai: OpenAI | null = null;

  constructor() {
    super('OpenAI');
    if (this.isConfigured) {
      const apiKey = process.env.OPENAI_API_KEY;
      this.openai = new OpenAI({ apiKey });
    }
  }

  checkConfiguration(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  async generateRecipe(request: RecipeGenerationRequest): Promise<GeneratedRecipe> {
    if (!this.openai) {
      throw new Error('OpenAI is not configured');
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: request.systemPrompt,
          },
          {
            role: 'user',
            content: request.prompt,
          },
        ],
        temperature: request.temperature || 1.1,
        max_tokens: request.maxTokens || 2000,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      const recipe = JSON.parse(content) as GeneratedRecipe;
      console.log(`✅ [OpenAI] Recipe generated: ${recipe.title}`);
      return recipe;
    } catch (error: any) {
      console.log(`🔍 [OpenAI] Error caught, normalizing:`, {
        code: error.code,
        status: error.status,
        errorCode: error.error?.code,
        errorType: error.error?.type,
        message: error.message,
      });
      const normalized = this.normalizeError(error, 'generateRecipe');
      console.log(`🔍 [OpenAI] Normalized error:`, {
        code: normalized.code,
        status: normalized.status,
        isQuotaError: normalized.isQuotaError,
        isRateLimitError: normalized.isRateLimitError,
      });
      throw normalized;
    }
  }
}

