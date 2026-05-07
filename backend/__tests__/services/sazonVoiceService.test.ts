// ROADMAP 4.0 N3.1 + N3.2 — sazonVoiceService test.

import {
  compose,
  assertVoice,
  expiringPrompt,
  discoveryInsight,
} from '../../src/services/sazonVoiceService';

describe('N3.1 — compose() normalizes prose against the voice contract', () => {
  it('returns the prose untouched when clean and within the cap', () => {
    const r = compose("First time you'd cook with sumac.", {
      surface: 'inline',
    });
    expect(r.line).toBe("First time you'd cook with sumac.");
    expect(r.truncated).toBe(false);
    expect(r.scrubbed).toBe(false);
  });

  it('caps to per-surface length with ellipsis', () => {
    const long =
      'A very long rationale that exceeds the chip surface budget by a lot of characters';
    const r = compose(long, { surface: 'chip' });
    expect(r.line.endsWith('…')).toBe(true);
    expect(r.line.length).toBeLessThanOrEqual(24);
    expect(r.truncated).toBe(true);
  });

  it('strips banned tokens (verdict + shame)', () => {
    const r = compose("You're under your goal — high in sumac.", {
      surface: 'inline',
    });
    // banned tokens removed; lifestyle anchor (sumac) preserved
    expect(r.line).not.toMatch(/you'?re under/i);
    expect(r.line).toContain('sumac');
  });

  it('strips shame-coded leftover vocabulary', () => {
    const r = compose("Use it before it's spoiled — cilantro.", {
      surface: 'inline',
    });
    expect(r.line).not.toMatch(/spoil/i);
    expect(r.line).toContain('cilantro');
  });
});

describe('N3.1 — assertVoice throws on violations', () => {
  it('passes clean lifestyle prose', () => {
    expect(() =>
      assertVoice("Your cilantro wants to be in something tonight."),
    ).not.toThrow();
  });
  it('throws on verdict tone', () => {
    expect(() => assertVoice('You should add fiber today')).toThrow(/verdict/i);
  });
  it('throws on shame-coded leftover prose', () => {
    expect(() => assertVoice('Your spinach is expiring soon')).toThrow(
      /shame/i,
    );
  });
});

describe('N3.2 — expiringPrompt produces lifestyle prose by source', () => {
  it('leftover variant: "wants to be in something tonight"', () => {
    expect(expiringPrompt({ ingredientName: 'cilantro', source: 'leftover' }))
      .toBe('Your cilantro wants to be in something tonight.');
  });

  it('meal-prep variant: friendly reheat invite', () => {
    const out = expiringPrompt({
      ingredientName: 'chicken curry',
      source: 'meal-prep',
    });
    expect(out).toContain('chicken curry');
    expect(out.toLowerCase()).toMatch(/reheat/);
  });

  it('pantry variant: gentle put-it-to-work invite', () => {
    const out = expiringPrompt({
      ingredientName: 'rice',
      source: 'pantry',
    });
    expect(out).toContain('rice');
    expect(out.toLowerCase()).toMatch(/quiet|work/);
  });

  it('all variants pass the lifestyle voice contract', () => {
    const cases: Array<{ source: 'leftover' | 'meal-prep' | 'pantry'; name: string }> = [
      { source: 'leftover', name: 'cilantro' },
      { source: 'meal-prep', name: 'chicken curry' },
      { source: 'pantry', name: 'rice' },
    ];
    for (const c of cases) {
      const out = expiringPrompt({ ingredientName: c.name, source: c.source });
      expect(() => assertVoice(out)).not.toThrow();
    }
  });
});

describe('N3.2 — discoveryInsight signal-to-prose mapping', () => {
  it('first_with_ingredient: requires ingredient', () => {
    expect(discoveryInsight({ rule: 'first_with_ingredient' })).toBeNull();
    expect(
      discoveryInsight({ rule: 'first_with_ingredient', ingredient: 'sumac' }),
    ).toBe("First time you'd cook with sumac.");
  });

  it('micro_standout: requires micronutrient + cuisine', () => {
    expect(
      discoveryInsight({ rule: 'micro_standout', cuisine: 'Italian' }),
    ).toBeNull();
    expect(
      discoveryInsight({
        rule: 'micro_standout',
        micronutrient: 'iron',
        cuisine: 'Italian',
      }),
    ).toBe('High in iron compared to your usual Italian.');
  });

  it('cuisine_cadence: requires cuisine + cadenceText', () => {
    expect(
      discoveryInsight({ rule: 'cuisine_cadence', cuisine: 'Persian' }),
    ).toBeNull();
    expect(
      discoveryInsight({
        rule: 'cuisine_cadence',
        cuisine: 'Persian',
        cadenceText: '3 weeks',
      }),
    ).toBe('First Persian dish in 3 weeks.');
  });

  it('output passes the lifestyle voice contract', () => {
    const all = [
      discoveryInsight({ rule: 'first_with_ingredient', ingredient: 'sumac' }),
      discoveryInsight({
        rule: 'micro_standout',
        micronutrient: 'iron',
        cuisine: 'Italian',
      }),
      discoveryInsight({
        rule: 'cuisine_cadence',
        cuisine: 'Persian',
        cadenceText: '3 weeks',
      }),
    ];
    for (const line of all) {
      expect(line).not.toBeNull();
      expect(() => assertVoice(line!)).not.toThrow();
    }
  });
});
