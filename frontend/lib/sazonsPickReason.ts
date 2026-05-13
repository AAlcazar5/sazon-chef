// P3 retention — Sazon's Pick reason composer.
//
// Builds the 1-line "I picked this because…" copy for <SazonsPickCard />.
// Inputs come from already-loaded client state (no extra fetches). Voice:
// curious + observational, never coachy. Returns a single string that
// always reads like Sazon talking to a friend who texts back.

import { suggestAdjacentCuisine } from './cuisineAdjacencySuggestion';
import { welcomeLine } from './cuisineNeighbors';

const norm = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, '-');

const titleCase = (s: string): string => {
  if (!s) return '';
  return s
    .split(/[\s-]+/)
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
};

interface ReasonInputs {
  /** Cuisine of the recipe Sazon picked. */
  pickCuisine?: string | null;
  /** Cuisine of the user's most-recent cook (for adjacency hooks). */
  lastCookCuisine?: string | null;
  /** Identity tags from `deriveIdentity` — used for personality hooks. */
  identityTags?: readonly string[];
}

const DEFAULT_REASON =
  "I picked this because it's the kind of thing you tend to come back to.";

function adjacencyFlavor(pick: string, last: string): boolean {
  const suggested = suggestAdjacentCuisine(last);
  return suggested != null && norm(suggested) === norm(pick);
}

export function composeSazonsPickReason(inputs: ReasonInputs): string {
  const pick = inputs.pickCuisine?.trim();
  const last = inputs.lastCookCuisine?.trim();
  const tags = inputs.identityTags ?? [];

  if (pick && last && norm(pick) === norm(last)) {
    return `More of the ${titleCase(pick)} you've been loving.`;
  }

  if (pick && last && adjacencyFlavor(pick, last)) {
    return `Same flavor neighborhood as your ${titleCase(last)} streak.`;
  }

  if (pick) {
    const welcome = welcomeLine(pick);
    if (welcome) {
      // welcomeLine ends with a period — pair it with a soft anchor.
      return `${welcome} Something new in your range.`;
    }
  }

  if (tags.includes('Globetrotter') && pick) {
    return `${titleCase(pick)} — another stamp for your map.`;
  }

  if (tags.includes('Veg-forward')) {
    return 'Plant-leaning, like your style.';
  }

  if (tags.some((t) => t.endsWith('-curious')) && pick) {
    return `${titleCase(pick)} — you've been curious about this lane.`;
  }

  if (last) {
    return `After a ${titleCase(last)} night, this is where I'd go next.`;
  }

  return DEFAULT_REASON;
}
