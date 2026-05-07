// ROADMAP 4.0 N11.3 — assertLifestyleVoice helper + cap test on the corpus.
//
// Validates that the corpus + helper enforce the C11 voice rules: trainer /
// verdict / shame / brand tokens trip the helper; clean lifestyle prose passes.
// Future tests must import from the corpus instead of inlining banned-token
// arrays — that convention is enforced by every voice regression test below.

import {
  assertLifestyleVoice,
  findVoiceViolation,
  TRAINER_TOKENS,
  VERDICT_PATTERNS,
  SHAME_PATTERNS,
  DEPRECATED_BRAND_TOKENS,
  ALL_BANNED_TOKENS,
} from '../__fixtures__/bannedVocabularyCorpus';

describe('N11.3 — banned-vocab corpus shape', () => {
  it('exports each banned-token category as a non-empty list', () => {
    expect(TRAINER_TOKENS.length).toBeGreaterThan(0);
    expect(VERDICT_PATTERNS.length).toBeGreaterThan(0);
    expect(SHAME_PATTERNS.length).toBeGreaterThan(0);
    expect(DEPRECATED_BRAND_TOKENS.length).toBeGreaterThan(0);
  });

  it('ALL_BANNED_TOKENS unions trainer + brand', () => {
    expect(ALL_BANNED_TOKENS).toEqual([
      ...TRAINER_TOKENS,
      ...DEPRECATED_BRAND_TOKENS,
    ]);
  });
});

describe('N11.3 — assertLifestyleVoice rejects banned vocabulary', () => {
  it('trips on trainer tokens', () => {
    expect(() =>
      assertLifestyleVoice('A macro-friendly dinner option'),
    ).toThrow(/trainer/i);
    expect(() => assertLifestyleVoice('Skinny pasta night')).toThrow(/trainer/i);
    expect(() => assertLifestyleVoice('Try this healthier swap')).toThrow(
      /trainer/i,
    );
  });

  it('trips on verdict / punitive vocabulary', () => {
    expect(() => assertLifestyleVoice("You should add more fiber")).toThrow(
      /verdict/i,
    );
    expect(() => assertLifestyleVoice("You're under your goal today")).toThrow(
      /verdict/i,
    );
    expect(() => assertLifestyleVoice('Iron is deficient this week')).toThrow(
      /verdict/i,
    );
    expect(() => assertLifestyleVoice('Low in magnesium')).toThrow(/verdict/i);
  });

  it('trips on goal-phase narrative ("your cut phase") but allows recipe verbs ("cut the onion")', () => {
    expect(() =>
      assertLifestyleVoice('Stay on track during your cut phase'),
    ).toThrow(/verdict/i);
    expect(() =>
      assertLifestyleVoice('Your bulk goal is in reach this week'),
    ).toThrow(/verdict/i);
    // Verb form must NOT trip
    expect(() =>
      assertLifestyleVoice('Cut the onion into thin slices'),
    ).not.toThrow();
    expect(() =>
      assertLifestyleVoice('Bulk up the salad with chickpeas'),
    ).not.toThrow();
  });

  it('trips on shame-coded leftover/pantry vocabulary', () => {
    expect(() => assertLifestyleVoice('Use it before it goes bad')).toThrow(
      /shame/i,
    );
    expect(() =>
      assertLifestyleVoice('Your cilantro is expiring soon!'),
    ).toThrow(/shame/i);
    expect(() => assertLifestyleVoice("Don't let it go bad — cook tonight")).toThrow(
      /shame/i,
    );
    expect(() => assertLifestyleVoice('Stop throwing out fresh produce')).toThrow(
      /shame/i,
    );
    expect(() => assertLifestyleVoice('Your spinach is spoiled')).toThrow(
      /shame/i,
    );
  });

  it('trips on deprecated brand vocabulary in user-facing surface contexts', () => {
    expect(() =>
      assertLifestyleVoice('Open the Coach tab to chat'),
    ).toThrow(/brand/i);
    expect(() =>
      assertLifestyleVoice('Browse the Cookbook screen for ideas'),
    ).toThrow(/brand/i);
    expect(() =>
      assertLifestyleVoice('Try our Fast Food Makeovers tonight'),
    ).toThrow(/brand/i);
  });

  it('passes on clean lifestyle prose', () => {
    expect(() =>
      assertLifestyleVoice("Your milk's been quiet — restock?"),
    ).not.toThrow();
    expect(() =>
      assertLifestyleVoice("First Persian dish in 3 weeks. Fancy fesenjan?"),
    ).not.toThrow();
    expect(() =>
      assertLifestyleVoice('Today your plate hit 18 ingredients.'),
    ).not.toThrow();
    expect(() =>
      assertLifestyleVoice("Your cilantro wants to be in something tonight."),
    ).not.toThrow();
  });

  it('honors the `allow` opt-out for surface-specific exceptions', () => {
    // Editorial / blog content might intentionally mention "healthier" — opt out.
    expect(() =>
      assertLifestyleVoice('A healthier swap, but in editorial voice', {
        allow: ['trainer'],
      }),
    ).not.toThrow();
  });
});

describe('N11.3 — findVoiceViolation returns structured violations', () => {
  it('returns null on clean prose', () => {
    expect(findVoiceViolation("Your magnesium hit 92% today.")).toBeNull();
  });

  it('returns the category, match, and rule on hit', () => {
    const v = findVoiceViolation('You should try this');
    expect(v).not.toBeNull();
    expect(v!.category).toBe('verdict');
    expect(v!.match.toLowerCase()).toContain('you should');
    expect(v!.rule).toContain('verdict:');
  });

  it('reports the FIRST violation when multiple are present', () => {
    // Trainer is checked before verdict, so the trainer token should win
    const v = findVoiceViolation("This healthier swap means you should try");
    expect(v).not.toBeNull();
    expect(v!.category).toBe('trainer');
  });
});
