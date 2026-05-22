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
    // Y-Live-9 (founder Telegram 2026-05-22, "Sushi" miss): single-word
    // food names auto-route too. Greetings + ack filler still bounce.
    ['Sushi', 'Sushi'],
    ['carbonara', 'carbonara'],
    ['ramen', 'ramen'],
    ['pizza', 'pizza'],
  ])('"%s" → query "%s"', (input, expectedQuery) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expectedQuery });
  });

  it('single-word greetings + ack filler DO NOT auto-route to recipe', () => {
    // Greetings caught by GREETING_EXCLUSIONS.
    expect(detectRecipeAsk('hello')).toBeNull();
    expect(detectRecipeAsk('hey')).toBeNull();
    expect(detectRecipeAsk('thanks')).toBeNull();
    // Ack filler caught by TRIVIAL_QUERIES.
    expect(detectRecipeAsk('yes')).toBeNull();
    expect(detectRecipeAsk('no')).toBeNull();
    expect(detectRecipeAsk('ok')).toBeNull();
    expect(detectRecipeAsk('sure')).toBeNull();
    expect(detectRecipeAsk('cool')).toBeNull();
    expect(detectRecipeAsk('done')).toBeNull();
    expect(detectRecipeAsk('what')).toBeNull();
    expect(detectRecipeAsk('hmm')).toBeNull();
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

  // Y-Live-8 founder bug 2026-05-19: multi-word greetings/openers
  // matched the bare-food 2–5-word heuristic and triggered the wedge
  // ("Hi coach" → recipe fetch). Single-word greetings were already null
  // (wordCount < 2 filter), but compound openers fell through.
  it.each([
    'Hi coach',
    'hello there',
    'good morning',
    'good afternoon',
    'good evening',
    'hey coach',
    'hey there',
    'sup coach',
    'howdy partner',
    'thanks coach',
    'thank you',
    'bye for now',
    'yo Sazon',
  ])('greeting/opener "%s" → null', (input) => {
    expect(detectRecipeAsk(input)).toBeNull();
  });

  it('greeting mixed with a recipe phrase still finds the ask via explicit pattern', () => {
    // Explicit patterns run BEFORE the bare-food/greeting filter; a
    // legitimate "give me X" inside a multi-word phrase that starts with
    // the verb still matches. The new greeting filter only blocks the
    // bare-food fallback (which is where false positives live).
    expect(detectRecipeAsk('give me a pizza recipe')).toEqual({ query: 'pizza' });
  });
});
