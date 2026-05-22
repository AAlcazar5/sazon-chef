// Y-PI-4 (founder Telegram 2026-05-22): allergen-override resistance.
// Deterministic post-check on coach replies. Even if a user / sanitization
// bypass / LLM hallucination produces a reply that mentions a user-allergen
// ingredient, this check catches it BEFORE delivery.
//
// Test corpus pins:
//   (a) Replies containing user-allergen tokens get flagged with the
//       specific tokens that violated.
//   (b) Replies that don't mention an allergen don't trigger.
//   (c) The variant map covers common synonyms (milk → dairy, almond →
//       tree_nut, etc.).
//   (d) Multi-word phrase tokens ("pine nut", "sea bass") match.
//   (e) The refusal copy is Sazon-voice (no "I cannot comply" / "Error").

import {
  detectAllergenViolation,
  buildAllergenRefusal,
  expandAllergenWatchlist,
} from '../../src/services/coachSafetyService';

// ─── expandAllergenWatchlist ────────────────────────────────────────────

describe('expandAllergenWatchlist', () => {
  it('expands peanut to peanut + peanuts + goober', () => {
    const list = expandAllergenWatchlist(['peanut']);
    expect(list).toEqual(expect.arrayContaining(['peanut', 'peanuts', 'goober']));
  });

  it('expands tree_nut to all known nuts', () => {
    const list = expandAllergenWatchlist(['tree_nut']);
    expect(list).toEqual(
      expect.arrayContaining(['almond', 'cashew', 'walnut', 'pecan', 'pistachio']),
    );
  });

  it('expands dairy to milk + cheese + cream + butter + yogurt + whey + casein + lactose + named cheeses', () => {
    const list = expandAllergenWatchlist(['dairy']);
    expect(list).toEqual(
      expect.arrayContaining([
        'milk',
        'cheese',
        'cream',
        'butter',
        'yogurt',
        'whey',
        'casein',
        'lactose',
        'parmesan',
        'mozzarella',
      ]),
    );
  });

  it('normalizes spaces in the input ("tree nut" → tree_nut)', () => {
    const list = expandAllergenWatchlist(['tree nut']);
    expect(list).toEqual(expect.arrayContaining(['almond', 'walnut']));
  });

  it('case-insensitive on the input ("PEANUT" → peanut variants)', () => {
    const list = expandAllergenWatchlist(['PEANUT']);
    expect(list).toEqual(expect.arrayContaining(['peanut', 'peanuts']));
  });

  it('falls back to the raw token for unknown allergens', () => {
    const list = expandAllergenWatchlist(['turmeric']);
    expect(list).toEqual(expect.arrayContaining(['turmeric', 'turmerics']));
  });

  it('drops empty / whitespace entries silently', () => {
    expect(expandAllergenWatchlist([''])).toEqual([]);
    expect(expandAllergenWatchlist(['  '])).toEqual([]);
    expect(expandAllergenWatchlist([])).toEqual([]);
  });

  it('dedupes tokens that appear in multiple variant groups', () => {
    // wheat + gluten both list 'flour', 'bread', etc.
    const list = expandAllergenWatchlist(['wheat', 'gluten']);
    const floorCount = list.filter((t) => t === 'flour').length;
    expect(floorCount).toBe(1);
  });
});

// ─── detectAllergenViolation — positives ────────────────────────────────

describe('detectAllergenViolation — replies that violate', () => {
  it('peanut profile: reply mentioning "peanut" flags', () => {
    const result = detectAllergenViolation(
      "Try this Thai peanut noodle bowl — it's quick and warming.",
      ['peanut'],
    );
    expect(result.containsAllergen).toBe(true);
    expect(result.violatingTokens).toContain('peanut');
  });

  it('peanut profile: reply mentioning "peanuts" (plural) flags', () => {
    const result = detectAllergenViolation(
      "Topped with crushed peanuts and lime.",
      ['peanut'],
    );
    expect(result.containsAllergen).toBe(true);
    expect(result.violatingTokens).toContain('peanuts');
  });

  it('dairy profile: reply mentioning "parmesan" flags', () => {
    const result = detectAllergenViolation(
      'Carbonara: guanciale, pecorino, eggs, parmesan, pasta water.',
      ['dairy'],
    );
    expect(result.containsAllergen).toBe(true);
    expect(result.violatingTokens).toEqual(
      expect.arrayContaining(['parmesan']),
    );
  });

  it('tree_nut profile: reply mentioning "almond" flags', () => {
    const result = detectAllergenViolation(
      'Drizzle with almond butter and serve over greens.',
      ['tree_nut'],
    );
    expect(result.containsAllergen).toBe(true);
    expect(result.violatingTokens).toContain('almond');
  });

  it('shellfish profile: reply mentioning "shrimp" flags', () => {
    const result = detectAllergenViolation(
      'Shrimp scampi tonight — quick weeknight dinner.',
      ['shellfish'],
    );
    expect(result.containsAllergen).toBe(true);
    expect(result.violatingTokens).toContain('shrimp');
  });

  it('multi-allergen profile: returns ALL violating tokens', () => {
    const result = detectAllergenViolation(
      "Peanut sauce with shrimp and a sprinkle of parmesan.",
      ['peanut', 'shellfish', 'dairy'],
    );
    expect(result.violatingTokens).toEqual(
      expect.arrayContaining(['peanut', 'shrimp', 'parmesan']),
    );
  });

  it('gluten profile: reply mentioning "pasta" flags', () => {
    const result = detectAllergenViolation(
      'Spaghetti with marinara is the simplest pasta dinner.',
      ['gluten'],
    );
    expect(result.violatingTokens).toContain('pasta');
  });

  it('multi-word phrase: "sea bass" flags fish profile', () => {
    const result = detectAllergenViolation(
      'Pan-roasted sea bass with capers.',
      ['fish'],
    );
    expect(result.containsAllergen).toBe(true);
    expect(result.violatingTokens).toContain('sea bass');
  });

  it('multi-word phrase: "pine nut" flags tree_nut profile', () => {
    const result = detectAllergenViolation(
      'Toss with toasted pine nut and basil.',
      ['tree_nut'],
    );
    expect(result.containsAllergen).toBe(true);
    expect(result.violatingTokens).toContain('pine nut');
  });

  it('phrase spans a newline (LLM line break inside the phrase)', () => {
    const result = detectAllergenViolation(
      'Finish with toasted pine\nnut over the top.',
      ['tree_nut'],
    );
    expect(result.containsAllergen).toBe(true);
  });

  it('case-insensitive on the reply', () => {
    const result = detectAllergenViolation('PEANUTS everywhere.', ['peanut']);
    expect(result.containsAllergen).toBe(true);
  });

  it('unknown allergen ("turmeric") matches reply containing "turmeric"', () => {
    const result = detectAllergenViolation(
      'A pinch of turmeric in the broth.',
      ['turmeric'],
    );
    expect(result.containsAllergen).toBe(true);
  });

  it('STRICT FP policy: "peanut-free" still flags (better refusal than risk)', () => {
    // "peanut-free" decomposes to ["peanut", "free"] on word-boundary scan.
    // We accept this false positive — the refusal copy reads as a friendly
    // double-check, not a robotic error.
    const result = detectAllergenViolation(
      'This is a peanut-free version of the dish.',
      ['peanut'],
    );
    expect(result.containsAllergen).toBe(true);
  });
});

// ─── detectAllergenViolation — negatives ────────────────────────────────

describe('detectAllergenViolation — clean replies', () => {
  it('reply with no allergen tokens does not flag', () => {
    const result = detectAllergenViolation(
      'Try a fresh tomato salad with basil and olive oil.',
      ['peanut', 'tree_nut', 'dairy'],
    );
    expect(result.containsAllergen).toBe(false);
    expect(result.violatingTokens).toEqual([]);
  });

  it('empty allergen profile never flags', () => {
    const result = detectAllergenViolation(
      'Peanut sauce shrimp parmesan — every allergen in one sentence.',
      [],
    );
    expect(result.containsAllergen).toBe(false);
  });

  it('empty reply text never flags', () => {
    const result = detectAllergenViolation('', ['peanut']);
    expect(result.containsAllergen).toBe(false);
  });

  it('substring without word boundary does NOT match (no partial-word matches)', () => {
    // "peanut" matches "peanut" but should NOT match if the chars are
    // mid-word. "peanutbutter" without space — `\b` enforces edges.
    // (We'd still flag "peanutbutter" because `\bpeanut` matches at the
    // start. But "ipeanut" would not flag because no boundary before "p".)
    const result = detectAllergenViolation('ipeanut', ['peanut']);
    expect(result.containsAllergen).toBe(false);
  });

  it('different allergen than the profile does not flag', () => {
    const result = detectAllergenViolation(
      'Shrimp scampi tonight.',
      ['peanut'], // user is peanut-allergic, not shellfish
    );
    expect(result.containsAllergen).toBe(false);
  });

  it('benign cooking words near an allergen-shaped substring stay clean', () => {
    // "milk" is the dairy allergen variant, but "milkweed" (plant) would
    // not get matched because of the word boundary at the end.
    const result = detectAllergenViolation('Add a sprig of milkweed.', ['dairy']);
    expect(result.containsAllergen).toBe(false);
  });
});

// ─── buildAllergenRefusal ───────────────────────────────────────────────

describe('buildAllergenRefusal — Sazon voice', () => {
  it('lists up to 3 violating tokens in the refusal', () => {
    const copy = buildAllergenRefusal(['peanut']);
    expect(copy).toMatch(/peanut/i);
    expect(copy).toMatch(/non-negotiable/i);
    expect(copy.toLowerCase()).not.toContain('error');
    expect(copy.toLowerCase()).not.toContain('cannot comply');
  });

  it('handles multi-token violations', () => {
    const copy = buildAllergenRefusal(['peanut', 'shrimp', 'parmesan']);
    expect(copy).toMatch(/peanut/);
    expect(copy).toMatch(/shrimp/);
    expect(copy).toMatch(/parmesan/);
  });

  it('truncates to 3 tokens for readability', () => {
    const copy = buildAllergenRefusal(['peanut', 'shrimp', 'parmesan', 'almond', 'wheat']);
    // Only the first 3 appear in the named list.
    expect(copy).toMatch(/peanut/);
    expect(copy).toMatch(/shrimp/);
    expect(copy).toMatch(/parmesan/);
    expect(copy).not.toMatch(/wheat/);
  });

  it('empty violations → generic Sazon-voice line', () => {
    const copy = buildAllergenRefusal([]);
    expect(copy).toMatch(/let me find something/i);
    expect(copy.toLowerCase()).not.toContain('error');
  });

  it('refusal copy is never robotic / clinical', () => {
    const copy = buildAllergenRefusal(['peanut']);
    // Banned phrases (would violate Sazon voice).
    expect(copy.toLowerCase()).not.toMatch(/i cannot|i can not|unable to comply|refused|forbidden|prohibited/);
    expect(copy.toLowerCase()).not.toMatch(/error|warning|alert|caution/);
  });
});

// ─── End-to-end: override probe + refusal ───────────────────────────────

describe('Y-PI-4 corpus — common override + reply combinations', () => {
  const userAllergens = ['peanut'];

  it.each<[string, string]>([
    [
      'A quick Thai peanut sauce with lime and garlic.',
      'peanut',
    ],
    [
      'Crushed peanuts on top for crunch.',
      'peanuts',
    ],
    [
      'Goober dressing variation: serve warm.',
      'goober',
    ],
  ])('reply mentioning %s violates peanut profile', (reply, expectedToken) => {
    const result = detectAllergenViolation(reply, userAllergens);
    expect(result.containsAllergen).toBe(true);
    expect(result.violatingTokens).toContain(expectedToken);
  });

  it.each<string>([
    'Try a roasted carrot soup with cumin and orange zest.',
    'Smashed cucumber salad with rice vinegar and chili crisp.',
    'Sheet-pan harissa chicken with green olives.',
  ])('clean reply "%s" does not violate peanut profile', (reply) => {
    const result = detectAllergenViolation(reply, userAllergens);
    expect(result.containsAllergen).toBe(false);
  });

  it('end-to-end: detection → refusal copy lists the violating token', () => {
    const reply = 'Tonight: peanut chicken stir-fry over jasmine rice.';
    const detection = detectAllergenViolation(reply, ['peanut']);
    expect(detection.containsAllergen).toBe(true);
    const refusal = buildAllergenRefusal(detection.violatingTokens);
    expect(refusal).toMatch(/peanut/);
    expect(refusal).toMatch(/non-negotiable/);
  });
});
