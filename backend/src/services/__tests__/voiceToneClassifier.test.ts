// Tier U voice-grade — Claude Haiku tone classifier unit tests.
// Pure prompt-builder + response-parser are tested exhaustively; the
// network-bound classifyTone is tested with an injected fake client.

import {
  buildTonePrompt,
  parseToneResponse,
  classifyTone,
  type MessageCreator,
} from '../voiceToneClassifier';

describe('buildTonePrompt', () => {
  const p = buildTonePrompt({
    title: 'Charred Corn & Lime',
    description: 'Smoky, bright, a little messy in the best way.',
  });

  it('embeds the canonical 1–5 rubric anchors', () => {
    expect(p.system).toMatch(/Bon App[eé]tit/i);
    expect(p.system).toMatch(/macro-cult|protein blast/i);
    expect(p.system).toMatch(/\b1\b/);
    expect(p.system).toMatch(/\b5\b/);
  });

  it('asks for a single integer only', () => {
    expect(p.system).toMatch(/only.*(number|integer)/i);
  });

  it('includes the recipe title and description in the user turn', () => {
    expect(p.user).toContain('Charred Corn & Lime');
    expect(p.user).toContain('Smoky, bright');
  });
});

describe('parseToneResponse', () => {
  it('parses a bare integer', () => {
    expect(parseToneResponse('4')).toBe(4);
    expect(parseToneResponse('  5\n')).toBe(5);
  });

  it('rounds a decimal to the nearest grade', () => {
    expect(parseToneResponse('4.0')).toBe(4);
    expect(parseToneResponse('3.7')).toBe(4);
  });

  it('parses a JSON envelope (grade or score key)', () => {
    expect(parseToneResponse('{"grade":2}')).toBe(2);
    expect(parseToneResponse('{"score":5}')).toBe(5);
  });

  it('extracts the grade from a sentence', () => {
    expect(parseToneResponse('Grade: 3 — generic but fine')).toBe(3);
  });

  it('takes the final grade, not a number echoed from the scale or preamble', () => {
    // model echoes the rubric range before answering
    expect(parseToneResponse("On a scale of 1-5, I'd give a 2")).toBe(2);
    // a stray number earlier in the text (year, count) must not win
    expect(parseToneResponse('This 1920s-style dish scores a 4')).toBe(4);
  });

  it('clamps out-of-range numbers into [1,5]', () => {
    expect(parseToneResponse('7')).toBe(5);
    expect(parseToneResponse('0')).toBe(1);
  });

  it('throws on unparseable text (so scoreVoice falls back to heuristics)', () => {
    expect(() => parseToneResponse('banana')).toThrow();
    expect(() => parseToneResponse('')).toThrow();
  });
});

describe('classifyTone', () => {
  const fakeClient = (text: string): MessageCreator => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text }],
      }),
    },
  });

  it('resolves the parsed grade from a text block', async () => {
    await expect(
      classifyTone(
        { title: 'X', description: 'y' },
        fakeClient('4'),
      ),
    ).resolves.toBe(4);
  });

  it('handles a JSON envelope response', async () => {
    await expect(
      classifyTone({ title: 'X', description: 'y' }, fakeClient('{"grade":1}')),
    ).resolves.toBe(1);
  });

  it('rejects when the model errors (caller falls back to heuristics)', async () => {
    const erroring: MessageCreator = {
      messages: { create: jest.fn().mockRejectedValue(new Error('rate limit')) },
    };
    await expect(
      classifyTone({ title: 'X', description: 'y' }, erroring),
    ).rejects.toThrow();
  });

  it('rejects when no text block is returned', async () => {
    const noText: MessageCreator = {
      messages: {
        create: jest.fn().mockResolvedValue({ content: [{ type: 'tool_use' }] }),
      },
    };
    await expect(
      classifyTone({ title: 'X', description: 'y' }, noText),
    ).rejects.toThrow();
  });
});
