// backend/src/services/aiProviders/OpenAICompatProvider.ts
// Generic OpenAI-Chat-Completions-compatible provider.
//
// Works with any service that speaks the OpenAI `/v1/chat/completions` wire
// format: Groq, DeepSeek, DeepInfra, Together AI, Fireworks, OpenRouter,
// vLLM, etc. Lets us run FOSS models (Llama 3.x, DeepSeek-V3, Qwen 2.5,
// Mixtral) without taking an SDK dependency.
//
// Two configuration modes:
//
// 1. **Generic** (no config arg): reads `OPENAI_COMPAT_*` env vars. Used as
//    the catch-all `openai_compat` provider key for ad-hoc setups.
//
// 2. **Named** (config arg): reads a custom env namespace. Used to register
//    multiple named instances (Groq, DeepSeek, …) that can co-exist in one
//    process and be referenced individually in AI_PROVIDER_ORDER.
//
// PII boundary: this provider may route prompts to third-party hosts. Use
// only for batch / seed runs where the prompt contains no user data. The
// live /api/recipes/generate path stays on Claude per AIProvider.ts policy.

import { logger } from '../../utils/logger';
import { AIProvider, RecipeGenerationRequest } from './AIProvider';
import type { GeneratedRecipe } from '../aiRecipeService';

export interface OpenAICompatConfig {
  /** Display name shown in logs / `getName()`. */
  label: string;
  /** Env var holding the API key. Required at runtime. */
  envKey: string;
  /** Env var holding a base URL override. Optional — defaults to `defaultBaseUrl`. */
  envBaseUrl?: string;
  /** Env var holding a model override. Optional — defaults to `defaultModel`. */
  envModel?: string;
  /** Hard-coded fallback base URL when the env override is absent. */
  defaultBaseUrl: string;
  /** Hard-coded fallback model when the env override is absent. */
  defaultModel: string;
}

const GENERIC_CONFIG: OpenAICompatConfig = {
  label: process.env.OPENAI_COMPAT_LABEL ?? 'OpenAI-Compatible',
  envKey: 'OPENAI_COMPAT_API_KEY',
  envBaseUrl: 'OPENAI_COMPAT_BASE_URL',
  envModel: 'OPENAI_COMPAT_MODEL',
  defaultBaseUrl: '', // forces explicit env override for the generic path
  defaultModel: 'deepseek-ai/DeepSeek-V3',
};

interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
  error?: { message?: string; code?: string; type?: string };
}

export class OpenAICompatProvider extends AIProvider {
  private apiKey: string | undefined;
  private baseUrl: string | undefined;
  private model: string;
  private cfg: OpenAICompatConfig;

  constructor(config: OpenAICompatConfig = GENERIC_CONFIG) {
    // super() invokes checkConfiguration() before we can assign this.cfg,
    // so the base class's initial result is meaningless for this subclass.
    // We re-run it below once cfg is in place.
    super(config.label);
    this.cfg = config;
    this.apiKey = process.env[config.envKey];
    this.baseUrl =
      (config.envBaseUrl && process.env[config.envBaseUrl]) || config.defaultBaseUrl;
    this.model =
      (config.envModel && process.env[config.envModel]) || config.defaultModel;
    this.isConfigured = this.checkConfiguration();
  }

  checkConfiguration(): boolean {
    // Called once from super() before `this.cfg` is assigned — defer to false
    // in that case; the constructor re-runs this after cfg is in place.
    if (!this.cfg) return false;
    // Named instances (Groq/DeepSeek) ship with a defaultBaseUrl, so only the
    // API key is strictly required. The generic instance has no default base
    // URL and must have both set explicitly.
    const hasKey = !!process.env[this.cfg.envKey];
    const hasBaseUrl = !!(
      (this.cfg.envBaseUrl && process.env[this.cfg.envBaseUrl]) ||
      this.cfg.defaultBaseUrl
    );
    return hasKey && hasBaseUrl;
  }

  async generateRecipe(request: RecipeGenerationRequest): Promise<GeneratedRecipe> {
    if (!this.apiKey || !this.baseUrl) {
      throw new Error('OpenAI-compat provider is not configured');
    }

    const url = `${this.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const messages: ChatCompletionMessage[] = [
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.prompt },
    ];

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          // Per-request override → constructor default. Lets Path B route
          // free-tier traffic to a specific DeepSeek/Groq/etc. model
          // without re-instantiating the provider.
          model: request.model ?? this.model,
          messages,
          temperature: request.temperature ?? 0.8,
          max_tokens: request.maxTokens ?? 4000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        const err: any = new Error(`HTTP ${res.status}: ${bodyText.slice(0, 200)}`);
        err.status = res.status;
        err.code = res.status === 429 ? 'rate_limit_exceeded' : `http_${res.status}`;
        throw err;
      }

      const data = (await res.json()) as ChatCompletionResponse;
      if (data.error) {
        const err: any = new Error(data.error.message ?? 'Unknown error');
        err.code = data.error.code ?? data.error.type;
        throw err;
      }

      const text = data.choices?.[0]?.message?.content ?? '';
      if (!text) {
        throw new Error('Empty response from OpenAI-compat provider');
      }

      const recipe = extractAndParseJSON(text);
      logger.info(`✅ [${this.providerName}] Recipe generated: ${recipe.title}`);
      return recipe;
    } catch (error: any) {
      throw this.normalizeError(error, 'generateRecipe');
    }
  }
}

// Most OpenAI-compatible providers honor response_format:json_object and
// return clean JSON. A few wrap output in markdown — handle both.
function extractAndParseJSON(text: string): GeneratedRecipe {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as GeneratedRecipe;
  } catch {
    // Strip ```json fences if present
    const fenced = trimmed.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (fenced && fenced[1]) {
      return JSON.parse(fenced[1]) as GeneratedRecipe;
    }
    // Last resort: take the outermost { … }
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.substring(start, end + 1)) as GeneratedRecipe;
    }
    throw new Error('Failed to extract JSON from response');
  }
}
