// ROADMAP 4.0 Tier $$ — $$2.1 — OpenRouter adapter (OpenAI-compatible REST).
//
// Routes free-tier traffic to Gemini 2.0 Flash via OpenRouter's OpenAI-
// compatible /v1/chat/completions stream endpoint. Translates between the
// normalized LLMClient shape (Anthropic-flavored) and OpenAI's messages +
// tool_calls format on the way in, and chunked deltas on the way out.
//
// What's NOT carried over from Anthropic:
//   - prompt caching: Gemini Flash via OpenRouter does not support
//     Anthropic's ephemeral cache_control. Cache hints are ignored. The
//     persona block is sent fresh on every call. Mitigated by Gemini's
//     ~13× cheaper input rate vs Haiku 4.5.
//   - extended thinking: dropped on the OpenAI shape.
//
// What IS carried:
//   - tool definitions (translated to OpenAI function-tool format)
//   - tool_use / tool_result history (translated)
//   - max_tokens, system prompt, message history

import { logger } from '../../utils/logger';
import { ensureStreamOk } from './adapterHelpers';
import type {
  LLMClient,
  LLMFinalMessage,
  LLMStreamCall,
  LLMStreamEvent,
  LLMStreamHandle,
  NormalizedContentBlock,
  NormalizedMessage,
  NormalizedToolDef,
  NormalizedUsage,
} from './types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-2.0-flash-exp:free';
const PAID_FALLBACK_MODEL = 'google/gemini-2.0-flash-001';

// Mirrors the cap logic in coachService — keep as a fallback when intent
// hints aren't passed through. Output is 5× more expensive than input on
// Gemini Flash too, so a tight cap matters.
const MAX_OUTPUT_TOKENS_FREE = 1024;

function selectOpenRouterModel(call: LLMStreamCall): string {
  if (call.modelOverride) return call.modelOverride;
  return process.env.OPENROUTER_FREE_MODEL ?? DEFAULT_MODEL;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    };
  };
}

function flattenSystem(call: LLMStreamCall): string {
  const stable = call.systemBlocks.stable;
  const dynamic = call.systemBlocks.dynamic;
  return dynamic && dynamic.length > 0 ? `${stable}\n\n${dynamic}` : stable;
}

function normalizedMessagesToOpenAI(
  msgs: ReadonlyArray<NormalizedMessage>,
): OpenAIMessage[] {
  const out: OpenAIMessage[] = [];
  for (const m of msgs) {
    if (typeof m.content === 'string') {
      out.push({ role: m.role, content: m.content });
      continue;
    }
    // Multi-block content. OpenAI's pattern: assistant turn with text + tool_calls
    // is one message with both fields populated; tool results come as separate
    // role:'tool' messages.
    if (m.role === 'assistant') {
      const textParts: string[] = [];
      const toolCalls: NonNullable<OpenAIMessage['tool_calls']> = [];
      for (const b of m.content) {
        if (b.type === 'text') textParts.push(b.text);
        else if (b.type === 'tool_use') {
          toolCalls.push({
            id: b.id,
            type: 'function',
            function: {
              name: b.name,
              arguments: JSON.stringify(b.input ?? {}),
            },
          });
        }
        // provider_native (image/document blocks): silently dropped here.
        // Pro-only attachments never reach OpenRouter (Pro stays on Anthropic).
      }
      const assistant: OpenAIMessage = { role: 'assistant' };
      if (textParts.length > 0) assistant.content = textParts.join('\n');
      if (toolCalls.length > 0) assistant.tool_calls = toolCalls;
      out.push(assistant);
      continue;
    }
    // user role with content blocks — typically tool_result blocks come back
    // here (Anthropic shape has user role for tool results; OpenAI splits
    // them into separate role:'tool' messages).
    let userText = '';
    for (const b of m.content) {
      if (b.type === 'text') userText += b.text;
      else if (b.type === 'tool_result') {
        out.push({
          role: 'tool',
          tool_call_id: b.toolUseId,
          content: b.content,
        });
      } else if (b.type === 'tool_use') {
        // Shouldn't happen on user role; skip defensively.
      }
    }
    if (userText.length > 0) out.push({ role: 'user', content: userText });
  }
  return out;
}

function normalizedToolsToOpenAI(
  tools: ReadonlyArray<NormalizedToolDef>,
): OpenAITool[] {
  return tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema as OpenAITool['function']['parameters'],
    },
  }));
}

interface PendingToolCall {
  id: string;
  name: string;
  argsBuffer: string;
}

interface OpenAIStreamChunk {
  id?: string;
  model?: string;
  choices?: Array<{
    delta?: {
      content?: string | null;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export function __parseSseLine(line: string): OpenAIStreamChunk | 'done' | null {
  if (!line.startsWith('data:')) return null;
  const payload = line.slice(5).trim();
  if (payload === '[DONE]') return 'done';
  if (payload.length === 0) return null;
  try {
    return JSON.parse(payload) as OpenAIStreamChunk;
  } catch {
    return null;
  }
}

export const openRouterAdapter: LLMClient = {
  providerId: 'openrouter-gemini',

  startStream(call: LLMStreamCall): LLMStreamHandle {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENROUTER_API_KEY not configured — cannot route free tier through OpenRouter.',
      );
    }

    const model = selectOpenRouterModel(call);
    const openaiTools = normalizedToolsToOpenAI(call.tools);
    const openaiMessages: OpenAIMessage[] = [
      { role: 'system', content: flattenSystem(call) },
      ...normalizedMessagesToOpenAI(call.messages),
    ];

    const max_tokens = call.innerToolIteration ? 512 : MAX_OUTPUT_TOKENS_FREE;

    const body = JSON.stringify({
      model,
      messages: openaiMessages,
      tools: openaiTools.length > 0 ? openaiTools : undefined,
      stream: true,
      max_tokens,
    });

    // Collected during streaming so finalMessage() returns the assembled
    // content + the canonical model id reported by the provider.
    const collectedText: string[] = [];
    const pendingByIndex = new Map<number, PendingToolCall>();
    let resolvedModel = model;
    let usage: NormalizedUsage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
    let streamComplete = false;

    async function* eventGenerator(): AsyncGenerator<LLMStreamEvent> {
      const resp = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          // Recommended by OpenRouter for analytics — these don't change pricing.
          'HTTP-Referer': process.env.OPENROUTER_REFERER ?? 'https://sazon.app',
          'X-Title': 'Sazon',
        },
        body,
      });
      const stream = await ensureStreamOk(resp, 'OpenRouter');
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const seenToolStartIds = new Set<string>();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nlIdx = buffer.indexOf('\n');
        while (nlIdx !== -1) {
          const line = buffer.slice(0, nlIdx).trim();
          buffer = buffer.slice(nlIdx + 1);
          const parsed = __parseSseLine(line);
          if (parsed === 'done') {
            streamComplete = true;
            return;
          }
          if (parsed != null) {
            if (parsed.model) resolvedModel = parsed.model;
            if (parsed.usage) {
              usage = {
                inputTokens: parsed.usage.prompt_tokens ?? 0,
                outputTokens: parsed.usage.completion_tokens ?? 0,
                cacheReadTokens: 0,
                cacheWriteTokens: 0,
              };
            }
            const choice = parsed.choices?.[0];
            const delta = choice?.delta;
            if (delta?.content) {
              collectedText.push(delta.content);
              yield { type: 'text_delta', text: delta.content };
            }
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                let pending = pendingByIndex.get(tc.index);
                if (!pending) {
                  pending = {
                    id: tc.id ?? `or_${tc.index}_${Date.now()}`,
                    name: tc.function?.name ?? '',
                    argsBuffer: '',
                  };
                  pendingByIndex.set(tc.index, pending);
                } else {
                  if (tc.id) pending.id = tc.id;
                  if (tc.function?.name) pending.name = tc.function.name;
                }
                if (tc.function?.arguments) {
                  pending.argsBuffer += tc.function.arguments;
                }
                // Fire `tool_use_start` as soon as we have id + name. Defer
                // args until finalMessage() (matches Anthropic semantics
                // where input is empty during streaming).
                if (
                  pending.id &&
                  pending.name &&
                  !seenToolStartIds.has(pending.id)
                ) {
                  seenToolStartIds.add(pending.id);
                  yield {
                    type: 'tool_use_start',
                    id: pending.id,
                    name: pending.name,
                  };
                }
              }
            }
          }
          nlIdx = buffer.indexOf('\n');
        }
      }
      streamComplete = true;
    }

    const generator = eventGenerator();

    const handle: LLMStreamHandle = {
      events: generator,
      async finalMessage(): Promise<LLMFinalMessage> {
        // Drain the generator if the caller didn't consume everything (defensive).
        if (!streamComplete) {
          for await (const _ of generator) {
            // discard; everything we need is collected in the closure already
            void _;
          }
        }

        const content: NormalizedContentBlock[] = [];
        const text = collectedText.join('');
        if (text.length > 0) content.push({ type: 'text', text });
        for (const pending of pendingByIndex.values()) {
          let parsed: unknown = {};
          if (pending.argsBuffer.length > 0) {
            try {
              parsed = JSON.parse(pending.argsBuffer);
            } catch {
              parsed = { __raw_args: pending.argsBuffer };
            }
          }
          content.push({
            type: 'tool_use',
            id: pending.id,
            name: pending.name,
            input: parsed,
          });
        }
        return { model: resolvedModel, content, usage };
      },
    };
    return handle;
  },
};

// Internal helpers exported for tests.
export const __INTERNALS = {
  flattenSystem,
  normalizedMessagesToOpenAI,
  normalizedToolsToOpenAI,
  PAID_FALLBACK_MODEL,
};
