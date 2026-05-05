// backend/scripts/seed-tier-d-gap-fill.ts
// ROADMAP 4.0 D1 partial — focused gap-fill, not the full v1 pipeline.
//
// Targets:
//   1. Every v1-scope cuisine currently at 0 recipes — generate 8 each
//   2. Thin v1-scope cuisines (Korean, Chinese, Middle Eastern → Lebanese)
//      — top up to 20 each
//   3. Glazed Protein Bites family (D6.5) — 20 recipes across the
//      protein × flavor matrix
//
// Cost-aware: prints projected count + provider before each cuisine,
// supports DRY_RUN=1 to preview without spending. Use the existing
// AIRecipeService — same prompt, same safety checks, same retries.

import { PrismaClient } from '@prisma/client';
import { aiRecipeService } from '../src/services/aiRecipeService';

const prisma = new PrismaClient();

const DRY_RUN = process.env.DRY_RUN === '1';
const COST_PER_RECIPE_USD = Number(process.env.COST_PER_RECIPE_USD ?? 0.12);

const ZERO_COVERAGE_CUISINES = [
  'Persian', 'Nigerian', 'Vietnamese', 'North African', 'French',
  'Greek', 'Lebanese', 'Salvadorean', 'Soul Food', 'Puerto Rican',
  'Ethiopian', 'Filipino', 'Spanish', 'Turkish', 'Tex-Mex',
  'Cuban', 'Brazilian', 'Peruvian', 'Colombian', 'Cajun/Creole',
  'Okinawan', 'Ghanaian',
];

const THIN_TOP_UPS: Array<{ cuisine: string; targetCount: number }> = [
  { cuisine: 'Korean', targetCount: 20 },
  { cuisine: 'Chinese', targetCount: 25 },
  { cuisine: 'Middle Eastern', targetCount: 20 },
];

const PER_CUISINE_GAP_COUNT = 8;
const MEAL_TYPE_DISTRIBUTION: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'> = [
  'breakfast', 'lunch', 'dinner', 'dinner', 'lunch', 'snack', 'dinner', 'lunch',
];

// ── Glazed Protein Bites (D6.5) — protein × flavor twist matrix ──
// Each entry becomes a recipeTitle hint passed to generateRecipe so the
// AI builds the recipe around that specific concept.
const GLAZED_BITES_PROMPTS: Array<{ title: string; cuisine: string; protein: string }> = [
  // Soy-honey-sesame anchors (already have salmon + chicken as MealComponents,
  // but seed the recipe rows so they show in browse + plate-builder)
  { title: 'Soy-Honey-Sesame Salmon Bites with Sesame Seeds', cuisine: 'Asian', protein: 'salmon' },
  { title: 'Soy-Honey-Sesame Chicken Bites with Cornstarch Glaze', cuisine: 'Asian', protein: 'chicken breast' },
  { title: 'Soy-Honey-Sesame Tofu Bites with Pressed Extra-Firm Tofu', cuisine: 'Asian', protein: 'extra-firm tofu' },
  { title: 'Soy-Honey-Sesame Shrimp Bites Skillet', cuisine: 'Asian', protein: 'shrimp' },
  // Gochujang twist — Korean lean
  { title: 'Gochujang-Honey Glazed Salmon Bites', cuisine: 'Korean', protein: 'salmon' },
  { title: 'Gochujang-Honey Glazed Chicken Bites', cuisine: 'Korean', protein: 'chicken breast' },
  { title: 'Gochujang-Honey Glazed Tofu Bites', cuisine: 'Korean', protein: 'extra-firm tofu' },
  // Teriyaki twist — Japanese lean
  { title: 'Teriyaki Salmon Bites with Sesame Seeds', cuisine: 'Japanese', protein: 'salmon' },
  { title: 'Teriyaki Chicken Bites Sheet-Pan Style', cuisine: 'Japanese', protein: 'chicken thigh' },
  { title: 'Teriyaki Tempeh Bites with Garlic + Ginger', cuisine: 'Japanese', protein: 'tempeh' },
  // Hoisin twist — Chinese lean
  { title: 'Hoisin-Honey Pork Tenderloin Bites', cuisine: 'Chinese', protein: 'pork tenderloin' },
  { title: 'Hoisin-Honey Sliced Steak Bites', cuisine: 'Chinese', protein: 'sirloin steak' },
  // Miso-maple twist — fusion
  { title: 'Miso-Maple Salmon Bites with Sesame Seeds', cuisine: 'Japanese', protein: 'salmon' },
  { title: 'Miso-Maple Chicken Bites Sheet-Pan', cuisine: 'Japanese', protein: 'chicken breast' },
  { title: 'Miso-Maple Tofu Bites with Sesame', cuisine: 'Japanese', protein: 'extra-firm tofu' },
  // Peanut-lime twist — Thai lean
  { title: 'Peanut-Lime Chicken Bites with Cilantro', cuisine: 'Thai', protein: 'chicken breast' },
  { title: 'Peanut-Lime Tempeh Bites with Sriracha', cuisine: 'Thai', protein: 'tempeh' },
  // Citrus-ginger twist — bright
  { title: 'Citrus-Ginger Shrimp Bites with Scallions', cuisine: 'Asian', protein: 'shrimp' },
  { title: 'Citrus-Ginger Salmon Bites Sheet-Pan', cuisine: 'Asian', protein: 'salmon' },
  // Halloumi + paneer — vegetarian non-tofu
  { title: 'Soy-Honey-Sesame Halloumi Bites', cuisine: 'Asian', protein: 'halloumi' },
];

interface PlannedJob {
  cuisine: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeTitle?: string;
}

async function buildPlan(): Promise<PlannedJob[]> {
  const plan: PlannedJob[] = [];

  // 1. Zero-coverage cuisines — 8 recipes each
  for (const cuisine of ZERO_COVERAGE_CUISINES) {
    for (let i = 0; i < PER_CUISINE_GAP_COUNT; i += 1) {
      plan.push({ cuisine, mealType: MEAL_TYPE_DISTRIBUTION[i] });
    }
  }

  // 2. Thin top-ups — fetch existing count, generate the delta
  for (const { cuisine, targetCount } of THIN_TOP_UPS) {
    const existing = await prisma.recipe.count({ where: { cuisine } });
    const needed = Math.max(0, targetCount - existing);
    for (let i = 0; i < needed; i += 1) {
      plan.push({ cuisine, mealType: MEAL_TYPE_DISTRIBUTION[i % MEAL_TYPE_DISTRIBUTION.length] });
    }
  }

  // 3. Glazed Protein Bites — explicit titles
  for (const entry of GLAZED_BITES_PROMPTS) {
    plan.push({ cuisine: entry.cuisine, mealType: 'dinner', recipeTitle: entry.title });
  }

  return plan;
}

async function main() {
  console.log('▶ ROADMAP 4.0 D1 — gap-fill recipe seed run');
  const plan = await buildPlan();
  const projectedCost = (plan.length * COST_PER_RECIPE_USD).toFixed(2);

  console.log(`  Planned recipes:        ${plan.length}`);
  console.log(`  Per-recipe cost (est):  $${COST_PER_RECIPE_USD.toFixed(3)}`);
  console.log(`  Total projected cost:   ~$${projectedCost}`);
  console.log(`  Mode:                   ${DRY_RUN ? 'DRY RUN (no API calls)' : 'LIVE'}`);
  console.log('');

  // Per-cuisine breakdown
  const byCuisine = new Map<string, number>();
  for (const j of plan) byCuisine.set(j.cuisine, (byCuisine.get(j.cuisine) ?? 0) + 1);
  for (const [cuisine, count] of [...byCuisine.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cuisine.padEnd(20)} ${count}`);
  }
  console.log('');

  if (DRY_RUN) {
    console.log('Dry run complete. Set DRY_RUN=0 (or omit) to execute.');
    return;
  }

  let succeeded = 0;
  let failed = 0;
  const startedAt = Date.now();

  for (let i = 0; i < plan.length; i += 1) {
    const job = plan[i];
    const label = job.recipeTitle ?? `${job.cuisine} ${job.mealType}`;
    process.stdout.write(`[${i + 1}/${plan.length}] ${label}… `);
    try {
      const recipe = await aiRecipeService.generateRecipe({
        userId: null,
        cuisineOverride: job.cuisine,
        mealType: job.mealType,
        recipeTitle: job.recipeTitle,
      });
      await aiRecipeService.saveGeneratedRecipe(recipe, null);
      succeeded += 1;
      console.log('✓');
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`✗ ${msg.slice(0, 80)}`);
    }
  }

  const elapsedMin = ((Date.now() - startedAt) / 60_000).toFixed(1);
  console.log('');
  console.log(`Done in ${elapsedMin}m.`);
  console.log(`  ✓ ${succeeded}/${plan.length} succeeded`);
  console.log(`  ✗ ${failed}/${plan.length} failed`);
  console.log(`  Approx spend: $${(succeeded * COST_PER_RECIPE_USD).toFixed(2)}`);
}

main()
  .catch(err => {
    console.error('Gap-fill run failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
