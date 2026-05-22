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
const CHAT_EXCLUSIONS =
  /\b(why|how come|can you|tell me|explain|do you|will it|is it|should i|what (does|is|should|can|to)|i'?m|i am|i think|i feel|i don'?t|plan|schedule|suggest|recommend|help me)\b/i;

// Y-Live-8: multi-word greetings/openers were slipping past
// CHAT_EXCLUSIONS into the bare-food fallback ("Hi coach" → wedge).
// Single-word greetings are already filtered by the wordCount>=2 rule.
const GREETING_EXCLUSIONS =
  /\b(hi|hello|hey|yo|sup|howdy|thanks|thank\s+you|bye|good\s+(morning|afternoon|evening|night))\b/i;

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
]);

function cleanEnd(s: string): string {
  return s.replace(/[?!.]+$/, '').trim();
}

// Y-Live-11: strip leading greeting + optional comma so "hey, give me sushi"
// behaves the same as "give me sushi". Conservative — only strips the
// known greeting set so we don't drop meaningful prefix words.
const LEADING_GREETING =
  /^(?:hey|hi|hello|yo|yeah|ok|okay|so|alright)[,!\s]+/i;

function stripLeadingGreeting(s: string): string {
  return s.replace(LEADING_GREETING, '').trim();
}

function sanitize(q: string | undefined | null): string | null {
  if (!q) return null;
  // Y-Live-11: strip leading possessive + demonstrative pronoun so
  // "what about your weekend" / "let's do this" / "I'm thinking about
  // my life" collapse to the noun, which then trips TRIVIAL_QUERIES.
  const stripped = cleanEnd(q)
    .replace(/^(?:my|your|his|her|our|their|its|this|that|these|those)\s+/i, '')
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
  if (GREETING_EXCLUSIONS.test(original)) return null;
  const wordCount = original.split(/\s+/).length;
  if (wordCount > 5) return null;
  if (wordCount === 1 && original.length < 3) return null;
  const q = sanitize(original);
  return q ? { query: q } : null;
}
