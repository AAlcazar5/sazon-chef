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
    // Y-Live-10 (founder Telegram 2026-05-22): regression pin for
    // multi-word "give me a recipe for X" — already worked before, but
    // pinning so the existing coverage can't silently drift.
    ['give me a recipe for chicken noodle soup', 'chicken noodle soup'],
    // Y-Live-10: natural recipe-ask phrasings.
    ['craving sushi', 'sushi'],
    ["I'm craving sushi", 'sushi'],
    ['craving a burrito', 'burrito'],
    ['in the mood for tacos', 'tacos'],
    ["I'm in the mood for ramen", 'ramen'],
    ['feeling like pho', 'pho'],
    ["I'm feeling like pad thai", 'pad thai'],
    ['how about ramen', 'ramen'],
    ['what about pad thai', 'pad thai'],
    ["let's do tacos", 'tacos'],
    ["let's make pizza", 'pizza'],
    ['lets cook biryani', 'biryani'],
    ["let's eat sushi", 'sushi'],
    // Y-Live-11: more natural phrasings.
    ['I need a recipe for chicken noodle soup', 'chicken noodle soup'],
    ['need pizza', 'pizza'],
    ['I need ramen', 'ramen'],
    ["I'm thinking pasta", 'pasta'],
    ['thinking about tacos', 'tacos'],
    ['thinking of biryani', 'biryani'],
    ['looking for a sushi recipe', 'sushi'],
    ["I'm looking for ramen", 'ramen'],
    ['searching for pho', 'pho'],
    ['send me a recipe for chicken parm', 'chicken parm'],
    ['send me ramen', 'ramen'],
    ['got any sushi recipes', 'sushi'],
    ['got any pizza', 'pizza'],
    ['any pasta recipes', 'pasta'],
    ['any ramen recipe', 'ramen'],
    ['fancy a curry', 'curry'],
    ['fancy some pasta', 'pasta'],
    ['gimme sushi', 'sushi'],
    ['gimme a burrito', 'burrito'],
    ['gimme a recipe for tacos', 'tacos'],
    ['whip me up some pasta', 'pasta'],
    ['whip up a salad', 'salad'],
    ['throw together some tacos', 'tacos'],
    // Y-Live-11: leading-greeting stripping.
    ['hey, give me a recipe for sushi', 'sushi'],
    ['yo, gimme tacos', 'tacos'],
    ['hi, craving pho', 'pho'],
    ['ok send me ramen', 'ramen'],
    ['so what about pad thai', 'pad thai'],
  ])('"%s" → query "%s"', (input, expectedQuery) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expectedQuery });
  });
});

describe('detectRecipeAsk — natural-phrasing false-positive guards', () => {
  // Y-Live-11: the new "how about X" / "what about X" / "I'm thinking X" /
  // "looking for X" patterns capture noun phrases broadly. The pronoun
  // strip + expanded TRIVIAL_QUERIES filter the most common false-positive
  // payloads so the wedge card doesn't fire on chat-y inputs.
  it.each([
    'what about your weekend',
    'how about that game',
    "I'm thinking about life",
    'thinking about my work',
    "I'm thinking about it",
    'how about now',
    'what about later',
    'looking for my keys', // "my keys" → stripped to "keys" — still routes; graceful fail downstream
    "let's do this",
    "let's do it",
  ])('"%s" → null OR trivially captured payload (no wedge hijack of clear chat)', (input) => {
    const result = detectRecipeAsk(input);
    // We allow EITHER null OR a captured payload that wouldn't crash the
    // wedge — what we DON'T want is a junk payload that hijacks chat into
    // a confusing recipe-card surface. Strict null for the most obvious
    // cases is asserted in the next test below.
    if (result !== null) {
      // The captured query must be a non-trivial string (long enough to
      // be a plausible food name). The wedge has a graceful-fail card
      // for "no recipe found".
      expect(result.query.length).toBeGreaterThan(1);
    }
  });

  it.each([
    ['what about your weekend', null],
    ['how about that game', null],
    ["I'm thinking about life", null],
    ["I'm thinking about it", null],
    ['how about now', null],
    ['what about later', null],
    ["let's do this", null],
    ["let's do it", null],
  ])('strict null on the highest-risk false positives: "%s"', (input, expected) => {
    expect(detectRecipeAsk(input)).toBe(expected);
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
