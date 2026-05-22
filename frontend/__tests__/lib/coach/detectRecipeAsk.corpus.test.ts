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

// ─── EXPANDED POSITIVE corpus (Y-Live-14, to 500+) ─────────────────────

describe('detectRecipeAsk corpus — cuisines (single-word) → route', () => {
  // Cuisine names alone should auto-route. The downstream wedge handles
  // the breadth ("Italian" → Spoonacular returns popular Italian dishes,
  // Dice + ranker pick one, card renders).
  it.each<[string, string]>([
    ['Italian', 'Italian'],
    ['Mexican', 'Mexican'],
    ['Thai', 'Thai'], // 4 chars — passes single-word min
    ['Japanese', 'Japanese'],
    ['Korean', 'Korean'],
    ['Vietnamese', 'Vietnamese'],
    ['Indian', 'Indian'],
    ['Pakistani', 'Pakistani'],
    ['Lebanese', 'Lebanese'],
    ['Moroccan', 'Moroccan'],
    ['Ethiopian', 'Ethiopian'],
    ['Peruvian', 'Peruvian'],
    ['Brazilian', 'Brazilian'],
    ['Cuban', 'Cuban'],
    ['Greek', 'Greek'],
    ['Turkish', 'Turkish'],
    ['Persian', 'Persian'],
    ['Filipino', 'Filipino'],
    ['Malaysian', 'Malaysian'],
    ['Indonesian', 'Indonesian'],
    ['Spanish', 'Spanish'],
    ['French', 'French'],
    ['German', 'German'],
    ['Russian', 'Russian'],
    ['Polish', 'Polish'],
    ['Hungarian', 'Hungarian'],
    ['Argentinean', 'Argentinean'],
    ['Caribbean', 'Caribbean'],
    ['Cajun', 'Cajun'],
    ['Creole', 'Creole'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — additional misspellings (pass-through)', () => {
  // Detector contract: don't BLOCK typos. Downstream wedge handles
  // correction (Spoonacular fuzzy + Dice + AI gen LLM-tolerance).
  it.each<[string, string]>([
    ['susi', 'susi'],
    ['sushie', 'sushie'],
    ['shusi', 'shusi'],
    ['pizzaa', 'pizzaa'],
    ['peeza', 'peeza'],
    ['pissa', 'pissa'],
    ['carbonarra', 'carbonarra'],
    ['karbonara', 'karbonara'],
    ['lasagne', 'lasagne'],
    ['lazania', 'lazania'],
    ['spagetti', 'spagetti'],
    ['spaghett', 'spaghett'],
    ['chiken', 'chiken'],
    ['chikken', 'chikken'],
    ['nooodel', 'nooodel'],
    ['nodle', 'nodle'],
    ['parmegan', 'parmegan'],
    ['mozarela', 'mozarela'],
    ['mozzarela', 'mozzarela'],
    ['biriani', 'biriani'],
    ['biryanee', 'biryanee'],
    ['curi', 'curi'],
    ['ramne', 'ramne'],
    ['raman', 'raman'],
    ['fajitass', 'fajitass'],
  ])('"%s" → %s (pass-through)', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — cooking method + food', () => {
  it.each<[string, string]>([
    ['grilled chicken', 'grilled chicken'],
    ['roasted veggies', 'roasted veggies'],
    ['smoked brisket', 'smoked brisket'],
    ['fried rice', 'fried rice'],
    ['steamed dumplings', 'steamed dumplings'],
    ['broiled fish', 'broiled fish'],
    ['poached eggs', 'poached eggs'],
    ['seared scallops', 'seared scallops'],
    ['braised short ribs', 'braised short ribs'],
    ['sauteed mushrooms', 'sauteed mushrooms'],
    ['baked salmon', 'baked salmon'],
    ['slow cooked stew', 'slow cooked stew'],
    ['pan fried tofu', 'pan fried tofu'],
    ['oven roasted potatoes', 'oven roasted potatoes'],
    ['stir fried noodles', 'stir fried noodles'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — diet hint + food', () => {
  it.each<[string, string]>([
    ['vegan pasta', 'vegan pasta'],
    ['gluten-free pizza', 'gluten-free pizza'],
    ['keto pancakes', 'keto pancakes'],
    ['low-carb bread', 'low-carb bread'],
    ['plant-based chili', 'plant-based chili'],
    ['paleo meatballs', 'paleo meatballs'],
    ['dairy-free smoothie', 'dairy-free smoothie'],
    ['high-protein bowl', 'high-protein bowl'],
    ['low-fat lasagna', 'low-fat lasagna'],
    ['vegetarian curry', 'vegetarian curry'],
    ['whole30 chicken', 'whole30 chicken'],
    ['flexitarian bowl', 'flexitarian bowl'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — regional / branded dishes', () => {
  it.each<[string, string]>([
    ['Korean BBQ', 'Korean BBQ'],
    ['Nashville hot chicken', 'Nashville hot chicken'],
    ['Cajun gumbo', 'Cajun gumbo'],
    ['Tex-Mex tacos', 'Tex-Mex tacos'],
    ['Buffalo wings', 'Buffalo wings'],
    ['Chicago pizza', 'Chicago pizza'],
    ['Philly cheesesteak', 'Philly cheesesteak'],
    ['Southern fried chicken', 'Southern fried chicken'],
    ['Hawaiian poke', 'Hawaiian poke'],
    ['California rolls', 'California rolls'],
    ['Thai green curry', 'Thai green curry'],
    ['Indian dal', 'Indian dal'],
    ['Vietnamese pho', 'Vietnamese pho'],
    ['Japanese ramen', 'Japanese ramen'],
    ['Spanish paella', 'Spanish paella'],
    ['Greek moussaka', 'Greek moussaka'],
    ['Italian risotto', 'Italian risotto'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — Y-Live-14 new natural phrasings', () => {
  it.each<[string, string]>([
    // wanna
    ['wanna have pizza', 'pizza'],
    ['wanna eat sushi', 'sushi'],
    ['wanna cook ramen', 'ramen'],
    ['wanna make pasta', 'pasta'],
    ['wanna try ceviche', 'ceviche'],
    ['wanna have some tacos', 'tacos'],
    // could go for / could use
    ['could go for sushi', 'sushi'],
    ['I could go for pizza', 'pizza'],
    ['could use some pasta', 'pasta'],
    ['could go for a burger', 'burger'],
    // down for
    ['down for ramen', 'ramen'],
    ["I'm down for tacos", 'tacos'],
    ['down for some sushi', 'sushi'],
    // got a craving for
    ['got a craving for pizza', 'pizza'],
    ['got a craving for sushi', 'sushi'],
    ['got a craving for some pasta', 'pasta'],
    // hit me with
    ['hit me with sushi', 'sushi'],
    ['hit me up with pizza', 'pizza'],
    ['hit me with a burrito', 'burrito'],
    // gotta have
    ['gotta have pizza', 'pizza'],
    ['gotta get ramen', 'ramen'],
    ['gotta eat sushi', 'sushi'],
    ['gotta try ceviche', 'ceviche'],
    // would love / I'd love
    ['I would love sushi', 'sushi'],
    ["I'd love ramen", 'ramen'],
    ['would love to eat pizza', 'pizza'],
    ["I'd love to cook pad thai", 'pad thai'],
    // dying for
    ['dying for tacos', 'tacos'],
    ["I'm dying for sushi", 'sushi'],
    ['dying for some pasta', 'pasta'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — Y-Live-14 negative guards for new patterns', () => {
  // The new phrasing patterns capture broadly; sanitize + TRIVIAL_QUERIES
  // catch the most obvious false positives so the wedge doesn't fire on
  // clearly-chat inputs.
  it.each<string>([
    'wanna have fun',
    'could go for a walk',
    "I'm down for anything",
    'gotta get some sleep',
    'I would love to travel',
    'dying for attention',
    "I'd love to rest",
  ])('"%s" → null', (input) => {
    expect(detectRecipeAsk(input)).toBeNull();
  });
});

describe('detectRecipeAsk corpus — international dishes (single-word)', () => {
  it.each<[string, string]>([
    ['bolognese', 'bolognese'],
    ['tartare', 'tartare'],
    ['schnitzel', 'schnitzel'],
    ['bratwurst', 'bratwurst'],
    ['borscht', 'borscht'],
    ['pelmeni', 'pelmeni'],
    ['blini', 'blini'],
    ['pierogi', 'pierogi'],
    ['goulash', 'goulash'],
    ['bagel', 'bagel'],
    ['challah', 'challah'],
    ['mansaf', 'mansaf'],
    ['tabouli', 'tabouli'],
    ['mujadara', 'mujadara'],
    ['kofta', 'kofta'],
    ['dolma', 'dolma'],
    ['harissa', 'harissa'],
    ['harira', 'harira'],
    ['jollof', 'jollof'],
    ['fufu', 'fufu'],
    ['injera', 'injera'],
    ['tibs', 'tibs'],
    ['bobotie', 'bobotie'],
    ['spanakopita', 'spanakopita'],
    ['moussaka', 'moussaka'],
    ['souvlaki', 'souvlaki'],
    ['tzatziki', 'tzatziki'],
    ['gyros', 'gyros'],
    ['dosa', 'dosa'],
    ['idli', 'idli'],
    ['vada', 'vada'],
    ['sambar', 'sambar'],
    ['vindaloo', 'vindaloo'],
    ['paneer', 'paneer'],
    ['samosa', 'samosa'],
    ['pakora', 'pakora'],
    ['halwa', 'halwa'],
    ['kheer', 'kheer'],
    ['rasgulla', 'rasgulla'],
    ['kulfi', 'kulfi'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — desserts + baked goods', () => {
  it.each<[string, string]>([
    ['tiramisu', 'tiramisu'],
    ['cheesecake', 'cheesecake'],
    ['brownie', 'brownie'],
    ['brownies', 'brownies'],
    ['cookies', 'cookies'],
    ['cookie', 'cookie'],
    ['cupcakes', 'cupcakes'],
    ['cinnamon rolls', 'cinnamon rolls'],
    ['croissants', 'croissants'],
    ['scones', 'scones'],
    ['banana bread', 'banana bread'],
    ['pumpkin pie', 'pumpkin pie'],
    ['apple pie', 'apple pie'],
    ['key lime pie', 'key lime pie'],
    ['carrot cake', 'carrot cake'],
    ['chocolate cake', 'chocolate cake'],
    ['birthday cake', 'birthday cake'],
    ['ice cream', 'ice cream'],
    ['gelato', 'gelato'],
    ['flan', 'flan'],
    ['churros', 'churros'],
    ['tres leches', 'tres leches'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — drinks + small-plate snacks', () => {
  it.each<[string, string]>([
    ['margarita', 'margarita'],
    ['mojito', 'mojito'],
    ['horchata', 'horchata'],
    ['matcha latte', 'matcha latte'],
    ['boba tea', 'boba tea'],
    ['smoothie', 'smoothie'],
    ['protein shake', 'protein shake'],
    ['energy balls', 'energy balls'],
    ['trail mix', 'trail mix'],
    ['granola', 'granola'],
    ['overnight oats', 'overnight oats'],
    ['hummus dip', 'hummus dip'],
    ['guacamole', 'guacamole'],
    ['salsa', 'salsa'],
    ['queso', 'queso'],
    ['edamame', 'edamame'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — additional question-shape negatives', () => {
  // Many of these test the explicit chat exclusions or just lack
  // recipe-ask shape.
  it.each<string>([
    'is dough hard to make?',
    'are tomatoes a fruit?',
    'when should I add salt?',
    'where is my apron?',
    'why is my cake flat?',
    'should I use oil or butter?',
    'do you cook?',
    'can I substitute butter?',
    "what's the best knife?",
    'tell me a joke',
    'explain sourdough',
    'help me decide',
    'recommend something light',
  ])('"%s" → null', (input) => {
    expect(detectRecipeAsk(input)).toBeNull();
  });
});

// ─── EXPANDED POSITIVE corpus (Y-Live-15, to 1000+) ────────────────────

describe('detectRecipeAsk corpus — single-word foods (mains + proteins)', () => {
  it.each<[string, string]>([
    ['burger', 'burger'],
    ['hotdog', 'hotdog'],
    ['burrito', 'burrito'],
    ['quesadilla', 'quesadilla'],
    ['enchilada', 'enchilada'],
    ['fajita', 'fajita'],
    ['fajitas', 'fajitas'],
    ['chimichanga', 'chimichanga'],
    ['tamale', 'tamale'],
    ['tamales', 'tamales'],
    ['empanada', 'empanada'],
    ['empanadas', 'empanadas'],
    ['arepa', 'arepa'],
    ['pupusa', 'pupusa'],
    ['salmon', 'salmon'],
    ['tilapia', 'tilapia'],
    ['mahi', 'mahi'],
    ['tuna', 'tuna'],
    ['cod', 'cod'],
    ['halibut', 'halibut'],
    ['snapper', 'snapper'],
    ['scallops', 'scallops'],
    ['shrimp', 'shrimp'],
    ['lobster', 'lobster'],
    ['crab', 'crab'],
    ['mussels', 'mussels'],
    ['oysters', 'oysters'],
    ['octopus', 'octopus'],
    ['calamari', 'calamari'],
    ['steak', 'steak'],
    ['ribeye', 'ribeye'],
    ['brisket', 'brisket'],
    ['meatloaf', 'meatloaf'],
    ['meatballs', 'meatballs'],
    ['lamb', 'lamb'],
    ['duck', 'duck'],
    ['turkey', 'turkey'],
    ['ham', 'ham'],
    ['sausage', 'sausage'],
    ['chorizo', 'chorizo'],
    ['pancetta', 'pancetta'],
    ['prosciutto', 'prosciutto'],
    ['tofu', 'tofu'],
    ['tempeh', 'tempeh'],
    ['seitan', 'seitan'],
    ['paneer', 'paneer'],
    ['eggplant', 'eggplant'],
    ['cauliflower', 'cauliflower'],
    ['broccoli', 'broccoli'],
    ['portobello', 'portobello'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — single-word pastas + grains + starches', () => {
  it.each<[string, string]>([
    ['penne', 'penne'],
    ['fettuccine', 'fettuccine'],
    ['rigatoni', 'rigatoni'],
    ['ravioli', 'ravioli'],
    ['tortellini', 'tortellini'],
    ['orzo', 'orzo'],
    ['linguine', 'linguine'],
    ['ziti', 'ziti'],
    ['farfalle', 'farfalle'],
    ['cannelloni', 'cannelloni'],
    ['manicotti', 'manicotti'],
    ['spaghetti', 'spaghetti'],
    ['fusilli', 'fusilli'],
    ['rigatoni', 'rigatoni'],
    ['couscous', 'couscous'],
    ['quinoa', 'quinoa'],
    ['polenta', 'polenta'],
    ['risotto', 'risotto'],
    ['farro', 'farro'],
    ['bulgur', 'bulgur'],
    ['barley', 'barley'],
    ['gnocchi', 'gnocchi'],
    ['udon', 'udon'],
    ['soba', 'soba'],
    ['naan', 'naan'],
    ['chapati', 'chapati'],
    ['paratha', 'paratha'],
    ['focaccia', 'focaccia'],
    ['ciabatta', 'ciabatta'],
    ['baguette', 'baguette'],
    ['tortilla', 'tortilla'],
    ['lavash', 'lavash'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — soups + salads + bowls', () => {
  it.each<[string, string]>([
    ['minestrone', 'minestrone'],
    ['gazpacho', 'gazpacho'],
    ['chowder', 'chowder'],
    ['bisque', 'bisque'],
    ['consomme', 'consomme'],
    ['chili', 'chili'],
    ['stew', 'stew'],
    ['ramen', 'ramen'],
    ['tortilla soup', 'tortilla soup'],
    ['french onion soup', 'french onion soup'],
    ['lentil soup', 'lentil soup'],
    ['butternut squash soup', 'butternut squash soup'],
    ['caesar salad', 'caesar salad'],
    ['cobb salad', 'cobb salad'],
    ['greek salad', 'greek salad'],
    ['kale salad', 'kale salad'],
    ['quinoa salad', 'quinoa salad'],
    ['nicoise salad', 'nicoise salad'],
    ['waldorf salad', 'waldorf salad'],
    ['fattoush', 'fattoush'],
    ['buddha bowl', 'buddha bowl'],
    ['grain bowl', 'grain bowl'],
    ['harvest bowl', 'harvest bowl'],
    ['acai bowl', 'acai bowl'],
    ['smoothie bowl', 'smoothie bowl'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — sandwiches + wraps + handhelds', () => {
  it.each<[string, string]>([
    ['BLT', 'BLT'],
    ['blt', 'blt'],
    ['club sandwich', 'club sandwich'],
    ['reuben', 'reuben'],
    ['monte cristo', 'monte cristo'],
    ['grilled cheese', 'grilled cheese'],
    ['gyro', 'gyro'],
    ['shawarma', 'shawarma'],
    ['kebab wrap', 'kebab wrap'],
    ['lettuce wrap', 'lettuce wrap'],
    ['hot dog', 'hot dog'],
    ['banh mi', 'banh mi'],
    ['lobster roll', 'lobster roll'],
    ['po boy', 'po boy'],
    ['cuban sandwich', 'cuban sandwich'],
    ['italian sub', 'italian sub'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — eggs + breakfast', () => {
  it.each<[string, string]>([
    ['omelette', 'omelette'],
    ['frittata', 'frittata'],
    ['quiche', 'quiche'],
    ['shakshuka', 'shakshuka'],
    ['scotch egg', 'scotch egg'],
    ['deviled eggs', 'deviled eggs'],
    ['breakfast burrito', 'breakfast burrito'],
    ['breakfast tacos', 'breakfast tacos'],
    ['eggs benedict', 'eggs benedict'],
    ['huevos rancheros', 'huevos rancheros'],
    ['avocado toast', 'avocado toast'],
    ['waffles', 'waffles'],
    ['pancakes', 'pancakes'],
    ['french toast', 'french toast'],
    ['oatmeal', 'oatmeal'],
    ['porridge', 'porridge'],
    ['granola', 'granola'],
    ['muesli', 'muesli'],
    ['breakfast hash', 'breakfast hash'],
    ['hashbrowns', 'hashbrowns'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — Asian dishes (regional, multi-word)', () => {
  it.each<[string, string]>([
    // Korean
    ['bulgogi', 'bulgogi'],
    ['bibimbap', 'bibimbap'],
    ['kimchi jjigae', 'kimchi jjigae'],
    ['japchae', 'japchae'],
    ['tteokbokki', 'tteokbokki'],
    ['samgyeopsal', 'samgyeopsal'],
    // Japanese
    ['yakitori', 'yakitori'],
    ['gyudon', 'gyudon'],
    ['donburi', 'donburi'],
    ['tempura', 'tempura'],
    ['tonkatsu', 'tonkatsu'],
    ['okonomiyaki', 'okonomiyaki'],
    ['takoyaki', 'takoyaki'],
    ['onigiri', 'onigiri'],
    ['sukiyaki', 'sukiyaki'],
    ['shabu shabu', 'shabu shabu'],
    // Chinese
    ['kung pao chicken', 'kung pao chicken'],
    ['mapo tofu', 'mapo tofu'],
    ['peking duck', 'peking duck'],
    ['dim sum', 'dim sum'],
    ['char siu', 'char siu'],
    ['lo mein', 'lo mein'],
    ['chow mein', 'chow mein'],
    ['hot pot', 'hot pot'],
    ['xiao long bao', 'xiao long bao'],
    ['general tso chicken', 'general tso chicken'],
    ['orange chicken', 'orange chicken'],
    ['sesame chicken', 'sesame chicken'],
    // Thai/SEA
    ['pad see ew', 'pad see ew'],
    ['drunken noodles', 'drunken noodles'],
    ['massaman curry', 'massaman curry'],
    ['nasi goreng', 'nasi goreng'],
    ['mee goreng', 'mee goreng'],
    ['rendang', 'rendang'],
    ['laksa', 'laksa'],
    ['satay', 'satay'],
    // Indian
    ['rogan josh', 'rogan josh'],
    ['chana masala', 'chana masala'],
    ['palak paneer', 'palak paneer'],
    ['saag paneer', 'saag paneer'],
    ['butter chicken', 'butter chicken'],
    ['chicken vindaloo', 'chicken vindaloo'],
    ['masala dosa', 'masala dosa'],
    ['aloo gobi', 'aloo gobi'],
    ['dal makhani', 'dal makhani'],
    ['paneer tikka', 'paneer tikka'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — Italian + Mediterranean dishes', () => {
  it.each<[string, string]>([
    ['osso buco', 'osso buco'],
    ['vitello tonnato', 'vitello tonnato'],
    ['cacio e pepe', 'cacio e pepe'],
    ['aglio e olio', 'aglio e olio'],
    ['puttanesca', 'puttanesca'],
    ['amatriciana', 'amatriciana'],
    ['bolognese', 'bolognese'],
    ['alfredo', 'alfredo'],
    ['pesto pasta', 'pesto pasta'],
    ['lasagna bolognese', 'lasagna bolognese'],
    ['caprese salad', 'caprese salad'],
    ['caponata', 'caponata'],
    ['arancini', 'arancini'],
    ['bruschetta', 'bruschetta'],
    ['saltimbocca', 'saltimbocca'],
    ['piccata', 'piccata'],
    ['cacciatore', 'cacciatore'],
    ['parmigiana', 'parmigiana'],
    ['carbonara', 'carbonara'],
    ['marinara', 'marinara'],
    ['pollo alla cacciatora', 'pollo alla cacciatora'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — Mexican + Latin dishes', () => {
  it.each<[string, string]>([
    ['mole poblano', 'mole poblano'],
    ['chiles rellenos', 'chiles rellenos'],
    ['carnitas', 'carnitas'],
    ['barbacoa', 'barbacoa'],
    ['al pastor', 'al pastor'],
    ['carne asada', 'carne asada'],
    ['chilaquiles', 'chilaquiles'],
    ['tinga', 'tinga'],
    ['birria', 'birria'],
    ['pozole', 'pozole'],
    ['menudo', 'menudo'],
    ['tres leches cake', 'tres leches cake'],
    ['flan', 'flan'],
    ['churros', 'churros'],
    ['ropa vieja', 'ropa vieja'],
    ['picadillo', 'picadillo'],
    ['lomo saltado', 'lomo saltado'],
    ['aji de gallina', 'aji de gallina'],
    ['feijoada', 'feijoada'],
    ['moqueca', 'moqueca'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — dish modifier + food', () => {
  // Spicy / sweet / classic / authentic / homestyle / easy / quick.
  it.each<[string, string]>([
    ['spicy ramen', 'spicy ramen'],
    ['spicy tuna roll', 'spicy tuna roll'],
    ['sweet potato fries', 'sweet potato fries'],
    ['savory crepes', 'savory crepes'],
    ['extra crispy chicken', 'extra crispy chicken'],
    ['classic carbonara', 'classic carbonara'],
    ['classic margherita', 'classic margherita'],
    ['authentic pad thai', 'authentic pad thai'],
    ['homestyle meatloaf', 'homestyle meatloaf'],
    ['easy weeknight pasta', 'easy weeknight pasta'],
    ['quick stir fry', 'quick stir fry'],
    ['simple salad', 'simple salad'],
    ['crispy tofu', 'crispy tofu'],
    ['fluffy pancakes', 'fluffy pancakes'],
    ['creamy risotto', 'creamy risotto'],
    ['rich beef stew', 'rich beef stew'],
    ['light fish tacos', 'light fish tacos'],
    ['hearty chili', 'hearty chili'],
    ['cheesy lasagna', 'cheesy lasagna'],
    ['smoky chipotle chicken', 'smoky chipotle chicken'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — Y-Live-15 new natural phrasings', () => {
  it.each<[string, string]>([
    // teach me
    ['teach me carbonara', 'carbonara'],
    ['teach me how to make sushi', 'sushi'],
    ['teach me how to cook ramen', 'ramen'],
    ['teach me how to bake bread', 'bread'],
    // show/tell me how to
    ['show me how to make pizza', 'pizza'],
    ['show me how to cook risotto', 'risotto'],
    ['tell me how to make biryani', 'biryani'],
    ['show me how to bake cookies', 'cookies'],
    // walk me through
    ['walk me through carbonara', 'carbonara'],
    ['walk me through making bread', 'bread'],
    ['walk me through cooking ramen', 'ramen'],
    // going to / gonna
    ['going to make pizza', 'pizza'],
    ['gonna make tacos', 'tacos'],
    ["I'm gonna make pasta", 'pasta'],
    ["I'm going to cook ramen", 'ramen'],
    ['gonna grab some sushi', 'sushi'],
    ['gonna try ceviche', 'ceviche'],
    // treat me to
    ['treat me to sushi', 'sushi'],
    ['treat me to some pasta', 'pasta'],
    ['treat me to a burger', 'burger'],
    // surprise me
    ['surprise me with sushi', 'sushi'],
    ['surprise me with a curry', 'curry'],
    ['surprise me with some pasta', 'pasta'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — more misspellings', () => {
  it.each<[string, string]>([
    ['kabonara', 'kabonara'],
    ['burito', 'burito'],
    ['fajitos', 'fajitos'],
    ['mozzarela', 'mozzarela'],
    ['parmesain', 'parmesain'],
    ['parmasen', 'parmasen'],
    ['guakamole', 'guakamole'],
    ['kimche', 'kimche'],
    ['kimchee', 'kimchee'],
    ['gnocci', 'gnocci'],
    ['gnochi', 'gnochi'],
    ['risoto', 'risoto'],
    ['rissoto', 'rissoto'],
    ['enchiladaz', 'enchiladaz'],
    ['quesedilla', 'quesedilla'],
    ['quesedillas', 'quesedillas'],
    ['huevos racheros', 'huevos racheros'],
    ['chimichanga', 'chimichanga'],
    ['xiao long boa', 'xiao long boa'],
    ['rendangs', 'rendangs'],
    ['shakshouka', 'shakshouka'],
    ['shakshuka', 'shakshuka'],
    ['baba ganoush', 'baba ganoush'],
    ['baba ghanoush', 'baba ghanoush'],
    ['baba ghanouj', 'baba ghanouj'],
    ['tabuleh', 'tabuleh'],
    ['humus', 'humus'],
    ['humuus', 'humuus'],
    ['felafel', 'felafel'],
    ['fallafel', 'fallafel'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — more cooking method + food', () => {
  it.each<[string, string]>([
    ['blackened salmon', 'blackened salmon'],
    ['glazed carrots', 'glazed carrots'],
    ['caramelized onions', 'caramelized onions'],
    ['crispy chicken thighs', 'crispy chicken thighs'],
    ['slow braised pork', 'slow braised pork'],
    ['oven-roasted brussels', 'oven-roasted brussels'],
    ['charred broccoli', 'charred broccoli'],
    ['blistered shishitos', 'blistered shishitos'],
    ['poached salmon', 'poached salmon'],
    ['grilled lamb chops', 'grilled lamb chops'],
    ['confit duck legs', 'confit duck legs'],
    ['cured salmon', 'cured salmon'],
    ['smoked turkey', 'smoked turkey'],
    ['butter basted steak', 'butter basted steak'],
    ['braised lamb shanks', 'braised lamb shanks'],
    ['seared duck breast', 'seared duck breast'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — more desserts + sweets', () => {
  it.each<[string, string]>([
    ['creme brulee', 'creme brulee'],
    ['mousse', 'mousse'],
    ['panna cotta', 'panna cotta'],
    ['tres leches', 'tres leches'],
    ['affogato', 'affogato'],
    ['baklava', 'baklava'],
    ['halva', 'halva'],
    ['mochi', 'mochi'],
    ['daifuku', 'daifuku'],
    ['dorayaki', 'dorayaki'],
    ['rice pudding', 'rice pudding'],
    ['bread pudding', 'bread pudding'],
    ['banana bread', 'banana bread'],
    ['zucchini bread', 'zucchini bread'],
    ['pumpkin bread', 'pumpkin bread'],
    ['snickerdoodles', 'snickerdoodles'],
    ['oatmeal cookies', 'oatmeal cookies'],
    ['shortbread', 'shortbread'],
    ['biscotti', 'biscotti'],
    ['macarons', 'macarons'],
    ['eclairs', 'eclairs'],
    ['profiteroles', 'profiteroles'],
    ['cobbler', 'cobbler'],
    ['crumble', 'crumble'],
    ['galette', 'galette'],
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — more greeting variants', () => {
  it.each<[string, string]>([
    ['hey friend, give me sushi', 'sushi'],
    ['hi sazon, what about pad thai', 'pad thai'],
    ['hey, I want pizza', 'pizza'],
    ['yo gimme tacos', 'tacos'],
    ['hello, craving ramen', 'ramen'],
    ['ok, fancy some pasta', 'pasta'],
    // "let me see X" intentionally NOT covered — too ambiguous with
    // genuine chat ("let me see your hands"). Drop or use "give me X".
  ])('"%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });
});

describe('detectRecipeAsk corpus — more chat questions (negative)', () => {
  it.each<string>([
    'is the stove off?',
    'do you have any chocolate?',
    'will the pasta boil over?',
    'can you call my mom?',
    'are we out of eggs?',
    'when is dinner?',
    'where did I put the salt?',
    'who ate the leftovers?',
    'how big is the oven?',
    'how loud is the blender?',
    'why is the kitchen messy?',
    'what does Sazon mean?',
    'how do you spell carbonara?',
    'tell me about you',
    'tell me a story',
    'explain why bread rises',
    'should I get a new pan?',
    'do I need a stand mixer?',
    "is it worth buying a sous vide?",
    'what should I name my sourdough starter?',
  ])('"%s" → null', (input) => {
    expect(detectRecipeAsk(input)).toBeNull();
  });
});

describe('detectRecipeAsk corpus — small-talk + acknowledgment phrases (negative)', () => {
  it.each<string>([
    'good talk',
    'see you later',
    'catch you tomorrow',
    'love it',
    'hate it',
    'sweet dreams',
    'goodbye',
    'good night',
    'morning',
    'evening',
    'pleasure to meet you',
    'thanks a lot',
    'no thank you',
    'all good',
    'no worries',
    'sounds good',
    'works for me',
    'fine by me',
    'go for it',
    "i'll think about it",
  ])('"%s" → null', (input) => {
    expect(detectRecipeAsk(input)).toBeNull();
  });
});

describe('detectRecipeAsk corpus — emoji + special-char edge cases', () => {
  it.each<unknown>([
    '🍕', // single emoji = 2 chars but no alpha — bare-food fallback returns it
    '!!!',
    '???',
    '...',
    '   ',
    '\t\n',
  ])('"%s" returns null OR a sanitized pass-through', (input) => {
    // We don't require strict null here — emoji/punctuation-only inputs
    // either fall to null (length < 3, only-punctuation) OR pass through
    // as a query that downstream graceful-fails on. What we DON'T want
    // is a crash. Pin the non-crash behavior.
    expect(() => detectRecipeAsk(input)).not.toThrow();
  });
});

describe('detectRecipeAsk corpus — exact-boundary word counts', () => {
  it.each<[string, string]>([
    // Exactly 5 words → still under cap
    ['classic homestyle Italian chicken parmigiana', 'classic homestyle Italian chicken parmigiana'],
    // Exactly 5 with descriptor
    ['authentic Korean kimchi fried rice', 'authentic Korean kimchi fried rice'],
  ])('5-word boundary: "%s" → %s', (input, expected) => {
    expect(detectRecipeAsk(input)).toEqual({ query: expected });
  });

  it.each<string>([
    // 6 words → over cap, no explicit pattern match
    'just some really nice fresh tomatoes for tonight',
    'cooked carefully with butter and a touch of garlic',
  ])('6+ word bare phrases → null: "%s"', (input) => {
    expect(detectRecipeAsk(input)).toBeNull();
  });
});
