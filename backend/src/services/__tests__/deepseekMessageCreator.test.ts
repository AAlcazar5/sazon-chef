// Tier U — Deepseek adapter for the voice MessageCreator seam.
// Pure body-builder + response-parser tested exhaustively; the
// network-bound creator is tested with a stubbed global fetch.

import {
  buildDeepseekBody,
  parseDeepseekResponse,
  deepseekMessageCreator,
} from '../deepseekMessageCreator';

describe('buildDeepseekBody', () => {
  const args = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 220,
    temperature: 0.7,
    system: 'You rewrite recipe descriptions.',
    messages: [{ role: 'user', content: 'Rewrite this.' }],
  };

  it('hoists the Anthropic `system` into a leading system message', () => {
    const body = buildDeepseekBody(args);
    expect(body.messages[0]).toEqual({
      role: 'system',
      content: 'You rewrite recipe descriptions.',
    });
    expect(body.messages[1]).toEqual({ role: 'user', content: 'Rewrite this.' });
  });

  it('maps the Anthropic model id to the Deepseek default model', () => {
    expect(buildDeepseekBody(args).model).toBe('deepseek-chat');
  });

  it('honors DEEPSEEK_MODEL override', () => {
    const prev = process.env.DEEPSEEK_MODEL;
    process.env.DEEPSEEK_MODEL = 'deepseek-reasoner';
    expect(buildDeepseekBody(args).model).toBe('deepseek-reasoner');
    process.env.DEEPSEEK_MODEL = prev;
  });

  it('forwards temperature and max_tokens', () => {
    const body = buildDeepseekBody(args);
    expect(body.temperature).toBe(0.7);
    expect(body.max_tokens).toBe(220);
  });

  it('omits a system message when none is provided', () => {
    const body = buildDeepseekBody({ ...args, system: undefined });
    expect(body.messages.every((m) => m.role !== 'system')).toBe(true);
  });
});

describe('parseDeepseekResponse', () => {
  it('maps an OpenAI choice into the Anthropic content shape', () => {
    const r = parseDeepseekResponse({
      choices: [{ message: { content: 'A bright, herby summer plate.' } }],
    });
    expect(r).toEqual({
      content: [{ type: 'text', text: 'A bright, herby summer plate.' }],
    });
  });

  it('throws on an API error envelope', () => {
    expect(() =>
      parseDeepseekResponse({
        error: { message: 'Your credit balance is too low' },
      }),
    ).toThrow(/credit balance is too low/);
  });

  it('throws on an empty completion', () => {
    expect(() =>
      parseDeepseekResponse({ choices: [{ message: { content: '' } }] }),
    ).toThrow(/empty/i);
  });
});

describe('deepseekMessageCreator', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.DEEPSEEK_BASE_URL;
  });

  it('POSTs to the Deepseek endpoint with a bearer key and returns text', async () => {
    process.env.DEEPSEEK_API_KEY = 'sk-deepseek-test';
    const calls: Array<{ url: string; init: RequestInit }> = [];
    global.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Rewritten prose.' } }],
        }),
      };
    }) as unknown as typeof fetch;

    const client = deepseekMessageCreator();
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 220,
      temperature: 0.7,
      system: 'sys',
      messages: [{ role: 'user', content: 'go' }],
    });

    expect(res.content[0].text).toBe('Rewritten prose.');
    expect(calls[0].url).toContain('/chat/completions');
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(
      'Bearer sk-deepseek-test',
    );
  });

  it('throws a status-bearing error on non-2xx so retry/backoff can see it', async () => {
    process.env.DEEPSEEK_API_KEY = 'sk-deepseek-test';
    global.fetch = (async () => ({
      ok: false,
      status: 429,
      text: async () => '{"error":{"message":"rate limit"}}',
    })) as unknown as typeof fetch;

    const client = deepseekMessageCreator();
    await expect(
      client.messages.create({
        model: 'm',
        max_tokens: 10,
        temperature: 0,
        system: 's',
        messages: [{ role: 'user', content: 'x' }],
      }),
    ).rejects.toMatchObject({ status: 429 });
  });

  it('throws when DEEPSEEK_API_KEY is missing', () => {
    expect(() => deepseekMessageCreator()).toThrow(/DEEPSEEK_API_KEY/);
  });
});
