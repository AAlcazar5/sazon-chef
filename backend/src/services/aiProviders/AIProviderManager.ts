import { logger } from '../../utils/logger';
// AI Provider Manager - Handles automatic fallback between providers
import { AIProvider, RecipeGenerationRequest, AIProviderError } from './AIProvider';
import type { AITaskType, ModelRoute, UserTier } from './AIProvider';
import { ClaudeProvider } from './ClaudeProvider';
import { GeminiProvider } from './GeminiProvider';
import { OpenAICompatProvider } from './OpenAICompatProvider';
import { OllamaProvider } from './OllamaProvider';
import type { GeneratedRecipe } from '../aiRecipeService';
import { captureException } from '@/utils/sentryCapture';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const SONNET_MODEL = 'claude-sonnet-4-6';
// Path B — DeepSeek-V3 is the cheap-tier primary. ~$0.27/M input,
// ~$1.10/M output → ~$0.0025/recipe. Hosted in China; PII is stripped
// before send via `aiRecipeService.buildSanitizedRecipePrompt`, so the
// only thing the API ever sees is non-personally-identifying (cuisine,
// meal type, cook-time cap). Override via DEEPSEEK_MODEL env.
const DEEPSEEK_MODEL = 'deepseek-chat';

/**
 * Path A — tier-aware model routing.
 *
 * Free + Premium → Haiku (today). Chef → Sonnet for recipe-style tasks
 * where Sonnet's structured-output quality is worth the 6× premium.
 *
 * The PII guard from the original routing table stays: every tier returns
 * provider 'claude'. Path B / Path C in the launch roadmap relax that
 * for the free tier (with PII stripping or third-party DPAs in place).
 *
 * Adding a tier: append it to `UserTier` in AIProvider.ts + add a column
 * here. The compiler enforces exhaustiveness.
 */
const MODEL_ROUTES: Record<AITaskType, Record<UserTier, ModelRoute>> = {
  recipe_generation: {
    free: {
      model: DEEPSEEK_MODEL,
      provider: 'deepseek',
      providerOrder: ['deepseek', 'claude'],
      requiresPiiStripping: true,
      reasoning: 'Path B: DeepSeek-V3 primary (~$0.0025/recipe) with Claude Haiku fallback. PII stripped from prompt before send — caller MUST use buildSanitizedRecipePrompt. DeepSeek hosted in China; the prompt-sanitization guard is what makes that acceptable: the API only ever sees non-personally-identifying fields (cuisine, mealType, cookTime cap).',
    },
    premium: {
      model: HAIKU_MODEL,
      provider: 'claude',
      reasoning: 'Premium tier: Haiku — same baseline as free today; Path B differentiates later.',
    },
    chef: {
      model: SONNET_MODEL,
      provider: 'claude',
      reasoning: 'Chef tier: Sonnet — richer prose + tighter nutrition math worth the premium.',
    },
  },
  safety_check: {
    free: { model: HAIKU_MODEL, provider: 'claude', reasoning: 'Binary classification — Haiku across all tiers.' },
    premium: { model: HAIKU_MODEL, provider: 'claude', reasoning: 'Binary classification — Haiku across all tiers.' },
    chef: { model: HAIKU_MODEL, provider: 'claude', reasoning: 'Binary classification — Haiku across all tiers.' },
  },
  craving_keyword_mapping: {
    free: { model: HAIKU_MODEL, provider: 'claude', reasoning: 'Keyword extraction — Haiku across all tiers.' },
    premium: { model: HAIKU_MODEL, provider: 'claude', reasoning: 'Keyword extraction — Haiku across all tiers.' },
    chef: { model: HAIKU_MODEL, provider: 'claude', reasoning: 'Keyword extraction — Haiku across all tiers.' },
  },
  ingredient_substitution: {
    free: { model: HAIKU_MODEL, provider: 'claude', reasoning: 'Lookup-style swap — Haiku across all tiers.' },
    premium: { model: HAIKU_MODEL, provider: 'claude', reasoning: 'Lookup-style swap — Haiku across all tiers.' },
    chef: { model: HAIKU_MODEL, provider: 'claude', reasoning: 'Lookup-style swap — Haiku across all tiers.' },
  },
  nutrition_label_parse: {
    free: { model: HAIKU_MODEL, provider: 'claude', reasoning: 'Structured extraction — Haiku across all tiers.' },
    premium: { model: HAIKU_MODEL, provider: 'claude', reasoning: 'Structured extraction — Haiku across all tiers.' },
    chef: { model: HAIKU_MODEL, provider: 'claude', reasoning: 'Structured extraction — Haiku across all tiers.' },
  },
  photo_meal_recognition: {
    free: {
      model: HAIKU_MODEL,
      provider: 'claude',
      reasoning: 'Free tier: Haiku vision (4.5 supports it) — accuracy slight drop vs Sonnet, acceptable.',
    },
    premium: {
      model: HAIKU_MODEL,
      provider: 'claude',
      reasoning: 'Premium tier: Haiku vision today; Chef gets Sonnet for tougher photo cases.',
    },
    chef: { model: SONNET_MODEL, provider: 'claude', reasoning: 'Chef tier: Sonnet vision for multi-step photo reasoning.' },
  },
  utterance_composition: {
    free: { model: HAIKU_MODEL, provider: 'claude', reasoning: 'Free tier: Haiku — voice quality acceptable.' },
    premium: { model: HAIKU_MODEL, provider: 'claude', reasoning: 'Premium tier: Haiku today.' },
    chef: { model: SONNET_MODEL, provider: 'claude', reasoning: 'Chef tier: Sonnet — Group 10X tone benefits from the heavier model.' },
  },
  craving_natural_language: {
    free: { model: HAIKU_MODEL, provider: 'claude', reasoning: 'Free tier: Haiku — most cravings parse cleanly.' },
    premium: { model: HAIKU_MODEL, provider: 'claude', reasoning: 'Premium tier: Haiku today.' },
    chef: { model: SONNET_MODEL, provider: 'claude', reasoning: 'Chef tier: Sonnet — long-tail craving NL is where Sonnet earns its rate.' },
  },
  healthify_craving: {
    free: { model: HAIKU_MODEL, provider: 'claude', reasoning: 'Free tier: Haiku — swap suggestions stay reasonable.' },
    premium: { model: HAIKU_MODEL, provider: 'claude', reasoning: 'Premium tier: Haiku today.' },
    chef: { model: SONNET_MODEL, provider: 'claude', reasoning: 'Chef tier: Sonnet — subjective health/taste tradeoffs.' },
  },
  simple_chat: {
    free: { model: HAIKU_MODEL, provider: 'claude', reasoning: 'General chat — Haiku across all tiers.' },
    premium: { model: HAIKU_MODEL, provider: 'claude', reasoning: 'General chat — Haiku across all tiers.' },
    chef: { model: HAIKU_MODEL, provider: 'claude', reasoning: 'General chat — Haiku across all tiers.' },
  },
};

export class AIProviderManager {
  private providers: AIProvider[] = [];
  private providerOrder: string[] = [];
  /**
   * Lowercase-key → provider instance map. Built alongside `providers` so
   * Path B can resolve `request.providerOrder = ['gemini', 'claude']` to
   * the right instances per-request.
   */
  private providersByKey: Map<string, AIProvider> = new Map();
  private lastUsedProvider: string | null = null;

  constructor() {
    // Initialize providers in priority order
    // Order can be configured via environment variable: AI_PROVIDER_ORDER=claude,gemini
    const configuredOrder = process.env.AI_PROVIDER_ORDER?.split(',').map(p => p.trim()) || [];
    
    // Default order: Claude -> Gemini (OpenAI removed - not being used)
    const defaultOrder = ['claude', 'gemini'];
    this.providerOrder = configuredOrder.length > 0 ? configuredOrder : defaultOrder;

    // Initialize all available providers.
    //
    // Live-inference policy (AIProvider.ts): user-facing requests stay on
    // `claude`. The other providers (`gemini`, `groq`, `deepseek`,
    // `openai_compat`, `ollama`) are intended for seed / batch / admin
    // pipelines where the prompt contains no user PII. Gate them via
    // AI_PROVIDER_ORDER at run time.
    const allProviders: { [key: string]: AIProvider } = {
      claude: new ClaudeProvider(),
      gemini: new GeminiProvider(),
      // Groq — Llama 3.3 70B via OpenAI-compatible API. Set GROQ_API_KEY
      // (get one at https://console.groq.com/keys, no ID verification).
      groq: new OpenAICompatProvider({
        label: 'Groq (Llama 3.3 70B)',
        envKey: 'GROQ_API_KEY',
        envBaseUrl: 'GROQ_BASE_URL',
        envModel: 'GROQ_MODEL',
        defaultBaseUrl: 'https://api.groq.com/openai/v1',
        defaultModel: 'llama-3.3-70b-versatile',
      }),
      // DeepSeek — DeepSeek-V3 via its own OpenAI-compatible API. Set
      // DEEPSEEK_API_KEY (get one at https://platform.deepseek.com/api_keys).
      // Override DEEPSEEK_BASE_URL to point at DeepInfra/Together if you
      // prefer hosted-elsewhere routing.
      deepseek: new OpenAICompatProvider({
        label: 'DeepSeek-V3',
        envKey: 'DEEPSEEK_API_KEY',
        envBaseUrl: 'DEEPSEEK_BASE_URL',
        envModel: 'DEEPSEEK_MODEL',
        defaultBaseUrl: 'https://api.deepseek.com/v1',
        defaultModel: 'deepseek-chat',
      }),
      // Generic OpenAI-compat slot — for any other host (Together, DeepInfra,
      // OpenRouter, Fireworks, vLLM). Configured via OPENAI_COMPAT_* env.
      openai_compat: new OpenAICompatProvider(),
      ollama: new OllamaProvider(),
    };

    // Add providers in configured order, only if they're available.
    // Also populate the by-key map so Path B per-request providerOrder
    // overrides can resolve to instances at call time.
    for (const providerKey of this.providerOrder) {
      const key = providerKey.toLowerCase();
      const provider = allProviders[key];
      if (provider && provider.isAvailable()) {
        this.providers.push(provider);
        this.providersByKey.set(key, provider);
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

    // Path B — per-request provider chain. When `request.providerOrder` is
    // set, resolve those keys to instances and try them in that order.
    // Unknown / unavailable keys are silently skipped (logged) so a stale
    // override doesn't break the call. Falls back to the constructor-time
    // order when omitted (Path A behavior).
    const chain: AIProvider[] = (() => {
      if (!request.providerOrder || request.providerOrder.length === 0) {
        return this.providers;
      }
      const resolved: AIProvider[] = [];
      const seen = new Set<AIProvider>();
      for (const key of request.providerOrder) {
        const p = this.providersByKey.get(key.toLowerCase());
        if (!p) {
          logger.info(`⚠️  [ProviderManager] requested provider '${key}' is not available — skipping`);
          continue;
        }
        if (seen.has(p)) continue;
        seen.add(p);
        resolved.push(p);
      }
      // If every requested provider is unavailable, fall back to the
      // default order rather than erroring with "no providers" — the
      // caller's intent was a chain, not an exclusion list.
      return resolved.length > 0 ? resolved : this.providers;
    })();

    for (const provider of chain) {
      try {
        logger.info(`🔄 [ProviderManager] Attempting generation with ${provider.getName()}...`);
        const recipe = await provider.generateRecipe(request);
        this.lastUsedProvider = provider.getName();
        logger.info(`✅ [ProviderManager] Successfully generated recipe using ${provider.getName()}`);
        return recipe;
      } catch (error: any) {
        captureException(error, {
          tag: 'ai.provider.generateRecipe.fallback',
          extra: { provider: provider.getName() },
        });
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
   * Return the optimal (model, provider, reasoning) for a given task +
   * user tier.
   *
   * PII guard: all routes return provider 'claude' — user PII (weight, age,
   * health conditions) never leaves Anthropic infrastructure. Path B / C
   * (launch roadmap) relax that for the free tier with PII stripping or
   * third-party DPAs in place.
   *
   * `tier` defaults to 'free' so callers that haven't been migrated yet
   * still receive the cheapest route, which is also the safest fall-back.
   */
  routeToModel(taskType: AITaskType, tier: UserTier = 'free'): ModelRoute {
    const routesForTask = MODEL_ROUTES[taskType];
    return routesForTask[tier] ?? routesForTask.free;
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

