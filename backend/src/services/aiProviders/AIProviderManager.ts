// AI Provider Manager - Handles automatic fallback between providers
import { AIProvider, RecipeGenerationRequest, AIProviderError } from './AIProvider';
import { ClaudeProvider } from './ClaudeProvider';
import { GeminiProvider } from './GeminiProvider';
import type { GeneratedRecipe } from '../aiRecipeService';

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
        console.log(`✅ [ProviderManager] ${provider.getName()} initialized and available`);
      } else {
        console.log(`⚠️  [ProviderManager] ${providerKey} is not configured or unavailable`);
      }
    }

    if (this.providers.length === 0) {
      console.error('❌ [ProviderManager] No AI providers are configured!');
      throw new Error('No AI providers configured. Please set at least one: ANTHROPIC_API_KEY or GOOGLE_AI_API_KEY');
    }

    console.log(`✅ [ProviderManager] ${this.providers.length} provider(s) ready: ${this.providers.map(p => p.getName()).join(', ')}`);
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
        console.log(`🔄 [ProviderManager] Attempting generation with ${provider.getName()}...`);
        const recipe = await provider.generateRecipe(request);
        this.lastUsedProvider = provider.getName();
        console.log(`✅ [ProviderManager] Successfully generated recipe using ${provider.getName()}`);
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

        console.warn(`⚠️  [ProviderManager] ${provider.getName()} failed:`, {
          code: normalizedError.code,
          status: normalizedError.status,
          message: normalizedError.message,
          isQuotaError: normalizedError.isQuotaError,
          isRateLimitError: normalizedError.isRateLimitError,
          rawErrorCode: error.code,
          rawErrorStatus: error.status,
          rawErrorType: error.error?.code || error.error?.type,
        });

        // If it's a quota/rate limit error, try next provider
        if (normalizedError.isQuotaError || normalizedError.isRateLimitError) {
          console.log(`⏭️  [ProviderManager] ${provider.getName()} quota exceeded, trying next provider...`);
          continue;
        }

        // If it's a retryable error, try next provider
        if (normalizedError.retryable) {
          console.log(`🔄 [ProviderManager] ${provider.getName()} retryable error, trying next provider...`);
          continue;
        }

        // Explicitly handle 529 (Overloaded) errors - treat as retryable and fallback
        if (normalizedError.status === 529) {
          console.log(`🔄 [ProviderManager] ${provider.getName()} overloaded (529), trying next provider...`);
          continue;
        }

        // For configuration/validation errors (400, 404), still try next provider as fallback
        // This allows fallback even if one provider has config issues
        if (normalizedError.status === 400 || normalizedError.status === 404) {
          console.log(`⏭️  [ProviderManager] ${provider.getName()} configuration error (${normalizedError.status}), trying next provider...`);
          continue;
        }

        // For any other error, still try next provider as fallback
        console.log(`⏭️  [ProviderManager] ${provider.getName()} error (${normalizedError.code}), trying next provider...`);
      }
    }

    // All providers failed
    console.error('❌ [ProviderManager] All providers failed:', errors);
    
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

