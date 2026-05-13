// P1 retention — identity tag derivation.
//
// "Sazon knows you as…" surface on Profile. Pure function: takes cooking
// journey signals already loaded by useCookingJourney and emits 3–5 short
// identity descriptors ("Persian-curious", "Veg-forward", "Weeknight regular").
//
// The voice rule: descriptive lifestyle observation, never coachy verdict.
// Never use "should", "need to", or anything that sounds like a goal.

import type {
  CookingStats,
  SkillProgress,
  SkillLevel,
} from '../hooks/useCookingJourney';

const titleCase = (s: string): string => {
  if (!s) return '';
  return s
    .split(/\s+/)
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
};

const SKILL_TAG: Record<SkillLevel, string> = {
  beginner: 'Getting started',
  home_cook: 'Confident home cook',
  confident: 'Confident in the kitchen',
  chef: 'Chef-level',
};

interface IdentityInput {
  stats: CookingStats | null;
  progress: SkillProgress | null;
}

export interface IdentitySummary {
  /** Short list (3–5) of identity tags ready to render as chips. */
  tags: string[];
  /** Optional 1-line lifestyle paragraph composed from the tags. */
  caption: string | null;
}

export function deriveIdentity({ stats, progress }: IdentityInput): IdentitySummary {
  if (!stats) return { tags: [], caption: null };

  const tags: string[] = [];

  // 1. Curiosity hook — current month's first cuisine (the one Sazon's
  //    currently learning about you through).
  const currentCuisine = stats.cuisinesExploredThisMonth?.[0]?.trim();
  if (currentCuisine) {
    tags.push(`${titleCase(currentCuisine)}-curious`);
  }

  // 2. Diversity tier — how broad your exploration is.
  const n = stats.cuisinesExplored?.length ?? 0;
  if (n >= 8) tags.push('Globetrotter');
  else if (n >= 4) tags.push('Adventurous');
  else if (n >= 1) tags.push('Loyalist');

  // 3. Difficulty signature — describes your kitchen energy.
  if (stats.averageDifficultyLabel === 'hard') {
    tags.push('Technique-curious');
  } else if (stats.averageDifficultyLabel === 'easy') {
    tags.push('Weeknight regular');
  } else if (stats.averageDifficultyLabel === 'medium') {
    tags.push('Steady hand');
  }

  // 4. Skill tier (from existing progression — Sazon already knows this).
  if (progress?.effectiveLevel) {
    tags.push(SKILL_TAG[progress.effectiveLevel]);
  } else if (progress?.currentLevel) {
    tags.push(SKILL_TAG[progress.currentLevel]);
  }

  // 5. Volume — "you really cook" signal when lifetime > 25.
  const allTime = stats.recipesCookedAllTime ?? 0;
  if (allTime >= 50) tags.push('In the kitchen 4+ nights/week');
  else if (allTime >= 25) tags.push('Cooks more than most apps assume');

  const seen = new Set<string>();
  const uniqueTags = tags.filter((t) => {
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });

  const caption = uniqueTags.length === 0
    ? null
    : uniqueTags.length === 1
      ? `${uniqueTags[0]}.`
      : `${uniqueTags.slice(0, -1).join('. ')}. ${uniqueTags[uniqueTags.length - 1]}.`;

  return { tags: uniqueTags, caption };
}
