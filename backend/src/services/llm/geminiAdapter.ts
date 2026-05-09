// ROADMAP 4.0 Tier $$ — $$2.3 — Direct Gemini adapter (Google AI Studio).
//
// Routes free-tier traffic to Google's native Gemini API, skipping the
// OpenRouter middleman. Same cost-per-token bracket as OpenRouter Gemini
// (~$0.075/M input, $0.30/M output paid; FREE tier ~1500 req/day at zero
// cost — no credit card needed).
//
// Translates between the normalized LLMClient shape (Anthropic-flavored)
// and Gemini's contents / systemInstruction / functionDeclarations format
// on the way in, and SSE streamGenerateContent chunks on the way out.
//
// Cache parity: Gemini does NOT support Anthropic-style ephemeral
// cache_control. Cache hints are ignored. The persona block is sent fresh
// on every call. Mitigated by Gemini's much cheaper input rate vs Haiku.
//
// Tool-call ID correlation: Gemini's functionCall messages don't carry an
// id. The route's flow needs an id to correlate tool_use_start ↔
// tool_result. We mint synthetic ids (`gem_<index>_<random>`) and translate
// outgoing tool_result blocks (which carry the synthetic id) back into
// Gemini's `functionResponse` shape (which uses the function NAME for
// correlation). This bookkeeping happens entirely inside the adapter.

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

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
// `gemini-flash-latest` is Google's moving alias for whichever Flash family
// model is currently free-tier eligible. Verified 2026-05 to alias to
// `gemini-3-flash-preview`. Pinning the alias (not the dated version) avoids
// the periodic free-tier-revocation churn on specific model ids — you don't
// have to re-test the swap every time Google rotates the free model.
const DEFAULT_MODEL = 'gemini-flash-latest';
const MAX_OUTPUT_TOKENS_FREE = 1024;

function selectGeminiModel(call: LLMStreamCall): string {
  if (call.modelOverride) return call.modelOverride;
  return process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
}

function flattenSystem(call: LLMStreamCall): string {
  const stable = call.systemBlocks.stable;
  const dynamic = call.systemBlocks.dynamic;
  return dynamic && dynamic.length > 0 ? `${stable}\n\n${dynamic}` : stable;
}

// ─── Gemini wire shapes (subset we need) ────────────────────────────────────

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

interface GeminiTool {
  functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: {
      type: string;
      properties?: Record<string, unknown>;
      required?: string[];
    };
  }>;
}

interface GeminiStreamChunk {
  candidates?: Array<{
    content?: GeminiContent;
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  modelVersion?: string;
}

// ─── Translators ────────────────────────────────────────────────────────────

interface ToolNameToSyntheticId {
  resolve(name: string): string;
}

/**
 * Build a Gemini-shaped `contents` array from the normalized message list.
 *
 * Gemini's tool-result correlation happens by NAME (not by id like Anthropic
 * or OpenRouter). The route persists tool_use blocks with synthetic ids
 * that come from this adapter — when those ids show up in tool_result
 * blocks on the next turn, we look up the corresponding name via the
 * `idToName` map and emit `functionResponse: { name }`.
 */
function normalizedMessagesToGemini(
  msgs: ReadonlyArray<NormalizedMessage>,
  idToName: Map<string, string>,
): GeminiContent[] {
  const out: GeminiContent[] = [];
  for (const m of msgs) {
    if (typeof m.content === 'string') {
      out.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      });
      continue;
    }
    if (m.role === 'assistant') {
      const parts: GeminiPart[] = [];
      for (const b of m.content) {
        if (b.type === 'text') parts.push({ text: b.text });
        else if (b.type === 'tool_use') {
          parts.push({
            functionCall: {
              name: b.name,
              args: (b.input as Record<string, unknown>) ?? {},
            },
          });
          // Remember the id↔name mapping for the next turn's tool_result.
          idToName.set(b.id, b.name);
        }
        // provider_native (Anthropic image/document) silently dropped — Pro
        // never routes here.
      }
      if (parts.length > 0) out.push({ role: 'model', parts });
      continue;
    }
    // user role: text + tool_results
    const parts: GeminiPart[] = [];
    for (const b of m.content) {
      if (b.type === 'text') parts.push({ text: b.text });
      else if (b.type === 'tool_result') {
        const name = idToName.get(b.toolUseId);
        if (!name) continue; // unknown synthetic id — drop defensively
        let response: Record<string, unknown>;
        try {
          const parsed = JSON.parse(b.content) as unknown;
          response =
            parsed && typeof parsed === 'object' && !Array.isArray(parsed)
              ? (parsed as Record<string, unknown>)
              : { result: parsed };
        } catch {
          response = { result: b.content };
        }
        parts.push({ functionResponse: { name, response } });
      }
    }
    if (parts.length > 0) out.push({ role: 'user', parts });
  }
  return out;
}

function normalizedToolsToGemini(
  tools: ReadonlyArray<NormalizedToolDef>,
): GeminiTool[] {
  if (tools.length === 0) return [];
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.inputSchema as GeminiTool['functionDeclarations'][number]['parameters'],
      })),
    },
  ];
}

// ─── SSE parser (shared shape) ─────────────────────────────────────────────

export function __parseSseLineGemini(
  line: string,
): GeminiStreamChunk | 'done' | null {
  if (!line.startsWith('data:')) return null;
  const payload = line.slice(5).trim();
  if (payload.length === 0) return null;
  if (payload === '[DONE]') return 'done';
  try {
    return JSON.parse(payload) as GeminiStreamChunk;
  } catch {
    return null;
  }
}

// ─── Adapter ───────────────────────────────────────────────────────────────

export const geminiAdapter: LLMClient = {
  providerId: 'gemini-direct',

  startStream(call: LLMStreamCall): LLMStreamHandle {
    const rawKey = process.env.GEMINI_API_KEY;
    if (!rawKey) {
      throw new Error(
        'GEMINI_API_KEY not configured — cannot route free tier through Gemini.',
      );
    }
    const apiKey: string = rawKey;

    const model = selectGeminiModel(call);
    const idToName = new Map<string, string>();
    const contents = normalizedMessagesToGemini(call.messages, idToName);
    const tools = normalizedToolsToGemini(call.tools);

    const max_output_tokens = call.innerToolIteration
      ? 512
      : MAX_OUTPUT_TOKENS_FREE;

    const body = JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: flattenSystem(call) }] },
      ...(tools.length > 0 ? { tools } : {}),
      generationConfig: { maxOutputTokens: max_output_tokens },
    });

    const url = `${GEMINI_BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;

    const collectedText: string[] = [];
    const collectedToolCalls: Array<{
      id: string;
      name: string;
      args: Record<string, unknown>;
    }> = [];
    let resolvedModel = model;
    let usage: NormalizedUsage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
    let streamComplete = false;

    async function* eventGenerator(): AsyncGenerator<LLMStreamEvent> {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Google accepts the key via header OR query param; header is
          // safer (won't show up in HTTP logs).
          'x-goog-api-key': apiKey,
        },
        body,
      });
      const stream = await ensureStreamOk(resp, 'Gemini');
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let toolIdx = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nlIdx = buffer.indexOf('\n');
        while (nlIdx !== -1) {
          const line = buffer.slice(0, nlIdx).trim();
          buffer = buffer.slice(nlIdx + 1);
          const parsed = __parseSseLineGemini(line);
          if (parsed === 'done') {
            streamComplete = true;
            return;
          }
          if (parsed != null) {
            if (parsed.modelVersion) resolvedModel = parsed.modelVersion;
            if (parsed.usageMetadata) {
              usage = {
                inputTokens: parsed.usageMetadata.promptTokenCount ?? 0,
                outputTokens: parsed.usageMetadata.candidatesTokenCount ?? 0,
                cacheReadTokens: 0,
                cacheWriteTokens: 0,
              };
            }
            const parts = parsed.candidates?.[0]?.content?.parts ?? [];
            for (const p of parts) {
              if (typeof p.text === 'string' && p.text.length > 0) {
                collectedText.push(p.text);
                yield { type: 'text_delta', text: p.text };
              }
              if (p.functionCall) {
                const synthId = `gem_${toolIdx}_${Math.random()
                  .toString(36)
                  .slice(2, 8)}`;
                toolIdx += 1;
                collectedToolCalls.push({
                  id: synthId,
                  name: p.functionCall.name,
                  args: p.functionCall.args ?? {},
                });
                yield {
                  type: 'tool_use_start',
                  id: synthId,
                  name: p.functionCall.name,
                };
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
          for await (const _ of generator) void _;
        }
        const content: NormalizedContentBlock[] = [];
        const text = collectedText.join('');
        if (text.length > 0) content.push({ type: 'text', text });
        for (const tc of collectedToolCalls) {
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.args,
          });
        }
        return { model: resolvedModel, content, usage };
      },
    };
    return handle;
  },
};

export const __INTERNALS = {
  flattenSystem,
  normalizedMessagesToGemini,
  normalizedToolsToGemini,
};
