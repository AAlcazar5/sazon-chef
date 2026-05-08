// Tier $$ — $$2.1 — OpenRouter adapter unit tests.

import {
  __INTERNALS,
  __parseSseLine,
  openRouterAdapter,
} from '../../../src/services/llm/openRouterAdapter';
import type {
  LLMStreamCall,
  NormalizedMessage,
  NormalizedToolDef,
} from '../../../src/services/llm/types';

const { flattenSystem, normalizedMessagesToOpenAI, normalizedToolsToOpenAI } =
  __INTERNALS;

describe('$$2.1 — OpenRouter adapter helpers', () => {
  it('flattens system blocks into a single string (no cache_control)', () => {
    const out = flattenSystem({
      systemBlocks: { stable: 'PERSONA', dynamic: '<user_profile>{}' },
      messages: [],
      tools: [],
      tier: 'free',
      intent: 'chat',
    } as LLMStreamCall);
    expect(out).toBe('PERSONA\n\n<user_profile>{}');
  });

  it('flattens with no dynamic block', () => {
    const out = flattenSystem({
      systemBlocks: { stable: 'PERSONA' },
      messages: [],
      tools: [],
      tier: 'free',
      intent: 'chat',
    } as LLMStreamCall);
    expect(out).toBe('PERSONA');
  });

  it('translates Anthropic tools to OpenAI function-tool shape', () => {
    const tools: NormalizedToolDef[] = [
      {
        name: 'get_pantry',
        description: 'Read pantry',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
    const out = normalizedToolsToOpenAI(tools);
    expect(out).toEqual([
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

  it('translates plain string user/assistant messages', () => {
    const msgs: NormalizedMessage[] = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ];
    expect(normalizedMessagesToOpenAI(msgs)).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ]);
  });

  it('translates assistant tool_use blocks into tool_calls payload', () => {
    const msgs: NormalizedMessage[] = [
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'let me check' },
          { type: 'tool_use', id: 't1', name: 'get_pantry', input: {} },
        ],
      },
    ];
    const out = normalizedMessagesToOpenAI(msgs);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      role: 'assistant',
      content: 'let me check',
      tool_calls: [
        {
          id: 't1',
          type: 'function',
          function: { name: 'get_pantry', arguments: '{}' },
        },
      ],
    });
  });

  it('splits user-side tool_result blocks into role:"tool" messages', () => {
    const msgs: NormalizedMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'tool_result', toolUseId: 't1', content: '{"ok":true}' },
        ],
      },
    ];
    const out = normalizedMessagesToOpenAI(msgs);
    expect(out).toEqual([
      { role: 'tool', tool_call_id: 't1', content: '{"ok":true}' },
    ]);
  });
});

describe('$$2.1 — __parseSseLine', () => {
  it('returns null for non-data lines', () => {
    expect(__parseSseLine('event: ping')).toBeNull();
    expect(__parseSseLine('')).toBeNull();
    expect(__parseSseLine(': comment')).toBeNull();
  });

  it('returns "done" sentinel on data: [DONE]', () => {
    expect(__parseSseLine('data: [DONE]')).toBe('done');
  });

  it('parses JSON chunks', () => {
    const line = 'data: {"choices":[{"delta":{"content":"hi"}}]}';
    expect(__parseSseLine(line)).toEqual({
      choices: [{ delta: { content: 'hi' } }],
    });
  });

  it('returns null on malformed JSON without throwing', () => {
    expect(__parseSseLine('data: {bad')).toBeNull();
  });
});

describe('$$2.1 — openRouterAdapter end-to-end (mocked fetch)', () => {
  const ORIGINAL_FETCH = global.fetch;
  const ORIGINAL_KEY = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'or-test';
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    process.env.OPENROUTER_API_KEY = ORIGINAL_KEY;
  });

  it('throws clearly when OPENROUTER_API_KEY is missing', () => {
    delete process.env.OPENROUTER_API_KEY;
    expect(() =>
      openRouterAdapter.startStream({
        systemBlocks: { stable: 'p' },
        messages: [{ role: 'user', content: 'hi' }],
        tools: [],
        tier: 'free',
        intent: 'chat',
      }),
    ).toThrow(/OPENROUTER_API_KEY/);
  });

  function fakeStream(chunks: string[]): Response {
    const body = {
      getReader() {
        let i = 0;
        return {
          read: async () => {
            if (i >= chunks.length) return { done: true, value: undefined };
            const enc = new TextEncoder().encode(chunks[i]);
            i += 1;
            return { done: false, value: enc };
          },
        };
      },
    };
    return new Response(null, { status: 200 }) as unknown as Response &
      typeof body;
    // (we don't actually use Response; we replace `body` below)
  }

  it('emits text_delta events from chunked content + finalMessage assembles full text', async () => {
    global.fetch = jest.fn(async () => {
      const lines = [
        'data: {"model":"google/gemini-2.0-flash-exp:free","choices":[{"delta":{"content":"Hello"}}]}\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n',
        'data: {"usage":{"prompt_tokens":42,"completion_tokens":7}}\n',
        'data: [DONE]\n',
      ];
      return {
        ok: true,
        body: {
          getReader() {
            let i = 0;
            return {
              read: async () => {
                if (i >= lines.length) return { done: true, value: undefined };
                const enc = new TextEncoder().encode(lines[i]);
                i += 1;
                return { done: false, value: enc };
              },
            };
          },
        },
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const handle = openRouterAdapter.startStream({
      systemBlocks: { stable: 'p' },
      messages: [{ role: 'user', content: 'hi' }],
      tools: [],
      tier: 'free',
      intent: 'chat',
    });
    const collected: string[] = [];
    for await (const ev of handle.events) {
      if (ev.type === 'text_delta') collected.push(ev.text);
    }
    expect(collected).toEqual(['Hello', ' world']);
    const final = await handle.finalMessage();
    expect(final.content).toEqual([{ type: 'text', text: 'Hello world' }]);
    expect(final.usage).toEqual({
      inputTokens: 42,
      outputTokens: 7,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
  });

  it('emits tool_use_start once per tool_call + assembles streamed JSON args on finalMessage', async () => {
    global.fetch = jest.fn(async () => {
      const lines = [
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","type":"function","function":{"name":"get_pantry"}}]}}]}\n',
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"q\\":"}}]}}]}\n',
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\"hi\\"}"}}]}}]}\n',
        'data: [DONE]\n',
      ];
      return {
        ok: true,
        body: {
          getReader() {
            let i = 0;
            return {
              read: async () => {
                if (i >= lines.length) return { done: true, value: undefined };
                const enc = new TextEncoder().encode(lines[i]);
                i += 1;
                return { done: false, value: enc };
              },
            };
          },
        },
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const handle = openRouterAdapter.startStream({
      systemBlocks: { stable: 'p' },
      messages: [{ role: 'user', content: 'hi' }],
      tools: [
        {
          name: 'get_pantry',
          description: '',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
      tier: 'free',
      intent: 'chat',
    });

    const events: Array<{ type: string }> = [];
    for await (const ev of handle.events) events.push(ev);
    const toolStarts = events.filter((e) => e.type === 'tool_use_start');
    expect(toolStarts).toHaveLength(1); // dedup'd

    const final = await handle.finalMessage();
    expect(final.content).toHaveLength(1);
    const tc = final.content[0] as {
      type: string;
      id: string;
      name: string;
      input: unknown;
    };
    expect(tc.type).toBe('tool_use');
    expect(tc.id).toBe('call_1');
    expect(tc.name).toBe('get_pantry');
    expect(tc.input).toEqual({ q: 'hi' });
  });

  it('falls back to __raw_args on unparseable JSON args', async () => {
    global.fetch = jest.fn(async () => {
      const lines = [
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c1","type":"function","function":{"name":"x","arguments":"not-json"}}]}}]}\n',
        'data: [DONE]\n',
      ];
      return {
        ok: true,
        body: {
          getReader() {
            let i = 0;
            return {
              read: async () => {
                if (i >= lines.length) return { done: true, value: undefined };
                const enc = new TextEncoder().encode(lines[i]);
                i += 1;
                return { done: false, value: enc };
              },
            };
          },
        },
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const handle = openRouterAdapter.startStream({
      systemBlocks: { stable: 'p' },
      messages: [{ role: 'user', content: 'hi' }],
      tools: [
        { name: 'x', description: '', inputSchema: { type: 'object', properties: {} } },
      ],
      tier: 'free',
      intent: 'chat',
    });
    for await (const _ of handle.events) void _;
    const final = await handle.finalMessage();
    const tc = final.content[0] as { input: unknown };
    expect(tc.input).toEqual({ __raw_args: 'not-json' });
  });

  it('throws on non-OK response', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => 'unauthorized',
    })) as unknown as typeof fetch;
    const handle = openRouterAdapter.startStream({
      systemBlocks: { stable: 'p' },
      messages: [{ role: 'user', content: 'hi' }],
      tools: [],
      tier: 'free',
      intent: 'chat',
    });
    await expect(
      (async () => {
        for await (const _ of handle.events) void _;
      })(),
    ).rejects.toThrow(/OpenRouter stream failed: 401/);
  });
});
