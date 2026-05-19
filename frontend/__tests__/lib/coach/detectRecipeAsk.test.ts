// Tier Y live-wiring. Pure intent detector: does this chat input mean
// "show me a recipe card for X"? If yes, the chat bypasses the LLM and
// renders CookingModeRecipeCard directly. Conservative — false positives
// suppress legitimate chat questions, so favor missing some asks over
// hijacking conversation. RED-first.

import { detectRecipeAsk } from '../../../lib/coach/detectRecipeAsk';

describe('detectRecipeAsk — explicit recipe phrases', () => {
  it.each([
    ['give me a recipe for pizza margarita', 'pizza margarita'],
    ['Give me a recipe for Roasted Edamame & Chickpeas', 'Roasted Edamame & Chickpeas'],
    ['find me an asparagus recipe', 'asparagus'],
    ['show me a pasta recipe', 'pasta'],
    ['recipe for chicken tikka masala', 'chicken tikka masala'],
    ['how do I make carbonara', 'carbonara'],
    ['how to make pad thai', 'pad thai'],
    ['how can I cook salmon bites', 'salmon bites'],
    ['carbonara recipe', 'carbonara'],
    ['I want pizza', 'pizza'],
    ['I want to make ratatouille', 'ratatouille'],
    ["i'd like pho", 'pho'],
    ['make me a salad', 'salad'],
    ['cook me beef tacos', 'beef tacos'],
  ])('"%s" → query "%s"', (input, expectedQuery) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expectedQuery });
  });
});

describe('detectRecipeAsk — bare food name (2-5 words, no chat verbs)', () => {
  it.each([
    ['Pizza margarita', 'Pizza margarita'],
    ['Roasted Edamame & Chickpeas', 'Roasted Edamame & Chickpeas'],
    ['salmon bites', 'salmon bites'],
    ['pad thai', 'pad thai'],
  ])('"%s" → query "%s"', (input, expectedQuery) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expectedQuery });
  });

  it('single-word greetings DO NOT auto-route to recipe (too noisy)', () => {
    // Use explicit phrasing ("carbonara recipe") for 1-word foods.
    expect(detectRecipeAsk('hello')).toBeNull();
    expect(detectRecipeAsk('hey')).toBeNull();
    expect(detectRecipeAsk('thanks')).toBeNull();
    expect(detectRecipeAsk('carbonara')).toBeNull();
  });
});

describe('detectRecipeAsk — chat questions are NOT recipe asks', () => {
  it.each([
    'what should I eat tonight?',
    "I'm hungry",
    'tell me about Italian food',
    'why does dough rise',
    'can you suggest something?',
    'is it okay to skip the cheese?',
    'what does umami mean',
    'how come my pasta keeps sticking',
    'i think pizza is overrated',
    "i don't like onions",
    "Plan tonight's dinner",
    'suggest a meal',
    'help me decide',
    'recommend something',
  ])('"%s" → null', (input) => {
    expect(detectRecipeAsk(input)).toBeNull();
  });

  it.each([
    '',
    '   ',
    'a very long sentence that goes on with many many many many words about food choices generally',
  ])('edge "%s" → null', (input) => {
    expect(detectRecipeAsk(input)).toBeNull();
  });

  it('non-string → null', () => {
    expect(detectRecipeAsk(null as unknown as string)).toBeNull();
  });
});
