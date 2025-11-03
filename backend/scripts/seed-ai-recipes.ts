// backend/scripts/seed-ai-recipes.ts
// Script to seed database with AI-generated macro-friendly recipes across all cuisine categories

import { PrismaClient } from '@prisma/client';
import { AIRecipeService } from '../src/services/aiRecipeService';

const prisma = new PrismaClient();
const aiRecipeService = new AIRecipeService();

// Define cuisine categories and target recipe counts per cuisine
// Focus on macro-friendly distribution across meal types
const CUISINE_TARGETS: {
  name: string;
  recipesPerCuisine: number; // Total recipes per cuisine
  mealTypeDistribution: { breakfast: number; lunch: number; dinner: number; snack: number };
}[] = [
  {
    name: 'Mediterranean',
    recipesPerCuisine: 45,
    mealTypeDistribution: { breakfast: 10, lunch: 15, dinner: 15, snack: 5 }
  },
  {
    name: 'Italian',
    recipesPerCuisine: 40,
    mealTypeDistribution: { breakfast: 8, lunch: 12, dinner: 15, snack: 5 }
  },
  {
    name: 'Mexican',
    recipesPerCuisine: 40,
    mealTypeDistribution: { breakfast: 10, lunch: 12, dinner: 13, snack: 5 }
  },
  {
    name: 'Asian',
    recipesPerCuisine: 35,
    mealTypeDistribution: { breakfast: 8, lunch: 12, dinner: 12, snack: 3 }
  },
  {
    name: 'American',
    recipesPerCuisine: 40,
    mealTypeDistribution: { breakfast: 12, lunch: 10, dinner: 13, snack: 5 }
  },
  {
    name: 'Indian',
    recipesPerCuisine: 35,
    mealTypeDistribution: { breakfast: 8, lunch: 12, dinner: 12, snack: 3 }
  },
  {
    name: 'Japanese',
    recipesPerCuisine: 30,
    mealTypeDistribution: { breakfast: 6, lunch: 10, dinner: 11, snack: 3 }
  },
  {
    name: 'Thai',
    recipesPerCuisine: 30,
    mealTypeDistribution: { breakfast: 6, lunch: 10, dinner: 11, snack: 3 }
  },
  {
    name: 'Chinese',
    recipesPerCuisine: 30,
    mealTypeDistribution: { breakfast: 6, lunch: 10, dinner: 11, snack: 3 }
  },
  {
    name: 'Middle Eastern',
    recipesPerCuisine: 30,
    mealTypeDistribution: { breakfast: 8, lunch: 10, dinner: 9, snack: 3 }
  },
  {
    name: 'French',
    recipesPerCuisine: 25,
    mealTypeDistribution: { breakfast: 6, lunch: 8, dinner: 9, snack: 2 }
  },
  {
    name: 'Latin American',
    recipesPerCuisine: 30,
    mealTypeDistribution: { breakfast: 8, lunch: 10, dinner: 9, snack: 3 }
  },
];

// Default macro goals for seeding (macro-friendly target: 2000 cal, 150g protein, 200g carbs, 67g fat)
const DEFAULT_MACRO_GOALS = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 67,
};

// Meal type macro distribution percentages
const MEAL_TYPE_MACROS: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {
  breakfast: { calories: 0.25, protein: 0.25, carbs: 0.25, fat: 0.25 }, // 25% of daily
  lunch: { calories: 0.30, protein: 0.30, carbs: 0.30, fat: 0.30 },     // 30% of daily
  dinner: { calories: 0.35, protein: 0.35, carbs: 0.35, fat: 0.35 },    // 35% of daily
  snack: { calories: 0.10, protein: 0.10, carbs: 0.10, fat: 0.10 },    // 10% of daily
};

// Delay function to avoid rate limiting
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate a single recipe
async function generateRecipe(
  cuisine: string,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  attempt: number = 1
): Promise<boolean> {
  try {
    const mealMacros = MEAL_TYPE_MACROS[mealType];
    const macroGoals = {
      calories: Math.round(DEFAULT_MACRO_GOALS.calories * mealMacros.calories),
      protein: Math.round(DEFAULT_MACRO_GOALS.protein * mealMacros.protein),
      carbs: Math.round(DEFAULT_MACRO_GOALS.carbs * mealMacros.carbs),
      fat: Math.round(DEFAULT_MACRO_GOALS.fat * mealMacros.fat),
    };

    console.log(`  🍽️  Generating ${mealType} recipe (${cuisine})... [Attempt ${attempt}]`);

    // Generate recipe using AI service
    const recipe = await aiRecipeService.generateRecipe({
      userId: null, // System user for seeding (no userId)
      macroGoals,
      mealType,
      cuisineOverride: cuisine,
      // No user preferences - generate diverse macro-friendly recipes
      userPreferences: undefined,
      physicalProfile: undefined,
    });

    // Save to database (null userId for system recipes)
    await aiRecipeService.saveGeneratedRecipe(recipe, null);

    console.log(`  ✅ Generated: "${recipe.title}" (${recipe.calories} cal, ${recipe.protein}g protein)`);
    return true;
  } catch (error: any) {
    console.error(`  ❌ Error generating ${mealType} recipe for ${cuisine}:`, error.message);
    
    // Retry once if it's a validation error (might just need regeneration)
    if (attempt < 2 && (error.message.includes('validation') || error.message.includes('missing required'))) {
      console.log(`  🔄 Retrying ${mealType} recipe for ${cuisine}...`);
      await delay(2000); // Wait 2 seconds before retry
      return generateRecipe(cuisine, mealType, attempt + 1);
    }
    
    return false;
  }
}

// Check if recipe already exists (avoid duplicates)
async function recipeExists(title: string, cuisine: string): Promise<boolean> {
  const existing = await prisma.recipe.findFirst({
    where: {
      title: title,
      cuisine: cuisine,
      source: 'ai-generated',
    },
  });
  return !!existing;
}

// Main seeding function
async function seedDatabase() {
  console.log('🌱 Starting AI Recipe Database Seeding...\n');
  console.log('📊 Target: ~420 macro-friendly recipes across 12 cuisines\n');

  const stats = {
    totalGenerated: 0,
    totalFailed: 0,
    byCuisine: {} as Record<string, { generated: number; failed: number }>,
    byMealType: { breakfast: 0, lunch: 0, dinner: 0, snack: 0 },
  };

  const startTime = Date.now();

  for (const cuisineTarget of CUISINE_TARGETS) {
    const { name: cuisine, mealTypeDistribution } = cuisineTarget;
    stats.byCuisine[cuisine] = { generated: 0, failed: 0 };

    console.log(`\n📦 ${cuisine} (${cuisineTarget.recipesPerCuisine} recipes total)`);
    console.log('─'.repeat(50));

    // Check how many recipes already exist for this cuisine
    const existingCount = await prisma.recipe.count({
      where: {
        cuisine: cuisine,
        source: 'ai-generated',
      },
    });

    const targetCount = cuisineTarget.recipesPerCuisine;
    const remainingNeeded = Math.max(0, targetCount - existingCount);

    if (remainingNeeded === 0) {
      console.log(`⏭️  ${cuisine}: Already has ${existingCount} recipes, skipping...`);
      stats.byCuisine[cuisine].generated = existingCount;
      continue;
    }

    console.log(`📊 ${cuisine}: ${existingCount} existing, need ${remainingNeeded} more`);

    // Generate recipes for each meal type
    for (const [mealType, targetCount] of Object.entries(mealTypeDistribution)) {
      // Check how many of this meal type already exist
      const existingMealCount = await prisma.recipe.count({
        where: {
          cuisine: cuisine,
          source: 'ai-generated',
          // We can't filter by meal type directly, so estimate based on calories
          // Breakfast: 300-600 cal, Lunch: 400-700 cal, Dinner: 500-800 cal, Snack: 100-300 cal
        },
      });

      const mealTypeNeeded = Math.max(0, targetCount - Math.floor(existingMealCount / 4)); // Rough estimate

      for (let i = 0; i < mealTypeNeeded && stats.byCuisine[cuisine].generated < remainingNeeded; i++) {
        try {
          const success = await generateRecipe(cuisine, mealType as any);
          
          if (success) {
            stats.totalGenerated++;
            stats.byCuisine[cuisine].generated++;
            stats.byMealType[mealType as keyof typeof stats.byMealType]++;
          } else {
            stats.totalFailed++;
            stats.byCuisine[cuisine].failed++;
          }
        } catch (error: any) {
          stats.totalFailed++;
          stats.byCuisine[cuisine].failed++;
          
          // If quota exceeded, add longer delay and continue to next cuisine
          if (error?.message?.includes('quota') || error?.message?.includes('429') || error?.code === 'insufficient_quota') {
            console.log(`⏸️  OpenAI quota exceeded. Pausing for 60 seconds...`);
            await delay(60000); // Wait 1 minute before continuing
          }
        }

        // Small delay between recipes to avoid overwhelming APIs (with 5000/hour we can be faster)
        await delay(1000); // 1 second between recipes = ~3600/hour (safe margin)
      }
    }

    console.log(`✅ ${cuisine}: ${stats.byCuisine[cuisine].generated} generated, ${stats.byCuisine[cuisine].failed} failed`);
  }

  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000 / 60); // minutes

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SEEDING SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Total Generated: ${stats.totalGenerated}`);
  console.log(`❌ Total Failed: ${stats.totalFailed}`);
  console.log(`⏱️  Duration: ${duration} minutes`);
  console.log('\n📈 By Meal Type:');
  for (const [mealType, count] of Object.entries(stats.byMealType)) {
    console.log(`   ${mealType.padEnd(10)}: ${count}`);
  }
  console.log('\n📦 By Cuisine:');
  for (const [cuisine, counts] of Object.entries(stats.byCuisine)) {
    console.log(`   ${cuisine.padEnd(20)}: ${counts.generated} generated, ${counts.failed} failed`);
  }

  // Final database stats
  const totalInDb = await prisma.recipe.count({
    where: { source: 'ai-generated' },
  });
  console.log(`\n💾 Total AI-generated recipes in database: ${totalInDb}`);
}

// Run seeding
seedDatabase()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\n🎉 Seeding complete!');
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('\n❌ Seeding error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });

