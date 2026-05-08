// ROADMAP 4.0 Tier S — keyword-only intent classifier tests.

import { classifyCoachIntent } from '../../src/services/coachIntentClassifier';

describe('classifyCoachIntent', () => {
  describe('returns deep_plan for clear planning asks', () => {
    const deepPlanMessages = [
      'plan my week',
      'Plan my meals for the week',
      'plan my month please',
      'rebuild my pantry from scratch',
      'overhaul my macros',
      'redo my fridge',
      'reset my diet',
      'audit my macros',
      'audit my nutrition this week',
      'audit my pantry',
      'build me a meal plan',
      'build a grocery list for me',
      'build a menu for next week',
      'build me a shopping list',
      'plan me a week of dinners',
      'weekly menu, please',
      'monthly plan for the family',
      'meal plan for next week',
      'meal-plan for tonight',
    ];

    for (const msg of deepPlanMessages) {
      it(`classifies "${msg}" as deep_plan`, () => {
        expect(classifyCoachIntent(msg)).toBe('deep_plan');
      });
    }
  });

  describe('returns chat for casual asks', () => {
    const chatMessages = [
      'what should I eat tonight',
      'got dessert ideas?',
      'swap chicken for tofu',
      'I have leftover rice — bridge it forward',
      'try a Persian dish I haven\'t yet',
      '320 cal under, what should I eat',
      'tell me about sumac',
      'is this safe for a peanut allergy',
      '',
    ];

    for (const msg of chatMessages) {
      it(`classifies "${msg}" as chat`, () => {
        expect(classifyCoachIntent(msg)).toBe('chat');
      });
    }
  });

  it('handles empty / whitespace input gracefully', () => {
    expect(classifyCoachIntent('')).toBe('chat');
    expect(classifyCoachIntent('   ')).toBe('chat');
    expect(classifyCoachIntent(undefined as unknown as string)).toBe('chat');
  });

  // ─── $$3.1 — lookup intent ─────────────────────────────────────────────
  describe('$$3.1 — classifies lookup queries', () => {
    const lookupCases: ReadonlyArray<string> = [
      "what's on my plan this week",
      'what is on my shopping list',
      "what's in my pantry",
      'what do I have in the fridge',
      'what did I cook last week',
      'do I have any rice left',
      'do I need eggs',
      'show me my pantry',
      'show my shopping list',
      'what am I allergic to',
      "what's my macro goals",
      'when did I last cook persian',
    ];
    for (const text of lookupCases) {
      it(`classifies "${text}" as lookup`, () => {
        expect(classifyCoachIntent(text)).toBe('lookup');
      });
    }
  });

  it('$$3.1: deep_plan wins over lookup when both could match', () => {
    expect(classifyCoachIntent('plan my week with what is on my pantry')).toBe(
      'deep_plan',
    );
  });

  it('$$3.1: ambiguous "what should I cook" stays as chat (needs reasoning)', () => {
    expect(classifyCoachIntent('what should I cook tonight')).toBe('chat');
    expect(classifyCoachIntent('what would be good for dinner')).toBe('chat');
  });

  it('$$3.1: "is this safe for a peanut allergy" stays chat (reasoning, not lookup)', () => {
    expect(classifyCoachIntent('is this safe for a peanut allergy')).toBe('chat');
  });
});
