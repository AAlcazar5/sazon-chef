// W-C1 — DeepSeek adapter (OpenAI-compatible REST).
//
// Routes free-tier cook traffic to DeepSeek-V3 via DeepSeek's OpenAI-
// compatible /chat/completions stream endpoint. DeepSeek speaks the same
// wire shape as OpenRouter (OpenAI messages + tool_calls in, chunked deltas
// out), so the translation contract is identical — this adapter is the
// OpenRouter adapter with a different base URL / key / model and none of
// OpenRouter's referer headers.
//
// Why DeepSeek for free-tier cooking: ~$0.27/M input — an order of
// magnitude cheaper than Haiku — and cook prompts carry no PII (step text +
// quantities only, never the personalized profile), which is what makes the
// China-hosted endpoint acceptable here (same rationale as the seed path's
// AIProviderManager Path B).
//
// NOT carried over from Anthropic: prompt caching (DeepSeek has its own
// server-side cache; Anthropic ephemeral cache_control is ignored) and
// extended thinking (dropped on the OpenAI shape).

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

const DEFAULT_BASE_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat'; // DeepSeek-V3

// Free-tier cook turns are short; cap output tight (DeepSeek output is
// pricier than input, same as the other free providers).
const MAX_OUTPUT_TOKENS_FREE = 1024;

function deepseekUrl(): string {
  return process.env.DEEPSEEK_BASE_URL ?? DEFAULT_BASE_URL;
}

function selectDeepseekModel(call: LLMStreamCall): string {
  if (call.modelOverride) return call.modelOverride;
  return process.env.DEEPSEEK_MODEL ?? DEFAULT_MODEL;
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
        // provider_native blocks are Pro-only (Pro stays on Anthropic) —
        // they never reach DeepSeek; drop defensively.
      }
      const assistant: OpenAIMessage = { role: 'assistant' };
      if (textParts.length > 0) assistant.content = textParts.join('\n');
      if (toolCalls.length > 0) assistant.tool_calls = toolCalls;
      out.push(assistant);
      continue;
    }
    let userText = '';
    for (const b of m.content) {
      if (b.type === 'text') userText += b.text;
      else if (b.type === 'tool_result') {
        out.push({
          role: 'tool',
          tool_call_id: b.toolUseId,
          content: b.content,
        });
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
    prompt_cache_hit_tokens?: number;
  };
}

export function __parseSseLine(
  line: string,
): OpenAIStreamChunk | 'done' | null {
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

export const deepseekAdapter: LLMClient = {
  providerId: 'deepseek',

  startStream(call: LLMStreamCall): LLMStreamHandle {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error(
        'DEEPSEEK_API_KEY not configured — cannot route free tier through DeepSeek.',
      );
    }

    const model = selectDeepseekModel(call);
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
      stream_options: { include_usage: true },
      max_tokens,
    });

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
      const resp = await fetch(deepseekUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body,
      });
      const stream = await ensureStreamOk(resp, 'DeepSeek');
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
                // DeepSeek reports server-side context-cache hits; surface
                // them as cacheReadTokens so the budget aggregate stays honest.
                cacheReadTokens: parsed.usage.prompt_cache_hit_tokens ?? 0,
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
                    id: tc.id ?? `ds_${tc.index}_${Date.now()}`,
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
        if (!streamComplete) {
          for await (const _ of generator) {
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
  DEFAULT_MODEL,
};
