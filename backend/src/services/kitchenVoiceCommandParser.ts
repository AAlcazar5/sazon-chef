// backend/src/services/kitchenVoiceCommandParser.ts
// ROADMAP 4.0 Tier C8 — Kitchen mode voice command parser.
//
// Pure transcript-string-to-intent function. Caller (frontend Kitchen mode)
// owns voice transcription + side effects (advance step, start timer, etc).
//
// Hands-on cooking with messy hands is the worst time to tap a phone. Voice
// commands during cooking solve that — but only if the parser is forgiving
// of how people actually talk.

export type KitchenVoiceIntent =
  | { kind: 'next-step' }
  | { kind: 'previous-step' }
  | { kind: 'jump-to'; step: number }
  | { kind: 'timer'; minutes: number }
  | { kind: 'temperature-query' }
  | { kind: 'unknown' };

const MAX_TIMER_MINUTES = 180;
const UNKNOWN: KitchenVoiceIntent = { kind: 'unknown' };

/**
 * Strip leading wake-word variants ("Sazon", "hey Sazon", optionally with a
 * comma) so downstream regexes can match against the bare command.
 */
function stripWakeWord(transcript: string): string {
  let s = transcript.trim();
  s = s.replace(/^hey\s+sazon[\s,]+/i, '');
  s = s.replace(/^sazon[\s,]+/i, '');
  return s.trim();
}

const NEXT_STEP_RX = /\b(next\s*step|continue|next)\b/i;
const PREVIOUS_STEP_RX = /\b(previous\s*step|previous|go\s*back|back)\b/i;
// Captures group 1 = step number
const JUMP_TO_RX = /(?:go\s*to\s+step|jump\s*to\s+step|i'?m\s+at\s+step|step)\s+(\d+)\b/i;
const TIMER_RX = /(?:(\d+)\s*(?:-?\s*)minute|set\s+(?:a\s+)?(?:\d+\s*minute\s+)?timer\s+(\d+)|timer\s+(\d+)|(?:\d+)\s*min\b)/i;
const TEMP_RX = /\b(temp(?:erature)?|temp(?:erature)?\s+for|what'?s\s+the\s+temp(?:erature)?)\b/i;

export function parseKitchenVoiceCommand(transcript: unknown): KitchenVoiceIntent {
  if (typeof transcript !== 'string' || transcript.trim().length === 0) {
    return UNKNOWN;
  }
  const cleaned = stripWakeWord(transcript);
  if (cleaned.length === 0) return UNKNOWN;

  // Order matters — jump-to and timer both contain numbers; temperature is
  // checked first, then jump-to, then timer, then step navigation.

  // Temperature query — short, distinctive, and we want it before jump-to
  // so "temp for this step" doesn't match step navigation.
  if (TEMP_RX.test(cleaned)) {
    return { kind: 'temperature-query' };
  }

  // Jump-to (must include a numeric step).
  const jumpMatch = cleaned.match(JUMP_TO_RX);
  if (jumpMatch) {
    const stepNum = parseInt(jumpMatch[1], 10);
    if (Number.isFinite(stepNum) && stepNum >= 1 && stepNum <= 200) {
      return { kind: 'jump-to', step: stepNum };
    }
  }

  // Timer — captures from 1..3 alternations
  // Use a more focused pattern set: explicit "N minute timer" / "timer N" /
  // "set timer N" / "N minutes" embedded in a request.
  const timerPatterns: RegExp[] = [
    /(?:set|start)\s+(?:a\s+)?(\d+)\s*-?\s*(?:minute|min)s?\s+timer/i,
    /timer\s+(?:for\s+)?(\d+)\s*(?:minute|min)s?/i,
    /(\d+)\s*(?:minute|min)s?\s+timer/i,
    /(\d+)\s*(?:minute|min)s?\s+timer/i,
  ];
  for (const rx of timerPatterns) {
    const m = cleaned.match(rx);
    if (m) {
      const minutes = parseInt(m[1], 10);
      if (Number.isFinite(minutes) && minutes > 0 && minutes <= MAX_TIMER_MINUTES) {
        return { kind: 'timer', minutes };
      }
      // Number out of range → fall through (unknown).
      return UNKNOWN;
    }
  }

  // Bare "set timer" with no duration is unknown.
  if (/^set\s+timer$/i.test(cleaned) || /^timer$/i.test(cleaned)) {
    return UNKNOWN;
  }

  if (PREVIOUS_STEP_RX.test(cleaned)) {
    return { kind: 'previous-step' };
  }

  if (NEXT_STEP_RX.test(cleaned)) {
    return { kind: 'next-step' };
  }

  return UNKNOWN;
}
