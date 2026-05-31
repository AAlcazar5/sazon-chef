// Tier U — Anthropic Message Batches path for the voice rewrite pass.
//
// The batch path is a one-time "quality ceiling" run: rewrite the whole
// low-voice slice with Sonnet at the −50% batch rate instead of the
// per-item Haiku/DeepSeek sync loop. These tests pin the two pure seams —
// request builder + result parser — that the live SDK orchestration leans on.

import {
  buildBatchRequests,
  parseBatchResults,
  VOICE_BATCH_MODEL,
  type RewriteBatchItem,
} from '../../src/services/voiceBatchRewrite';

const items: RewriteBatchItem[] = [
  { id: 'rec_a', title: 'Pad See Ew', description: 'Noodles.', cuisine: 'Thai' },
  { id: 'rec_b', title: 'Feijoada', description: 'Bean stew.', cuisine: 'Brazilian' },
];

describe('buildBatchRequests', () => {
  it('emits one request per recipe with the recipe id as custom_id', () => {
    const reqs = buildBatchRequests(items);
    expect(reqs).toHaveLength(2);
    expect(reqs.map((r) => r.custom_id)).toEqual(['rec_a', 'rec_b']);
  });

  it('targets the Sonnet batch model and carries the rewrite prompt', () => {
    const [req] = buildBatchRequests(items);
    expect(req.params.model).toBe(VOICE_BATCH_MODEL);
    expect(req.params.max_tokens).toBeGreaterThan(0);
    expect(typeof req.params.system).toBe('string');
    expect(req.params.system as string).toMatch(/Sazon/);
    expect(req.params.messages[0].role).toBe('user');
    // The dish title must reach the prompt so the model keeps it fixed.
    const userContent = req.params.messages[0].content;
    expect(String(userContent)).toContain('Pad See Ew');
  });

  it('honors a model override', () => {
    const [req] = buildBatchRequests(items, { model: 'claude-opus-4-7' });
    expect(req.params.model).toBe('claude-opus-4-7');
  });

  it('rejects ids that violate the custom_id charset', () => {
    expect(() =>
      buildBatchRequests([{ id: 'bad id!', title: 't', description: 'd', cuisine: 'c' }]),
    ).toThrow(/custom_id/i);
  });
});

function succeeded(custom_id: string, text: string) {
  return {
    custom_id,
    result: {
      type: 'succeeded' as const,
      message: {
        content: [{ type: 'text', text }],
      },
    },
  };
}

describe('parseBatchResults', () => {
  it('maps succeeded results back to recipe ids with parsed descriptions', () => {
    const parsed = parseBatchResults([
      succeeded('rec_b', 'A smoky, slow-simmered pot of black beans and pork.'),
      succeeded('rec_a', 'Charred wide noodles slicked with dark soy.'),
    ] as never);
    const byId = new Map(parsed.map((p) => [p.id, p]));
    expect(byId.get('rec_a')?.description).toMatch(/Charred wide noodles/);
    expect(byId.get('rec_b')?.description).toMatch(/black beans/);
    expect(byId.get('rec_a')?.error).toBeUndefined();
  });

  it('strips quotes / fences via parseRewrittenDescription', () => {
    const [p] = parseBatchResults([succeeded('rec_a', '"Charred noodles."')] as never);
    expect(p.description).toBe('Charred noodles.');
  });

  it('records an error for errored / canceled / expired results (no description)', () => {
    const parsed = parseBatchResults([
      { custom_id: 'rec_a', result: { type: 'errored', error: { type: 'error', error: { type: 'rate_limit_error', message: 'slow down' } } } },
      { custom_id: 'rec_b', result: { type: 'expired' } },
      { custom_id: 'rec_c', result: { type: 'canceled' } },
    ] as never);
    expect(parsed.every((p) => p.description === undefined)).toBe(true);
    expect(parsed.find((p) => p.id === 'rec_a')?.error).toMatch(/error|rate/i);
    expect(parsed.find((p) => p.id === 'rec_b')?.error).toMatch(/expired/i);
    expect(parsed.find((p) => p.id === 'rec_c')?.error).toMatch(/cancel/i);
  });

  it('records an error when a succeeded result has no usable text block', () => {
    const parsed = parseBatchResults([
      { custom_id: 'rec_a', result: { type: 'succeeded', message: { content: [] } } },
    ] as never);
    expect(parsed[0].description).toBeUndefined();
    expect(parsed[0].error).toBeTruthy();
  });
});
