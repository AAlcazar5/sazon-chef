// Group 10Y-A: Coach service tier routing + Anthropic dispatch.

import Anthropic from '@anthropic-ai/sdk';

export type CoachTier = 'free' | 'premium';

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
  free: 'claude-sonnet-4-6',
  premium: 'claude-opus-4-7',
} as const;

const MAX_TOKENS_FREE = 4096;
const MAX_TOKENS_PREMIUM = 24000;
const PREMIUM_THINKING_BUDGET = 16000;

type ThinkingBudget =
  | { type: 'disabled' }
  | { type: 'enabled'; budget_tokens: number };

export function selectModel(tier: CoachTier): string {
  return COACH_MODELS[tier];
}

export function selectThinkingBudget(tier: CoachTier): ThinkingBudget {
  if (tier === 'premium') {
    return { type: 'enabled', budget_tokens: PREMIUM_THINKING_BUDGET };
  }
  return { type: 'disabled' };
}

export interface BuildCoachParamsInput {
  tier: CoachTier;
  systemPrompt: string;
  // Phase 5: messages may carry multi-block content (text + image blocks) for
  // Pro photo attachments. The Anthropic SDK already accepts both string and
  // array forms on MessageParam.content — pass through unchanged.
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
}

export function buildAnthropicCreateParams(
  input: BuildCoachParamsInput,
): Anthropic.MessageCreateParamsStreaming {
  const { tier, systemPrompt, messages, tools } = input;
  const params: Anthropic.MessageCreateParamsStreaming = {
    model: selectModel(tier),
    max_tokens: tier === 'premium' ? MAX_TOKENS_PREMIUM : MAX_TOKENS_FREE,
    thinking: selectThinkingBudget(tier),
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
