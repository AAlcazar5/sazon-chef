// Group 10Y-A: Coach service tier routing + dispatch.

import {
  selectModel,
  selectThinkingBudget,
  buildAnthropicCreateParams,
  COACH_MODELS,
} from '../../src/services/coachService';

describe('selectModel by tier', () => {
  it('free tier maps to Sonnet 4.6', () => {
    expect(selectModel('free')).toBe(COACH_MODELS.free);
    expect(selectModel('free')).toMatch(/sonnet/);
  });

  it('premium tier maps to Opus 4.7', () => {
    expect(selectModel('premium')).toBe(COACH_MODELS.premium);
    expect(selectModel('premium')).toMatch(/opus/);
  });
});

describe('selectThinkingBudget by tier', () => {
  it('free tier disables extended thinking', () => {
    expect(selectThinkingBudget('free')).toEqual({ type: 'disabled' });
  });

  it('premium tier enables 16k token thinking budget', () => {
    expect(selectThinkingBudget('premium')).toEqual({
      type: 'enabled',
      budget_tokens: 16000,
    });
  });
});

describe('buildAnthropicCreateParams', () => {
  const systemPrompt = 'Sazon Coach. <user_profile>{}</user_profile>';
  const messages = [{ role: 'user' as const, content: 'What should I cook?' }];

  it('attaches cache_control: ephemeral on the system prompt block', () => {
    const params = buildAnthropicCreateParams({
      tier: 'free',
      systemPrompt,
      messages,
    });
    expect(Array.isArray(params.system)).toBe(true);
    const sys = params.system as Array<{
      type: string;
      text: string;
      cache_control?: { type: string };
    }>;
    expect(sys[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(sys[0].text).toContain('Sazon Coach');
  });

  it('selects Sonnet for free tier and disables thinking', () => {
    const params = buildAnthropicCreateParams({
      tier: 'free',
      systemPrompt,
      messages,
    });
    expect(params.model).toMatch(/sonnet/);
    expect(params.thinking).toEqual({ type: 'disabled' });
  });

  it('selects Opus + thinking for premium tier', () => {
    const params = buildAnthropicCreateParams({
      tier: 'premium',
      systemPrompt,
      messages,
    });
    expect(params.model).toMatch(/opus/);
    expect(params.thinking).toEqual({ type: 'enabled', budget_tokens: 16000 });
    expect(params.max_tokens).toBeGreaterThan(16000);
  });

  it('passes user messages through unchanged', () => {
    const params = buildAnthropicCreateParams({
      tier: 'free',
      systemPrompt,
      messages,
    });
    expect(params.messages).toEqual(messages);
  });
});
