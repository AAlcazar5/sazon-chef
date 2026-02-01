const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function pruneDuplicates() {
  try {
    console.log('🔍 Finding duplicate recipes...\n');

    // Get all recipes
    const recipes = await prisma.recipe.findMany({
      select: {
        id: true,
        title: true,
        cuisine: true,
        calories: true,
        protein: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' } // Keep the oldest one
    });

    console.log(`Total recipes: ${recipes.length}\n`);

    // Group by title (normalized)
    const groups = {};
    for (const recipe of recipes) {
      const key = recipe.title.toLowerCase().trim();
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(recipe);
    }

    // Find duplicates
    const duplicateIds = [];
    const duplicateGroups = [];

    for (const [title, group] of Object.entries(groups)) {
      if (group.length > 1) {
        // Keep the first one (oldest), mark the rest as duplicates
        const [keep, ...remove] = group;
        duplicateGroups.push({
          title: keep.title,
          kept: keep.id,
          removed: remove.map(r => r.id)
        });
        duplicateIds.push(...remove.map(r => r.id));
      }
    }

    if (duplicateIds.length === 0) {
      console.log('✅ No duplicates found!');
      return;
    }

    console.log(`Found ${duplicateIds.length} duplicate recipes to remove:\n`);

    for (const group of duplicateGroups) {
      console.log(`  "${group.title}"`);
      console.log(`    Keeping: ${group.kept}`);
      console.log(`    Removing: ${group.removed.length} duplicate(s)`);
    }

    console.log('\n🗑️  Deleting duplicates...\n');

    // Delete related data first (due to foreign key constraints)
    // Delete instructions
    const deletedInstructions = await prisma.recipeInstruction.deleteMany({
      where: { recipeId: { in: duplicateIds } }
    });
    console.log(`  Deleted ${deletedInstructions.count} instructions`);

    // Delete ingredients
    const deletedIngredients = await prisma.recipeIngredient.deleteMany({
      where: { recipeId: { in: duplicateIds } }
    });
    console.log(`  Deleted ${deletedIngredients.count} ingredients`);

    // Delete meal history references
    const deletedMealHistory = await prisma.mealHistory.deleteMany({
      where: { recipeId: { in: duplicateIds } }
    });
    console.log(`  Deleted ${deletedMealHistory.count} meal history entries`);

    // Delete feedback
    const deletedFeedback = await prisma.recipeFeedback.deleteMany({
      where: { recipeId: { in: duplicateIds } }
    });
    console.log(`  Deleted ${deletedFeedback.count} feedback entries`);

    // Delete the duplicate recipes
    const deletedRecipes = await prisma.recipe.deleteMany({
      where: { id: { in: duplicateIds } }
    });
    console.log(`  Deleted ${deletedRecipes.count} duplicate recipes`);

    // Final count
    const remainingCount = await prisma.recipe.count();
    console.log(`\n✅ Done! ${remainingCount} unique recipes remaining.`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

pruneDuplicates();
