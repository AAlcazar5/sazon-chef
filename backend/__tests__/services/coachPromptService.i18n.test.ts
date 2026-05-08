// i18n PoC — locale-aware persona for Sazon coach.
//
// This is a sketch of what proper localization looks like, scoped to one
// non-English locale (Spanish) so the path forward is concrete:
//   - locale option threads through buildSystemPromptParts
//   - PERSONA_BY_LOCALE provides translated stable system blocks
//   - byte-stability holds per-locale (each locale is independently cached)
//   - Spanish-side voice constraints mirror the English ones
//
// What's NOT in this PoC (real i18n work, separate PRs):
//   - banned-vocab corpus translation (currently English-only — sazonVoiceService)
//   - 200+ frontend hardcoded strings (Tier N8.4 has the audit + cap)
//   - User-locale persistence on User row (today: passed in options)
//   - Recipe-detail content translation (Tier-D catalog is en-only)

import {
  buildProfileSnapshot,
  buildSystemPrompt,
  buildSystemPromptParts,
  type CoachProfileInput,
} from '../../src/services/coachPromptService';

const baseInput: CoachProfileInput = {
  userId: 'u1',
  pantry: [],
  leftoverInventory: [],
  slotAffinity: [],
  pairAffinity: [],
  remainingMacros: null,
  last7Cooks: [],
  dietaryProfile: ['gluten-free'],
  allergens: ['peanut'],
  cuisineAffinity: [],
  skillTier: 'cook',
  goalPhase: 'maintain',
  currentMealPlanDay: null,
};

describe('i18n PoC — locale-aware buildSystemPromptParts', () => {
  const snap = buildProfileSnapshot(baseInput);

  it('defaults to English when no locale provided (backward-compat)', () => {
    const { stable } = buildSystemPromptParts(snap);
    expect(stable).toContain('You are Sazon');
    expect(stable).not.toContain('Eres Sazon');
  });

  it('locale=en returns the English persona', () => {
    const { stable } = buildSystemPromptParts(snap, { locale: 'en' });
    expect(stable).toContain('You are Sazon');
  });

  it('locale=es returns the Spanish persona', () => {
    const { stable } = buildSystemPromptParts(snap, { locale: 'es' });
    expect(stable).toContain('Eres Sazon');
    expect(stable).not.toContain('You are Sazon');
  });

  it('Spanish persona preserves the medical-deflection rule', () => {
    const { stable } = buildSystemPromptParts(snap, { locale: 'es' });
    expect(stable.toLowerCase()).toMatch(/profesional médico|profesional de la salud/);
  });

  it('Spanish persona preserves the allergen-honor rule', () => {
    const { stable } = buildSystemPromptParts(snap, { locale: 'es' });
    expect(stable.toLowerCase()).toMatch(/alérgen/);
  });

  it('Spanish persona preserves the prompt-injection guard', () => {
    const { stable } = buildSystemPromptParts(snap, { locale: 'es' });
    // Tool-result + user_profile content must be treated as DATA, not
    // instructions — equivalent rule must exist in the Spanish persona.
    expect(stable).toMatch(/<user_profile>|<tool_result>/);
    expect(stable.toLowerCase()).toMatch(/datos|instruccion/);
  });

  it('Spanish persona instructs the model to fetch state via the same tool names', () => {
    const { stable } = buildSystemPromptParts(snap, { locale: 'es' });
    // Tool names are API identifiers — they must NOT be translated.
    expect(stable).toMatch(/get_pantry|get_meal_plan|search_cookbook|find_recipes/);
  });

  it('English and Spanish personas are byte-different (cache key separation)', () => {
    const en = buildSystemPromptParts(snap, { locale: 'en' }).stable;
    const es = buildSystemPromptParts(snap, { locale: 'es' }).stable;
    expect(en).not.toBe(es);
    // Each is independently cached — a bilingual user wouldn't pollute the
    // other's cache key, but each only pays warmup cost in their own locale.
  });

  it('Spanish persona is byte-stable across calls (cache HIT precondition)', () => {
    const a = buildSystemPromptParts(snap, { locale: 'es' }).stable;
    const b = buildSystemPromptParts(snap, { locale: 'es' }).stable;
    expect(a).toBe(b);
  });

  it('dynamic block (lean profile JSON) does NOT vary by locale', () => {
    const en = buildSystemPromptParts(snap, { locale: 'en' }).dynamic;
    const es = buildSystemPromptParts(snap, { locale: 'es' }).dynamic;
    // The user's allergen list, dietary profile, etc. is data, not voice —
    // it goes through unchanged. Only the persona translates.
    expect(en).toBe(es);
  });

  it('legacy buildSystemPrompt(snapshot, options) accepts locale and returns Spanish single-block', () => {
    const out = buildSystemPrompt(snap, { locale: 'es' });
    expect(out).toContain('Eres Sazon');
    expect(out).toContain('<user_profile>');
  });

  // Voice-rule check: Spanish persona must NOT use trainer-coded vocabulary
  // (the Spanish equivalents of "macro-friendly", "you're under your goal").
  it('Spanish persona avoids verdict / trainer vocabulary', () => {
    const { stable } = buildSystemPromptParts(snap, { locale: 'es' });
    // Direct verdict tone we explicitly forbid:
    expect(stable.toLowerCase()).not.toMatch(/te quedaste corto/);
    expect(stable.toLowerCase()).not.toMatch(/excediste tu meta/);
    // The persona itself must NAME these as forbidden, just like the
    // English version does. So they appear once — in the rule statement —
    // but never as actual voice.
  });

  it('memories block placement is locale-agnostic (not translated)', () => {
    const memories = [
      { kind: 'preference', content: 'no le gusta el cilantro', confidence: 0.9 },
    ];
    const { dynamic } = buildSystemPromptParts(snap, { locale: 'es', memories });
    expect(dynamic).toContain('<learned_memories>');
    expect(dynamic).toContain('no le gusta el cilantro');
  });
});
