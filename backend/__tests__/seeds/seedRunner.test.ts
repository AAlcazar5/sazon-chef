// Shared seed-runner core. The pure, testable seam is provider-chain
// resolution — the rest of the core is orchestration (DB + AI IO) covered by
// the planner tests + dry-run parity. resolveAiProviderOrder reproduces the
// per-runner gating block verbatim so all three entrypoints share one copy.

import { resolveAiProviderOrder } from '../../scripts/seedRunner';

describe('resolveAiProviderOrder', () => {
  it('an explicit AI_PROVIDER_ORDER from the shell always wins', () => {
    expect(resolveAiProviderOrder('deepseek', 'claude,groq')).toBe('claude,groq');
    expect(resolveAiProviderOrder('ollama', 'groq')).toBe('groq');
  });

  it('FOSS provider → itself first, then the rest of the FOSS chain', () => {
    expect(resolveAiProviderOrder('deepseek')).toBe('deepseek,groq');
    expect(resolveAiProviderOrder('groq')).toBe('groq,deepseek');
    expect(resolveAiProviderOrder('ollama')).toBe('ollama,groq,deepseek');
    expect(resolveAiProviderOrder('openai_compat')).toBe('openai_compat,groq,deepseek');
  });

  it('closed provider → just that provider (no FOSS fallback auto-appended)', () => {
    expect(resolveAiProviderOrder('claude')).toBe('claude');
    expect(resolveAiProviderOrder('gemini')).toBe('gemini');
  });

  it('treats an empty explicit string as unset (falls back to the chain)', () => {
    expect(resolveAiProviderOrder('deepseek', '')).toBe('deepseek,groq');
    expect(resolveAiProviderOrder('deepseek', undefined)).toBe('deepseek,groq');
  });
});
