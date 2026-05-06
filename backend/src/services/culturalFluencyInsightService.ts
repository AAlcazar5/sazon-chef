// backend/src/services/culturalFluencyInsightService.ts
// ROADMAP 4.0 Tier J17.1 — Stories/Journey weekly cultural-fluency beat.
//
// Surfaces a 1-card "why this works" insight tied to the cuisine the user
// has cooked most this week. Templated, NOT AI — the curated copy below is
// the source of truth.
//
// Voice rules (from plans/persona.md):
//   - Discovery, never prescription.
//   - The user catches themselves recognizing a pattern. That recognition is
//     the dopamine. Lecture is failure mode.
//   - Banned: any health/diet/macro framing.
//
// Data model: reads cookingLog rows for the trailing 7 days, counts cuisines,
// returns the most-cooked cuisine + matching template insight. Returns null
// when the user has fewer than 3 cooks in the window — thin content is worse
// than no content.

import { prisma } from '../lib/prisma';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WEEKLY_WINDOW_DAYS = 7;
const MIN_COOKS_FOR_INSIGHT = 3;

export interface WeeklyInsightInput {
  userId: string;
  asOfDate: Date;
}

export interface WeeklyInsight {
  /** Canonicalized cuisine name (lowercased) for downstream rendering. */
  cuisine: string;
  /** Curated, persona-grade insight copy. */
  insight: string;
}

/**
 * Curated per-cuisine "why this works" templates. Voice: discovery, never
 * prescription. The user-facing string is the value; the key is the
 * canonical cuisine slug (lowercase). Add new cuisines here — the service
 * falls back to a generic discovery line for any cuisine not listed.
 */
export const CULTURAL_FLUENCY_TEMPLATES: Readonly<Record<string, string>> = {
  japanese:
    'Japanese home cooking averages 5–7 small dishes — your week trended that way too.',
  greek:
    'In Crete, lunch is the big meal — your Sunday lunch hit it.',
  cretan:
    'In Crete, lunch is the big meal — your Sunday lunch hit it.',
  korean:
    'Korean banchan turn one protein into seven flavors — like your bulgogi night did.',
  italian:
    'Italian cooks lean on three or four ingredients per plate — your week echoed that simplicity.',
  lebanese:
    'Lebanese tables are built around mezze — small, shared, bright. Your week leaned into that shape.',
  vietnamese:
    'Vietnamese cooking layers herbs at the table — your bowls this week did the same.',
  thai:
    'Thai cooks balance four notes on every plate — sour, sweet, salty, spicy. Your week kept hitting all four.',
  mexican:
    'Mexican home cooking lives on salsas and citrus brightness — your kitchen stayed in that key.',
  indian:
    'Indian home cooks layer spices in stages — your week showed that patience.',
  moroccan:
    'Moroccan cooking marries sweet and savory in one pot — your tagine night was textbook.',
  ethiopian:
    'Ethiopian meals are shared off one platter — your week trended communal.',
  spanish:
    'Spanish kitchens treat olive oil as a finishing flavor — your plates this week reached for it.',
  french:
    'French home cooking rewards a slow start and a hot finish — your week split that way.',
  persian:
    'Persian cooking treats herbs as a vegetable — your week leaned green.',
  filipino:
    'Filipino cooking braids vinegar, garlic, and citrus — your week kept the brightness.',
  turkish:
    'Turkish breakfast is a tableful of small dishes — your mornings echoed that rhythm.',
  georgian:
    'Georgian feasts are built on toasts and shared dishes — your week trended toward the table.',
  okinawan:
    'Okinawan cooking is built around long-life staples — sweet potato, bitter melon, soy. Your week reached for those notes.',
  cretan_greek:
    'In Crete, lunch is the big meal — your Sunday lunch hit it.',
};

interface CookingLogRow {
  recipe: { cuisine: string | null } | null;
  cookedAt: Date;
}

export async function generateWeeklyInsight(
  input: WeeklyInsightInput,
): Promise<WeeklyInsight | null> {
  if (!input.userId) return null;

  const asOfDate = input.asOfDate ?? new Date();
  const windowStart = new Date(asOfDate.getTime() - WEEKLY_WINDOW_DAYS * MS_PER_DAY);

  const rows = (await (prisma as unknown as {
    cookingLog: {
      findMany: (args: unknown) => Promise<CookingLogRow[]>;
    };
  }).cookingLog.findMany({
    where: {
      userId: input.userId,
      cookedAt: { gte: windowStart, lt: asOfDate },
    },
    select: {
      recipe: { select: { cuisine: true } },
      cookedAt: true,
    },
  })) as CookingLogRow[];

  // Defensive in-service window filter — guards against stale cache leaks.
  const validRows = rows.filter(
    (r) =>
      r?.recipe?.cuisine &&
      r.cookedAt >= windowStart &&
      r.cookedAt < asOfDate,
  );

  if (validRows.length < MIN_COOKS_FOR_INSIGHT) return null;

  const counts = new Map<string, number>();
  for (const row of validRows) {
    const key = row.recipe!.cuisine!.trim().toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  if (counts.size === 0) return null;

  // Stable ordering: count desc, then alphabetical for deterministic ties.
  const sorted = Array.from(counts.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });

  const [topCuisine] = sorted[0];
  const display = capitalize(topCuisine);
  const template =
    CULTURAL_FLUENCY_TEMPLATES[topCuisine] ??
    `${display} home cooking has its own rhythm — your week leaned into it.`;

  return { cuisine: topCuisine, insight: template };
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
