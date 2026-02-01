// backend/scripts/seed-100-recipes.ts
// Seed 100 diverse recipes across 15 global cuisines with balanced meal types

import { PrismaClient } from '@prisma/client';
import { AIRecipeService } from '../src/services/aiRecipeService';

const prisma = new PrismaClient();
const aiRecipeService = new AIRecipeService();

const TARGET = 100;

// Diverse cuisine distribution with specific meal type targets
const CUISINE_TARGETS = [
  {
    name: 'Mediterranean',
    meals: { breakfast: 3, lunch: 3, dinner: 4, snack: 1, dessert: 1 } // 12 total
  },
  {
    name: 'Italian',
    meals: { breakfast: 2, lunch: 3, dinner: 3, snack: 1, dessert: 1 } // 10 total
  },
  {
    name: 'Mexican',
    meals: { breakfast: 2, lunch: 3, dinner: 3, snack: 1, dessert: 1 } // 10 total
  },
  {
    name: 'American',
    meals: { breakfast: 2, lunch: 2, dinner: 3, snack: 1, dessert: 1 } // 9 total
  },
  {
    name: 'Japanese',
    meals: { breakfast: 2, lunch: 2, dinner: 3, snack: 1, dessert: 1 } // 9 total
  },
  {
    name: 'Indian',
    meals: { breakfast: 2, lunch: 2, dinner: 3, snack: 1, dessert: 1 } // 9 total
  },
  {
    name: 'Thai',
    meals: { breakfast: 1, lunch: 2, dinner: 3, snack: 1, dessert: 1 } // 8 total
  },
  {
    name: 'Chinese',
    meals: { breakfast: 1, lunch: 2, dinner: 3, snack: 1, dessert: 1 } // 8 total
  },
  {
    name: 'Korean',
    meals: { breakfast: 1, lunch: 2, dinner: 2, snack: 1, dessert: 1 } // 7 total
  },
  {
    name: 'Middle Eastern',
    meals: { breakfast: 1, lunch: 2, dinner: 2, snack: 1, dessert: 0 } // 6 total
  },
  {
    name: 'French',
    meals: { breakfast: 1, lunch: 1, dinner: 2, snack: 0, dessert: 1 } // 5 total
  },
  {
    name: 'Vietnamese',
    meals: { breakfast: 1, lunch: 1, dinner: 2, snack: 0, dessert: 0 } // 4 total
  },
  {
    name: 'Brazilian',
    meals: { breakfast: 1, lunch: 0, dinner: 1, snack: 0, dessert: 0 } // 2 total
  },
  {
    name: 'Caribbean',
    meals: { breakfast: 0, lunch: 0, dinner: 1, snack: 0, dessert: 0 } // 1 total
  },
];

// Calculated totals:
// Breakfast: 20, Lunch: 25, Dinner: 35, Snack: 10, Dessert: 10 = 100

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';

const MACRO_GOALS: Record<MealType, { calories: number; protein: number; carbs: number; fat: number }> = {
  breakfast: { calories: 500, protein: 35, carbs: 50, fat: 17 },
  lunch: { calories: 600, protein: 45, carbs: 60, fat: 20 },
  dinner: { calories: 700, protein: 50, carbs: 65, fat: 25 },
  snack: { calories: 250, protein: 15, carbs: 25, fat: 10 },
  dessert: { calories: 300, protein: 8, carbs: 45, fat: 12 },
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if recipe exists (avoid duplicates)
async function recipeExists(title: string): Promise<boolean> {
  const existing = await prisma.recipe.findFirst({
    where: {
      title: {
        contains: title.toLowerCase(),
      },
    },
  });

  // Also check exact match (case insensitive via JS)
  if (!existing) {
    const allRecipes = await prisma.recipe.findMany({
      select: { title: true },
    });
    return allRecipes.some(r => r.title.toLowerCase() === title.toLowerCase());
  }

  return !!existing;
}

async function generateRecipe(
  cuisine: string,
  mealType: MealType,
  attempt: number = 1
): Promise<boolean> {
  const maxAttempts = 3;

  try {
    console.log(`  🍽️  ${mealType.padEnd(10)} (${cuisine})...`);

    const recipe = await aiRecipeService.generateRecipe({
      userId: null,
      macroGoals: MACRO_GOALS[mealType],
      mealType: mealType === 'dessert' ? 'snack' : mealType, // API uses 'snack' for desserts
      cuisineOverride: cuisine,
    });

    // Check for duplicate
    const isDuplicate = await recipeExists(recipe.title);
    if (isDuplicate) {
      console.log(`     ⚠️  Duplicate: "${recipe.title}" - retrying`);
      if (attempt < maxAttempts) {
        await delay(1500);
        return generateRecipe(cuisine, mealType, attempt + 1);
      }
      return false;
    }

    // Save to database
    await aiRecipeService.saveGeneratedRecipe(recipe, null);

    console.log(`     ✅ "${recipe.title}" (${recipe.calories}cal, ${recipe.protein}g protein)`);
    return true;
  } catch (error: any) {
    console.error(`     ❌ Error: ${error.message?.substring(0, 60)}`);

    if (attempt < maxAttempts) {
      await delay(3000);
      return generateRecipe(cuisine, mealType, attempt + 1);
    }

    return false;
  }
}

async function seed100Recipes() {
  console.log('\n🌱 SAZON CHEF - Seeding 100 Global Recipes');
  console.log('═'.repeat(60));

  const currentCount = await prisma.recipe.count({
    where: { isUserCreated: false }
  });

  console.log(`\n📊 Current recipes: ${currentCount}`);
  console.log(`📊 Target: ${TARGET} recipes`);

  const needed = Math.max(0, TARGET - currentCount);
  console.log(`📊 Need to generate: ${needed} recipes\n`);

  if (needed === 0) {
    console.log('✅ Already at target!\n');
    return;
  }

  let generated = 0;
  let failed = 0;

  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'];

  // Generate recipes by cuisine and meal type
  for (const cuisine of CUISINE_TARGETS) {
    if (generated >= needed) break;

    const cuisineTotal = Object.values(cuisine.meals).reduce((a, b) => a + b, 0);
    console.log(`\n🌍 ${cuisine.name} (${cuisineTotal} recipes)`);
    console.log('─'.repeat(60));

    for (const mealType of mealTypes) {
      const count = cuisine.meals[mealType];
      if (count === 0) continue;

      for (let i = 0; i < count; i++) {
        if (generated >= needed) break;

        const success = await generateRecipe(cuisine.name, mealType);

        if (success) {
          generated++;
        } else {
          failed++;
        }

        // Rate limiting - 1.5 seconds between recipes
        await delay(1500);
      }
    }

    // Progress update after each cuisine
    const progress = Math.round(((currentCount + generated) / TARGET) * 100);
    console.log(`\n  📈 Progress: ${currentCount + generated}/${TARGET} (${progress}%)`);
  }

  // Final stats
  const finalCount = await prisma.recipe.count({ where: { isUserCreated: false } });

  // Breakdown by meal type
  const byMealType = await prisma.recipe.groupBy({
    by: ['mealType'],
    where: { isUserCreated: false },
    _count: true,
  });

  // Breakdown by cuisine
  const byCuisine = await prisma.recipe.groupBy({
    by: ['cuisine'],
    where: { isUserCreated: false },
    _count: true,
    orderBy: { _count: { cuisine: 'desc' } },
  });

  console.log('\n' + '═'.repeat(60));
  console.log('📊 SEEDING COMPLETE!');
  console.log('═'.repeat(60));
  console.log(`\n✅ Generated: ${generated} recipes`);
  console.log(`❌ Failed: ${failed} recipes`);
  console.log(`📊 Total in database: ${finalCount} recipes`);

  console.log('\n🍽️  By Meal Type:');
  byMealType.forEach(item => {
    const type = item.mealType || 'Unspecified';
    console.log(`   ${type.padEnd(12)}: ${item._count}`);
  });

  console.log('\n🌍 By Cuisine:');
  byCuisine.slice(0, 10).forEach(item => {
    console.log(`   ${item.cuisine.padEnd(15)}: ${item._count}`);
  });

  console.log('\n' + '═'.repeat(60) + '\n');
}

seed100Recipes()
  .then(async () => {
    await prisma.$disconnect();
    console.log('🎉 Done!\n');
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
