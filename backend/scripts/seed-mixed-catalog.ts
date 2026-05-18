// backend/scripts/seed-mixed-catalog.ts
//
// Mixed all-mealType catalog pass that beefs up the lowest-count categories.
// Reads the live per-mealType counts, then runs seedRunner with a
// deficit-weighted plan (scripts/seedMixedCatalog.ts): the thinnest meal
// types get the bulk of the run, every type still gets a smoothing floor so
// it stays a true breakfast/lunch/dinner/snack/dessert/sauce mix. Cuisine is
// pinned and rotated for international breadth. Cost-aware: defaults to
// DRY_RUN — set DRY_RUN=0 to execute. CUISINE_OFFSET rotates the pairing.

import { PrismaClient } from '@prisma/client';
import { runSeed, type SeedJob } from './seedRunner';
import {
  buildMixedCatalogPlan,
  MIXED_MEALTYPES,
  type MealTypeCounts,
} from './seedMixedCatalog';

const rawOffset = Number(process.env.CUISINE_OFFSET);
const cuisineOffset = Number.isFinite(rawOffset) ? rawOffset : 0;

async function getMealTypeCounts(): Promise<MealTypeCounts> {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.recipe.groupBy({
      by: ['mealType'],
      _count: { _all: true },
    });
    const counts: MealTypeCounts = {
      breakfast: 0, lunch: 0, dinner: 0, snack: 0, dessert: 0, sauce: 0,
    };
    for (const r of rows) {
      const mt = r.mealType as (typeof MIXED_MEALTYPES)[number] | null;
      if (mt && mt in counts) counts[mt] = r._count._all;
    }
    return counts;
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  const counts = await getMealTypeCounts();
  console.log('  Live mealType counts:');
  for (const mt of MIXED_MEALTYPES) {
    console.log(`    ${mt.padEnd(12)} ${String(counts[mt]).padStart(5)}`);
  }
  console.log('');

  await runSeed({
    runLabel:
      'Mixed catalog seed run — all meal types, deficit-weighted to thinnest',
    groupNoun: 'cuisine',
    buildPlan: (cap): SeedJob[] =>
      buildMixedCatalogPlan(cap, counts, { cuisineOffset }).map((j) => ({
        mealType: j.mealType,
        styleHint: j.styleHint,
        groupKey: j.groupKey,
        cuisine: j.cuisine,
      })),
  });
}

main().catch((err) => {
  console.error('Seed run failed:', err);
  process.exit(1);
});
