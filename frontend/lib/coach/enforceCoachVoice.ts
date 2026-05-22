// frontend/lib/coach/enforceCoachVoice.ts
//
// Y-Voice-7 (founder Telegram 2026-05-22, "still getting wall of text on
// general responses"): post-stream cap on Sazon coach replies. The server
// persona prompt says "3 sentences max", "no preamble", "no question
// stacks" — but the LLM drifts under load and the user keeps seeing
// 5-paragraph replies. This is the safety net.
//
// Pure function. Runs after the stream completes; the streamed deltas
// still render live during typing, but the final stored message + any
// re-render reads through this enforcement. Deterministic + testable so
// future regressions surface immediately.
//
// Three layers applied in order:
//   1. Preamble strip — leading interjections like "Sure!" / "Of course!"
//      / "Let me think…" / "Great question!" that don't carry information.
//   2. Sentence cap — keep at most `maxSentences` (default 3) terminated
//      sentences. Splits on `[.!?]\s+` (or end-of-string).
//   3. Question-stack strip — if the LAST kept sentence is a stacked
//      question (contains " or " between two `?` segments), drop it OR
//      collapse to its first alternative.

export interface EnforceCoachVoiceOptions {
  /** Max sentences in the final reply. Default 3. */
  maxSentences?: number;
  /** Strip "Sure!", "Of course!", "Let me think…" leading interjections. */
  stripPreamble?: boolean;
  /** Drop trailing "X? or Y? or Z?" question stacks. */
  stripQuestionStacks?: boolean;
}

export interface EnforceCoachVoiceResult {
  /** Cleaned output. */
  text: string;
  /** True iff a preamble was removed. */
  preambleStripped: boolean;
  /** True iff one or more trailing sentences were truncated. */
  truncated: boolean;
  /** True iff a trailing question-stack was dropped. */
  questionsStripped: boolean;
}

// ── Preamble patterns ──────────────────────────────────────────────────
//
// Each entry strips a leading interjection + the trailing punctuation +
// whitespace. Conservative — only matches known opener phrases so we don't
// chop the first words of legitimate one-liners. Order: longer phrases
// before shorter, so "Of course!" wins before "Of".

const PREAMBLE_PATTERNS: RegExp[] = [
  /^(?:i'?d\s+be\s+happy\s+to(?:\s+help)?)\s*[!,.…—\-]*\s*/i,
  /^(?:happy\s+to\s+help)\s*[!,.…—\-]*\s*/i,
  /^(?:great\s+question)\s*[!,.…—\-]*\s*/i,
  /^(?:good\s+question)\s*[!,.…—\-]*\s*/i,
  /^(?:let\s+me\s+(?:think|see|check)(?:\s+about\s+that)?)\s*[!,.…—\-]*\s*/i,
  /^(?:of\s+course)\s*[!,.…—\-]*\s*/i,
  /^(?:absolutely)\s*[!,.…—\-]*\s*/i,
  /^(?:certainly)\s*[!,.…—\-]*\s*/i,
  /^(?:definitely)\s*[!,.…—\-]*\s*/i,
  /^(?:sure(?:\s+thing)?)\s*[!,.…—\-]*\s*/i,
  /^(?:no\s+problem)\s*[!,.…—\-]*\s*/i,
  /^(?:my\s+pleasure)\s*[!,.…—\-]*\s*/i,
  /^(?:gotcha)\s*[!,.…—\-]*\s*/i,
  /^(?:got\s+it)\s*[!,.…—\-]*\s*/i,
  /^(?:awesome)\s*[!,.…—\-]*\s*/i,
  /^(?:perfect)\s*[!,.…—\-]*\s*/i,
  /^(?:lovely)\s*[!,.…—\-]*\s*/i,
  /^(?:nice)\s*[!,.…—\-]*\s*/i,
  /^(?:okay|ok)\s*[!,.…—\-]+\s*/i, // require punctuation after to avoid "OK pasta"
  /^(?:alright)\s*[!,.…—\-]+\s*/i,
];

function stripPreamble(input: string): { text: string; stripped: boolean } {
  let text = input;
  let stripped = false;
  // Apply iteratively — the LLM stacks multiple ("Sure! Of course! Let me…").
  // Bound the loop to prevent any pathological regex from looping forever.
  for (let i = 0; i < 6; i += 1) {
    let matched = false;
    for (const pattern of PREAMBLE_PATTERNS) {
      const next = text.replace(pattern, '');
      if (next !== text) {
        text = next;
        matched = true;
        stripped = true;
        break;
      }
    }
    if (!matched) break;
  }
  return { text: text.trimStart(), stripped };
}

// ── Sentence cap ───────────────────────────────────────────────────────

/**
 * Split prose into sentences. Lightweight — splits on terminating
 * punctuation followed by whitespace OR end-of-string. Returns the
 * terminator with each sentence so re-joining produces the original
 * formatting.
 */
function splitSentences(input: string): string[] {
  const out: string[] = [];
  // Match: anything up to (?: [.!?…] (?:\s+|$) ). Allow consecutive
  // terminators (e.g. "?!") to stay together via [.!?…]+.
  const re = /[^.!?…]+[.!?…]+(?:\s+|$)|[^.!?…]+$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    const piece = m[0];
    if (piece.trim().length > 0) out.push(piece);
  }
  return out;
}

/**
 * Cap the input at `maxSentences`. Returns the joined output (preserving
 * original trailing whitespace per sentence) and a flag noting whether any
 * sentence was dropped.
 */
function capSentences(
  input: string,
  maxSentences: number,
): { text: string; truncated: boolean } {
  const sentences = splitSentences(input);
  if (sentences.length <= maxSentences) {
    return { text: input, truncated: false };
  }
  const kept = sentences.slice(0, maxSentences).join('').trimEnd();
  return { text: kept, truncated: true };
}

// ── Question-stack strip ───────────────────────────────────────────────

/**
 * Detects + drops a trailing "X? or Y? or Z?" question stack — the LLM's
 * favorite voice violation. If the LAST kept sentence is a stacked
 * question (one `?` plus an " or " followed by more options), drop it
 * entirely. The earlier sentences carry the actual content; the stack
 * just interrogates.
 */
function stripQuestionStack(
  input: string,
): { text: string; stripped: boolean } {
  const sentences = splitSentences(input);
  if (sentences.length < 2) return { text: input, stripped: false };

  // Walk backwards counting trailing question sentences. A "stack" is
  // 2+ consecutive trailing questions, OR a final question that itself
  // lists alternatives (" or "/"or").
  let trailingQs = 0;
  for (let i = sentences.length - 1; i >= 0; i -= 1) {
    if (/\?[!\s]*$/.test(sentences[i].trim())) {
      trailingQs += 1;
    } else {
      break;
    }
  }
  const last = sentences[sentences.length - 1].trim();
  const lastHasOrAlts = /\?/.test(last) && /\bor\b/i.test(last);
  const lastHasMultipleQs = (last.match(/\?/g)?.length ?? 0) >= 2;
  const isStack = trailingQs >= 2 || lastHasOrAlts || lastHasMultipleQs;
  if (!isStack) return { text: input, stripped: false };

  // Need at least one non-question sentence to keep — otherwise the
  // reply is JUST a question, which we leave alone.
  const stripCount = Math.max(trailingQs, 1);
  if (sentences.length - stripCount <= 0) return { text: input, stripped: false };

  const kept = sentences.slice(0, sentences.length - stripCount).join('').trimEnd();
  return { text: kept, stripped: true };
}

// ── Public ─────────────────────────────────────────────────────────────

export function enforceCoachVoice(
  input: string,
  options: EnforceCoachVoiceOptions = {},
): EnforceCoachVoiceResult {
  const maxSentences = options.maxSentences ?? 3;
  const wantPreamble = options.stripPreamble ?? true;
  const wantQuestions = options.stripQuestionStacks ?? true;

  if (typeof input !== 'string' || input.length === 0) {
    return {
      text: input ?? '',
      preambleStripped: false,
      truncated: false,
      questionsStripped: false,
    };
  }

  let text = input.trim();
  let preambleStripped = false;
  if (wantPreamble) {
    const r = stripPreamble(text);
    text = r.text;
    preambleStripped = r.stripped;
  }
  // Run sentence cap BEFORE question-stack so the stack detection only
  // runs on the kept tail (avoids dropping a question that lived in
  // sentence #4 we already dropped).
  const cap = capSentences(text, maxSentences);
  text = cap.text;
  let questionsStripped = false;
  if (wantQuestions) {
    const q = stripQuestionStack(text);
    text = q.text;
    questionsStripped = q.stripped;
  }
  return {
    text: text.trim(),
    preambleStripped,
    truncated: cap.truncated,
    questionsStripped,
  };
}
