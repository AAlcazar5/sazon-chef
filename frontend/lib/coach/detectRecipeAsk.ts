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

  // Bare-food fallback: 2-5 words, no chat-question markers, no "?".
  // Single-word inputs ("hello", "carbonara") are too noisy — they catch
  // greetings as recipe asks. Users typing one food word can use
  // explicit phrasing (e.g., "carbonara recipe", "find me carbonara").
  if (text.includes('?')) return null;
  if (CHAT_EXCLUSIONS.test(t)) return null;
  if (GREETING_EXCLUSIONS.test(t)) return null;
  const wordCount = t.split(/\s+/).length;
  if (wordCount < 2 || wordCount > 5) return null;
  const q = sanitize(t);
  return q ? { query: q } : null;
}
