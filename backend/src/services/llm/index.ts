// ROADMAP 4.0 Tier $$ — $$2.2 — tier-aware LLM client factory.
//
// Selects which provider serves a coach turn:
//
//   - Pro (premium) ALWAYS routes through Anthropic. Tool-call reliability +
//     brand voice are non-negotiable on the paid surface.
//   - Free tier routes through Anthropic by default; flip to OpenRouter
//     (Gemini 2.0 Flash) by setting COACH_FREE_PROVIDER=openrouter-gemini.
//   - Force a specific provider with COACH_LLM_PROVIDER=anthropic|openrouter-gemini
//     (overrides tier-based routing — useful for E2E tests + local dev).

import type { CoachTier } from '../coachService';
import { logger } from '../../utils/logger';
import { anthropicAdapter } from './anthropicAdapter';
import { openRouterAdapter } from './openRouterAdapter';
import type { LLMClient } from './types';

export type CoachLLMProviderId = 'anthropic' | 'openrouter-gemini';

function resolveProviderForTier(tier: CoachTier): CoachLLMProviderId {
  const force = process.env.COACH_LLM_PROVIDER;
  if (force === 'anthropic' || force === 'openrouter-gemini') {
    return force;
  }
  if (tier === 'premium') return 'anthropic';
  const freeOverride = process.env.COACH_FREE_PROVIDER;
  if (freeOverride === 'openrouter-gemini') return 'openrouter-gemini';
  return 'anthropic';
}

export function selectLLMClient(tier: CoachTier): LLMClient {
  const id = resolveProviderForTier(tier);
  if (id === 'openrouter-gemini') {
    if (!process.env.OPENROUTER_API_KEY) {
      // Fail-safe: never route a paying user to a misconfigured provider.
      // Log loudly + fall back to Anthropic.
      logger.warn(
        { tier },
        'COACH_FREE_PROVIDER=openrouter-gemini but OPENROUTER_API_KEY not set — falling back to Anthropic',
      );
      return anthropicAdapter;
    }
    return openRouterAdapter;
  }
  return anthropicAdapter;
}

export { anthropicAdapter, openRouterAdapter };
export * from './types';
