// backend/scripts/seed-tier-d-even-out.ts
// ROADMAP 4.0 D1 follow-up — top every small cuisine bucket up to a target.
// Generates only the delta (target - existing) per cuisine. Idempotent —
// re-running with the same target generates 0 if already at target.

import { PrismaClient } from '@prisma/client';
import { aiRecipeService } from '../src/services/aiRecipeService';

const prisma = new PrismaClient();

const TARGET_PER_CUISINE = Number(process.env.TARGET ?? 11);
const DRY_RUN = process.env.DRY_RUN === '1';
const COST_PER_RECIPE_USD = Number(process.env.COST_PER_RECIPE_USD ?? 0.12);

// Cuisines we want a more-even distribution across. Excludes the
// over-stocked legacy buckets (American, Mediterranean, Mexican, etc.).
const SMALL_CUISINES = [
  'Brazilian', 'Cajun/Creole', 'Colombian', 'Cuban', 'Ethiopian',
  'Filipino', 'French', 'Ghanaian', 'Greek', 'Lebanese',
  'Nigerian', 'North African', 'Okinawan', 'Persian', 'Peruvian',
  'Puerto Rican', 'Salvadorean', 'Soul Food', 'Spanish', 'Tex-Mex',
  'Turkish', 'Vietnamese',
];

const MEAL_TYPES: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'> = [
  'breakfast', 'lunch', 'dinner', 'dinner', 'lunch', 'snack', 'dinner', 'breakfast', 'lunch', 'dinner', 'dinner',
];

async function main() {
  console.log(`▶ ROADMAP 4.0 D1 even-out — target ${TARGET_PER_CUISINE} recipes per cuisine`);
  const plan: Array<{ cuisine: string; mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' }> = [];

  for (const cuisine of SMALL_CUISINES) {
    const existing = await prisma.recipe.count({ where: { cuisine } });
    const needed = Math.max(0, TARGET_PER_CUISINE - existing);
    for (let i = 0; i < needed; i += 1) {
      plan.push({ cuisine, mealType: MEAL_TYPES[i % MEAL_TYPES.length] });
    }
    if (needed > 0) console.log(`  ${cuisine.padEnd(20)} ${existing} → ${TARGET_PER_CUISINE}  (+${needed})`);
  }

  const projectedCost = (plan.length * COST_PER_RECIPE_USD).toFixed(2);
  console.log('');
  console.log(`Total planned recipes: ${plan.length}`);
  console.log(`Projected cost:        ~$${projectedCost}`);
  console.log(`Mode:                  ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log('');

  if (DRY_RUN || plan.length === 0) {
    console.log(plan.length === 0 ? 'Nothing to do — all cuisines at or above target.' : 'Dry run complete.');
    return;
  }

  let succeeded = 0;
  let failed = 0;
  const startedAt = Date.now();

  for (let i = 0; i < plan.length; i += 1) {
    const { cuisine, mealType } = plan[i];
    process.stdout.write(`[${i + 1}/${plan.length}] ${cuisine} ${mealType}… `);
    try {
      const recipe = await aiRecipeService.generateRecipe({
        userId: null,
        cuisineOverride: cuisine,
        mealType,
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
  console.log(`Done in ${elapsedMin}m. ✓ ${succeeded}/${plan.length}, ✗ ${failed}/${plan.length}.`);
  console.log(`Approx spend: $${(succeeded * COST_PER_RECIPE_USD).toFixed(2)}`);
}

main()
  .catch(err => {
    console.error('even-out run failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
