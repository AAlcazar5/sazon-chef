import { detectTechniques, COOKING_TECHNIQUES } from '../../lib/cookingTechniques';

describe('detectTechniques', () => {
  test('detects braising from instruction text', () => {
    const found = detectTechniques('Braise the short ribs for 2 hours until tender.');
    expect(found.map((f) => f.id)).toContain('braise');
  });

  test('detects deglazing with "deglaze"', () => {
    const found = detectTechniques('Deglaze the pan with red wine.');
    expect(found.map((f) => f.id)).toContain('deglaze');
  });

  test('detects tempering', () => {
    const found = detectTechniques('Temper the egg yolks with a little hot milk.');
    expect(found.map((f) => f.id)).toContain('temper');
  });

  test('ignores techniques the user has already seen', () => {
    const seen = new Set(['braise']);
    const found = detectTechniques('Braise the beef for 90 minutes.', seen);
    expect(found).toEqual([]);
  });

  test('returns empty for generic instructions', () => {
    const found = detectTechniques('Add salt and pepper to taste.');
    expect(found).toEqual([]);
  });

  test('does not return duplicate matches when a technique appears twice', () => {
    const found = detectTechniques('Sear the steak on one side, then sear the other.');
    const searCount = found.filter((f) => f.id === 'sear').length;
    expect(searCount).toBe(1);
  });

  test('glossary covers at least 30 techniques', () => {
    expect(COOKING_TECHNIQUES.length).toBeGreaterThanOrEqual(30);
  });
});
