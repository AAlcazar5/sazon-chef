// AI Provider Interface for Multi-Provider Support
import type { GeneratedRecipe } from '../aiRecipeService';

export type AITaskType =
  | 'recipe_generation'        // → Sonnet (complex, structured JSON, nutrition math)
  | 'safety_check'             // → Haiku (simple binary classification)
  | 'craving_keyword_mapping'  // → Haiku (already used)
  | 'ingredient_substitution'  // → Haiku (lookup-style)
  | 'nutrition_label_parse'    // → Haiku (structured extraction)
  | 'photo_meal_recognition'   // → Sonnet (vision + reasoning)
  | 'utterance_composition'    // → Sonnet (Group 10X voice tone)
  | 'craving_natural_language' // → Sonnet (complex NL understanding)
  | 'healthify_craving'        // → Sonnet (subjective swap reasoning)
  | 'simple_chat';             // → Haiku

/**
 * User subscription tier — controls model selection per task type.
 *
 *   free    — current default. Lightweight model + same PII guard.
 *   premium — paid baseline ("Sazon Membership"). Same model as free today;
 *             Path B (post-launch) shifts free → cheap multi-provider chain
 *             with PII stripping, premium stays on Claude Haiku.
 *   chef    — future top tier. Uses Sonnet for richer recipe quality.
 *             IAP wiring deferred — env flag CHEF_TIER_ENABLED gates real
 *             routing today.
 */
export type UserTier = 'free' | 'premium' | 'chef';

/**
 * Set of providers a route is allowed to flow through. Single-provider
 * routes (Path A) keep `provider: 'claude'` so the PII guard reads
 * obviously from the type. Multi-provider routes (Path B) set
 * `providerOrder`, and `requiresPiiStripping: true` forces the
 * prompt-sanitization step before the request leaves Anthropic infra.
 */
export type RouteProvider = 'claude' | 'gemini' | 'groq' | 'deepseek' | 'openai_compat' | 'ollama';

export interface ModelRoute {
  /** Model identifier for the primary provider. */
  model: string;
  /** Primary provider (used when `providerOrder` is unset). */
  provider: RouteProvider;
  /**
   * Optional ordered fallback chain. When set, AIProviderManager iterates
   * these providers in order on a per-request basis. Defaults to
   * [provider] when omitted.
   */
  providerOrder?: RouteProvider[];
  /**
   * Path B guardrail. When true, aiRecipeService must run the prompt
   * through `buildSanitizedRecipePrompt` before sending so PII (pantry,
   * allergens, macros, weight, health conditions) never leaves Anthropic.
   * Single-provider Claude routes leave this undefined.
   */
  requiresPiiStripping?: boolean;
  /** Human-readable why. */
  reasoning: string;
}

export interface RecipeGenerationRequest {
  prompt: string;
  systemPrompt: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'sauce' | 'any';
  temperature?: number;
  maxTokens?: number;
  /**
   * Optional model override. When set, the provider uses this exact model
   * instead of its hardcoded default. AIProviderManager populates it from
   * `routeToModel(task, tier)`. Falling through to the provider default
   * keeps single-provider tests + script callers working unchanged.
   */
  model?: string;
  /**
   * Path B — per-request provider chain override. When set,
   * AIProviderManager iterates these providers in order instead of the
   * constructor-time `this.providerOrder`. Lets the free tier route
   * through `['gemini', 'claude']` while premium stays on `['claude']`.
   */
  providerOrder?: RouteProvider[];
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

    // Detect overloaded errors (529 from Claude)
    const isOverloadedError = 
      errorStatus === 529 ||
      errorCode === 'overloaded_error' ||
      error.error?.type === 'overloaded_error' ||
      /overloaded/i.test(errorMessage);

    // Determine if error is retryable
    // Include 529 (Overloaded), 503 (Service Unavailable), 502 (Bad Gateway), and network/timeout errors
    normalized.retryable = 
      !normalized.isQuotaError && 
      (isOverloadedError ||
       errorStatus === 503 || 
       errorStatus === 502 || 
       /timeout|network/i.test(errorMessage));

    return normalized;
  }
}

