// backend/scripts/top-up-to-1000.ts
// Quick script to top up the database to exactly 1000 recipes

import { PrismaClient } from '@prisma/client';
import { AIRecipeService } from '../src/services/aiRecipeService';

const prisma = new PrismaClient();
const aiRecipeService = new AIRecipeService();

const TARGET = 1000;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Cuisines that can use a few more recipes
const TOP_UP_CUISINES = [
  'Latin American',
  'Asian',
  'Korean',
  'French',
  'Greek',
];

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'] as const;

async function generateRecipe(
  cuisine: string,
  mealType: typeof MEAL_TYPES[number]
): Promise<boolean> {
  try {
    console.log(`  🍽️  Generating ${mealType} (${cuisine})...`);

    const macros = {
      calories: 550,
      protein: 40,
      carbs: 50,
      fat: 20,
    };

    const recipe = await aiRecipeService.generateRecipe({
      userId: null,
      macroGoals: macros,
      mealType: mealType === 'dessert' ? 'snack' : mealType,
      cuisineOverride: cuisine,
    });

    await aiRecipeService.saveGeneratedRecipe(recipe, null);

    console.log(`  ✅ "${recipe.title}" (${recipe.calories} cal, ${recipe.protein}g protein)`);
    return true;
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message?.substring(0, 100)}`);
    return false;
  }
}

async function topUp() {
  console.log('🌱 Topping up database to 1000 recipes...\n');

  const currentTotal = await prisma.recipe.count({ where: { isUserCreated: false } });
  const needed = TARGET - currentTotal;

  console.log(`Current: ${currentTotal} recipes`);
  console.log(`Needed: ${needed} recipes\n`);

  if (needed <= 0) {
    console.log('✅ Already at or above target!');
    return;
  }

  let generated = 0;

  for (let i = 0; i < needed; i++) {
    const cuisine = TOP_UP_CUISINES[i % TOP_UP_CUISINES.length];
    const mealType = MEAL_TYPES[i % MEAL_TYPES.length];

    const success = await generateRecipe(cuisine, mealType);

    if (success) {
      generated++;
      console.log(`Progress: ${currentTotal + generated}/${TARGET}\n`);
    }

    await delay(1500);
  }

  const finalTotal = await prisma.recipe.count({ where: { isUserCreated: false } });

  console.log('\n' + '='.repeat(60));
  console.log(`🎉 Top-up complete!`);
  console.log(`Final total: ${finalTotal} recipes`);
  console.log('='.repeat(60));
}

topUp()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
