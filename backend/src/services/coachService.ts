// Group 10Y-A: Coach service tier routing + Anthropic dispatch.
// Tier S (ROADMAP 4.0): tiered model routing — Haiku 4.5 for free, Sonnet 4.6
// for premium chat, Opus 4.7 for premium deep-plan intents only.

import Anthropic from '@anthropic-ai/sdk';

export type CoachTier = 'free' | 'premium';
// Tier $$ — $$3.1 — 'lookup' for pure data-fetch queries that need no
// reasoning ("what's on my plan", "what am I allergic to"). Pro tier
// disables the thinking budget entirely on lookup intent.
export type CoachIntent = 'chat' | 'deep_plan' | 'lookup';

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

// S17c — output-token caps. Output is 5× more expensive than input on every
// Claude tier, so over-provisioning max_tokens is wasted ceiling. The persona
// enforces "one paragraph max" — 1024 tokens fits ~750 words, ample for chat.
const MAX_TOKENS_FREE = 1024;
const MAX_TOKENS_PREMIUM = 4096;
const MAX_TOKENS_PREMIUM_DEEP = 12000;
// Tier $$ — $$3.2 — inner-loop iteration cap. When the model is mid-tool-use
// sequence (not the final iteration), it tends to emit either (a) a short ack
// + another tool_use block, or (b) a concise post-tool answer. 512 tokens is
// safe headroom for both without risking truncation of a real conversational
// reply. Still well below the full 1024 (free) / 4096 (premium chat) ceiling.
const INNER_LOOP_MAX_TOKENS = 512;
// S17c — thinking budgets dialed down. Extended thinking tokens ARE billed at
// output rate; 8k of thinking on Sonnet was ~$0.12 per Pro chat call. 2k still
// gives the model meaningful internal reasoning room without runaway spend.
// deep_plan intent (explicit "plan my week" / "rebuild my pantry" asks) keeps
// a generous 8k budget — that's where reasoning earns its cost.
const PREMIUM_THINKING_BUDGET = 2000;
const PREMIUM_DEEP_THINKING_BUDGET = 8000;

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
  // Tier $$ — $$3.1: pure-lookup turns don't benefit from extended thinking.
  // Disabling on lookup saves ~75% of the per-call thinking spend.
  if (intent === 'lookup') return { type: 'disabled' };
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

/**
 * S17 — split system prompt for prompt caching.
 *
 * Anthropic ephemeral caching uses the EXACT bytes of a system block as the
 * cache key. The legacy single-block prompt mixed the stable PERSONA with
 * the per-call user-profile JSON, so any drift in profile bytes (a new
 * cooked recipe, a leftover that just expired) busted the cache.
 *
 * Splitting into `{ stable, dynamic }` lets us mark only the stable block
 * with cache_control. The persona stays cached even when profile changes.
 */
export interface SystemPromptBlocks {
  /** Persona, brand voice, instructions — byte-stable across calls. Cached. */
  stable: string;
  /** Per-call user profile / memories. Not cached. Optional. */
  dynamic?: string;
}

export interface BuildCoachParamsInput {
  tier: CoachTier;
  /** Legacy single-string prompt. One cached block. */
  systemPrompt?: string;
  /** S17 — preferred. Two-block system (stable cached + dynamic uncached). */
  systemBlocks?: SystemPromptBlocks;
  // Phase 5: messages may carry multi-block content (text + image blocks) for
  // Pro photo attachments. The Anthropic SDK already accepts both string and
  // array forms on MessageParam.content — pass through unchanged.
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
  intent?: CoachIntent;
  modelOverride?: string;
  /**
   * Tier $$ — $$3.2. When true, max_tokens is forced to INNER_LOOP_MAX_TOKENS
   * (96). The agent loop sets this on every iteration except the FINAL one so
   * the model doesn't emit a long acknowledgment between tool calls.
   */
  innerToolIteration?: boolean;
}

function buildSystemBlocks(
  input: Pick<BuildCoachParamsInput, 'systemPrompt' | 'systemBlocks'>,
): Array<Anthropic.TextBlockParam> {
  if (input.systemBlocks) {
    const blocks: Array<Anthropic.TextBlockParam> = [
      {
        type: 'text',
        text: input.systemBlocks.stable,
        cache_control: { type: 'ephemeral' },
      },
    ];
    if (input.systemBlocks.dynamic && input.systemBlocks.dynamic.length > 0) {
      blocks.push({ type: 'text', text: input.systemBlocks.dynamic });
    }
    return blocks;
  }
  // Legacy single-block path.
  return [
    {
      type: 'text',
      text: input.systemPrompt ?? '',
      cache_control: { type: 'ephemeral' },
    },
  ];
}

/**
 * S17 — cache the tool catalog. Anthropic caches everything before the
 * cache_control marker, so we only need to mark the last tool. Returns a
 * new array (no mutation of caller's tools).
 */
function withCachedTools(tools: Anthropic.Tool[]): Anthropic.Tool[] {
  if (tools.length === 0) return tools;
  const next = tools.slice();
  const last = next[next.length - 1];
  next[next.length - 1] = {
    ...last,
    cache_control: { type: 'ephemeral' },
  } as Anthropic.Tool;
  return next;
}

export function buildAnthropicCreateParams(
  input: BuildCoachParamsInput,
): Anthropic.MessageCreateParamsStreaming {
  const { tier, messages, tools, intent = 'chat', modelOverride, innerToolIteration } = input;
  const max_tokens = innerToolIteration
    ? INNER_LOOP_MAX_TOKENS
    : maxTokensFor(tier, intent);
  // Tier $$ — $$3.2: disable thinking on inner iterations. Anthropic requires
  // max_tokens > thinking.budget_tokens, and a 96-token output cap with a
  // 2000-token thinking budget would fail validation.
  const thinking = innerToolIteration
    ? ({ type: 'disabled' } as ThinkingBudget)
    : selectThinkingBudget(tier, intent);
  const params: Anthropic.MessageCreateParamsStreaming = {
    model: modelOverride ?? selectModelForIntent(tier, intent),
    max_tokens,
    thinking,
    system: buildSystemBlocks(input),
    messages: [...messages],
    stream: true,
  };
  if (tools && tools.length > 0) {
    params.tools = withCachedTools(tools);
  }
  return params;
}

export interface StreamCoachReplyInput {
  tier: CoachTier;
  /** Legacy single-string prompt. */
  systemPrompt?: string;
  /** S17 — preferred. Two-block system (stable cached + dynamic uncached). */
  systemBlocks?: SystemPromptBlocks;
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
  intent?: CoachIntent;
  modelOverride?: string;
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
