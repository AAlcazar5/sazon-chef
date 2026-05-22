// Y-Live-13 (founder Telegram 2026-05-22, "expand test coverage to a very
// wide catalog"): broad corpus pinning the detector's positive +
// negative behavior across many real-world phrasings. Adding a new
// pattern? Drop a case in here. Triaging a regression? grep the input.
//
// The corpus is structured as plain it.each tables so engineers can
// scan + extend without scrolling through assertion ceremony.

import { detectRecipeAsk } from '../../../lib/coach/detectRecipeAsk';

// ─── POSITIVE corpus ─────────────────────────────────────────────────────

describe('detectRecipeAsk corpus — single-word foods', () => {
  // Single-word foods MUST auto-route after Y-Live-9. Mix common +
  // international + edge-length cases.
  it.each<[string, string]>([
    ['Sushi', 'Sushi'],
    ['sushi', 'sushi'],
    ['SUSHI', 'SUSHI'],
    ['pizza', 'pizza'],
    ['ramen', 'ramen'],
    ['carbonara', 'carbonara'],
    ['lasagna', 'lasagna'],
    ['biryani', 'biryani'],
    ['kebab', 'kebab'],
    ['curry', 'curry'],
    ['tacos', 'tacos'],
    ['pho', 'pho'], // 3 chars — minimum length floor
    ['dal', 'dal'],
    ['risotto', 'risotto'],
    ['tagine', 'tagine'],
    ['paella', 'paella'],
    ['shakshuka', 'shakshuka'],
    ['ceviche', 'ceviche'],
    ['ratatouille', 'ratatouille'],
    ['gnocchi', 'gnocchi'],
    ['hummus', 'hummus'],
    ['falafel', 'falafel'],
    ['quesadilla', 'quesadilla'],
    ['enchilada', 'enchilada'],
    ['kibbeh', 'kibbeh'],
    ['poutine', 'poutine'],
    ['baklava', 'baklava'],
    ['kimchi', 'kimchi'],
    ['gyoza', 'gyoza'],
    ['tandoori', 'tandoori'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — multi-word foods', () => {
  it.each<[string, string]>([
    ['pad thai', 'pad thai'],
    ['pizza margarita', 'pizza margarita'],
    ['Pizza Margherita', 'Pizza Margherita'],
    ['chicken noodle soup', 'chicken noodle soup'],
    ['beef bourguignon', 'beef bourguignon'],
    ['shrimp scampi', 'shrimp scampi'],
    ['butter chicken', 'butter chicken'],
    ['chicken tikka masala', 'chicken tikka masala'],
    ['miso soup', 'miso soup'],
    ['salmon bites', 'salmon bites'],
    ['tom yum', 'tom yum'],
    ['banh mi', 'banh mi'],
    ['mac and cheese', 'mac and cheese'],
    ['huevos rancheros', 'huevos rancheros'],
    ['xiao long bao', 'xiao long bao'],
    ['steak frites', 'steak frites'],
    ['eggs benedict', 'eggs benedict'],
    ['fish and chips', 'fish and chips'],
    ['arroz con pollo', 'arroz con pollo'],
    ['poke bowl', 'poke bowl'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — explicit recipe phrasings', () => {
  it.each<[string, string]>([
    ['give me a recipe for pizza', 'pizza'],
    ['give me a recipe for chicken noodle soup', 'chicken noodle soup'],
    ['get me a pasta recipe', 'pasta'],
    ['find me an asparagus recipe', 'asparagus'],
    ['find me a sushi recipe', 'sushi'],
    ['show me a recipe for tacos', 'tacos'],
    ['recipe for chicken tikka masala', 'chicken tikka masala'],
    ['carbonara recipe', 'carbonara'],
    ['lamb biryani recipe', 'lamb biryani'],
    ['how do I make carbonara', 'carbonara'],
    ['how to make pad thai', 'pad thai'],
    ['how can I cook salmon', 'salmon'],
    ['how can I bake bread', 'bread'],
    ['how to prepare ceviche', 'ceviche'],
    ['I want pizza', 'pizza'],
    ['I want to make pizza', 'pizza'],
    ["I'd like ramen", 'ramen'],
    ["i'd like some pho", 'pho'],
    ['make me a salad', 'salad'],
    ['cook me beef tacos', 'beef tacos'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — natural phrasings', () => {
  // Y-Live-10 + Y-Live-11 patterns.
  it.each<[string, string]>([
    // craving
    ['craving sushi', 'sushi'],
    ["I'm craving ramen", 'ramen'],
    ['craving a burrito', 'burrito'],
    // in the mood
    ['in the mood for tacos', 'tacos'],
    ["I'm in the mood for ramen", 'ramen'],
    // feeling like
    ['feeling like pho', 'pho'],
    ["I'm feeling like pad thai", 'pad thai'],
    // how/what about
    ['how about ramen', 'ramen'],
    ['what about pad thai', 'pad thai'],
    ['how about some sushi', 'sushi'],
    // let's
    ["let's do tacos", 'tacos'],
    ["let's make pizza", 'pizza'],
    ['lets cook biryani', 'biryani'],
    ["let's eat sushi", 'sushi'],
    ["let's grab some pizza", 'pizza'], // Y-Live-13 added "grab"
    ["let's try ceviche", 'ceviche'],
    // need
    ['I need a recipe for chicken noodle soup', 'chicken noodle soup'],
    ['need pizza', 'pizza'],
    // thinking
    ["I'm thinking pasta", 'pasta'],
    ['thinking about tacos', 'tacos'],
    ['thinking of biryani', 'biryani'],
    // looking for / searching for
    ['looking for a sushi recipe', 'sushi'],
    ["I'm looking for ramen", 'ramen'],
    ['searching for pho', 'pho'],
    ['hunting for a curry', 'curry'],
    // send me
    ['send me a recipe for chicken parm', 'chicken parm'],
    ['send me ramen', 'ramen'],
    // got any / any X recipes
    ['got any sushi recipes', 'sushi'],
    ['got any pizza', 'pizza'],
    ['any pasta recipes', 'pasta'],
    ['any ramen recipe', 'ramen'],
    // fancy (British)
    ['fancy a curry', 'curry'],
    ['fancy some pasta', 'pasta'],
    // gimme
    ['gimme sushi', 'sushi'],
    ['gimme a burrito', 'burrito'],
    ['gimme a recipe for tacos', 'tacos'],
    // is there / whip up
    ['is there a sushi recipe', 'sushi'],
    ['whip me up some pasta', 'pasta'],
    ['whip up a salad', 'salad'],
    ['throw together some tacos', 'tacos'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — greeting-prefixed asks', () => {
  // Two-pass: pass 1 misses, pass 2 strips the greeting and re-matches.
  it.each<[string, string]>([
    ['hey, give me a recipe for sushi', 'sushi'],
    ['yo, gimme tacos', 'tacos'],
    ['hi, craving pho', 'pho'],
    ['ok send me ramen', 'ramen'],
    ['so what about pad thai', 'pad thai'],
    ['hello, how about ramen', 'ramen'],
    ["hey, let's make pizza", 'pizza'],
    ['ok, I want sushi', 'sushi'],
    ['alright, give me a recipe for tacos', 'tacos'],
    ['so, gimme a burrito', 'burrito'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — capitalization + whitespace tolerance', () => {
  it.each<[string, string]>([
    ['PIZZA', 'PIZZA'],
    ['Pizza', 'Pizza'],
    ['pizza', 'pizza'],
    ['I WANT PIZZA', 'PIZZA'],
    ['  carbonara  ', 'carbonara'], // trim
    [' \tsushi\t ', 'sushi'],
    ['CRAVING SUSHI', 'SUSHI'],
    ['Give Me A Recipe For Sushi', 'Sushi'],
    ['HOW DO I MAKE CARBONARA', 'CARBONARA'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — punctuation tolerance', () => {
  // Trailing . and ! are stripped by cleanEnd (not chat markers).
  // Trailing ? IS a chat marker — fall through to bare-food = null only
  // if no explicit pattern matched; explicit patterns above still fire.
  it.each<[string, string]>([
    ['carbonara!', 'carbonara'],
    ['carbonara.', 'carbonara'],
    ['carbonara!!!', 'carbonara'],
    ['give me sushi!', 'sushi'],
    ['I want pizza.', 'pizza'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — light typos (pass-through to downstream)', () => {
  // The detector doesn't try to fix typos — it just doesn't BLOCK them.
  // The downstream wedge (catalog fuzzy + AI gen) resolves them into
  // a real recipe. Detector contract: produce a non-null query so the
  // downstream chain can run.
  it.each<[string, string]>([
    ['sushii', 'sushii'],
    ['carbnara', 'carbnara'],
    ['spagheti carbonara', 'spagheti carbonara'],
    ['chickn noodle soup', 'chickn noodle soup'],
    ['ramne', 'ramne'],
    ['lasanya', 'lasanya'],
    ['kimche', 'kimche'],
  ])('"%s" → %s (pass-through, downstream handles typo)', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

// ─── NEGATIVE corpus ─────────────────────────────────────────────────────

describe('detectRecipeAsk corpus — pure greetings → null', () => {
  it.each<string>([
    'hello',
    'hi',
    'hey',
    'yo',
    'howdy',
    'sup',
    'hi there',
    'hey coach',
    'hello there',
    'yo Sazon',
    'hey Sazon',
    'hello coach',
    'sup coach',
    'good morning',
    'good evening',
  ])('"%s" → null', (input) => {
    expect(detectRecipeAsk(input)).toBeNull();
  });
});

describe('detectRecipeAsk corpus — pure acknowledgments → null', () => {
  it.each<string>([
    'yes',
    'no',
    'ok',
    'okay',
    'sure',
    'yep',
    'nope',
    'yeah',
    'nah',
    'maybe',
    'cool',
    'nice',
    'great',
    'awesome',
    'perfect',
    'done',
    'ready',
    'huh',
    'hmm',
    'idk',
  ])('"%s" → null', (input) => {
    expect(detectRecipeAsk(input)).toBeNull();
  });
});

describe('detectRecipeAsk corpus — questions → null', () => {
  it.each<string>([
    'what should I eat tonight?',
    "what's for dinner?",
    'why does dough rise?',
    'why are tomatoes acidic?',
    'how come my pasta keeps sticking?',
    'can you suggest something?',
    'is it okay to skip the cheese?',
    'do you have any vegetarian ideas?',
    'should I roast or grill?',
    'what does umami mean?',
    'how long should I knead?',
    'will the dough rise overnight?',
  ])('"%s" → null', (input) => {
    expect(detectRecipeAsk(input)).toBeNull();
  });
});

describe('detectRecipeAsk corpus — chat-y phrases → null', () => {
  it.each<string>([
    "I'm hungry",
    "I'm tired",
    'tell me about Italian food',
    'explain risotto',
    'i think pizza is overrated',
    "i don't like onions",
    'help me plan dinner',
    'suggest something light',
    'recommend a wine',
    'plan my week',
    'schedule a meal',
  ])('"%s" → null', (input) => {
    expect(detectRecipeAsk(input)).toBeNull();
  });
});

describe('detectRecipeAsk corpus — pronoun-only / topic non-asks → null', () => {
  // The pattern matched something but sanitize stripped to a TRIVIAL noun.
  // Match-but-trivial short-circuits to null (no bare-food fallback hijack).
  it.each<string>([
    'how about now',
    'what about later',
    "let's do this",
    "let's do it",
    "I'm thinking about life",
    "I'm thinking about it",
    'what about your weekend',
    'how about that',
  ])('"%s" → null', (input) => {
    expect(detectRecipeAsk(input)).toBeNull();
  });
});

describe('detectRecipeAsk corpus — very long messages → null', () => {
  it.each<string>([
    // Bare-food fallback caps at 5 words. These are too long AND don't
    // match any explicit pattern.
    'so i was thinking we could make something interesting tonight',
    'maybe we can have something fun this weekend at the house',
    'lots of things i could eat but nothing sounds great right now',
  ])('"%s" → null', (input) => {
    expect(detectRecipeAsk(input)).toBeNull();
  });
});

describe('detectRecipeAsk corpus — non-string + empty → null', () => {
  it.each<unknown>([null, undefined, 0, 42, true, false, {}, [], ''])(
    '%s → null',
    (input) => {
      expect(detectRecipeAsk(input)).toBeNull();
    },
  );
});
