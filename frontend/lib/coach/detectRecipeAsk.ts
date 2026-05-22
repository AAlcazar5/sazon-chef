// frontend/lib/coach/detectRecipeAsk.ts
//
// Tier Y live-wiring. When the chat input is a recipe ask, the coach
// bypasses the LLM entirely and renders CookingModeRecipeCard directly
// (deterministic, fast, no prompt dependency — same principle as W-C1's
// "deterministic cook ops"). Conservative: false positives hijack
// genuine chat, so we lean on explicit recipe-phrasing first and only
// fall back to a tightly-bounded bare-food heuristic.

export interface RecipeAsk {
  query: string;
}

// Chat-question markers — if present, this is conversation, not a recipe
// ask. Lower-cased; the regex uses /i so it matches the original input.
//
// Y-Live-15: added i'?d and i'?ll as blanket-blocked roots; specific
// recipe-ask phrases ("I'd love X", "I'll have X") are caught by explicit
// patterns BEFORE this exclusion runs (bare-food fallback only).
const CHAT_EXCLUSIONS =
  /\b(why|how come|can you|tell me|explain|do you|will it|is it|should i|what (does|is|should|can|to)|i'?m|i'?d|i'?ll|i am|i think|i feel|i don'?t|plan|schedule|suggest|recommend|help me)\b/i;

// Y-Live-15: multi-word chat closers + acknowledgments that aren't recipe
// asks. These would otherwise slip through the bare-food fallback because
// each individual word isn't trivial on its own.
const CHAT_PHRASE_EXCLUSIONS =
  /\b(?:see\s+(?:you|ya)|catch\s+you|good\s+(?:talk|night|morning|evening|afternoon|day|times?|times)|love\s+(?:it|ya|you)|hate\s+(?:it|ya|you)|sweet\s+dreams|pleasure\s+to\s+meet|sounds\s+good|works\s+for\s+me|fine\s+by\s+me|go\s+for\s+it|no\s+worries|all\s+good|take\s+care|thanks\s+a\s+lot|no\s+thank\s+you)\b/i;

// Y-Live-8: multi-word greetings/openers were slipping past
// CHAT_EXCLUSIONS into the bare-food fallback ("Hi coach" → wedge).
// Single-word greetings are already filtered by the wordCount>=2 rule.
//
// Y-Live-15: added goodbye + good talk/day variants.
const GREETING_EXCLUSIONS =
  /\b(hi|hello|hey|yo|sup|howdy|thanks|thank\s+you|bye|goodbye|good\s+(morning|afternoon|evening|night|talk|day))\b/i;

// Refuse trivial single-word "queries" that aren't actually a food name —
// these would yield empty recipe searches.
//
// Y-Live-9 (founder Telegram 2026-05-22, "Sushi" miss): expanded to cover
// common single-word non-foods that show up in chat follow-ups (yes / ok /
// cool / done / etc). Without this, dropping the wordCount>=2 floor would
// hijack acknowledgments into recipe asks.
//
// Y-Live-11 (founder Telegram 2026-05-22, "expand more widely"): added
// pronouns + common non-food nouns to neutralize false positives from the
// new natural-phrasing patterns (e.g. "I'm thinking about life" →
// captures "life", "what about your weekend" → captures "weekend").
const TRIVIAL_QUERIES = new Set([
  'recipe',
  'food',
  'something',
  'anything',
  'dinner',
  'lunch',
  'breakfast',
  'snack',
  'meal',
  // Y-Live-9: follow-up acknowledgments + filler.
  'yes',
  'yep',
  'yeah',
  'no',
  'nope',
  'nah',
  'ok',
  'okay',
  'sure',
  'maybe',
  'cool',
  'nice',
  'good',
  'great',
  'perfect',
  'awesome',
  'done',
  'ready',
  'wait',
  'stop',
  'pause',
  'next',
  'back',
  'what',
  'huh',
  'hmm',
  'idk',
  // Y-Live-11: pronouns + common non-food nouns that the new natural-
  // phrasing patterns could capture.
  'it',
  'this',
  'that',
  'them',
  'those',
  'these',
  'you',
  'me',
  'us',
  'him',
  'her',
  'life',
  'weekend',
  'work',
  'sleep',
  'time',
  'help',
  'advice',
  'idea',
  'ideas',
  'suggestion',
  'suggestions',
  'thing',
  'things',
  'stuff',
  'now',
  'later',
  'tomorrow',
  'today',
  'yesterday',
  // Y-Live-11: common chat-topic nouns that the "how about X" / "what
  // about X" / "let's do X" patterns could otherwise capture.
  'game',
  'games',
  'movie',
  'movies',
  'music',
  'party',
  'plan',
  'plans',
  'show',
  'shows',
  'drink',
  'drinks',
  // Y-Live-11: addressee tokens — "hey coach" / "yo sazon" / "hi there"
  // collapse to these after the greeting strip, and they're chat openers
  // not food names.
  'coach',
  'sazon',
  'there',
  'dude',
  'buddy',
  'bro',
  'man',
  'bot',
  // Y-Live-14: more chat-shaped captures from the new wanna/could/dying
  // patterns. Travel/fun/walk/etc. are plausible captures from
  // "wanna have fun" / "could go for a walk" / "dying for attention".
  'travel',
  'fun',
  'attention',
  'walk',
  'run',
  'ride',
  'drive',
  'vacation',
  'holiday',
  'break',
  'rest',
  'nap',
  'space',
  'love',
  'change',
  // Y-Live-15: chat closers + day periods that surface as single-word
  // inputs alongside the multi-word phrases in CHAT_PHRASE_EXCLUSIONS.
  'morning',
  'evening',
  'afternoon',
  'noon',
  'goodbye',
]);

function cleanEnd(s: string): string {
  return s.replace(/[?!.]+$/, '').trim();
}

// Y-Live-11: strip leading greeting + optional comma so "hey, give me sushi"
// behaves the same as "give me sushi". Conservative — only strips the
// known greeting set so we don't drop meaningful prefix words.
//
// Y-Live-15: also handle "greeting + addressee + optional comma" forms
// like "hey friend, give me sushi" / "hi sazon, what about pad thai".
// The optional `[,!]?` lets bare "hi give me sushi" (no comma) work too.
const LEADING_GREETING =
  /^(?:hey|hi|hello|yo|yeah|ok|okay|so|alright|sup|howdy)(?:\s+(?:there|coach|sazon|friend|buddy|dude|bro|man|guys?))?[,!]?\s+/i;

function stripLeadingGreeting(s: string): string {
  return s.replace(LEADING_GREETING, '').trim();
}

function sanitize(q: string | undefined | null): string | null {
  if (!q) return null;
  // Y-Live-11: strip leading possessive + demonstrative pronoun so
  // "what about your weekend" / "let's do this" / "I'm thinking about
  // my life" collapse to the noun, which then trips TRIVIAL_QUERIES.
  const stripped = cleanEnd(q)
    // Y-Live-14: also strip leading "to " so non-food infinitives
    // ("to travel" / "to rest" / "to sleep") collapse to the verb,
    // which is then caught by TRIVIAL_QUERIES.
    .replace(/^(?:my|your|his|her|our|their|its|this|that|these|those|to)\s+/i, '')
    .trim();
  if (stripped.length < 2) return null;
  if (TRIVIAL_QUERIES.has(stripped.toLowerCase())) return null;
  return stripped;
}

// Order matters — more specific patterns first.
//
// Y-Live-10 (founder Telegram 2026-05-22): added natural recipe-ask
// phrasings (craving / in the mood / feeling like / how about / what
// about / let's). These short-circuit before CHAT_EXCLUSIONS so the
// blanket `i'?m` chat-exclusion can't bite "I'm craving sushi".
const EXPLICIT_PATTERNS: RegExp[] = [
  // Y-Live-15: "show me how to (make|cook|prepare|bake) X" — runs BEFORE
  // the generic "show me X" pattern so we capture the food, not the
  // whole "how to make X" phrase.
  /^(?:show|tell)\s+me\s+how\s+to\s+(?:make|cook|prepare|bake)\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // give / get / find / show me [a] [recipe for] X [recipe]
  /^(?:give|get|find|show)\s+(?:me\s+)?(?:a\s+|an\s+|some\s+)?(?:recipe\s+for\s+)?(.+?)(?:\s+recipe)?$/i,
  // recipe for X
  /^recipe\s+for\s+(.+)$/i,
  // how do I / how to / how can I (make|cook|prepare|bake) X
  /^how\s+(?:do\s+i|to|can\s+i)\s+(?:make|cook|prepare|bake)\s+(.+?)$/i,
  // I want / I'd like [to make/cook/eat] [a/an/some] X
  /^(?:i\s+want|i'?d\s+like)(?:\s+to\s+(?:make|cook|eat))?\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // make / cook me [a/an/some] X
  /^(?:make|cook)\s+me\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-10: "craving X" / "I'm craving X"
  /^(?:i'?m\s+)?craving\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-10: "in the mood for X" / "I'm in the mood for X"
  /^(?:i'?m\s+)?in\s+the\s+mood\s+for\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-10: "feeling like X" / "I'm feeling like X"
  /^(?:i'?m\s+)?feeling\s+like\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-10: "how about X" / "what about X" — questions ("how about
  // it?") are caught earlier by the literal `?` check.
  /^(?:how|what)\s+about\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-10: "let's (do|make|have|try|cook|eat|grab) X"
  // Y-Live-13: added "grab" — common phrasing ("let's grab some pizza").
  /^let'?s\s+(?:do|make|have|try|cook|eat|grab)\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-11: "I need [a recipe for] X" / "need X"
  /^(?:i\s+)?need\s+(?:a\s+|an\s+|some\s+)?(?:recipe\s+for\s+)?(.+?)(?:\s+recipe)?$/i,
  // Y-Live-11: "I'm thinking X" / "thinking X" / "thinking about|of X"
  /^(?:i'?m\s+)?thinking(?:\s+(?:about|of))?\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-11: "looking for X" / "I'm looking for X" / "searching for X"
  /^(?:i'?m\s+)?(?:looking|searching|hunting)\s+for\s+(?:a\s+|an\s+|some\s+)?(?:recipe\s+for\s+)?(.+?)(?:\s+recipe)?$/i,
  // Y-Live-11: "send me [a recipe for] X"
  /^send\s+me\s+(?:a\s+|an\s+|some\s+)?(?:recipe\s+for\s+)?(.+?)(?:\s+recipe)?$/i,
  // Y-Live-11: "got any X" / "got any X recipes"
  /^got\s+any\s+(.+?)(?:\s+recipes?)?$/i,
  // Y-Live-11: "any X recipes" / "any X recipe"
  /^any\s+(.+?)\s+recipes?$/i,
  // Y-Live-11: "fancy X" / "fancy a X" / "fancy some X" (British)
  /^fancy\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-11: "gimme X" / "gimme some X"
  /^gimme\s+(?:a\s+|an\s+|some\s+)?(?:recipe\s+for\s+)?(.+?)$/i,
  // Y-Live-11: "is there [a] X recipe"
  /^is\s+there\s+(?:a\s+|an\s+)?(.+?)\s+recipe$/i,
  // Y-Live-11: "whip [me] [up] X" / "throw together X" / "fix me X"
  /^(?:whip|throw)\s+(?:me\s+)?(?:up\s+|together\s+)?(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-14: "wanna (have|eat|cook|make|try) X"
  /^wanna\s+(?:have|eat|cook|make|try)\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-14: "could go for X" / "could use some X" / "I could go for X"
  /^(?:i\s+)?could\s+(?:go|use)\s+(?:for|some)\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-14: "down for X" / "I'm down for X"
  /^(?:i'?m\s+)?down\s+for\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-14: "got a craving for X"
  /^got\s+a\s+craving\s+for\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-14: "hit me with X" / "hit me up with X"
  /^hit\s+me\s+(?:up\s+with|with)\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-14: "gotta have X" / "gotta get X" / "gotta eat X" / "gotta try X"
  /^(?:i'?ve\s+)?gotta\s+(?:have|get|eat|try|make|cook)\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-14: "would love to (eat|cook|make|have|try) X" — explicit
  // food-verb infinitive form. Must come BEFORE the bare-form pattern
  // below so "I'd love to make pizza" captures "pizza" not "to make pizza".
  /^(?:(?:i\s+)?would|i'?d)\s+love\s+to\s+(?:eat|cook|make|have|try)\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-14: bare "would love X" / "I'd love X". Non-food infinitive
  // captures ("to travel", "to rest") get stripped + caught by TRIVIAL
  // via the sanitize "to" leading-strip.
  /^(?:(?:i\s+)?would|i'?d)\s+love\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-14: "dying for X" / "I'm dying for X"
  /^(?:i'?m\s+)?dying\s+for\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-15: "teach me [how to (make|cook|prepare|bake)] X"
  /^teach\s+me\s+(?:how\s+to\s+(?:make|cook|prepare|bake)\s+)?(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-15: "walk me through X" / "walk me through making X"
  /^walk\s+me\s+through\s+(?:making\s+|cooking\s+|baking\s+|preparing\s+)?(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-15: "I'll (have|eat|cook|make|try|grab) X" — paired with
  // adding `i'?ll` to CHAT_EXCLUSIONS so bare "I'll think about it" /
  // "I'll see you later" still bottom out at null.
  /^i'?ll\s+(?:have|eat|cook|make|try|grab)\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-15: "going to (make|cook|...) X" / "gonna make X" /
  // "I'm gonna make X" / "I'm going to make X".
  /^(?:i'?m\s+)?(?:going\s+to|gonna)\s+(?:make|cook|bake|prepare|eat|have|try|grab)\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-15: "treat me to X"
  /^treat\s+me\s+to\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-15: "surprise me with X" / "surprise me — X"
  /^surprise\s+me\s+(?:with\s+)?(?:a\s+|an\s+|some\s+)?(.+?)$/i,
  // Y-Live-11: catch-all "X recipe" — moved to the END so the more specific
  // verb-led patterns above ("looking for a sushi recipe", "any X recipes",
  // etc.) get first crack and don't trip the greedy capture here.
  /^(.+?)\s+recipe$/i,
];

export function detectRecipeAsk(text: unknown): RecipeAsk | null {
  if (typeof text !== 'string') return null;
  const original = cleanEnd(text);
  if (original.length === 0) return null;

  // Y-Live-11: two-pass explicit match. Pass 1 runs against the original
  // text so addressee-only inputs like "hey coach" still bottom out at
  // the bare-food fallback (where GREETING_EXCLUSIONS catches them).
  // Pass 2 retries against a greeting-stripped variant so prefixed
  // recipe asks ("hey, give me sushi" / "ok send me ramen" / "so what
  // about pad thai") still hit an explicit pattern.
  for (const t of [original, stripLeadingGreeting(original)]) {
    if (t.length === 0) continue;
    for (const p of EXPLICIT_PATTERNS) {
      const m = t.match(p);
      if (m && m[1]) {
        const q = sanitize(m[1]);
        if (q) return { query: q };
        // Match-but-trivial: e.g. "what about your weekend" → "your
        // weekend" → strip → "weekend" → TRIVIAL → null. Don't fall
        // through to bare-food fallback; the explicit pattern already
        // told us this isn't a recipe ask.
        return null;
      }
    }
  }

  // Bare-food fallback: 1-5 words, no chat-question markers, no "?".
  //
  // Y-Live-9: single-word food names ("Sushi", "carbonara", "ramen")
  // now auto-route. GREETING_EXCLUSIONS + the expanded TRIVIAL_QUERIES
  // set + a 3-character min on single-word inputs filter the noise
  // (greetings / ack filler / 2-char chars) that the old >=2-word
  // floor used to block.
  if (text.includes('?')) return null;
  if (CHAT_EXCLUSIONS.test(original)) return null;
  if (CHAT_PHRASE_EXCLUSIONS.test(original)) return null;
  if (GREETING_EXCLUSIONS.test(original)) return null;
  const wordCount = original.split(/\s+/).length;
  if (wordCount > 5) return null;
  if (wordCount === 1 && original.length < 3) return null;
  const q = sanitize(original);
  return q ? { query: q } : null;
}
