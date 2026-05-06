// Group 10Y-A: Coach service tier routing + Anthropic dispatch.
// Tier S (ROADMAP 4.0): tiered model routing — Haiku 4.5 for free, Sonnet 4.6
// for premium chat, Opus 4.7 for premium deep-plan intents only.

import Anthropic from '@anthropic-ai/sdk';

export type CoachTier = 'free' | 'premium';
export type CoachIntent = 'chat' | 'deep_plan';

interface CoachTierUserShape {
  subscriptionTier?: string | null;
  subscriptionStatus?: string | null;
}

const PREMIUM_STATUSES = new Set(['active', 'trialing']);

export function resolveCoachTier(
  user: CoachTierUserShape | null | undefined,
): CoachTier {
  if (!user) return 'free';
  const tier = user.subscriptionTier;
  const status = user.subscriptionStatus;
  if (tier === 'premium' && typeof status === 'string' && PREMIUM_STATUSES.has(status)) {
    return 'premium';
  }
  return 'free';
}

export const COACH_MODELS = {
  free: 'claude-haiku-4-5-20251001',
  premium: 'claude-sonnet-4-6',
  premiumDeepPlan: 'claude-opus-4-7',
} as const;

const MAX_TOKENS_FREE = 4096;
const MAX_TOKENS_PREMIUM = 16000;
const MAX_TOKENS_PREMIUM_DEEP = 24000;
const PREMIUM_THINKING_BUDGET = 8000;
const PREMIUM_DEEP_THINKING_BUDGET = 16000;

type ThinkingBudget =
  | { type: 'disabled' }
  | { type: 'enabled'; budget_tokens: number };

export function selectModel(tier: CoachTier): string {
  return tier === 'premium' ? COACH_MODELS.premium : COACH_MODELS.free;
}

export function selectModelForIntent(
  tier: CoachTier,
  intent: CoachIntent,
): string {
  if (tier === 'free') return COACH_MODELS.free;
  if (intent === 'deep_plan') return COACH_MODELS.premiumDeepPlan;
  return COACH_MODELS.premium;
}

export function selectThinkingBudget(
  tier: CoachTier,
  intent: CoachIntent = 'chat',
): ThinkingBudget {
  if (tier !== 'premium') return { type: 'disabled' };
  return {
    type: 'enabled',
    budget_tokens:
      intent === 'deep_plan'
        ? PREMIUM_DEEP_THINKING_BUDGET
        : PREMIUM_THINKING_BUDGET,
  };
}

function maxTokensFor(tier: CoachTier, intent: CoachIntent): number {
  if (tier === 'free') return MAX_TOKENS_FREE;
  return intent === 'deep_plan' ? MAX_TOKENS_PREMIUM_DEEP : MAX_TOKENS_PREMIUM;
}

export interface BuildCoachParamsInput {
  tier: CoachTier;
  systemPrompt: string;
  // Phase 5: messages may carry multi-block content (text + image blocks) for
  // Pro photo attachments. The Anthropic SDK already accepts both string and
  // array forms on MessageParam.content — pass through unchanged.
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
  intent?: CoachIntent;
  modelOverride?: string;
}

export function buildAnthropicCreateParams(
  input: BuildCoachParamsInput,
): Anthropic.MessageCreateParamsStreaming {
  const { tier, systemPrompt, messages, tools, intent = 'chat', modelOverride } = input;
  const params: Anthropic.MessageCreateParamsStreaming = {
    model: modelOverride ?? selectModelForIntent(tier, intent),
    max_tokens: maxTokensFor(tier, intent),
    thinking: selectThinkingBudget(tier, intent),
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [...messages],
    stream: true,
  };
  if (tools && tools.length > 0) {
    params.tools = tools;
  }
  return params;
}

export interface StreamCoachReplyInput {
  tier: CoachTier;
  systemPrompt: string;
  messages: Anthropic.MessageParam[];
  anthropic: Anthropic;
}

export function streamCoachReply(input: StreamCoachReplyInput) {
  const { anthropic, ...rest } = input;
  const params = buildAnthropicCreateParams(rest);
  return anthropic.messages.stream(params);
}

let cachedClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not configured — cannot create Anthropic client for Sazon Coach.',
    );
  }
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}
