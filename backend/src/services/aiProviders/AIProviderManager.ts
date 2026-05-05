import { logger } from '../../utils/logger';
// AI Provider Manager - Handles automatic fallback between providers
import { AIProvider, RecipeGenerationRequest, AIProviderError } from './AIProvider';
import type { AITaskType, ModelRoute } from './AIProvider';
import { ClaudeProvider } from './ClaudeProvider';
import { GeminiProvider } from './GeminiProvider';
import type { GeneratedRecipe } from '../aiRecipeService';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const SONNET_MODEL = 'claude-sonnet-4-6';

const MODEL_ROUTES: Record<AITaskType, ModelRoute> = {
  recipe_generation: {
    model: SONNET_MODEL,
    provider: 'claude',
    reasoning: 'Requires structured JSON output with accurate nutrition math — Sonnet quality needed',
  },
  safety_check: {
    model: HAIKU_MODEL,
    provider: 'claude',
    reasoning: 'Simple binary classification; Haiku is sufficient and ~3x cheaper',
  },
  craving_keyword_mapping: {
    model: HAIKU_MODEL,
    provider: 'claude',
    reasoning: 'Keyword extraction is a lookup-style task; Haiku handles it well',
  },
  ingredient_substitution: {
    model: HAIKU_MODEL,
    provider: 'claude',
    reasoning: 'Lookup-style substitution with limited reasoning depth needed',
  },
  nutrition_label_parse: {
    model: HAIKU_MODEL,
    provider: 'claude',
    reasoning: 'Structured field extraction from a known schema; Haiku is sufficient',
  },
  photo_meal_recognition: {
    model: SONNET_MODEL,
    provider: 'claude',
    reasoning: 'Requires vision + multi-step reasoning to identify meals accurately',
  },
  utterance_composition: {
    model: SONNET_MODEL,
    provider: 'claude',
    reasoning: 'Group 10X voice tone requires nuanced language generation',
  },
  craving_natural_language: {
    model: SONNET_MODEL,
    provider: 'claude',
    reasoning: 'Complex NL understanding of free-form craving descriptions',
  },
  healthify_craving: {
    model: SONNET_MODEL,
    provider: 'claude',
    reasoning: 'Subjective swap reasoning across health and taste dimensions',
  },
  simple_chat: {
    model: HAIKU_MODEL,
    provider: 'claude',
    reasoning: 'General-purpose chat with no complex reasoning requirement',
  },
};

export class AIProviderManager {
  private providers: AIProvider[] = [];
  private providerOrder: string[] = [];
  private lastUsedProvider: string | null = null;

  constructor() {
    // Initialize providers in priority order
    // Order can be configured via environment variable: AI_PROVIDER_ORDER=claude,gemini
    const configuredOrder = process.env.AI_PROVIDER_ORDER?.split(',').map(p => p.trim()) || [];
    
    // Default order: Claude -> Gemini (OpenAI removed - not being used)
    const defaultOrder = ['claude', 'gemini'];
    this.providerOrder = configuredOrder.length > 0 ? configuredOrder : defaultOrder;

    // Initialize all available providers
    const allProviders: { [key: string]: AIProvider } = {
      claude: new ClaudeProvider(),
      gemini: new GeminiProvider(),
    };

    // Add providers in configured order, only if they're available
    for (const providerKey of this.providerOrder) {
      const provider = allProviders[providerKey.toLowerCase()];
      if (provider && provider.isAvailable()) {
        this.providers.push(provider);
        logger.info(`✅ [ProviderManager] ${provider.getName()} initialized and available`);
      } else {
        logger.info(`⚠️  [ProviderManager] ${providerKey} is not configured or unavailable`);
      }
    }

    if (this.providers.length === 0) {
      logger.error('❌ [ProviderManager] No AI providers are configured!');
      throw new Error('No AI providers configured. Please set at least one: ANTHROPIC_API_KEY or GOOGLE_AI_API_KEY');
    }

    logger.info(`✅ [ProviderManager] ${this.providers.length} provider(s) ready: ${this.providers.map(p => p.getName()).join(', ')}`);
  }

  /**
   * Generate recipe with automatic fallback
   * Tries providers in order until one succeeds
   */
  async generateRecipe(request: RecipeGenerationRequest): Promise<GeneratedRecipe> {
    const errors: Array<{ provider: string; error: AIProviderError }> = [];
    let lastError: AIProviderError | null = null;

    for (const provider of this.providers) {
      try {
        logger.info(`🔄 [ProviderManager] Attempting generation with ${provider.getName()}...`);
        const recipe = await provider.generateRecipe(request);
        this.lastUsedProvider = provider.getName();
        logger.info(`✅ [ProviderManager] Successfully generated recipe using ${provider.getName()}`);
        return recipe;
      } catch (error: any) {
        // Ensure error is normalized (providers should normalize, but check just in case)
        let normalizedError: AIProviderError;
        if (error.isQuotaError !== undefined || error.provider) {
          // Already normalized by provider
          normalizedError = error as AIProviderError;
        } else {
          // Not normalized - normalize it now
          normalizedError = provider.normalizeError(error, 'generateRecipe');
          normalizedError.provider = normalizedError.provider || provider.getName();
        }
        
        errors.push({ provider: provider.getName(), error: normalizedError });
        lastError = normalizedError;

        logger.warn({
          code: normalizedError.code,
          status: normalizedError.status,
          message: normalizedError.message,
          isQuotaError: normalizedError.isQuotaError,
          isRateLimitError: normalizedError.isRateLimitError,
          rawErrorCode: error.code,
          rawErrorStatus: error.status,
          rawErrorType: error.error?.code || error.error?.type,
        }, `⚠️  [ProviderManager] ${provider.getName()} failed`);

        // If it's a quota/rate limit error, try next provider
        if (normalizedError.isQuotaError || normalizedError.isRateLimitError) {
          logger.info(`⏭️  [ProviderManager] ${provider.getName()} quota exceeded, trying next provider...`);
          continue;
        }

        // If it's a retryable error, try next provider
        if (normalizedError.retryable) {
          logger.info(`🔄 [ProviderManager] ${provider.getName()} retryable error, trying next provider...`);
          continue;
        }

        // Explicitly handle 529 (Overloaded) errors - treat as retryable and fallback
        if (normalizedError.status === 529) {
          logger.info(`🔄 [ProviderManager] ${provider.getName()} overloaded (529), trying next provider...`);
          continue;
        }

        // For configuration/validation errors (400, 404), still try next provider as fallback
        // This allows fallback even if one provider has config issues
        if (normalizedError.status === 400 || normalizedError.status === 404) {
          logger.info(`⏭️  [ProviderManager] ${provider.getName()} configuration error (${normalizedError.status}), trying next provider...`);
          continue;
        }

        // For any other error, still try next provider as fallback
        logger.info(`⏭️  [ProviderManager] ${provider.getName()} error (${normalizedError.code}), trying next provider...`);
      }
    }

    // All providers failed
    logger.error({ data: errors }, '❌ [ProviderManager] All providers failed:');
    
    // Determine the most appropriate error to throw
    const quotaErrors = errors.filter(e => e.error.isQuotaError || e.error.isRateLimitError);
    const allQuotaErrors = errors.length > 0 && quotaErrors.length === errors.length;
    
    if (allQuotaErrors) {
      // All providers have quota exceeded
      const quotaError: AIProviderError = new Error(
        `All AI providers have quota exceeded. Tried: ${errors.map(e => e.provider).join(', ')}`
      );
      quotaError.code = 'insufficient_quota';
      quotaError.status = 429;
      quotaError.isQuotaError = true;
      throw quotaError;
    }

    // If we have some quota errors but not all, or mixed errors, use the last non-quota error if available
    const nonQuotaErrors = errors.filter(e => !e.error.isQuotaError && !e.error.isRateLimitError);
    if (nonQuotaErrors.length > 0) {
      throw nonQuotaErrors[nonQuotaErrors.length - 1].error;
    }

    // Return the last error (or a summary)
    if (lastError) {
      throw lastError;
    }

    throw new Error(`All AI providers failed. Errors: ${errors.map(e => `${e.provider}: ${e.error.message}`).join('; ')}`);
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): string[] {
    return this.providers.map(p => p.getName());
  }

  /**
   * Get the last successfully used provider
   */
  getLastUsedProvider(): string | null {
    return this.lastUsedProvider;
  }

  /**
   * Return the optimal (model, provider, reasoning) for a given task type.
   *
   * PII guard: all routes return provider 'claude' — user PII (weight, age,
   * health conditions) never leaves Anthropic infrastructure.
   */
  routeToModel(taskType: AITaskType): ModelRoute {
    return MODEL_ROUTES[taskType];
  }

  /**
   * Get provider statistics
   */
  getStats(): {
    totalProviders: number;
    availableProviders: string[];
    lastUsedProvider: string | null;
  } {
    return {
      totalProviders: this.providers.length,
      availableProviders: this.getAvailableProviders(),
      lastUsedProvider: this.lastUsedProvider,
    };
  }
}

