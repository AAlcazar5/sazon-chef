// ROADMAP 4.0 TB0.3 — OpenAI fallback embed test.

import {
  makeOpenAIEmbed,
  projectDown,
  getProjection,
} from '../../../src/services/recommender/openaiEmbed';
import { EMBEDDING_DIM } from '../../../src/services/recommender/embeddingStore';

describe('makeOpenAIEmbed', () => {
  it('returns null when no API key is configured', () => {
    delete process.env.OPENAI_API_KEY;
    expect(makeOpenAIEmbed()).toBeNull();
  });

  it('projects 1536-dim API response to 64-dim L2-normed vector', async () => {
    const fetchFn = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [{ embedding: Array.from({ length: 1536 }, (_, i) => i / 1536) }],
      }),
    })) as any;
    const embed = makeOpenAIEmbed({ apiKey: 'sk-test', fetchFn })!;
    const vec = await embed('pasta');
    expect(vec).toHaveLength(EMBEDDING_DIM);
    const norm = Math.sqrt(vec!.reduce((s, v) => s + v * v, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it('returns null on non-200 response', async () => {
    const fetchFn = jest.fn(async () => ({ ok: false, status: 500 })) as any;
    const embed = makeOpenAIEmbed({ apiKey: 'sk-test', fetchFn })!;
    expect(await embed('text')).toBeNull();
  });

  it('returns null on fetch throw', async () => {
    const fetchFn = jest.fn(async () => {
      throw new Error('network');
    }) as any;
    const embed = makeOpenAIEmbed({ apiKey: 'sk-test', fetchFn })!;
    expect(await embed('text')).toBeNull();
  });

  it('returns null on malformed response shape', async () => {
    const fetchFn = jest.fn(async () => ({
      ok: true,
      json: async () => ({ wrong: 'shape' }),
    })) as any;
    const embed = makeOpenAIEmbed({ apiKey: 'sk-test', fetchFn })!;
    expect(await embed('text')).toBeNull();
  });

  it('projection matrix is deterministic across calls', () => {
    const a = getProjection();
    const b = getProjection();
    expect(a[0][0]).toBe(b[0][0]);
    expect(a.length).toBe(EMBEDDING_DIM);
  });

  it('projectDown returns L2-normed 64-dim vector', () => {
    const v = projectDown(Array.from({ length: 1536 }, (_, i) => Math.sin(i)));
    expect(v).toHaveLength(EMBEDDING_DIM);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 5);
  });
});
