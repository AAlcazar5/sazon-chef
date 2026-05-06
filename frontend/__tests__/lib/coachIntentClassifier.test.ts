// frontend/__tests__/lib/coachIntentClassifier.test.ts
// ROADMAP 4.0 S1.2 — keyword-only intent classifier (mirror of backend).

import { classifyCoachIntent } from '../../lib/coachIntentClassifier';

describe('classifyCoachIntent (frontend mirror of backend)', () => {
  it.each([
    ['plan my week', 'deep_plan'],
    ['Plan my week, please', 'deep_plan'],
    ['rebuild my pantry', 'deep_plan'],
    ['audit my macros', 'deep_plan'],
    ['weekly menu plan', 'deep_plan'],
    ['build me a meal plan', 'deep_plan'],
    ['build me a grocery list', 'deep_plan'],
    ['plan my meals for tomorrow', 'deep_plan'],
  ])('classifies "%s" as deep_plan', (input, expected) => {
    expect(classifyCoachIntent(input)).toBe(expected);
  });

  it.each([
    ['what should I eat tonight'],
    ['got dessert ideas'],
    ['swap chicken for tofu'],
    ['I have leftover spinach'],
    [''],
    ['hey'],
  ])('classifies "%s" as chat (default)', (input) => {
    expect(classifyCoachIntent(input)).toBe('chat');
  });
});
