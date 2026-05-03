// Group 10Y-A: pure unit tests for the Coach profile snapshot + system prompt
// builder. The byte-stability test is the cache-hit guarantee for prompt
// caching — if it ever fails, every Coach call would be a cache miss.

import {
  buildProfileSnapshot,
  buildSystemPrompt,
  serializeSnapshot,
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
    expect(prompt).toContain('Sazon Coach');
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
