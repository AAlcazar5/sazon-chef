// backend/src/services/aiProviders/OllamaProvider.ts
// Local Ollama provider — runs FOSS models (Llama 3.1/3.3, Mistral, Qwen,
// DeepSeek, Phi-3) on the user's own machine via the Ollama HTTP server.
// Zero marginal cost; throughput depends on hardware.
//
// Setup:
//   brew install ollama
//   ollama serve            # background HTTP server on :11434
//   ollama pull llama3.1:70b
//
// Config via env:
//   OLLAMA_ENABLED          — set to "1" to make the provider report available
//   OLLAMA_BASE_URL         — default http://localhost:11434
//   OLLAMA_MODEL            — default llama3.1:70b
//
// Suitable for seed / batch runs. Quality of small models (7-13B) for
// structured JSON recipe generation is uneven; prefer 70B+ if you have the
// RAM (≥48GB unified memory on Apple Silicon).

import { logger } from '../../utils/logger';
import { AIProvider, RecipeGenerationRequest } from './AIProvider';
import type { GeneratedRecipe } from '../aiRecipeService';

interface OllamaChatResponse {
  message?: { role?: string; content?: string };
  done?: boolean;
  error?: string;
}

export class OllamaProvider extends AIProvider {
  private baseUrl: string;
  private model: string;

  constructor() {
    const model = process.env.OLLAMA_MODEL ?? 'llama3.1:70b';
    super(`Ollama (${model})`);
    this.baseUrl = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '');
    this.model = model;
  }

  checkConfiguration(): boolean {
    // Opt-in only — we don't want to advertise availability when ollama
    // isn't running. The seed script flips this on explicitly.
    return process.env.OLLAMA_ENABLED === '1';
  }

  async generateRecipe(request: RecipeGenerationRequest): Promise<GeneratedRecipe> {
    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          stream: false,
          // format:'json' constrains the sampler so the model can ONLY emit
          // valid JSON — eliminates the markdown-wrap / preamble noise that
          // hosted models sometimes produce.
          format: 'json',
          options: {
            temperature: request.temperature ?? 0.8,
            num_predict: request.maxTokens ?? 4000,
          },
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.prompt },
          ],
        }),
      });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        const err: any = new Error(`Ollama HTTP ${res.status}: ${bodyText.slice(0, 200)}`);
        err.status = res.status;
        throw err;
      }

      const data = (await res.json()) as OllamaChatResponse;
      if (data.error) {
        throw new Error(data.error);
      }

      const text = data.message?.content ?? '';
      if (!text) {
        throw new Error('Empty response from Ollama');
      }

      const recipe = JSON.parse(text) as GeneratedRecipe;
      logger.info(`✅ [Ollama:${this.model}] Recipe generated: ${recipe.title}`);
      return recipe;
    } catch (error: any) {
      // Network errors (ollama not running) should be retryable so the
      // ProviderManager falls through to the next provider in the chain.
      if (/ECONNREFUSED|fetch failed/i.test(error.message ?? '')) {
        error.retryable = true;
      }
      throw this.normalizeError(error, 'generateRecipe');
    }
  }
}
