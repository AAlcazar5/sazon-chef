// backend/scripts/seed-1000-recipes.ts
// Comprehensive script to seed database with 1000 diverse, macro-friendly recipes
// This creates a shared recipe pool that all users can access

import { PrismaClient } from '@prisma/client';
import { AIRecipeService } from '../src/services/aiRecipeService';

const prisma = new PrismaClient();
const aiRecipeService = new AIRecipeService();

// ============================================================================
// CONFIGURATION: 1000 recipes across 15 cuisines with dietary variety
// ============================================================================

interface CuisineTarget {
  name: string;
  recipesTotal: number;
  mealTypes: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snack: number;
    dessert: number;
  };
  // Dietary variations to ensure diversity
  dietaryVariations: {
    regular: number;      // Standard recipes
    highProtein: number;  // 40g+ protein per serving
    lowCarb: number;      // Under 30g carbs
    vegetarian: number;   // No meat
    quickMeals: number;   // Under 20 min cook time
  };
}

const CUISINE_TARGETS: CuisineTarget[] = [
  {
    name: 'Mediterranean',
    recipesTotal: 90,
    mealTypes: { breakfast: 15, lunch: 25, dinner: 30, snack: 10, dessert: 10 },
    dietaryVariations: { regular: 40, highProtein: 20, lowCarb: 10, vegetarian: 10, quickMeals: 10 }
  },
  {
    name: 'Italian',
    recipesTotal: 80,
    mealTypes: { breakfast: 10, lunch: 25, dinner: 30, snack: 8, dessert: 7 },
    dietaryVariations: { regular: 35, highProtein: 15, lowCarb: 10, vegetarian: 12, quickMeals: 8 }
  },
  {
    name: 'Mexican',
    recipesTotal: 80,
    mealTypes: { breakfast: 15, lunch: 25, dinner: 25, snack: 10, dessert: 5 },
    dietaryVariations: { regular: 35, highProtein: 20, lowCarb: 10, vegetarian: 10, quickMeals: 5 }
  },
  {
    name: 'American',
    recipesTotal: 80,
    mealTypes: { breakfast: 20, lunch: 20, dinner: 25, snack: 10, dessert: 5 },
    dietaryVariations: { regular: 30, highProtein: 25, lowCarb: 10, vegetarian: 8, quickMeals: 7 }
  },
  {
    name: 'Asian',
    recipesTotal: 70,
    mealTypes: { breakfast: 10, lunch: 20, dinner: 25, snack: 10, dessert: 5 },
    dietaryVariations: { regular: 30, highProtein: 15, lowCarb: 10, vegetarian: 10, quickMeals: 5 }
  },
  {
    name: 'Indian',
    recipesTotal: 70,
    mealTypes: { breakfast: 12, lunch: 20, dinner: 25, snack: 8, dessert: 5 },
    dietaryVariations: { regular: 25, highProtein: 15, lowCarb: 10, vegetarian: 15, quickMeals: 5 }
  },
  {
    name: 'Japanese',
    recipesTotal: 65,
    mealTypes: { breakfast: 10, lunch: 20, dinner: 25, snack: 5, dessert: 5 },
    dietaryVariations: { regular: 30, highProtein: 15, lowCarb: 10, vegetarian: 5, quickMeals: 5 }
  },
  {
    name: 'Chinese',
    recipesTotal: 65,
    mealTypes: { breakfast: 10, lunch: 20, dinner: 25, snack: 5, dessert: 5 },
    dietaryVariations: { regular: 30, highProtein: 15, lowCarb: 10, vegetarian: 5, quickMeals: 5 }
  },
  {
    name: 'Thai',
    recipesTotal: 60,
    mealTypes: { breakfast: 8, lunch: 18, dinner: 22, snack: 7, dessert: 5 },
    dietaryVariations: { regular: 25, highProtein: 15, lowCarb: 8, vegetarian: 7, quickMeals: 5 }
  },
  {
    name: 'Middle Eastern',
    recipesTotal: 60,
    mealTypes: { breakfast: 12, lunch: 18, dinner: 20, snack: 5, dessert: 5 },
    dietaryVariations: { regular: 25, highProtein: 12, lowCarb: 8, vegetarian: 10, quickMeals: 5 }
  },
  {
    name: 'Korean',
    recipesTotal: 55,
    mealTypes: { breakfast: 8, lunch: 18, dinner: 20, snack: 5, dessert: 4 },
    dietaryVariations: { regular: 25, highProtein: 12, lowCarb: 8, vegetarian: 5, quickMeals: 5 }
  },
  {
    name: 'French',
    recipesTotal: 55,
    mealTypes: { breakfast: 10, lunch: 15, dinner: 20, snack: 5, dessert: 5 },
    dietaryVariations: { regular: 25, highProtein: 10, lowCarb: 8, vegetarian: 7, quickMeals: 5 }
  },
  {
    name: 'Greek',
    recipesTotal: 55,
    mealTypes: { breakfast: 10, lunch: 15, dinner: 20, snack: 5, dessert: 5 },
    dietaryVariations: { regular: 25, highProtein: 10, lowCarb: 8, vegetarian: 7, quickMeals: 5 }
  },
  {
    name: 'Latin American',
    recipesTotal: 55,
    mealTypes: { breakfast: 10, lunch: 15, dinner: 20, snack: 5, dessert: 5 },
    dietaryVariations: { regular: 25, highProtein: 10, lowCarb: 8, vegetarian: 7, quickMeals: 5 }
  },
  {
    name: 'Vietnamese',
    recipesTotal: 60,
    mealTypes: { breakfast: 10, lunch: 18, dinner: 22, snack: 5, dessert: 5 },
    dietaryVariations: { regular: 25, highProtein: 15, lowCarb: 8, vegetarian: 7, quickMeals: 5 }
  },
];

// Calculate total target
const TOTAL_TARGET = CUISINE_TARGETS.reduce((sum, c) => sum + c.recipesTotal, 0);

// Macro goals by dietary variation
const MACRO_PROFILES = {
  regular: {
    breakfast: { calories: 500, protein: 35, carbs: 50, fat: 20 },
    lunch: { calories: 600, protein: 45, carbs: 55, fat: 22 },
    dinner: { calories: 700, protein: 50, carbs: 60, fat: 25 },
    snack: { calories: 250, protein: 15, carbs: 25, fat: 12 },
    dessert: { calories: 300, protein: 8, carbs: 45, fat: 12 },
  },
  highProtein: {
    breakfast: { calories: 500, protein: 45, carbs: 35, fat: 18 },
    lunch: { calories: 600, protein: 55, carbs: 40, fat: 20 },
    dinner: { calories: 700, protein: 60, carbs: 45, fat: 22 },
    snack: { calories: 250, protein: 25, carbs: 15, fat: 10 },
    dessert: { calories: 280, protein: 20, carbs: 30, fat: 10 },
  },
  lowCarb: {
    breakfast: { calories: 450, protein: 35, carbs: 20, fat: 28 },
    lunch: { calories: 550, protein: 45, carbs: 25, fat: 32 },
    dinner: { calories: 650, protein: 50, carbs: 30, fat: 35 },
    snack: { calories: 200, protein: 15, carbs: 10, fat: 14 },
    dessert: { calories: 250, protein: 8, carbs: 20, fat: 18 },
  },
  vegetarian: {
    breakfast: { calories: 480, protein: 25, carbs: 55, fat: 18 },
    lunch: { calories: 580, protein: 30, carbs: 65, fat: 20 },
    dinner: { calories: 650, protein: 35, carbs: 70, fat: 22 },
    snack: { calories: 220, protein: 12, carbs: 28, fat: 10 },
    dessert: { calories: 280, protein: 6, carbs: 45, fat: 10 },
  },
  quickMeals: {
    breakfast: { calories: 400, protein: 30, carbs: 40, fat: 15 },
    lunch: { calories: 500, protein: 40, carbs: 45, fat: 18 },
    dinner: { calories: 550, protein: 45, carbs: 50, fat: 20 },
    snack: { calories: 200, protein: 12, carbs: 20, fat: 10 },
    dessert: { calories: 250, protein: 5, carbs: 40, fat: 8 },
  },
};

// Delay function
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get dietary instruction for AI prompt
function getDietaryInstruction(variation: string): string {
  switch (variation) {
    case 'highProtein':
      return 'This recipe MUST be high-protein (40g+ protein per serving). Focus on lean meats, fish, eggs, legumes, or Greek yogurt as the main protein source.';
    case 'lowCarb':
      return 'This recipe MUST be low-carb (under 30g carbs per serving). Avoid pasta, rice, bread, and high-carb vegetables. Use cauliflower rice, zucchini noodles, or leafy greens as bases.';
    case 'vegetarian':
      return 'This recipe MUST be vegetarian (no meat, poultry, or fish). Use plant proteins like tofu, tempeh, legumes, eggs, or dairy for protein.';
    case 'quickMeals':
      return 'This recipe MUST be quick to prepare (under 20 minutes total cook time). Focus on simple techniques and minimal ingredients.';
    default:
      return '';
  }
}

// Generate a single recipe with specific parameters
async function generateRecipe(
  cuisine: string,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert',
  dietaryVariation: string,
  attempt: number = 1
): Promise<boolean> {
  const maxAttempts = 3;

  try {
    const macros = MACRO_PROFILES[dietaryVariation as keyof typeof MACRO_PROFILES]?.[mealType]
      || MACRO_PROFILES.regular[mealType];

    const dietaryInstruction = getDietaryInstruction(dietaryVariation);

    // Build preferences based on dietary variation
    const userPreferences: any = {
      likedCuisines: [cuisine],
      dietaryRestrictions: [],
      bannedIngredients: [],
      spiceLevel: 'medium',
      cookTimePreference: dietaryVariation === 'quickMeals' ? 20 : 45,
    };

    if (dietaryVariation === 'vegetarian') {
      userPreferences.dietaryRestrictions = ['vegetarian'];
    }

    console.log(`  🍽️  [${dietaryVariation}] Generating ${mealType} (${cuisine})... [Attempt ${attempt}]`);

    // Generate recipe using AI service
    const recipe = await aiRecipeService.generateRecipe({
      userId: null,
      macroGoals: macros,
      mealType: mealType === 'dessert' ? 'snack' : mealType, // Map dessert to snack for AI
      cuisineOverride: cuisine,
      userPreferences,
      maxCookTimeForMeal: dietaryVariation === 'quickMeals' ? 20 : undefined,
    });

    // Check for duplicate before saving
    const isDuplicate = await recipeExists(recipe.title);
    if (isDuplicate) {
      console.log(`  ⚠️  Duplicate title detected: "${recipe.title}" - skipping`);
      if (attempt < maxAttempts) {
        console.log(`  🔄 Retrying with new recipe... (${attempt + 1}/${maxAttempts})`);
        await delay(1000);
        return generateRecipe(cuisine, mealType, dietaryVariation, attempt + 1);
      }
      return false;
    }

    // Save to database
    await aiRecipeService.saveGeneratedRecipe(recipe, null);

    console.log(`  ✅ "${recipe.title}" (${recipe.calories} cal, ${recipe.protein}g protein, ${recipe.cookTime} min)`);
    return true;
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message?.substring(0, 100)}`);

    if (attempt < maxAttempts) {
      console.log(`  🔄 Retrying... (${attempt + 1}/${maxAttempts})`);
      await delay(3000);
      return generateRecipe(cuisine, mealType, dietaryVariation, attempt + 1);
    }

    return false;
  }
}

// Check if recipe with same title already exists (avoid duplicates)
async function recipeExists(title: string): Promise<boolean> {
  const existing = await prisma.recipe.findFirst({
    where: {
      title: {
        equals: title,
        mode: 'insensitive',
      },
    },
  });
  return !!existing;
}

// Get current counts for a cuisine
async function getCuisineCounts(cuisine: string): Promise<{
  total: number;
  byMealType: Record<string, number>;
}> {
  const total = await prisma.recipe.count({
    where: { cuisine, isUserCreated: false },
  });

  const byMealType = await prisma.recipe.groupBy({
    by: ['mealType'],
    where: { cuisine, isUserCreated: false },
    _count: true,
  });

  const mealTypeCounts: Record<string, number> = {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snack: 0,
    dessert: 0,
    null: 0,
  };

  byMealType.forEach(item => {
    const key = item.mealType || 'null';
    mealTypeCounts[key] = item._count;
  });

  return { total, byMealType: mealTypeCounts };
}

// Main seeding function
async function seedDatabase() {
  console.log('🌱 Starting Comprehensive Recipe Database Seeding');
  console.log('═'.repeat(60));
  console.log(`📊 Target: ${TOTAL_TARGET} macro-friendly recipes across ${CUISINE_TARGETS.length} cuisines\n`);

  const stats = {
    totalGenerated: 0,
    totalFailed: 0,
    totalSkipped: 0,
    byCuisine: {} as Record<string, { generated: number; failed: number; existing: number }>,
  };

  const startTime = Date.now();

  // Get current total
  const currentTotal = await prisma.recipe.count({ where: { isUserCreated: false } });
  console.log(`📦 Current recipes in database: ${currentTotal}`);
  console.log(`🎯 Recipes needed to reach 1000: ${Math.max(0, 1000 - currentTotal)}\n`);

  for (const cuisineTarget of CUISINE_TARGETS) {
    const { name: cuisine, recipesTotal, mealTypes, dietaryVariations } = cuisineTarget;

    // Get current counts for this cuisine
    const currentCounts = await getCuisineCounts(cuisine);
    const needed = Math.max(0, recipesTotal - currentCounts.total);

    stats.byCuisine[cuisine] = { generated: 0, failed: 0, existing: currentCounts.total };

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📦 ${cuisine.toUpperCase()}`);
    console.log(`   Target: ${recipesTotal} | Existing: ${currentCounts.total} | Needed: ${needed}`);
    console.log(`${'─'.repeat(60)}`);

    if (needed === 0) {
      console.log(`   ⏭️  Already at target, skipping...`);
      stats.totalSkipped += recipesTotal;
      continue;
    }

    // Calculate how many of each type we need
    const mealTypeKeys = Object.keys(mealTypes) as Array<keyof typeof mealTypes>;
    const variationKeys = Object.keys(dietaryVariations) as Array<keyof typeof dietaryVariations>;

    // Generate recipes distributed across meal types and dietary variations
    let generatedForCuisine = 0;

    for (const mealType of mealTypeKeys) {
      const targetForMealType = mealTypes[mealType];
      const currentForMealType = currentCounts.byMealType[mealType] || 0;
      const neededForMealType = Math.max(0, targetForMealType - currentForMealType);

      if (neededForMealType === 0) continue;

      // Distribute across dietary variations
      for (const variation of variationKeys) {
        const variationTarget = dietaryVariations[variation];
        const proportionalTarget = Math.ceil((neededForMealType * variationTarget) / recipesTotal);

        for (let i = 0; i < proportionalTarget && generatedForCuisine < needed; i++) {
          const success = await generateRecipe(cuisine, mealType, variation);

          if (success) {
            stats.totalGenerated++;
            stats.byCuisine[cuisine].generated++;
            generatedForCuisine++;
          } else {
            stats.totalFailed++;
            stats.byCuisine[cuisine].failed++;
          }

          // Rate limiting delay
          await delay(1500);

          // Check if we've hit the overall target
          const currentDbTotal = await prisma.recipe.count({ where: { isUserCreated: false } });
          if (currentDbTotal >= 1000) {
            console.log(`\n🎉 Reached 1000 recipes target!`);
            break;
          }
        }
      }
    }

    console.log(`   📊 ${cuisine}: +${stats.byCuisine[cuisine].generated} generated, ${stats.byCuisine[cuisine].failed} failed`);

    // Check overall progress
    const currentDbTotal = await prisma.recipe.count({ where: { isUserCreated: false } });
    if (currentDbTotal >= 1000) {
      console.log(`\n🎉 Reached 1000 recipes target! Stopping generation.`);
      break;
    }
  }

  const endTime = Date.now();
  const durationMinutes = Math.round((endTime - startTime) / 1000 / 60);

  // Final stats
  const finalTotal = await prisma.recipe.count({ where: { isUserCreated: false } });
  const finalByCuisine = await prisma.recipe.groupBy({
    by: ['cuisine'],
    where: { isUserCreated: false },
    _count: true,
  });

  console.log('\n' + '═'.repeat(60));
  console.log('📊 SEEDING SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Total Generated: ${stats.totalGenerated}`);
  console.log(`❌ Total Failed: ${stats.totalFailed}`);
  console.log(`⏭️  Total Skipped: ${stats.totalSkipped}`);
  console.log(`⏱️  Duration: ${durationMinutes} minutes`);
  console.log(`\n💾 Final Database Total: ${finalTotal} recipes`);

  console.log('\n📦 Final Cuisine Distribution:');
  finalByCuisine
    .sort((a, b) => b._count - a._count)
    .forEach(item => {
      const bar = '█'.repeat(Math.floor(item._count / 5));
      console.log(`   ${item.cuisine.padEnd(18)} ${item._count.toString().padStart(3)} ${bar}`);
    });
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
