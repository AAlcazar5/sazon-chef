// W-C1 follow-on — DeepSeek adapter unit tests. DeepSeek's API is
// OpenAI-compatible (same /chat/completions shape + SSE chunks + tool_calls
// as OpenRouter), so the translation contract is the same. RED-first.

import {
  __INTERNALS,
  __parseSseLine,
  deepseekAdapter,
} from '../../../src/services/llm/deepseekAdapter';
import type {
  LLMStreamCall,
  NormalizedMessage,
  NormalizedToolDef,
} from '../../../src/services/llm/types';

const { flattenSystem, normalizedMessagesToOpenAI, normalizedToolsToOpenAI } =
  __INTERNALS;

describe('DeepSeek adapter — identity', () => {
  it('reports providerId "deepseek"', () => {
    expect(deepseekAdapter.providerId).toBe('deepseek');
  });
});

describe('DeepSeek adapter helpers (OpenAI-compatible)', () => {
  it('flattens system blocks into a single string', () => {
    expect(
      flattenSystem({
        systemBlocks: { stable: 'PERSONA', dynamic: '<user_profile>{}' },
        messages: [],
        tools: [],
        tier: 'free',
        intent: 'chat',
      } as LLMStreamCall),
    ).toBe('PERSONA\n\n<user_profile>{}');
  });

  it('flattens with no dynamic block', () => {
    expect(
      flattenSystem({
        systemBlocks: { stable: 'PERSONA' },
        messages: [],
        tools: [],
        tier: 'free',
        intent: 'chat',
      } as LLMStreamCall),
    ).toBe('PERSONA');
  });

  it('translates Anthropic tools → OpenAI function-tool shape', () => {
    const tools: NormalizedToolDef[] = [
      {
        name: 'get_pantry',
        description: 'Read pantry',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
    expect(normalizedToolsToOpenAI(tools)).toEqual([
      {
        type: 'function',
        function: {
          name: 'get_pantry',
          description: 'Read pantry',
          parameters: { type: 'object', properties: {} },
        },
      },
    ]);
  });

  it('splits assistant text + tool_use and user tool_result into OpenAI messages', () => {
    const msgs: NormalizedMessage[] = [
      { role: 'user', content: 'scale this' },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'on it' },
          { type: 'tool_use', id: 't1', name: 'scale', input: { factor: 2 } },
        ],
      },
      {
        role: 'user',
        content: [{ type: 'tool_result', toolUseId: 't1', content: 'done' }],
      },
    ];
    expect(normalizedMessagesToOpenAI(msgs)).toEqual([
      { role: 'user', content: 'scale this' },
      {
        role: 'assistant',
        content: 'on it',
        tool_calls: [
          {
            id: 't1',
            type: 'function',
            function: { name: 'scale', arguments: '{"factor":2}' },
          },
        ],
      },
      { role: 'tool', tool_call_id: 't1', content: 'done' },
    ]);
  });
});

describe('DeepSeek SSE line parsing', () => {
  it('parses a data chunk, ignores non-data, detects [DONE]', () => {
    expect(__parseSseLine('data: {"choices":[{"delta":{"content":"hi"}}]}'))
      .toEqual({ choices: [{ delta: { content: 'hi' } }] });
    expect(__parseSseLine(': ping')).toBeNull();
    expect(__parseSseLine('data: [DONE]')).toBe('done');
    expect(__parseSseLine('data: not-json')).toBeNull();
  });
});

describe('DeepSeek adapter — missing key', () => {
  const KEY = process.env.DEEPSEEK_API_KEY;
  afterEach(() => {
    if (KEY === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = KEY;
  });

  it('startStream throws a clear error when DEEPSEEK_API_KEY is unset', () => {
    delete process.env.DEEPSEEK_API_KEY;
    expect(() =>
      deepseekAdapter.startStream({
        systemBlocks: { stable: 'P' },
        messages: [{ role: 'user', content: 'hi' }],
        tools: [],
        tier: 'free',
        intent: 'chat',
      }),
    ).toThrow(/DEEPSEEK_API_KEY/);
  });
});
