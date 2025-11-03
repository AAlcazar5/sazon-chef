// AI Provider Interface for Multi-Provider Support
import type { GeneratedRecipe } from '../aiRecipeService';

export interface RecipeGenerationRequest {
  prompt: string;
  systemPrompt: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'any';
  temperature?: number;
  maxTokens?: number;
}

export interface AIProviderError extends Error {
  code?: string;
  status?: number;
  provider?: string;
  isQuotaError?: boolean;
  isRateLimitError?: boolean;
  retryable?: boolean;
}

/**
 * Abstract base class for AI recipe generation providers
 * Allows easy integration of multiple AI providers with automatic fallback
 */
export abstract class AIProvider {
  protected providerName: string;
  protected isConfigured: boolean;

  constructor(providerName: string) {
    this.providerName = providerName;
    this.isConfigured = this.checkConfiguration();
  }

  /**
   * Check if provider is properly configured (API key exists, etc.)
   */
  abstract checkConfiguration(): boolean;

  /**
   * Generate a recipe using this provider
   */
  abstract generateRecipe(request: RecipeGenerationRequest): Promise<GeneratedRecipe>;

  /**
   * Get the provider's display name
   */
  getName(): string {
    return this.providerName;
  }

  /**
   * Check if provider is available and configured
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Normalize error to standard format
   * Made public so ProviderManager can use it for unnormalized errors
   */
  public normalizeError(error: any, operation: string): AIProviderError {
    // Extract error details (handle nested error structures like OpenAI SDK)
    const errorCode = error.code || error.error?.code || error.error?.type;
    const errorStatus = error.status || error.response?.status;
    const errorMessage = error.message || error.error?.message || 'Unknown error';
    
    const normalized: AIProviderError = new Error(
      `${this.providerName} ${operation} error: ${errorMessage}`
    );
    normalized.provider = this.providerName;
    normalized.code = errorCode || errorStatus?.toString() || 'UNKNOWN_ERROR';
    normalized.status = errorStatus || (errorCode === 'insufficient_quota' ? 429 : undefined);

    // Detect quota/rate limit errors (check multiple possible locations)
    normalized.isQuotaError = 
      errorStatus === 429 ||
      errorCode === 'insufficient_quota' ||
      error.error?.code === 'insufficient_quota' ||
      error.error?.type === 'insufficient_quota' ||
      /quota.*exceeded|billing|payment.*required/i.test(errorMessage);

    normalized.isRateLimitError = 
      errorStatus === 429 ||
      errorCode === 'rate_limit_exceeded' ||
      /rate.*limit|too.*many.*requests/i.test(errorMessage);

    // Determine if error is retryable
    normalized.retryable = 
      !normalized.isQuotaError && 
      (errorStatus === 503 || errorStatus === 502 || /timeout|network/i.test(errorMessage));

    return normalized;
  }
}

