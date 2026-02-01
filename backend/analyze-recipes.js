const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeRecipes() {
  try {
    console.log('📊 Analyzing Recipe Database\n');
    console.log('='.repeat(60));

    // Total recipe count
    const totalRecipes = await prisma.recipe.count();
    const userCreatedCount = await prisma.recipe.count({ where: { isUserCreated: true } });
    const systemRecipeCount = await prisma.recipe.count({ where: { isUserCreated: false } });

    console.log(`\n📈 RECIPE COUNTS:`);
    console.log(`  Total Recipes: ${totalRecipes}`);
    console.log(`  System Recipes (isUserCreated=false): ${systemRecipeCount}`);
    console.log(`  User Created: ${userCreatedCount}`);

    // Count by meal type
    console.log(`\n🍽️  RECIPES BY MEAL TYPE:`);
    const byMealType = await prisma.recipe.groupBy({
      by: ['mealType'],
      where: { isUserCreated: false },
      _count: true,
    });

    byMealType.forEach(item => {
      const mealType = item.mealType || 'Unspecified';
      console.log(`  ${mealType}: ${item._count}`);
    });

    // Count by cuisine
    console.log(`\n🌍 RECIPES BY CUISINE (Top 15):`);
    const byCuisine = await prisma.recipe.groupBy({
      by: ['cuisine'],
      where: { isUserCreated: false },
      _count: true,
      orderBy: { _count: { cuisine: 'desc' } },
      take: 15,
    });

    byCuisine.forEach(item => {
      console.log(`  ${item.cuisine}: ${item._count}`);
    });

    // Check for recipes with missing data
    console.log(`\n⚠️  DATA QUALITY CHECKS:`);

    const missingMealType = await prisma.recipe.count({
      where: { isUserCreated: false, mealType: null }
    });
    console.log(`  Recipes without mealType: ${missingMealType}`);

    const missingIngredients = await prisma.recipe.findMany({
      where: { isUserCreated: false },
      include: { ingredients: true },
    });
    const noIngredients = missingIngredients.filter(r => r.ingredients.length === 0).length;
    console.log(`  Recipes without ingredients: ${noIngredients}`);

    const missingInstructions = await prisma.recipe.findMany({
      where: { isUserCreated: false },
      include: { instructions: true },
    });
    const noInstructions = missingInstructions.filter(r => r.instructions.length === 0).length;
    console.log(`  Recipes without instructions: ${noInstructions}`);

    const missingImages = await prisma.recipe.count({
      where: { isUserCreated: false, imageUrl: null }
    });
    console.log(`  Recipes without images: ${missingImages}`);

    // Sample 5 recipes to see structure
    console.log(`\n📋 SAMPLE RECIPES (First 5):`);
    const sampleRecipes = await prisma.recipe.findMany({
      where: { isUserCreated: false },
      take: 5,
      select: {
        id: true,
        title: true,
        cuisine: true,
        mealType: true,
        calories: true,
        protein: true,
        cookTime: true,
        imageUrl: true,
        _count: {
          select: {
            ingredients: true,
            instructions: true,
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    sampleRecipes.forEach((recipe, index) => {
      console.log(`\n  ${index + 1}. ${recipe.title}`);
      console.log(`     ID: ${recipe.id}`);
      console.log(`     Cuisine: ${recipe.cuisine}`);
      console.log(`     MealType: ${recipe.mealType || 'NOT SET'}`);
      console.log(`     Macros: ${recipe.calories}cal, ${recipe.protein}g protein`);
      console.log(`     Cook Time: ${recipe.cookTime} min`);
      console.log(`     Has Image: ${!!recipe.imageUrl ? 'Yes' : 'No'}`);
      console.log(`     Ingredients: ${recipe._count.ingredients}`);
      console.log(`     Instructions: ${recipe._count.instructions}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('\n💡 ANALYSIS:');

    if (totalRecipes < 100) {
      console.log(`  ⚠️  Only ${totalRecipes} recipes - Need to seed more!`);
    }

    if (missingMealType > 0) {
      console.log(`  ⚠️  ${missingMealType} recipes missing mealType - This affects filtering!`);
    }

    if (noIngredients > 0 || noInstructions > 0) {
      console.log(`  ⚠️  Some recipes missing ingredients/instructions - Incomplete data!`);
    }

    if (systemRecipeCount < 20) {
      console.log(`  ❌ PROBLEM: Only ${systemRecipeCount} system recipes available!`);
      console.log(`     This is why pagination shows less than 20.`);
      console.log(`     Solution: Run 'npm run seed:1000' to generate more recipes.`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeRecipes();
