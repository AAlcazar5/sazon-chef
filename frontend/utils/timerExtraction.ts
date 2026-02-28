// frontend/utils/timerExtraction.ts
// Extracts timer suggestions from recipe instruction text

export interface ExtractedTimer {
  /** Short label, e.g. "Bake" or "Simmer" */
  label: string;
  /** Total duration in minutes */
  minutes: number;
}

// Patterns that signal the start of a timed action
const ACTION_WORDS = /\b(bake|roast|cook|simmer|boil|fry|sauté|saute|grill|steam|broil|marinate|chill|refrigerate|freeze|rest|cool|heat|warm|microwave|reduce|let stand|stand|wait|soak|steep|knead|rise|proof)\b/i;

// Duration patterns (order matters — most specific first)
const DURATION_PATTERNS: Array<{ re: RegExp; toMinutes: (m: RegExpMatchArray) => number }> = [
  // "1 hour 30 minutes" / "1 hr 30 min"
  {
    re: /(\d+)\s*(?:hours?|hrs?)\s+(\d+)\s*(?:minutes?|mins?)/i,
    toMinutes: (m) => parseInt(m[1], 10) * 60 + parseInt(m[2], 10),
  },
  // "1.5 hours"
  {
    re: /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i,
    toMinutes: (m) => Math.round(parseFloat(m[1]) * 60),
  },
  // "25-30 minutes"
  {
    re: /(\d+)\s*[-–]\s*(\d+)\s*(?:minutes?|mins?)/i,
    toMinutes: (m) => Math.round((parseInt(m[1], 10) + parseInt(m[2], 10)) / 2),
  },
  // "25 minutes"
  {
    re: /(\d+)\s*(?:minutes?|mins?)/i,
    toMinutes: (m) => parseInt(m[1], 10),
  },
  // "30 seconds" → round up to 1 min
  {
    re: /(\d+)\s*(?:seconds?|secs?)/i,
    toMinutes: () => 1,
  },
];

/**
 * Extracts cooking timers from a single instruction step.
 * Returns an array because some steps have multiple timed phases.
 * Minimum timer: 1 minute. Maximum: 8 hours (480 min) — sanity cap.
 */
export function extractTimers(stepText: string): ExtractedTimer[] {
  const results: ExtractedTimer[] = [];
  const seen = new Set<number>(); // Dedup by duration

  // Walk through the text looking for duration matches
  let remaining = stepText;

  for (const { re, toMinutes } of DURATION_PATTERNS) {
    const globalRe = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    let match: RegExpExecArray | null;

    while ((match = globalRe.exec(remaining)) !== null) {
      const minutes = toMinutes(match);
      if (minutes < 1 || minutes > 480 || seen.has(minutes)) continue;
      seen.add(minutes);

      // Find a nearby action word before this match (within 60 chars)
      const prefix = remaining.substring(Math.max(0, match.index - 60), match.index);
      const actionMatch = prefix.match(ACTION_WORDS);
      const rawLabel = actionMatch
        ? capitalize(actionMatch[0])
        : 'Timer';

      results.push({ label: rawLabel, minutes });
    }
  }

  return results;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/** Format minutes as human-readable string: "25 min", "1 hr 30 min", "2 hrs" */
export function formatDuration(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m === 0) return `${h} hr${h > 1 ? 's' : ''}`;
  return `${h} hr ${m} min`;
}

/** Format remaining seconds as MM:SS */
export function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
