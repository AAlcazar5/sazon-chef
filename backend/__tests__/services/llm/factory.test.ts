// Tier $$ — $$2.2 — tier-aware factory tests.

import { selectLLMClient } from '../../../src/services/llm';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('selectLLMClient', () => {
  it('premium always routes to Anthropic', () => {
    process.env.COACH_FREE_PROVIDER = 'openrouter-gemini';
    process.env.OPENROUTER_API_KEY = 'or-test';
    expect(selectLLMClient('premium').providerId).toBe('anthropic');
  });

  it('free routes to Anthropic by default', () => {
    delete process.env.COACH_FREE_PROVIDER;
    delete process.env.COACH_LLM_PROVIDER;
    expect(selectLLMClient('free').providerId).toBe('anthropic');
  });

  it('free routes to OpenRouter when COACH_FREE_PROVIDER=openrouter-gemini', () => {
    process.env.COACH_FREE_PROVIDER = 'openrouter-gemini';
    process.env.OPENROUTER_API_KEY = 'or-test';
    expect(selectLLMClient('free').providerId).toBe('openrouter-gemini');
  });

  it('free OpenRouter falls back to Anthropic when OPENROUTER_API_KEY missing', () => {
    process.env.COACH_FREE_PROVIDER = 'openrouter-gemini';
    delete process.env.OPENROUTER_API_KEY;
    expect(selectLLMClient('free').providerId).toBe('anthropic');
  });

  it('COACH_LLM_PROVIDER=anthropic forces Anthropic regardless of tier', () => {
    process.env.COACH_LLM_PROVIDER = 'anthropic';
    process.env.COACH_FREE_PROVIDER = 'openrouter-gemini';
    process.env.OPENROUTER_API_KEY = 'or-test';
    expect(selectLLMClient('free').providerId).toBe('anthropic');
    expect(selectLLMClient('premium').providerId).toBe('anthropic');
  });

  it('COACH_LLM_PROVIDER=openrouter-gemini forces OpenRouter regardless of tier (with key)', () => {
    process.env.COACH_LLM_PROVIDER = 'openrouter-gemini';
    process.env.OPENROUTER_API_KEY = 'or-test';
    expect(selectLLMClient('free').providerId).toBe('openrouter-gemini');
    expect(selectLLMClient('premium').providerId).toBe('openrouter-gemini');
  });
});
