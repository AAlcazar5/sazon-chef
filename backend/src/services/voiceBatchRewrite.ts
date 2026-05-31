// backend/src/services/voiceBatchRewrite.ts
// Tier U — Anthropic Message Batches path for the voice rewrite pass.
//
// The sync rewrite loop (rewrite-voice-mvp.ts) runs per-item against Haiku /
// DeepSeek. This module is the seam for a one-time "quality ceiling" run:
// rewrite the whole low-voice slice with Sonnet via the async Batches API at
// the −50% batch rate. Latency (up to 24h) is irrelevant for an offline
// catalog pass, and Sonnet's headnote voice is the point.
//
// Pure by design — the request builder and the result parser carry the logic;
// the live submit/poll/fetch orchestration lives in the script and leans on
// these two functions. Reuses the existing buildRewritePrompt + parser so the
// prompt + cleanup stay byte-identical to the sync path.

import type { MessageBatchIndividualResponse } from '@anthropic-ai/sdk/resources/messages/batches';
import type { BatchCreateParams } from '@anthropic-ai/sdk/resources/messages/batches';
import { buildRewritePrompt, parseRewrittenDescription } from './voiceRewriter';

// Sonnet is the quality target for the ceiling pass. Overridable so a model-ID
// bump (or an Opus run) doesn't require a code change.
export const VOICE_BATCH_MODEL =
  process.env.VOICE_BATCH_MODEL || 'claude-sonnet-4-6';

const MAX_TOKENS = 220;
const TEMPERATURE = 0.7;

// Anthropic custom_id charset: ^[a-zA-Z0-9_-]{1,64}$. Recipe cuids satisfy it,
// but validate so a malformed id fails loudly at build time, not mid-batch.
const CUSTOM_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export interface RewriteBatchItem {
  id: string;
  title: string;
  description: string;
  cuisine: string;
}

export interface BuildBatchOptions {
  model?: string;
}

export function buildBatchRequests(
  items: ReadonlyArray<RewriteBatchItem>,
  opts: BuildBatchOptions = {},
): BatchCreateParams.Request[] {
  const model = opts.model ?? VOICE_BATCH_MODEL;
  return items.map((item) => {
    if (!CUSTOM_ID_RE.test(item.id)) {
      throw new Error(
        `voiceBatchRewrite: recipe id "${item.id}" is not a valid custom_id (^[a-zA-Z0-9_-]{1,64}$)`,
      );
    }
    const { system, user } = buildRewritePrompt({
      title: item.title,
      description: item.description,
      cuisine: item.cuisine,
    });
    return {
      custom_id: item.id,
      params: {
        model,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        system,
        messages: [{ role: 'user', content: user }],
      },
    };
  });
}

export interface ParsedBatchResult {
  id: string;
  /** Set on a clean rewrite. Undefined when the request didn't yield usable text. */
  description?: string;
  /** Set when the result errored / expired / canceled / produced no text. */
  error?: string;
}

function extractText(message: { content?: Array<{ type?: string; text?: unknown }> }): string | null {
  const block = (message.content ?? []).find(
    (b): b is { type: string; text: string } =>
      b?.type === 'text' && typeof b.text === 'string',
  );
  return block ? block.text : null;
}

export function parseBatchResults(
  responses: ReadonlyArray<MessageBatchIndividualResponse>,
): ParsedBatchResult[] {
  return responses.map((res) => {
    const id = res.custom_id;
    const result = res.result;
    switch (result.type) {
      case 'succeeded': {
        const text = extractText(result.message as never);
        if (text === null) {
          return { id, error: 'no text block in succeeded result' };
        }
        try {
          return { id, description: parseRewrittenDescription(text) };
        } catch (err) {
          return { id, error: err instanceof Error ? err.message : String(err) };
        }
      }
      case 'errored': {
        const e = result.error as { error?: { message?: string; type?: string } } | undefined;
        const msg = e?.error?.message || e?.error?.type || 'errored';
        return { id, error: `error: ${msg}` };
      }
      case 'expired':
        return { id, error: 'expired before processing' };
      case 'canceled':
        return { id, error: 'canceled before processing' };
      default:
        return { id, error: `unknown result type: ${String((result as { type?: string }).type)}` };
    }
  });
}
