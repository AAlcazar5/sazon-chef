// Group 10Y-A: pure unit tests for the Coach profile snapshot + system prompt
// builder. The byte-stability test is the cache-hit guarantee for prompt
// caching — if it ever fails, every Coach call would be a cache miss.

import {
  buildProfileSnapshot,
  buildSystemPrompt,
  buildSystemPromptParts,
  serializeSnapshot,
  serializeSnapshotLean,
  type CoachProfileInput,
  generateConversationTitle,
} from '../../src/services/coachPromptService';

const SLOT_AFFINITY = Array.from({ length: 50 }, (_, i) => ({
  componentId: `c${String(i).padStart(3, '0')}`,
  slot: i % 2 === 0 ? 'protein' : 'veg',
  score: 1 - i * 0.01,
}));

const PAIR_AFFINITY = Array.from({ length: 40 }, (_, i) => ({
  componentIdA: `a${String(i).padStart(3, '0')}`,
  componentIdB: `b${String(i).padStart(3, '0')}`,
  score: 1 - i * 0.01,
}));

const baseInput: CoachProfileInput = {
  userId: 'user_1',
  pantry: ['olive oil', 'chicken thigh', 'lime'],
  leftoverInventory: [
    {
      name: 'roast chicken',
      portions: 2,
      expiresAt: new Date('2026-05-06T00:00:00Z'),
    },
  ],
  slotAffinity: SLOT_AFFINITY,
  pairAffinity: PAIR_AFFINITY,
  remainingMacros: { calories: 320, protein: 22, carbs: 30, fat: 10, fiber: 8 },
  last7Cooks: [
    {
      recipeId: 'r1',
      title: 'Salmon Bowl',
      cookedAt: new Date('2026-05-02T00:00:00Z'),
      rating: 5,
    },
    {
      recipeId: 'r2',
      title: 'Pesto Pasta',
      cookedAt: new Date('2026-05-01T00:00:00Z'),
      rating: 3,
    },
  ],
  dietaryProfile: ['high-protein', 'no-pork'],
  allergens: ['peanuts'],
  cuisineAffinity: [
    { cuisine: 'Mediterranean', score: 0.9 },
    { cuisine: 'Mexican', score: 0.7 },
  ],
  skillTier: 'home_cook',
  goalPhase: 'cut',
  currentMealPlanDay: 3,
};

describe('buildProfileSnapshot', () => {
  it('includes every personalization field the roadmap pins', () => {
    const snap = buildProfileSnapshot(baseInput);
    expect(snap.pantry).toEqual(['chicken thigh', 'lime', 'olive oil']);
    expect(snap.leftoverInventory).toHaveLength(1);
    expect(snap.slotAffinity).toHaveLength(30);
    expect(snap.pairAffinity).toHaveLength(20);
    expect(snap.today.remainingMacros!.calories).toBe(320);
    expect(snap.last7Cooks).toHaveLength(2);
    expect(snap.dietaryProfile).toEqual(['high-protein', 'no-pork']);
    expect(snap.allergens).toEqual(['peanuts']);
    expect(snap.cuisineAffinity).toHaveLength(2);
    expect(snap.skillTier).toBe('home_cook');
    expect(snap.goalPhase).toBe('cut');
    expect(snap.currentMealPlanDay).toBe(3);
  });

  it('caps slotAffinity at 30 and sorts by score desc then componentId asc', () => {
    const snap = buildProfileSnapshot(baseInput);
    expect(snap.slotAffinity[0].score).toBeGreaterThan(
      snap.slotAffinity[29].score,
    );
    expect(snap.slotAffinity).toHaveLength(30);
  });

  it('caps pairAffinity at 20', () => {
    const snap = buildProfileSnapshot(baseInput);
    expect(snap.pairAffinity).toHaveLength(20);
  });

  it('handles a brand-new user (all empty inputs) without throwing', () => {
    const empty: CoachProfileInput = {
      userId: 'user_new',
      pantry: [],
      leftoverInventory: [],
      slotAffinity: [],
      pairAffinity: [],
      remainingMacros: null,
      last7Cooks: [],
      dietaryProfile: [],
      allergens: [],
      cuisineAffinity: [],
      skillTier: 'beginner',
      goalPhase: 'maintain',
      currentMealPlanDay: null,
    };
    const snap = buildProfileSnapshot(empty);
    expect(snap.pantry).toEqual([]);
    expect(snap.today.remainingMacros).toBeNull();
    expect(snap.currentMealPlanDay).toBeNull();
  });
});

describe('serializeSnapshot — byte stability', () => {
  it('produces identical bytes for identical inputs (cache hit guarantee)', () => {
    const a = serializeSnapshot(buildProfileSnapshot(baseInput));
    const b = serializeSnapshot(buildProfileSnapshot(baseInput));
    expect(a).toBe(b);
  });

  it('produces identical bytes when input array order is permuted', () => {
    const reversed: CoachProfileInput = {
      ...baseInput,
      pantry: [...baseInput.pantry].reverse(),
      slotAffinity: [...baseInput.slotAffinity].reverse(),
    };
    const a = serializeSnapshot(buildProfileSnapshot(baseInput));
    const b = serializeSnapshot(buildProfileSnapshot(reversed));
    expect(a).toBe(b);
  });

  it('changes bytes when a substantive field changes', () => {
    const altered: CoachProfileInput = { ...baseInput, goalPhase: 'bulk' };
    const a = serializeSnapshot(buildProfileSnapshot(baseInput));
    const b = serializeSnapshot(buildProfileSnapshot(altered));
    expect(a).not.toBe(b);
  });
});

describe('buildSystemPrompt', () => {
  it('embeds the user profile snapshot JSON inside a delimited section', () => {
    const snap = buildProfileSnapshot(baseInput);
    const prompt = buildSystemPrompt(snap);
    // ROADMAP 4.0 C11 — branded as "Sazon" (the friend), not "Sazon Coach" (the trainer).
    expect(prompt).toContain('You are Sazon');
    expect(prompt).not.toContain('Sazon Coach');
    expect(prompt).toContain('<user_profile>');
    expect(prompt).toContain('</user_profile>');
    expect(prompt).toContain('"goalPhase":"cut"');
  });

  it('forbids medical advice in the persona block', () => {
    const prompt = buildSystemPrompt(buildProfileSnapshot(baseInput));
    expect(prompt.toLowerCase()).toContain('not a medical');
  });
});

describe('generateConversationTitle', () => {
  it('injects the goal phase when the message references food', () => {
    const title = generateConversationTitle({
      firstMessage: 'Chicken thigh ideas?',
      goalPhase: 'cut',
      topCuisine: 'Mediterranean',
      deficientNutrient: 'fiber',
    });
    expect(title.length).toBeLessThanOrEqual(80);
    expect(title.toLowerCase()).toMatch(/cut/);
  });

  it('falls back gracefully when no signals are available', () => {
    const title = generateConversationTitle({
      firstMessage: 'Hello',
      goalPhase: 'maintain',
      topCuisine: null,
      deficientNutrient: null,
    });
    expect(title.length).toBeGreaterThan(0);
    expect(title.length).toBeLessThanOrEqual(80);
  });
});

// ─── S17b — lean dynamic system block ──────────────────────────────────────

describe('serializeSnapshotLean', () => {
  it('only includes safety-critical + voice-shaping fields', () => {
    const snap = buildProfileSnapshot(baseInput);
    const lean = JSON.parse(serializeSnapshotLean(snap)) as Record<string, unknown>;
    expect(Object.keys(lean).sort()).toEqual([
      'allergens',
      'dietaryProfile',
      'goalPhase',
      'skillTier',
    ]);
  });

  it('strips pantry, leftovers, last7Cooks, slot/pair/cuisine affinity, macros, meal plan day', () => {
    const snap = buildProfileSnapshot(baseInput);
    const json = serializeSnapshotLean(snap);
    expect(json).not.toMatch(/pantry/);
    expect(json).not.toMatch(/leftoverInventory/);
    expect(json).not.toMatch(/last7Cooks/);
    expect(json).not.toMatch(/slotAffinity/);
    expect(json).not.toMatch(/pairAffinity/);
    expect(json).not.toMatch(/cuisineAffinity/);
    expect(json).not.toMatch(/remainingMacros/);
    expect(json).not.toMatch(/currentMealPlanDay/);
  });

  it('preserves allergens + dietary so safety stays in-prompt', () => {
    const snap = buildProfileSnapshot({
      ...baseInput,
      allergens: ['peanut', 'tree nut'],
      dietaryProfile: ['gluten-free', 'vegetarian'],
    });
    const json = serializeSnapshotLean(snap);
    expect(json).toMatch(/peanut/);
    expect(json).toMatch(/gluten-free/);
  });

  it('produces materially smaller payload than the full snapshot', () => {
    const snap = buildProfileSnapshot(baseInput);
    const full = serializeSnapshot(snap);
    const lean = serializeSnapshotLean(snap);
    expect(lean.length).toBeLessThan(full.length / 2);
  });
});

describe('buildSystemPromptParts (S17 split + S17b lean dynamic)', () => {
  it('returns { stable: PERSONA, dynamic: lean profile JSON }', () => {
    const snap = buildProfileSnapshot(baseInput);
    const { stable, dynamic } = buildSystemPromptParts(snap);
    expect(stable).toContain('You are Sazon');
    expect(stable).toContain('not a medical');
    expect(dynamic).toContain('<user_profile>');
    expect(dynamic).toMatch(/"allergens":/);
    expect(dynamic).not.toMatch(/"pantry":/);
    expect(dynamic).not.toMatch(/"slotAffinity":/);
  });

  it('persona block instructs the model to fetch state via tools', () => {
    const { stable } = buildSystemPromptParts(buildProfileSnapshot(baseInput));
    // Tool-use directive — at least one of the read tools must be named.
    expect(stable).toMatch(/get_pantry|get_meal_plan|search_cookbook|find_recipes/);
    // Allergens are in-prompt (safety) — directive says so explicitly.
    expect(stable.toLowerCase()).toMatch(/allergens|dietary/);
  });

  it('memories appear in the dynamic block when provided, and only there', () => {
    const snap = buildProfileSnapshot(baseInput);
    const { stable, dynamic } = buildSystemPromptParts(snap, {
      memories: [{ kind: 'preference', content: 'dislikes cilantro', confidence: 0.9 }],
    });
    expect(dynamic).toContain('<learned_memories>');
    expect(dynamic).toContain('dislikes cilantro');
    expect(stable).not.toContain('dislikes cilantro');
  });
});
