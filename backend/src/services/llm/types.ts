// ROADMAP 4.0 Tier $$ — $$2.1 — provider-agnostic LLM adapter contract.
//
// Both AnthropicAdapter and OpenRouterAdapter implement this interface so
// coachRoutes.ts stays provider-neutral. The route emits the same SSE events
// to the frontend regardless of which model is serving the turn.
//
// Streaming model: `startStream` returns an immediately-usable handle. The
// caller awaits `events` for incremental emission (text deltas + tool_use
// markers) and `finalMessage()` for the assembled response + token usage.

import type { CoachTier, CoachIntent } from '../coachService';

// ─── Inputs ────────────────────────────────────────────────────────────────

export interface NormalizedToolDef {
  name: string;
  description: string;
  /** JSON-schema. Same shape Anthropic's `input_schema` accepts. */
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface NormalizedMessage {
  role: 'user' | 'assistant';
  content: string | NormalizedContentBlock[];
}

export interface SystemPromptBlocks {
  stable: string;
  dynamic?: string;
}

export interface LLMStreamCall {
  systemBlocks: SystemPromptBlocks;
  messages: NormalizedMessage[];
  tools: NormalizedToolDef[];
  tier: CoachTier;
  intent: CoachIntent;
  /** $$3.2 — inner-loop iteration cap. */
  innerToolIteration?: boolean;
  /** Cost-ceiling downgrade or budget-driven model swap. */
  modelOverride?: string;
}

// ─── Streaming output ──────────────────────────────────────────────────────

export type LLMStreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_use_start'; id: string; name: string };

export type NormalizedContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; toolUseId: string; content: string }
  /**
   * Escape hatch for provider-native blocks (e.g. Anthropic's image /
   * document blocks for Pro vision attachments). The adapter for the
   * matching provider passes them through verbatim; other adapters drop
   * or reject them. Not for general use — only for tier-specific
   * features that don't have a cross-provider analog yet.
   */
  | { type: 'provider_native'; provider: 'anthropic'; block: unknown };

export interface NormalizedUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface LLMFinalMessage {
  model: string;
  content: NormalizedContentBlock[];
  usage: NormalizedUsage;
}

export interface LLMStreamHandle {
  events: AsyncIterable<LLMStreamEvent>;
  finalMessage(): Promise<LLMFinalMessage>;
}

// ─── Client interface ──────────────────────────────────────────────────────

export interface LLMClient {
  /** Stable id for telemetry / logging. */
  providerId: 'anthropic' | 'openrouter-gemini';
  /** Begin a streamed completion. */
  startStream(call: LLMStreamCall): LLMStreamHandle;
}
