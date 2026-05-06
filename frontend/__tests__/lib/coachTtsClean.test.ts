// Tier S S3.2 — TTS payload sanitizer.

import { cleanForTts } from '../../lib/coachTtsClean';

describe('cleanForTts', () => {
  it('strips bold/italic asterisks', () => {
    expect(cleanForTts('this is **really** important')).toBe(
      'this is really important',
    );
    expect(cleanForTts('this is *italic* text')).toBe('this is italic text');
  });

  it('strips underscore emphasis', () => {
    expect(cleanForTts('this is __bold__ and _italic_')).toBe(
      'this is bold and italic',
    );
  });

  it('drops markdown bullet markers but keeps the line', () => {
    expect(cleanForTts('- chicken\n- rice\n- spinach')).toBe(
      'chicken\nrice\nspinach',
    );
    expect(cleanForTts('* bullet')).toBe('bullet');
  });

  it('strips inline code backticks', () => {
    expect(cleanForTts('use the `find_recipes` tool')).toBe(
      'use the find_recipes tool',
    );
  });

  it('strips markdown headers', () => {
    expect(cleanForTts('# Tonight\nsalmon and yogurt')).toBe(
      'Tonight\nsalmon and yogurt',
    );
  });

  it('keeps link text, drops the URL', () => {
    expect(cleanForTts('see [the recipe](https://example.com/r/1)')).toBe(
      'see the recipe',
    );
  });

  it('drops emoji while keeping punctuation', () => {
    expect(cleanForTts('chef-kiss 🤌 try the sumac yogurt!')).toBe(
      'chef-kiss try the sumac yogurt!',
    );
    expect(cleanForTts('🍳 breakfast time')).toBe('breakfast time');
  });

  it('preserves sentence punctuation and contractions', () => {
    expect(cleanForTts("Tonight's special — sumac and yogurt.")).toBe(
      "Tonight's special — sumac and yogurt.",
    );
  });

  it('handles empty / null input', () => {
    expect(cleanForTts('')).toBe('');
    expect(cleanForTts(undefined as unknown as string)).toBe('');
  });

  it('collapses double spaces left behind by stripping', () => {
    expect(cleanForTts('hello  world')).toBe('hello world');
  });
});
