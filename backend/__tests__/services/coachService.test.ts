// Group 10Y-A + Tier S: Coach service tier routing + dispatch.

import {
  selectModel,
  selectModelForIntent,
  selectThinkingBudget,
  buildAnthropicCreateParams,
  COACH_MODELS,
} from '../../src/services/coachService';

describe('selectModel by tier', () => {
  it('free tier maps to Haiku 4.5 (Tier S cost win)', () => {
    expect(selectModel('free')).toBe(COACH_MODELS.free);
    expect(selectModel('free')).toMatch(/haiku/);
  });

  it('premium tier default maps to Sonnet 4.6', () => {
    expect(selectModel('premium')).toBe(COACH_MODELS.premium);
    expect(selectModel('premium')).toMatch(/sonnet/);
  });
});

describe('selectModelForIntent (Tier S)', () => {
  it('free tier never escalates regardless of intent', () => {
    expect(selectModelForIntent('free', 'chat')).toBe(COACH_MODELS.free);
    expect(selectModelForIntent('free', 'deep_plan')).toBe(COACH_MODELS.free);
  });

  it('premium chat → Sonnet 4.6', () => {
    expect(selectModelForIntent('premium', 'chat')).toBe(COACH_MODELS.premium);
    expect(selectModelForIntent('premium', 'chat')).toMatch(/sonnet/);
  });

  it('premium deep_plan → Opus 4.7', () => {
    expect(selectModelForIntent('premium', 'deep_plan')).toBe(
      COACH_MODELS.premiumDeepPlan,
    );
    expect(selectModelForIntent('premium', 'deep_plan')).toMatch(/opus/);
  });
});

describe('selectThinkingBudget by tier', () => {
  it('free tier disables extended thinking', () => {
    expect(selectThinkingBudget('free')).toEqual({ type: 'disabled' });
    expect(selectThinkingBudget('free', 'deep_plan')).toEqual({
      type: 'disabled',
    });
  });

  it('premium chat enables 8k token thinking budget', () => {
    expect(selectThinkingBudget('premium')).toEqual({
      type: 'enabled',
      budget_tokens: 8000,
    });
    expect(selectThinkingBudget('premium', 'chat')).toEqual({
      type: 'enabled',
      budget_tokens: 8000,
    });
  });

  it('premium deep_plan enables 16k token thinking budget', () => {
    expect(selectThinkingBudget('premium', 'deep_plan')).toEqual({
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

  it('selects Haiku for free tier and disables thinking', () => {
    const params = buildAnthropicCreateParams({
      tier: 'free',
      systemPrompt,
      messages,
    });
    expect(params.model).toMatch(/haiku/);
    expect(params.thinking).toEqual({ type: 'disabled' });
  });

  it('selects Sonnet for premium chat by default', () => {
    const params = buildAnthropicCreateParams({
      tier: 'premium',
      systemPrompt,
      messages,
    });
    expect(params.model).toMatch(/sonnet/);
    expect(params.thinking).toEqual({ type: 'enabled', budget_tokens: 8000 });
  });

  it('escalates to Opus + 16k thinking when intent is deep_plan', () => {
    const params = buildAnthropicCreateParams({
      tier: 'premium',
      systemPrompt,
      messages,
      intent: 'deep_plan',
    });
    expect(params.model).toMatch(/opus/);
    expect(params.thinking).toEqual({
      type: 'enabled',
      budget_tokens: 16000,
    });
    expect(params.max_tokens).toBeGreaterThan(16000);
  });

  it('honors modelOverride when provided (used by per-user budget downgrade)', () => {
    const params = buildAnthropicCreateParams({
      tier: 'premium',
      systemPrompt,
      messages,
      modelOverride: COACH_MODELS.free,
    });
    expect(params.model).toBe(COACH_MODELS.free);
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
