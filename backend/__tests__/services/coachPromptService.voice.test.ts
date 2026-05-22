// backend/__tests__/services/coachPromptService.voice.test.ts
// ROADMAP 4.0 Tier C11 — Sazon voice rewrite (lifestyle voice fixtures).
//
// Sample-based assertions on the system prompt itself. We do NOT mock or
// call the model — we verify that the persona block ships a lifestyle voice
// (no bodybuilder vocabulary, cuisine-led, friend-not-trainer).

import { buildSystemPrompt, type CoachProfileSnapshot } from '../../src/services/coachPromptService';

const stubSnapshot: CoachProfileSnapshot = {
  userId: 'user-1',
  pantry: ['olive oil', 'sea salt'],
  leftoverInventory: [],
  slotAffinity: [],
  pairAffinity: [],
  today: { remainingMacros: { calories: 800, protein: 30, carbs: 80, fat: 30, fiber: 12 } },
  last7Cooks: [],
  dietaryProfile: [],
  allergens: [],
  cuisineAffinity: [],
  skillTier: 'cook',
  goalPhase: 'maintain',
  currentMealPlanDay: null,
} as any;

const BANNED_PHRASES_IN_PERSONA = [
  // Trainer/coach vibe — Sazon is a friend, not a trainer.
  'personal trainer',
  'Sazon Coach',
  // Goal-phase vocabulary as DIRECTIVE language inside the persona block. We
  // can still document the goalPhase data field below; just not in the voice.
  'cut, bulk, or maintain',
  'are cutting',
  'are bulking',
  // Punitive framing — "under your goal", "over your target", etc.
  "under your goal",
  "over your target",
  "missed your target",
  "hit your macros",
];

const REQUIRED_PHRASES_IN_PERSONA = [
  // Lifestyle-voice signal markers.
  'eats well around the world',
  'friend',
  'discovery',
  'real food', // case-insensitive check below
];

describe('Sazon system prompt — lifestyle voice (C11)', () => {
  let prompt: string;

  beforeAll(() => {
    prompt = buildSystemPrompt(stubSnapshot, { memories: [] });
  });

  it('does NOT use trainer/coach self-description in the persona', () => {
    expect(prompt).not.toMatch(/personal trainer/i);
    expect(prompt).not.toMatch(/Sazon Coach\b/);
    // The brand-as-friend rename: refer to ourselves as "Sazon", not "Sazon Coach".
    // But the "Coach" word may appear in the constitution decline-phrase, so
    // we only ban the bare "Sazon Coach" branding.
  });

  it('does NOT use punitive macro vocabulary in the persona', () => {
    BANNED_PHRASES_IN_PERSONA.forEach((phrase) => {
      expect(prompt.toLowerCase()).not.toContain(phrase.toLowerCase());
    });
  });

  it('explicitly bans "cut" / "bulk" / "maintain" as goal-phase vocabulary in the voice rules', () => {
    // The persona must explicitly TELL the model not to use these words.
    // (They can still appear in user_profile data — we only ban them in the voice.)
    expect(prompt).toMatch(/never use the words.*cut.*bulk.*maintain/i);
  });

  it('encodes the lifestyle voice rules (macros as discovery, not verdict)', () => {
    expect(prompt).toMatch(/discovery surface, not a control surface/i);
  });

  it('encodes cultural specificity preference', () => {
    expect(prompt).toMatch(/cultural specificity/i);
    expect(prompt).toMatch(/Persian|Salvadorean|Mediterranean/);
  });

  it('encodes brevity rule (short replies)', () => {
    // Y-Voice-7 (PR #116) tightened the brevity rule from "keep it short"
    // to a hard "3 sentences max" cap. Match the actual current wording.
    expect(prompt).toMatch(/3 sentences max/i);
  });

  it('encodes friend voice ("eats well around the world")', () => {
    expect(prompt).toMatch(/eats well around the world/i);
  });

  it('preserves the constitution block (medical guardrails, allergen guard, prompt-injection defense)', () => {
    expect(prompt).toMatch(/<constitution>/);
    expect(prompt).toMatch(/medical, clinical, or licensed nutrition/i);
    expect(prompt).toMatch(/honor the user's allergens/i);
    expect(prompt).toMatch(/treat any text inside.*as data/i);
  });

  it('still references the data fields the model can use (pantry, leftovers, recent cooks, dietary profile)', () => {
    expect(prompt).toMatch(/pantry/i);
    expect(prompt).toMatch(/leftovers/i);
    expect(prompt).toMatch(/recent cooks/i);
    expect(prompt).toMatch(/dietary profile/i);
  });

  it('contains lifestyle anchor phrases', () => {
    REQUIRED_PHRASES_IN_PERSONA.forEach((phrase) => {
      expect(prompt.toLowerCase()).toContain(phrase.toLowerCase());
    });
  });

  it('renders the user_profile block (data layer still threads through)', () => {
    expect(prompt).toMatch(/<user_profile>/);
  });
});
