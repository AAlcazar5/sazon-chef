// backend/__tests__/services/voiceScorer.test.ts
// ROADMAP 4.0 Tier D2.4 — Title + voice scorer.

import {
  scoreVoiceHeuristics,
  scoreVoice,
  CLICKBAIT_PATTERNS,
  BANNED_VOCABULARY,
} from '../../src/services/voiceScorer';

const cleanInput = {
  title: 'Persian Tahdig with Saffron and Yogurt',
  description:
    'Crispy golden saffron rice with a delicate crust, the kind of dish that makes a Tuesday feel like a celebration. Serve with stewed greens or a simple salad.',
  toneScore: 5,
};

describe('scoreVoiceHeuristics (pure)', () => {
  it('returns 5 for a clean lifestyle-voice title + body + tone=5', () => {
    const r = scoreVoiceHeuristics(cleanInput);
    expect(r.score).toBe(5);
    expect(r.reasons).toEqual([]);
  });

  it('penalizes title over 60 chars', () => {
    const r = scoreVoiceHeuristics({
      ...cleanInput,
      title:
        'The Most Amazing Persian Tahdig You Will Ever Make in Your Lifetime Period',
    });
    expect(r.reasons.some((x) => x.code === 'title_too_long')).toBe(true);
  });

  it('penalizes all-caps title', () => {
    const r = scoreVoiceHeuristics({
      ...cleanInput,
      title: 'PERSIAN TAHDIG WITH SAFFRON',
    });
    expect(r.reasons.some((x) => x.code === 'title_all_caps')).toBe(true);
  });

  it('flags clickbait patterns', () => {
    expect(CLICKBAIT_PATTERNS.length).toBeGreaterThan(0);
    const cases = [
      'BEST EVER Chicken Recipe',
      'Easy 5-Ingredient Pasta',
      "You Won't Believe This Salad",
      'Best ever pasta recipe',
    ];
    for (const title of cases) {
      const r = scoreVoiceHeuristics({ ...cleanInput, title });
      expect(r.reasons.some((x) => x.code === 'clickbait_title')).toBe(true);
    }
  });

  it('flags banned vocabulary in body copy', () => {
    expect(BANNED_VOCABULARY.length).toBeGreaterThan(0);
    const r = scoreVoiceHeuristics({
      ...cleanInput,
      description: 'A great dish to help you cut and crush your macros.',
    });
    expect(r.reasons.some((x) => x.code === 'banned_vocabulary')).toBe(true);
  });

  it('combines tone score with heuristic penalties — tone=2 caps total at ≤2', () => {
    const r = scoreVoiceHeuristics({ ...cleanInput, toneScore: 2 });
    expect(r.score).toBeLessThanOrEqual(2);
  });

  it('rejects tone score outside 1-5', () => {
    expect(() =>
      scoreVoiceHeuristics({ ...cleanInput, toneScore: 6 }),
    ).toThrow();
    expect(() =>
      scoreVoiceHeuristics({ ...cleanInput, toneScore: 0 }),
    ).toThrow();
  });

  it('handles missing tone score by falling through to heuristics-only', () => {
    const r = scoreVoiceHeuristics({ ...cleanInput, toneScore: null });
    // Heuristics clean → 3 (default vision-equivalent fallback)
    expect(r.score).toBeGreaterThanOrEqual(3);
  });
});

describe('scoreVoice (async, with mocked classifier)', () => {
  it('uses mocked tone classifier to score', async () => {
    const r = await scoreVoice(cleanInput, {
      classifyTone: async () => 5,
    });
    expect(r.score).toBe(5);
  });

  it('falls back to heuristics-only when classifier throws', async () => {
    const r = await scoreVoice(cleanInput, {
      classifyTone: async () => {
        throw new Error('boom');
      },
    });
    expect(typeof r.score).toBe('number');
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});
