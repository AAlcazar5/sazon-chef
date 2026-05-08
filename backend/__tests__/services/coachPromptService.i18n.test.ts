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

// ─── Regional Spanish (BCP 47) ─────────────────────────────────────────────
//
// Each region appends a small "Notas regionales" block to the base Spanish
// persona. Vocabulary is locale-correct so "tortilla" means the right food
// to a Mexican vs Argentine user, "frijoles" vs "porotos" vs "judías" etc.

describe('i18n PoC — regional Spanish (es-MX, es-AR, es-CO, es-ES, es-419)', () => {
  const snap = buildProfileSnapshot(baseInput);

  it('es-MX appends Mexican vocab notes to the base Spanish persona', () => {
    const { stable } = buildSystemPromptParts(snap, { locale: 'es-MX' });
    expect(stable).toContain('Eres Sazon'); // base es persona
    expect(stable).toMatch(/Notas regionales/i);
    expect(stable.toLowerCase()).toMatch(/méxico|mexicana?s?/);
    // Mexican vocab: tortilla = pan plano, frijoles, elote, chile (not ají)
    expect(stable.toLowerCase()).toMatch(/tortilla.*pan|pan.*tortilla|maíz/);
    expect(stable.toLowerCase()).toMatch(/elote/);
  });

  it('es-AR appends Argentine vocab notes — "porotos" not "frijoles"', () => {
    const { stable } = buildSystemPromptParts(snap, { locale: 'es-AR' });
    expect(stable).toContain('Eres Sazon');
    expect(stable.toLowerCase()).toMatch(/argentina|porotos|chimichurri|asado/);
    // Argentine "tortilla" = potato omelette, must be flagged
    expect(stable.toLowerCase()).toMatch(/tortilla.*papas?|tortilla de papas?/);
  });

  it('es-ES appends Spanish (Spain) vocab notes — "patata" not "papa"', () => {
    const { stable } = buildSystemPromptParts(snap, { locale: 'es-ES' });
    expect(stable).toContain('Eres Sazon');
    expect(stable.toLowerCase()).toMatch(/españa|paella|sofrito/);
    expect(stable.toLowerCase()).toMatch(/patata|judías|pimiento/);
    // Spanish "tortilla" = potato omelette (tortilla española)
    expect(stable.toLowerCase()).toMatch(/tortilla\s+española|tortilla.*huevo/);
  });

  it('es-CO appends Colombian vocab notes — arepa, ajiaco, mild ají', () => {
    const { stable } = buildSystemPromptParts(snap, { locale: 'es-CO' });
    expect(stable).toContain('Eres Sazon');
    expect(stable.toLowerCase()).toMatch(/colombia|arepa|ajiaco|mazorca/);
  });

  it('es-419 (LatAm catch-all) appends a neutral LatAm note (no region-specific cuisine bias)', () => {
    const { stable } = buildSystemPromptParts(snap, { locale: 'es-419' });
    expect(stable).toContain('Eres Sazon');
    expect(stable.toLowerCase()).toMatch(/latinoamérica|latinoamericana|latam/);
    // Should NOT name any specific country — it's a catch-all
    expect(stable.toLowerCase()).not.toMatch(/^.*méxico.*$/);
  });

  it('unknown Spanish region (e.g. es-VE) falls back to base es with NO regional notes', () => {
    const { stable } = buildSystemPromptParts(snap, { locale: 'es-VE' as never });
    expect(stable).toContain('Eres Sazon');
    expect(stable).not.toMatch(/Notas regionales/i);
  });

  it('unknown locale entirely (e.g. jp-JP) falls back to English persona', () => {
    const { stable } = buildSystemPromptParts(snap, { locale: 'jp-JP' as never });
    expect(stable).toContain('You are Sazon');
    expect(stable).not.toContain('Eres Sazon');
  });

  it('each regional persona is byte-stable across calls (cache-hit precondition)', () => {
    for (const loc of ['es-MX', 'es-AR', 'es-CO', 'es-ES', 'es-419'] as const) {
      const a = buildSystemPromptParts(snap, { locale: loc }).stable;
      const b = buildSystemPromptParts(snap, { locale: loc }).stable;
      expect(a).toBe(b);
    }
  });

  it('each regional persona is byte-different from every other region (cache key separation)', () => {
    const personas = ['es', 'es-MX', 'es-AR', 'es-CO', 'es-ES', 'es-419'].map(
      (l) => buildSystemPromptParts(snap, { locale: l as never }).stable,
    );
    const unique = new Set(personas);
    expect(unique.size).toBe(personas.length);
  });
});
