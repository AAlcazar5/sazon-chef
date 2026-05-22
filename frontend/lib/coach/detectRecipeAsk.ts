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
  // Y-Live-9: follow-up acknowledgments + filler that pass the new
  // single-word path.
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
]);

function cleanEnd(s: string): string {
  return s.replace(/[?!.]+$/, '').trim();
}

function sanitize(q: string | undefined | null): string | null {
  if (!q) return null;
  const c = cleanEnd(q);
  if (c.length < 2) return null;
  if (TRIVIAL_QUERIES.has(c.toLowerCase())) return null;
  return c;
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
  // X recipe (e.g., "carbonara recipe")
  /^(.+?)\s+recipe$/i,
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
  // Y-Live-10: "let's (do|make|have|try|cook|eat) X"
  /^let'?s\s+(?:do|make|have|try|cook|eat)\s+(?:a\s+|an\s+|some\s+)?(.+?)$/i,
];

export function detectRecipeAsk(text: unknown): RecipeAsk | null {
  if (typeof text !== 'string') return null;
  const t = cleanEnd(text);
  if (t.length === 0) return null;

  for (const p of EXPLICIT_PATTERNS) {
    const m = t.match(p);
    if (m && m[1]) {
      const q = sanitize(m[1]);
      if (q) return { query: q };
    }
  }

  // Bare-food fallback: 1-5 words, no chat-question markers, no "?".
  //
  // Y-Live-9 (founder Telegram 2026-05-22, "Sushi" miss): single-word
  // food names ("Sushi", "carbonara", "ramen") now auto-route to a
  // recipe card. The original >=2-word floor was protecting against
  // greetings + acknowledgments leaking through — that role is now
  // covered by GREETING_EXCLUSIONS + the expanded TRIVIAL_QUERIES set
  // + a 3-character min-length floor that drops "ok" / "no" / etc.
  if (text.includes('?')) return null;
  if (CHAT_EXCLUSIONS.test(t)) return null;
  if (GREETING_EXCLUSIONS.test(t)) return null;
  const wordCount = t.split(/\s+/).length;
  if (wordCount > 5) return null;
  // Single-word inputs need a min length to reject 2-char filler ("ok"
  // would be in TRIVIAL too, but defensive: any 1-2 char input is noise).
  if (wordCount === 1 && t.length < 3) return null;
  const q = sanitize(t);
  return q ? { query: q } : null;
}
