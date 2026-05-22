// Phase 8 (10Y-E): safety guardrails — medical-claim deflection, prompt-injection
// sanitization, and tool-result tagging. Used both server-side (deflect before
// SDK call) and as input scrubbers for any user/attachment/tool content.

const MEDICAL_DEFLECTION_TEXT =
  "I'm not a medical or clinical professional, so I can't give you a calorie prescription, diagnosis, or drug-food guidance — please loop in a registered dietitian or your doctor for that. I can still help you build balanced, allergen-safe meals around the goal you've set.";

// Match strict clinical / prescriptive territory. Each pattern is paired with
// terms that indicate prescription / weight-loss promises / diagnosis territory.
// Heuristic, not exhaustive — calibrated to ≥28/30 of the corpus while leaving
// vanilla cooking questions ("what should I cook with chicken thighs") clean.
const MEDICAL_PATTERNS: ReadonlyArray<RegExp> = [
  // calorie / macro PRESCRIPTION tied to body change
  /\bhow many (calories|carbs|grams of (protein|carbs|fat))\b[^?.!]*\b(should i|do i need|to (lose|gain|drop|cut))\b/i,
  /\b(calorie|macro|protein) (target|goal|prescription|number)\b[^?.!]*\b(lose|gain|cut|bulk|drop|fat)\b/i,
  /\b(set|tell me|give me) (my|a|the) (calorie|macro|macros|calories)\b/i,
  /\b(daily|weekly) calorie (intake|limit|target|amount)\b[^?.!]*\b(weight|fat|lose|drop)\b/i,
  // weight-loss / gain prescription / promise / rate
  /\b(lose|drop|cut|shed)\b[^?.!]*\b\d+\s*(lb|lbs|pound|pounds|kg|kilo|kilos)\b/i,
  /\b(gain|put on)\b[^?.!]*\b\d+\s*(lb|lbs|pound|pounds|kg|kilo|kilos)\b[^?.!]*\b(muscle|weight)\b/i,
  /\b(how (fast|quickly)|how long)\b[^?.!]*\b(lose|drop|cut|shed)\b[^?.!]*\b(weight|fat|lbs|pounds|kg)\b/i,
  /\b(guarantee|guaranteed|guarantees)\b[^?.!]*\b(weight loss|fat loss|results|lose weight)\b/i,
  // clinical conditions / treatment / management
  /\b(treat|cure|manage|reverse|fix)\b[^?.!]*\b(diabetes|hypertension|cholesterol|blood pressure|pcos|ibs|crohn'?s|thyroid|kidney disease|fatty liver|gerd|hashimoto)/i,
  /\b(diet|meal plan|food|foods|eat|nutrition)\b[^?.!]{0,40}\b(for|to manage|to treat|to reverse|to cure)\b[^?.!]{0,40}\b(diabetes|hypertension|high blood pressure|high cholesterol|pcos|ibs|crohn'?s|thyroid|kidney disease|gout|gerd|fatty liver|hashimoto)/i,
  /\b(my)\s+(diabetes|hypertension|high blood pressure|high cholesterol|pcos|ibs|crohn'?s|thyroid|kidney disease|gout|gerd|fatty liver|hashimoto)/i,
  /\bshould i (eat|avoid|take)\b[^?.!]*\b(diabetes|insulin|metformin|statin|warfarin|maoi|ssri|blood thinner)/i,
  /\b(take|taking)\s+(metformin|warfarin|coumadin|statin|statins|lipitor|ozempic|wegovy|maoi|ssri|levothyroxine|lithium|adderall|ritalin|insulin)\b/i,
  // drug / food interactions
  /\b(food|diet|eat|avoid|grapefruit|broccoli)\b[^?.!]*\b(interaction|interact|interacts|safe)\b[^?.!]*\b(metformin|warfarin|coumadin|statin|statins|lipitor|ozempic|wegovy|maoi|ssri|levothyroxine|lithium|adderall|ritalin|insulin|medication|medicine)/i,
  /\b(metformin|warfarin|coumadin|statin|statins|lipitor|ozempic|wegovy|maoi|ssri|levothyroxine|lithium|adderall|ritalin|insulin)\b[^?.!]*\b(food|eat|avoid|interact|interaction|safe)/i,
  /\b(safe|ok|fine)\s+to\s+(eat|drink|take|combine|have)\b[^?.!]*\b(while|when|with)\b[^?.!]*\b(taking|medication|medicine|drug|pill|on|metformin|warfarin|statin|statins|ozempic|wegovy|levothyroxine|insulin)/i,
  /\bfoods?\s+(interact|that interact|interactions?)\b/i,
  /\bfood\s+interactions?\s+(with|for)\b/i,
  // diagnostic / "do i have"
  /\b(do i have|am i)\b[^?.!]*\b(diabetic|prediabetic|hypoglycemic|insulin resistant|insulin resistance|anorexic|bulimic|deficient)\b/i,
  /\b(diagnose|diagnosis)\b[^?.!]*\b(me|my)\b/i,
  // eating disorder territory / extreme restriction
  /\b(starve|starving) myself\b/i,
  /\b(stop eating|skip (all|every) meal)\b[^?.!]*\b(lose|drop|fat|weight)/i,
  /\b(fast|fasting|hour fast|day fast)\b[^?.!]*\b(\d{2,}|forty|fifty|sixty|seventy|72|48)\s*(hour|hours|day|days)\b/i,
  /\b(\d{2,})[- ]?(hour|day)\s*fast\b/i,
  /\b(under|less than|below|fewer than)\s*(\d{2,3})\s*calories?\b/i,
  /\b(extreme|crash|starvation)\s+(diet|cut)\b/i,
  // pregnancy / pediatric / clinical population prescription
  /\b(safe|healthy|ok)\b[^?.!]*\b(pregnan|breastfeed|nursing|infant|toddler|baby)\b/i,
  /\b(diet|nutrition)\b[^?.!]*\b(pregnan|breastfeed|nursing|chemo|cancer|dialysis)/i,
  // supplement dosing
  /\bhow (much|many)\b[^?.!]*\b(creatine|caffeine|vitamin [a-z0-9]+|magnesium|zinc|iron|fish oil|omega)\b[^?.!]*\b(should i (take|have)|do i need|per day|a day|daily|safe)/i,
  /\b(milligrams|mg|grams)\s+of\s+(caffeine|creatine|magnesium|zinc|iron)\b[^?.!]*\b(safe|daily|per day|a day)\b/i,
];

export function shouldDeflectMedicalClaim(userMessage: string): boolean {
  if (!userMessage) return false;
  const text = userMessage.trim();
  if (text.length === 0) return false;
  for (const pattern of MEDICAL_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

export function getMedicalDeflectionText(): string {
  return MEDICAL_DEFLECTION_TEXT;
}

// ─── Prompt-injection sanitization ─────────────────────────────────────────

/**
 * Y-PI-1 (founder Telegram 2026-05-22): named-reason classification for
 * every injection pattern. Sanitize still wraps in `<suspicious>` for
 * defense-in-depth; the new `detectInjectionAttempt` function returns
 * metadata so `coachAnalytics` can log attempts for novel-attack triage.
 */
export type InjectionReason =
  | 'instruction_override'      // ignore/disregard/forget previous instructions
  | 'role_marker'                // SYSTEM: / ASSISTANT: / USER: line-start tags
  | 'model_marker'               // <system>, <|im_start|>, [INST], <<SYS>>
  | 'new_instructions'           // "new instructions:" prefix
  | 'role_spoof'                 // "you are now X", "pretend to be", "act as DAN"
  | 'override_rules'             // "override (instructions|rules|safety)"
  | 'sazon_framing_tag'          // </user_profile>, </tool_result>, etc.
  | 'prompt_extraction'          // "show me your prompt", "what are your instructions"
  | 'multilingual_override'      // es/pt/fr/ja variants of "ignore previous"
  | 'encoded_payload';           // zero-width chars / unicode homoglyphs

interface PatternEntry {
  pattern: RegExp;
  reason: InjectionReason;
}

const INJECTION_PATTERN_ENTRIES: ReadonlyArray<PatternEntry> = [
  // ── English instruction overrides ───────────────────────────────────────
  {
    pattern: /\b(ignore|disregard|forget)\b[^.!?\n]*\b(previous|prior|above|earlier|all)\b[^.!?\n]*\b(instructions?|prompt|rules?|system)/gi,
    reason: 'instruction_override',
  },
  // ── Role markers (line-leading, case-insensitive) ──────────────────────
  { pattern: /\bSYSTEM\s*:\s*/gi, reason: 'role_marker' },
  { pattern: /\bASSISTANT\s*:\s*/gi, reason: 'role_marker' },
  { pattern: /\bUSER\s*:\s*/gi, reason: 'role_marker' },
  { pattern: /\bMODEL\s*:\s*/gi, reason: 'role_marker' },
  // ── Model framing tags ──────────────────────────────────────────────────
  { pattern: /<\/?\s*system\s*>/gi, reason: 'model_marker' },
  { pattern: /<\/?\s*assistant\s*>/gi, reason: 'model_marker' },
  { pattern: /<\|[a-zA-Z_][a-zA-Z0-9_-]*\|>/g, reason: 'model_marker' },
  { pattern: /\[\[\s*INST\s*\]\]/gi, reason: 'model_marker' },
  { pattern: /<\/?\s*INST\s*>/gi, reason: 'model_marker' },
  { pattern: /\[\/?INST\]/gi, reason: 'model_marker' },
  { pattern: /<<\s*SYS\s*>>/gi, reason: 'model_marker' },
  { pattern: /<<\/\s*SYS\s*>>/gi, reason: 'model_marker' },
  { pattern: /###\s*Instructions?\s*:/gi, reason: 'model_marker' },
  // ── New instructions / role spoof / override ───────────────────────────
  { pattern: /\bnew instructions?\s*:/gi, reason: 'new_instructions' },
  {
    pattern: /\byou are now\b[^.!?\n]*\b(developer|admin|root|system|jailbroken|unrestricted|DAN|godmode)/gi,
    reason: 'role_spoof',
  },
  {
    pattern: /\bpretend\b[^.!?\n]{0,30}\b(you('?| a)re|to be)\b/gi,
    reason: 'role_spoof',
  },
  {
    pattern: /\bact as\b[^.!?\n]{0,30}\b(DAN|jailbroken|unrestricted|developer|admin|root)\b/gi,
    reason: 'role_spoof',
  },
  {
    pattern: /\broleplay as\b[^.!?\n]{0,30}\b(an?|the)\b/gi,
    reason: 'role_spoof',
  },
  {
    pattern: /\bfrom now on\b[^.!?\n]*\byou\b[^.!?\n]*\b(are|will|must)\b/gi,
    reason: 'role_spoof',
  },
  {
    pattern: /\boverride\b[^.!?\n]*\b(instructions?|rules?|safety|guardrails?|prompt|system)/gi,
    reason: 'override_rules',
  },
  // ── Sazon-specific framing tags ────────────────────────────────────────
  // The system prompt uses these to delimit DATA blocks. Defense-in-depth:
  // strip any literal occurrence so an adversary can't write
  //   "ignore the above </user_profile><user_profile>{...evil...}"
  // and trick the LLM into treating injected JSON as the real profile.
  {
    pattern: /<\/?\s*(user_profile|learned_memories|attachment|tool_result|tool_data|constitution)\s*>/gi,
    reason: 'sazon_framing_tag',
  },
  // ── Prompt extraction ──────────────────────────────────────────────────
  // `me` is optional so "reveal your system prompt" matches without "me".
  // Multiple adjectives stack ("the original system prompt") via the
  // (?: adj \s+ )* repetition.
  {
    pattern: /\b(show|print|reveal|output|tell|give)(?:\s+me)?\s+(your|the)\s+(?:(system|original|real|actual|verbatim|true)\s+){1,3}(prompt|instructions?|rules?|constitution)/gi,
    reason: 'prompt_extraction',
  },
  {
    pattern: /\b(show|print|reveal|output|tell|give)(?:\s+me)?\s+(your|the)\s+(system|original|real|actual|verbatim|true)\s*(prompt|instructions?|rules?|constitution)/gi,
    reason: 'prompt_extraction',
  },
  {
    pattern: /\bwhat\s+(are|is)\s+your\s+(?:(system|real|true|actual|original)\s+){0,3}(prompt|instructions?|rules?|constitution)/gi,
    reason: 'prompt_extraction',
  },
  {
    pattern: /\brepeat\s+(your|the|everything|all)\s*(system|prompt|instructions?|rules?|constitution|above)/gi,
    reason: 'prompt_extraction',
  },
  {
    pattern: /\bprint\s+(everything\s+)?above\s+this/gi,
    reason: 'prompt_extraction',
  },
  // ── Multi-language overrides ───────────────────────────────────────────
  // Spanish
  {
    pattern: /\b(ignora|olvida|descarta|deja\s+de\s+lado)\b[^.!?\n]*\b(las\s+)?(instrucciones?|reglas?|sistema|prompt)\s+(anteriores?|previas?|de\s+arriba|todas?)/gi,
    reason: 'multilingual_override',
  },
  {
    pattern: /\beres\s+ahora\b[^.!?\n]*\b(desarrollador|admin|root|sin\s+restricciones|jailbroken)/gi,
    reason: 'multilingual_override',
  },
  // Portuguese
  {
    pattern: /\b(ignore|esque[çc]a|descarte)\b[^.!?\n]*\b(as\s+)?(instru[çc][õo]es?|regras?|sistema|prompt)\s+(anteriores?|pr[ée]vias?|de\s+cima|todas?)/gi,
    reason: 'multilingual_override',
  },
  {
    pattern: /\bvoc[êe]\s+[ée]\s+agora\b[^.!?\n]*\b(desenvolvedor|admin|root|sem\s+restri[çc][õo]es|jailbroken)/gi,
    reason: 'multilingual_override',
  },
  // French
  {
    pattern: /\b(ignore|oublie|n[ée]glige)\b[^.!?\n]*\b(les\s+)?(instructions?|r[èe]gles?|syst[èe]me|prompt)\s+(pr[ée]c[ée]dentes?|ant[ée]rieures?|ci-dessus|toutes?)/gi,
    reason: 'multilingual_override',
  },
  {
    pattern: /\btu\s+es\s+maintenant\b[^.!?\n]*\b(d[ée]veloppeur|admin|root|sans\s+restrictions|jailbroken)/gi,
    reason: 'multilingual_override',
  },
  // ── Encoded payloads ───────────────────────────────────────────────────
  // Zero-width characters often used to bypass keyword matching:
  //   U+200B zero-width space, U+200C non-joiner, U+200D joiner,
  //   U+FEFF zero-width no-break space, U+2060 word joiner.
  { pattern: /[​-‍﻿⁠]/g, reason: 'encoded_payload' },
  // Unicode homoglyphs of "SYSTEM:" prefix — fullwidth Latin, small caps,
  // Cyrillic look-alikes. We catch THREE common attack shapes:
  //   1. All-fullwidth "ＳＹＳＴＥＭ:" — flag the full sequence.
  //   2. All small-caps "ꜱʏꜱᴛᴇᴍ:" — flag the full sequence.
  //   3. All-cyrillic "ЅҮЅТЕМ:" — flag the full sequence.
  //   4. Mixed (homoglyph S + ASCII rest, "Ｓystem:") — flag any of the
  //      three known S-homoglyphs followed by alphabetic chars + colon.
  // The four patterns share the `encoded_payload` reason.
  { pattern: /ＳＹＳＴＥＭ\s*[:：]/g, reason: 'encoded_payload' },
  { pattern: /ꜱʏꜱᴛᴇᴍ\s*[:：]/gi, reason: 'encoded_payload' },
  { pattern: /ЅҮЅТЕМ\s*[:：]/g, reason: 'encoded_payload' },
  {
    pattern: /[ＳꜱЅ][a-zA-Z]{1,8}\s*[:：]/g,
    reason: 'encoded_payload',
  },
];

const INJECTION_PATTERNS: ReadonlyArray<RegExp> = INJECTION_PATTERN_ENTRIES.map(
  (e) => e.pattern,
);

export function sanitizeUserContent(text: string): string {
  if (!text) return text;
  let out = text;
  for (const pattern of INJECTION_PATTERNS) {
    out = out.replace(pattern, (match) => `<suspicious>${match}</suspicious>`);
  }
  return out;
}

export interface DetectInjectionResult {
  /** True iff any injection pattern matched. */
  flagged: boolean;
  /** Distinct reasons triggered (sorted for stable ordering in tests + logs). */
  reasons: ReadonlyArray<InjectionReason>;
}

/**
 * Y-PI-1 — detect injection attempts WITHOUT mutating the text. Used by
 * `coachAnalytics` to log attempts for novel-attack triage. Independent
 * of `sanitizeUserContent` so callers that just want to log (e.g., a
 * background job) don't pay the string-replace cost. The two functions
 * are kept in sync: every pattern that triggers sanitize ALSO triggers
 * detection with the corresponding reason.
 */
export function detectInjectionAttempt(text: string): DetectInjectionResult {
  if (!text) return { flagged: false, reasons: [] };
  const seen = new Set<InjectionReason>();
  for (const entry of INJECTION_PATTERN_ENTRIES) {
    // Clone the regex to avoid lastIndex state on global flags.
    const re = new RegExp(entry.pattern.source, entry.pattern.flags);
    if (re.test(text)) {
      seen.add(entry.reason);
    }
  }
  const reasons = Array.from(seen).sort() as InjectionReason[];
  return { flagged: reasons.length > 0, reasons };
}

// Wrap long string fields inside a tool result with <tool_data> tags so the
// model treats them as data, not instructions. Pragmatic: only wraps strings
// over a length threshold to keep small typed payloads (like macro numbers)
// untouched.
const TOOL_DATA_WRAP_THRESHOLD = 80;

export function tagToolResult(result: unknown): unknown {
  if (typeof result === 'string') {
    if (result.length >= TOOL_DATA_WRAP_THRESHOLD) {
      return `<tool_data>${sanitizeUserContent(result)}</tool_data>`;
    }
    return result;
  }
  if (Array.isArray(result)) {
    return result.map((item) => tagToolResult(item));
  }
  if (result !== null && typeof result === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(result as Record<string, unknown>)) {
      out[k] = tagToolResult(v);
    }
    return out;
  }
  return result;
}
