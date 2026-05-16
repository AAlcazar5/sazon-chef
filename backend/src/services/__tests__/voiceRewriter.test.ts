// Tier U voice rewrite — Claude Haiku description rewriter unit tests.
// Pure prompt-builder + response-parser tested exhaustively; the
// network-bound rewriteDescription is tested with an injected fake client.

import {
  buildRewritePrompt,
  parseRewrittenDescription,
  rewriteDescription,
} from '../voiceRewriter';
import type { MessageCreator } from '../voiceToneClassifier';

describe('buildRewritePrompt', () => {
  const p = buildRewritePrompt({
    title: 'Thai Green Curry',
    description: 'Aromatic coconut curry with vegetables',
    cuisine: 'Thai',
  });

  it('anchors on the Bon Appétit / Sazon voice', () => {
    expect(p.system).toMatch(/Bon App[eé]tit|Ottolenghi/i);
    expect(p.system).toMatch(/witty friend|texts you/i);
  });

  it('forbids macro-cult vocabulary', () => {
    expect(p.system).toMatch(/guilt-free|macro|low-cal|protein blast/i);
  });

  it('constrains to description-only, fact-preserving, bounded length', () => {
    expect(p.system).toMatch(/description only|only the description/i);
    expect(p.system).toMatch(/(don't|do not|never).*(invent|change|add).*ingredient/i);
    expect(p.system).toMatch(/\b\d{2,3}\b/); // a character/length budget
  });

  it('includes the original title, description, and cuisine', () => {
    expect(p.user).toContain('Thai Green Curry');
    expect(p.user).toContain('Aromatic coconut curry with vegetables');
    expect(p.user).toContain('Thai');
  });
});

describe('parseRewrittenDescription', () => {
  it('returns trimmed plain text', () => {
    expect(parseRewrittenDescription('  Charred, bright, a little smoky.  ')).toBe(
      'Charred, bright, a little smoky.',
    );
  });

  it('unwraps surrounding quotes', () => {
    expect(parseRewrittenDescription('"Smoky and bright."')).toBe(
      'Smoky and bright.',
    );
    expect(parseRewrittenDescription('“Curly quotes too.”')).toBe(
      'Curly quotes too.',
    );
  });

  it('unwraps a fenced code block', () => {
    expect(parseRewrittenDescription('```\nJust the prose.\n```')).toBe(
      'Just the prose.',
    );
  });

  it('extracts a JSON { description } envelope', () => {
    expect(
      parseRewrittenDescription('{"description":"From the envelope."}'),
    ).toBe('From the envelope.');
  });

  it('strips a leading "Description:" label', () => {
    expect(parseRewrittenDescription('Description: The cleaned line.')).toBe(
      'The cleaned line.',
    );
  });

  it('throws on empty / whitespace output', () => {
    expect(() => parseRewrittenDescription('')).toThrow();
    expect(() => parseRewrittenDescription('   \n  ')).toThrow();
    expect(() => parseRewrittenDescription('""')).toThrow();
  });
});

describe('rewriteDescription', () => {
  const fake = (text: string): MessageCreator => ({
    messages: {
      create: jest.fn().mockResolvedValue({ content: [{ type: 'text', text }] }),
    },
  });

  it('resolves the cleaned rewritten description', async () => {
    await expect(
      rewriteDescription(
        { title: 'X', description: 'flat', cuisine: 'Thai' },
        fake('"Bright, herbal, with a coconut hum."'),
      ),
    ).resolves.toBe('Bright, herbal, with a coconut hum.');
  });

  it('handles a JSON envelope response', async () => {
    await expect(
      rewriteDescription(
        { title: 'X', description: 'flat', cuisine: 'Thai' },
        fake('{"description":"Enveloped prose."}'),
      ),
    ).resolves.toBe('Enveloped prose.');
  });

  it('rejects when the model errors', async () => {
    const erroring: MessageCreator = {
      messages: { create: jest.fn().mockRejectedValue(new Error('rate limit')) },
    };
    await expect(
      rewriteDescription({ title: 'X', description: 'y', cuisine: 'Thai' }, erroring),
    ).rejects.toThrow();
  });

  it('rejects when no text block is returned', async () => {
    const noText: MessageCreator = {
      messages: {
        create: jest.fn().mockResolvedValue({ content: [{ type: 'tool_use' }] }),
      },
    };
    await expect(
      rewriteDescription({ title: 'X', description: 'y', cuisine: 'Thai' }, noText),
    ).rejects.toThrow();
  });
});
