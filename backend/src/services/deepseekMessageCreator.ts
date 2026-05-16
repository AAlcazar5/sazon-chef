// backend/src/services/deepseekMessageCreator.ts
// Tier U — a Deepseek-backed adapter for the voice `MessageCreator` seam.
//
// voiceRewriter.rewriteDescription and voiceToneClassifier.classifyTone
// both accept an optional `MessageCreator` (an Anthropic-shaped
// `messages.create`). Deepseek speaks the OpenAI /v1/chat/completions
// wire format, so this maps the Anthropic call shape ⇄ Deepseek and
// hands back the same `{ content: [{ type, text }] }` envelope the voice
// services already parse — no change to the callers' parsing logic.
//
// Used when the Anthropic balance is exhausted: route the rewrite +
// tone-scoring through Deepseek-V3 instead. Errors preserve `.status`
// so the rewrite script's transient-retry/backoff still triggers on
// 429/5xx.

import type { MessageCreator } from './voiceToneClassifier';

const DEFAULT_MODEL = 'deepseek-chat';
const DEFAULT_BASE_URL = 'https://api.deepseek.com/v1';

interface AnthropicLikeArgs {
  model: string;
  max_tokens: number;
  temperature: number;
  system?: string;
  messages: Array<{ role: string; content: string }>;
}

interface DeepseekBody {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  max_tokens: number;
}

export function buildDeepseekBody(args: AnthropicLikeArgs): DeepseekBody {
  const model = process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;
  const messages = args.system
    ? [{ role: 'system', content: args.system }, ...args.messages]
    : [...args.messages];
  return {
    model,
    messages,
    temperature: args.temperature,
    max_tokens: args.max_tokens,
  };
}

interface DeepseekResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

export function parseDeepseekResponse(json: DeepseekResponse): {
  content: Array<{ type: string; text: string }>;
} {
  if (json.error) {
    throw new Error(json.error.message ?? 'Deepseek: unknown API error');
  }
  const text = json.choices?.[0]?.message?.content ?? '';
  if (text.length === 0) {
    throw new Error('Deepseek: empty completion');
  }
  return { content: [{ type: 'text', text }] };
}

export function deepseekMessageCreator(): MessageCreator {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      'DEEPSEEK_API_KEY is not configured — cannot create Deepseek client.',
    );
  }
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL).replace(
    /\/$/,
    '',
  );
  const url = `${baseUrl}/chat/completions`;

  return {
    messages: {
      create: async (args: unknown) => {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(buildDeepseekBody(args as AnthropicLikeArgs)),
        });

        if (!res.ok) {
          const bodyText = await res.text().catch(() => '');
          const err = new Error(
            `Deepseek HTTP ${res.status}: ${bodyText.slice(0, 200)}`,
          ) as Error & { status?: number };
          err.status = res.status;
          throw err;
        }

        return parseDeepseekResponse((await res.json()) as DeepseekResponse);
      },
    },
  };
}
