// Tier $$ — $$2.3 — Direct Gemini adapter tests.

import {
  __INTERNALS,
  __parseSseLineGemini,
  geminiAdapter,
} from '../../../src/services/llm/geminiAdapter';
import type {
  LLMStreamCall,
  NormalizedMessage,
  NormalizedToolDef,
} from '../../../src/services/llm/types';

const { flattenSystem, normalizedMessagesToGemini, normalizedToolsToGemini } =
  __INTERNALS;

describe('$$2.3 — Gemini adapter helpers', () => {
  it('flattens system blocks into a single string', () => {
    const out = flattenSystem({
      systemBlocks: { stable: 'PERSONA', dynamic: '<user_profile>{}' },
      messages: [],
      tools: [],
      tier: 'free',
      intent: 'chat',
    } as LLMStreamCall);
    expect(out).toBe('PERSONA\n\n<user_profile>{}');
  });

  it('translates Anthropic-shaped tools into a SINGLE Gemini tool entry with functionDeclarations', () => {
    const tools: NormalizedToolDef[] = [
      { name: 'get_pantry', description: 'p', inputSchema: { type: 'object', properties: {} } },
      { name: 'find_recipes', description: 'r', inputSchema: { type: 'object', properties: {} } },
    ];
    const out = normalizedToolsToGemini(tools);
    expect(out).toHaveLength(1);
    expect(out[0].functionDeclarations).toHaveLength(2);
    expect(out[0].functionDeclarations[0].name).toBe('get_pantry');
  });

  it('returns empty tools array when input is empty', () => {
    expect(normalizedToolsToGemini([])).toEqual([]);
  });

  it('translates assistant role to "model" and string content to text part', () => {
    const msgs: NormalizedMessage[] = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ];
    const out = normalizedMessagesToGemini(msgs, new Map());
    expect(out).toEqual([
      { role: 'user', parts: [{ text: 'hi' }] },
      { role: 'model', parts: [{ text: 'hello' }] },
    ]);
  });

  it('translates assistant tool_use blocks into functionCall parts AND records id↔name mapping', () => {
    const idMap = new Map<string, string>();
    const msgs: NormalizedMessage[] = [
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'let me check' },
          { type: 'tool_use', id: 'gem_0_abc', name: 'get_pantry', input: { q: 'rice' } },
        ],
      },
    ];
    const out = normalizedMessagesToGemini(msgs, idMap);
    expect(out).toEqual([
      {
        role: 'model',
        parts: [
          { text: 'let me check' },
          { functionCall: { name: 'get_pantry', args: { q: 'rice' } } },
        ],
      },
    ]);
    // The id↔name map is the bookkeeping that lets the next user-turn's
    // tool_result block get translated into a Gemini functionResponse.
    expect(idMap.get('gem_0_abc')).toBe('get_pantry');
  });

  it('translates user-side tool_result blocks into functionResponse parts (correlated by name)', () => {
    const idMap = new Map<string, string>([['gem_0_abc', 'get_pantry']]);
    const msgs: NormalizedMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'tool_result', toolUseId: 'gem_0_abc', content: '{"items":["rice"]}' },
        ],
      },
    ];
    const out = normalizedMessagesToGemini(msgs, idMap);
    expect(out).toEqual([
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: 'get_pantry',
              response: { items: ['rice'] },
            },
          },
        ],
      },
    ]);
  });

  it('wraps non-object tool_result content in { result } so the API gets a valid object', () => {
    const idMap = new Map([['gem_0_abc', 'get_pantry']]);
    const msgs: NormalizedMessage[] = [
      {
        role: 'user',
        content: [{ type: 'tool_result', toolUseId: 'gem_0_abc', content: '42' }],
      },
    ];
    const out = normalizedMessagesToGemini(msgs, idMap);
    expect(out[0].parts[0].functionResponse?.response).toEqual({ result: 42 });
  });

  it('drops tool_result blocks with unknown synthetic ids (defensive)', () => {
    const idMap = new Map<string, string>(); // empty — id never seen
    const msgs: NormalizedMessage[] = [
      {
        role: 'user',
        content: [{ type: 'tool_result', toolUseId: 'gem_unknown', content: '{}' }],
      },
    ];
    const out = normalizedMessagesToGemini(msgs, idMap);
    expect(out).toEqual([]);
  });

  it('drops provider_native blocks (Anthropic image/document) — Pro never reaches here', () => {
    const msgs: NormalizedMessage[] = [
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'ok' },
          { type: 'provider_native', provider: 'anthropic', block: { type: 'image' } },
        ],
      },
    ];
    const out = normalizedMessagesToGemini(msgs, new Map());
    expect(out).toEqual([{ role: 'model', parts: [{ text: 'ok' }] }]);
  });
});

describe('$$2.3 — __parseSseLineGemini', () => {
  it('returns null on non-data lines', () => {
    expect(__parseSseLineGemini('event: ping')).toBeNull();
    expect(__parseSseLineGemini('')).toBeNull();
  });

  it('parses a JSON chunk', () => {
    const line = 'data: {"candidates":[{"content":{"parts":[{"text":"hi"}],"role":"model"}}]}';
    expect(__parseSseLineGemini(line)).toEqual({
      candidates: [{ content: { parts: [{ text: 'hi' }], role: 'model' } }],
    });
  });

  it('returns null on malformed JSON without throwing', () => {
    expect(__parseSseLineGemini('data: {bad')).toBeNull();
  });
});

describe('$$2.3 — geminiAdapter end-to-end (mocked fetch)', () => {
  const ORIGINAL_FETCH = global.fetch;
  const ORIGINAL_KEY = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'g-test';
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    process.env.GEMINI_API_KEY = ORIGINAL_KEY;
  });

  it('throws clearly when GEMINI_API_KEY is missing', () => {
    delete process.env.GEMINI_API_KEY;
    expect(() =>
      geminiAdapter.startStream({
        systemBlocks: { stable: 'p' },
        messages: [{ role: 'user', content: 'hi' }],
        tools: [],
        tier: 'free',
        intent: 'chat',
      }),
    ).toThrow(/GEMINI_API_KEY/);
  });

  function mockGeminiStream(lines: string[]) {
    return jest.fn(async () => ({
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
    })) as unknown as typeof fetch;
  }

  it('emits text_delta events from text parts + finalMessage assembles full text', async () => {
    global.fetch = mockGeminiStream([
      'data: {"candidates":[{"content":{"parts":[{"text":"Hello"}],"role":"model"}}],"modelVersion":"gemini-2.0-flash"}\n',
      'data: {"candidates":[{"content":{"parts":[{"text":" world"}]}}]}\n',
      'data: {"usageMetadata":{"promptTokenCount":42,"candidatesTokenCount":7}}\n',
    ]);

    const handle = geminiAdapter.startStream({
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
    expect(final.model).toBe('gemini-2.0-flash');
  });

  it('emits tool_use_start with synthetic id + carries args through to finalMessage', async () => {
    global.fetch = mockGeminiStream([
      'data: {"candidates":[{"content":{"parts":[{"functionCall":{"name":"get_pantry","args":{"q":"rice"}}}]}}]}\n',
    ]);

    const handle = geminiAdapter.startStream({
      systemBlocks: { stable: 'p' },
      messages: [{ role: 'user', content: 'hi' }],
      tools: [
        { name: 'get_pantry', description: '', inputSchema: { type: 'object', properties: {} } },
      ],
      tier: 'free',
      intent: 'chat',
    });

    const events: Array<{ type: string }> = [];
    for await (const ev of handle.events) events.push(ev);
    const toolStarts = events.filter((e) => e.type === 'tool_use_start') as Array<{
      type: 'tool_use_start';
      id: string;
      name: string;
    }>;
    expect(toolStarts).toHaveLength(1);
    expect(toolStarts[0].name).toBe('get_pantry');
    expect(toolStarts[0].id).toMatch(/^gem_/);

    const final = await handle.finalMessage();
    const tc = final.content[0] as { type: string; name: string; input: unknown };
    expect(tc.type).toBe('tool_use');
    expect(tc.name).toBe('get_pantry');
    expect(tc.input).toEqual({ q: 'rice' });
  });

  it('handles a single chunk containing BOTH text and a functionCall', async () => {
    global.fetch = mockGeminiStream([
      'data: {"candidates":[{"content":{"parts":[{"text":"Let me check."},{"functionCall":{"name":"get_pantry","args":{}}}]}}]}\n',
    ]);

    const handle = geminiAdapter.startStream({
      systemBlocks: { stable: 'p' },
      messages: [{ role: 'user', content: 'hi' }],
      tools: [
        { name: 'get_pantry', description: '', inputSchema: { type: 'object', properties: {} } },
      ],
      tier: 'free',
      intent: 'chat',
    });
    const events: Array<{ type: string }> = [];
    for await (const ev of handle.events) events.push(ev);
    expect(events.map((e) => e.type)).toEqual(['text_delta', 'tool_use_start']);
    const final = await handle.finalMessage();
    expect(final.content).toHaveLength(2);
    expect(final.content[0].type).toBe('text');
    expect(final.content[1].type).toBe('tool_use');
  });

  it('throws on non-OK response', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 403,
      text: async () => 'forbidden',
    })) as unknown as typeof fetch;
    const handle = geminiAdapter.startStream({
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
    ).rejects.toThrow(/Gemini stream failed: 403/);
  });

  it('sends the API key via x-goog-api-key header (not query param)', async () => {
    const fetchMock = mockGeminiStream(['data: {"candidates":[{"content":{"parts":[{"text":"hi"}]}}]}\n']);
    global.fetch = fetchMock;
    const handle = geminiAdapter.startStream({
      systemBlocks: { stable: 'p' },
      messages: [{ role: 'user', content: 'hi' }],
      tools: [],
      tier: 'free',
      intent: 'chat',
    });
    for await (const _ of handle.events) void _;
    const fetchArgs = (fetchMock as jest.Mock).mock.calls[0];
    const url = fetchArgs[0] as string;
    const init = fetchArgs[1] as RequestInit;
    expect(url).not.toMatch(/[?&]key=/);
    const headers = init.headers as Record<string, string>;
    expect(headers['x-goog-api-key']).toBe('g-test');
  });
});
