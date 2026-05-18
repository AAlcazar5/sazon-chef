// backend/scripts/seed-international-sauces.ts
//
// International sauce/condiment catalog pass. buildInternationalSaucePlan pins
// a rotating roster of world cuisines so the model produces authentic regional
// sauces (tzatziki, chimichurri, harissa, romesco, nuoc cham, gochujang glaze,
// …) — a browsable 'sauce' meal-type category, kept out of plate scoring by
// the mealTypeWhereClause guard. All run machinery lives in
// scripts/seedRunner.ts; this file only supplies the plan. Cost-aware:
// defaults to DRY_RUN — set DRY_RUN=0 to execute. CUISINE_OFFSET rotates the
// cuisine/archetype pairing on re-runs.

import { runSeed, type SeedJob } from './seedRunner';
import { buildInternationalSaucePlan } from './seedSnackDessert';

const rawOffset = Number(process.env.CUISINE_OFFSET);
const cuisineOffset = Number.isFinite(rawOffset) ? rawOffset : 0;

runSeed({
  runLabel: 'International sauce seed run — cuisine-pinned, condiment-focused',
  groupNoun: 'cuisine',
  buildPlan: (cap): SeedJob[] =>
    buildInternationalSaucePlan(cap, { cuisineOffset }).map((j) => ({
      mealType: j.mealType,
      styleHint: j.styleHint,
      groupKey: j.cuisine,
      cuisine: j.cuisine,
    })),
}).catch((err) => {
  console.error('Seed run failed:', err);
  process.exit(1);
});
