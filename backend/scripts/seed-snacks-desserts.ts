// backend/scripts/seed-snacks-desserts.ts
//
// Focused snack/dessert catalog pass. Theme-driven (scripts/seedSnackDessert.ts)
// with cuisine left free — widens parfaits / Ninja Creami protein ice cream /
// whole-food vegan snacks / protein snacks without re-running the cuisine seed.
// All run machinery lives in scripts/seedRunner.ts; this file only supplies the
// plan. Cost-aware: defaults to DRY_RUN — set DRY_RUN=0 to execute.
// THEME_OFFSET rotates the theme/nudge pairing on re-runs.

import { runSeed, type SeedJob } from './seedRunner';
import { buildSnackDessertPlan } from './seedSnackDessert';

const rawOffset = Number(process.env.THEME_OFFSET);
const themeOffset = Number.isFinite(rawOffset) ? rawOffset : 0;

runSeed({
  runLabel: 'Focused snack/dessert seed run — theme-driven, cuisine free',
  groupNoun: 'theme',
  buildPlan: (cap): SeedJob[] =>
    buildSnackDessertPlan(cap, { themeOffset }).map((j) => ({
      mealType: j.mealType,
      styleHint: j.styleHint,
      groupKey: j.themeKey,
    })),
}).catch((err) => {
  console.error('Seed run failed:', err);
  process.exit(1);
});
