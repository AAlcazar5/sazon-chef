// backend/scripts/check-quick-meals.ts
// Script to check how many recipes in the database are under 30 minutes

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking quick meals in database...\n');

  // Get all recipes
  const allRecipes = await prisma.recipe.findMany({
    select: {
      id: true,
      title: true,
      cookTime: true,
      cuisine: true,
      mealType: true,
    },
    orderBy: {
      cookTime: 'asc',
    },
  });

  const totalRecipes = allRecipes.length;
  const quickMeals = allRecipes.filter(r => r.cookTime <= 30);
  const veryQuickMeals = allRecipes.filter(r => r.cookTime <= 15);
  const mediumMeals = allRecipes.filter(r => r.cookTime > 30 && r.cookTime <= 60);
  const longMeals = allRecipes.filter(r => r.cookTime > 60);

  console.log('📊 Quick Meals Statistics:');
  console.log('─'.repeat(50));
  console.log(`Total recipes: ${totalRecipes}`);
  console.log(`\n⏱️  Cook Time Breakdown:`);
  console.log(`  ≤ 15 minutes: ${veryQuickMeals.length} (${((veryQuickMeals.length / totalRecipes) * 100).toFixed(1)}%)`);
  console.log(`  ≤ 30 minutes: ${quickMeals.length} (${((quickMeals.length / totalRecipes) * 100).toFixed(1)}%)`);
  console.log(`  31-60 minutes: ${mediumMeals.length} (${((mediumMeals.length / totalRecipes) * 100).toFixed(1)}%)`);
  console.log(`  > 60 minutes: ${longMeals.length} (${((longMeals.length / totalRecipes) * 100).toFixed(1)}%)`);

  // Breakdown by cuisine
  console.log(`\n🌍 Quick Meals (≤30 min) by Cuisine:`);
  const quickByCuisine = quickMeals.reduce((acc, r) => {
    acc[r.cuisine] = (acc[r.cuisine] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(quickByCuisine)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cuisine, count]) => {
      console.log(`  ${cuisine}: ${count}`);
    });

  // Breakdown by meal type
  console.log(`\n🍽️  Quick Meals (≤30 min) by Meal Type:`);
  const quickByMealType = quickMeals.reduce((acc, r) => {
    const mealType = r.mealType || 'unknown';
    acc[mealType] = (acc[mealType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(quickByMealType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([mealType, count]) => {
      console.log(`  ${mealType}: ${count}`);
    });

  // Show some examples
  console.log(`\n📝 Sample Quick Meals (≤30 min):`);
  quickMeals.slice(0, 10).forEach(r => {
    console.log(`  • ${r.title} (${r.cookTime} min, ${r.cuisine})`);
  });

  if (quickMeals.length < 5) {
    console.log(`\n⚠️  WARNING: Only ${quickMeals.length} quick meals found!`);
    console.log(`   Consider running seed-quick-meals.ts to add more.`);
  }

  console.log('\n✅ Check complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
