// backend/scripts/seed-international-snacks.ts
//
// International snack catalog pass. buildInternationalSnackPlan pins a rotating
// roster of world cuisines so the model produces authentic regional snacks
// (onigiri, chaat, börek, coxinha, puff-puff, miang kham, …) instead of
// defaulting to American parfaits/bars. All run machinery lives in
// scripts/seedRunner.ts; this file only supplies the plan. Cost-aware:
// defaults to DRY_RUN — set DRY_RUN=0 to execute. CUISINE_OFFSET rotates the
// cuisine/archetype pairing on re-runs.

import { runSeed, type SeedJob } from './seedRunner';
import { buildInternationalSnackPlan } from './seedSnackDessert';

const rawOffset = Number(process.env.CUISINE_OFFSET);
const cuisineOffset = Number.isFinite(rawOffset) ? rawOffset : 0;

runSeed({
  runLabel: 'International snack seed run — cuisine-pinned, snack-focused',
  groupNoun: 'cuisine',
  buildPlan: (cap): SeedJob[] =>
    buildInternationalSnackPlan(cap, { cuisineOffset }).map((j) => ({
      mealType: j.mealType,
      styleHint: j.styleHint,
      groupKey: j.cuisine,
      cuisine: j.cuisine,
    })),
}).catch((err) => {
  console.error('Seed run failed:', err);
  process.exit(1);
});
