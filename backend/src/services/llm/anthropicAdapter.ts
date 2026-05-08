// ROADMAP 4.0 Tier $$ — $$2.1 — Anthropic adapter.
//
// Wraps the existing buildAnthropicCreateParams + anthropic.messages.stream
// flow into the provider-agnostic LLMClient interface. All the S17 cache
// machinery (cache_control on persona + tools) lives here unchanged.

import type Anthropic from '@anthropic-ai/sdk';
import {
  buildAnthropicCreateParams,
  getAnthropicClient,
} from '../coachService';
import type {
  LLMClient,
  LLMFinalMessage,
  LLMStreamCall,
  LLMStreamEvent,
  LLMStreamHandle,
  NormalizedContentBlock,
  NormalizedMessage,
  NormalizedToolDef,
} from './types';

function normalizedMessagesToAnthropic(
  msgs: ReadonlyArray<NormalizedMessage>,
): Anthropic.MessageParam[] {
  return msgs.map((m) => {
    if (typeof m.content === 'string') {
      return { role: m.role, content: m.content };
    }
    // Array form — translate normalized blocks to Anthropic blocks.
    const blocks = m.content.map((b): Anthropic.ContentBlockParam => {
      if (b.type === 'text') return { type: 'text', text: b.text };
      if (b.type === 'tool_use')
        return { type: 'tool_use', id: b.id, name: b.name, input: b.input as never };
      if (b.type === 'tool_result') {
        return {
          type: 'tool_result',
          tool_use_id: b.toolUseId,
          content: b.content,
        };
      }
      // provider_native — pass through if it's an Anthropic-native block
      // (image / document for Pro vision). For other providers this would
      // get dropped at their adapter layer.
      return b.block as Anthropic.ContentBlockParam;
    });
    return { role: m.role, content: blocks };
  });
}

function normalizedToolsToAnthropic(
  tools: ReadonlyArray<NormalizedToolDef>,
): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
  }));
}

function anthropicContentToNormalized(
  blocks: ReadonlyArray<Anthropic.ContentBlock>,
): NormalizedContentBlock[] {
  return blocks
    .map((b): NormalizedContentBlock | null => {
      if (b.type === 'text') return { type: 'text', text: b.text };
      if (b.type === 'tool_use')
        return { type: 'tool_use', id: b.id, name: b.name, input: b.input };
      // thinking / redacted_thinking / server_tool_use / etc — drop from
      // the normalized stream (the route doesn't replay them).
      return null;
    })
    .filter((b): b is NormalizedContentBlock => b !== null);
}

/**
 * Bridge helpers exported for coachRoutes — let the route stay Anthropic-shaped
 * internally while the LLM call goes through the normalized adapter boundary.
 */
export function anthropicMessagesToNormalized(
  msgs: ReadonlyArray<Anthropic.MessageParam>,
): NormalizedMessage[] {
  return msgs.map((m): NormalizedMessage => {
    if (typeof m.content === 'string') {
      return { role: m.role, content: m.content };
    }
    const blocks = m.content
      .map((b): NormalizedContentBlock | null => {
        if (b.type === 'text') return { type: 'text', text: b.text };
        if (b.type === 'tool_use')
          return {
            type: 'tool_use',
            id: b.id,
            name: b.name,
            input: b.input as unknown,
          };
        if (b.type === 'tool_result') {
          const content =
            typeof b.content === 'string'
              ? b.content
              : Array.isArray(b.content)
                ? b.content
                    .map((cb) => (cb.type === 'text' ? cb.text : ''))
                    .join('')
                : '';
          return {
            type: 'tool_result',
            toolUseId: b.tool_use_id,
            content,
          };
        }
        // image / document / thinking — wrap in provider_native escape hatch
        // so the AnthropicAdapter passes them through verbatim. Pro-only
        // vision attachments (image blocks) take this path. OpenRouterAdapter
        // would drop them at translation; that's fine because Pro never
        // routes there.
        return { type: 'provider_native', provider: 'anthropic', block: b };
      })
      .filter((b): b is NormalizedContentBlock => b !== null);
    return { role: m.role, content: blocks };
  });
}

export function anthropicToolsToNormalized(
  tools: ReadonlyArray<Anthropic.Tool>,
): NormalizedToolDef[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description ?? '',
    inputSchema: t.input_schema as NormalizedToolDef['inputSchema'],
  }));
}

export function normalizedToAnthropicContent(
  blocks: ReadonlyArray<NormalizedContentBlock>,
): Anthropic.ContentBlockParam[] {
  return blocks.map((b): Anthropic.ContentBlockParam => {
    if (b.type === 'text') return { type: 'text', text: b.text };
    if (b.type === 'tool_use')
      return { type: 'tool_use', id: b.id, name: b.name, input: b.input as never };
    if (b.type === 'tool_result') {
      return {
        type: 'tool_result',
        tool_use_id: b.toolUseId,
        content: b.content,
      };
    }
    // provider_native pass-through
    return b.block as Anthropic.ContentBlockParam;
  });
}

export const anthropicAdapter: LLMClient = {
  providerId: 'anthropic',

  startStream(call: LLMStreamCall): LLMStreamHandle {
    const client = getAnthropicClient();
    const params = buildAnthropicCreateParams({
      tier: call.tier,
      systemBlocks: call.systemBlocks,
      messages: normalizedMessagesToAnthropic(call.messages),
      tools: normalizedToolsToAnthropic(call.tools),
      intent: call.intent,
      innerToolIteration: call.innerToolIteration,
      modelOverride: call.modelOverride,
    });
    const sdkStream = client.messages.stream(params);

    async function* eventGenerator(): AsyncGenerator<LLMStreamEvent> {
      for await (const event of sdkStream as AsyncIterable<Anthropic.RawMessageStreamEvent>) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield { type: 'text_delta', text: event.delta.text };
        } else if (
          event.type === 'content_block_start' &&
          event.content_block.type === 'tool_use'
        ) {
          yield {
            type: 'tool_use_start',
            id: event.content_block.id,
            name: event.content_block.name,
          };
        }
      }
    }

    const handle: LLMStreamHandle = {
      events: eventGenerator(),
      async finalMessage(): Promise<LLMFinalMessage> {
        const final = await sdkStream.finalMessage();
        return {
          model: final.model,
          content: anthropicContentToNormalized(final.content),
          usage: {
            inputTokens: final.usage.input_tokens ?? 0,
            outputTokens: final.usage.output_tokens ?? 0,
            cacheReadTokens: final.usage.cache_read_input_tokens ?? 0,
            cacheWriteTokens: final.usage.cache_creation_input_tokens ?? 0,
          },
        };
      },
    };
    return handle;
  },
};
