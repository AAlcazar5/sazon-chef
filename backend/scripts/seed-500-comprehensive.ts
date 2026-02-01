// backend/scripts/seed-500-comprehensive.ts
// Medium-scale seeding: 500 diverse recipes across major categories
// ADDS to existing database (does NOT overwrite)
// Includes duplicate checking to ensure no conflicts

import { PrismaClient } from '@prisma/client';
import { AIRecipeService } from '../src/services/aiRecipeService';

const prisma = new PrismaClient();
const aiRecipeService = new AIRecipeService();

// ============================================================================
// 500-RECIPE CONFIGURATION
// ============================================================================

interface CategoryTarget {
  name: string;
  cuisines: string[]; // Multiple cuisines for variety
  recipesTotal: number;
  mealTypes: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snack: number;
    dessert: number;
  };
  macroProfile?: {
    calories: { min: number; max: number };
    protein: { min: number; max: number };
    carbs: { min: number; max: number };
    fat: { min: number; max: number };
  };
  specialInstruction?: string;
  dietaryRestrictions?: string[];
  maxCookTime?: number;
}

const CATEGORY_TARGETS: CategoryTarget[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // TOP CUISINES (250 recipes)
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'Mediterranean',
    cuisines: ['Mediterranean', 'Greek'],
    recipesTotal: 50,
    mealTypes: { breakfast: 8, lunch: 14, dinner: 18, snack: 6, dessert: 4 },
  },
  {
    name: 'American',
    cuisines: ['American', 'Californian'],
    recipesTotal: 50,
    mealTypes: { breakfast: 12, lunch: 14, dinner: 16, snack: 5, dessert: 3 },
  },
  {
    name: 'Mexican',
    cuisines: ['Mexican'],
    recipesTotal: 40,
    mealTypes: { breakfast: 8, lunch: 12, dinner: 14, snack: 4, dessert: 2 },
  },
  {
    name: 'Asian',
    cuisines: ['Japanese', 'Chinese', 'Thai', 'Korean', 'Vietnamese'],
    recipesTotal: 60,
    mealTypes: { breakfast: 8, lunch: 18, dinner: 24, snack: 6, dessert: 4 },
  },
  {
    name: 'Italian',
    cuisines: ['Italian'],
    recipesTotal: 35,
    mealTypes: { breakfast: 5, lunch: 12, dinner: 14, snack: 2, dessert: 2 },
  },
  {
    name: 'Indian',
    cuisines: ['Indian', 'Pakistani'],
    recipesTotal: 35,
    mealTypes: { breakfast: 6, lunch: 12, dinner: 14, snack: 2, dessert: 1 },
  },
  {
    name: 'Middle Eastern',
    cuisines: ['Middle Eastern', 'Lebanese', 'Turkish'],
    recipesTotal: 30,
    mealTypes: { breakfast: 6, lunch: 10, dinner: 10, snack: 3, dessert: 1 },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FITNESS CATEGORIES (150 recipes)
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'High Protein',
    cuisines: ['American', 'Mediterranean', 'Asian', 'Mexican'],
    recipesTotal: 50,
    mealTypes: { breakfast: 10, lunch: 14, dinner: 18, snack: 5, dessert: 3 },
    macroProfile: {
      calories: { min: 400, max: 700 },
      protein: { min: 45, max: 65 },
      carbs: { min: 25, max: 55 },
      fat: { min: 15, max: 28 },
    },
    specialInstruction: 'This recipe MUST be high-protein (45g+ protein per serving). Focus on lean meats, fish, eggs, Greek yogurt, or protein powder.',
  },
  {
    name: 'Post-Workout Recovery',
    cuisines: ['American', 'Mediterranean', 'Mexican', 'Asian'],
    recipesTotal: 30,
    mealTypes: { breakfast: 5, lunch: 10, dinner: 10, snack: 3, dessert: 2 },
    macroProfile: {
      calories: { min: 400, max: 650 },
      protein: { min: 40, max: 55 },
      carbs: { min: 40, max: 70 },
      fat: { min: 10, max: 22 },
    },
    specialInstruction: 'This is a POST-WORKOUT RECOVERY recipe. HIGH protein (40g+) with fast carbs for glycogen replenishment. Perfect after training.',
  },
  {
    name: 'Low Carb',
    cuisines: ['Mediterranean', 'American', 'Asian'],
    recipesTotal: 30,
    mealTypes: { breakfast: 6, lunch: 10, dinner: 12, snack: 2, dessert: 0 },
    macroProfile: {
      calories: { min: 350, max: 650 },
      protein: { min: 35, max: 55 },
      carbs: { min: 10, max: 30 },
      fat: { min: 25, max: 45 },
    },
    specialInstruction: 'This recipe MUST be LOW-CARB (under 30g carbs). Avoid pasta, rice, bread. Use cauliflower rice, zucchini noodles, or leafy greens.',
  },
  {
    name: 'High Fiber',
    cuisines: ['Mediterranean', 'Mexican', 'Indian', 'American'],
    recipesTotal: 40,
    mealTypes: { breakfast: 10, lunch: 12, dinner: 14, snack: 3, dessert: 1 },
    macroProfile: {
      calories: { min: 350, max: 600 },
      protein: { min: 25, max: 45 },
      carbs: { min: 40, max: 70 },
      fat: { min: 12, max: 25 },
    },
    specialInstruction: 'This recipe MUST be HIGH-FIBER (12g+ fiber per serving). Focus on whole grains, legumes, vegetables, fruits, nuts, and seeds. Great for digestive health.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DIETARY CATEGORIES (50 recipes)
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'Vegetarian',
    cuisines: ['Indian', 'Mediterranean', 'Mexican', 'Italian'],
    recipesTotal: 30,
    mealTypes: { breakfast: 5, lunch: 10, dinner: 12, snack: 2, dessert: 1 },
    specialInstruction: 'This recipe MUST be VEGETARIAN (no meat, poultry, or fish). Use plant proteins: tofu, tempeh, legumes, eggs, dairy.',
    dietaryRestrictions: ['vegetarian'],
  },
  {
    name: 'Vegan',
    cuisines: ['Mediterranean', 'Indian', 'Mexican', 'Asian'],
    recipesTotal: 20,
    mealTypes: { breakfast: 4, lunch: 7, dinner: 7, snack: 1, dessert: 1 },
    specialInstruction: 'This recipe MUST be VEGAN (no animal products). Use plant proteins: tofu, tempeh, legumes, nuts, seeds.',
    dietaryRestrictions: ['vegan'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CONVENIENCE CATEGORIES (50 recipes)
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'Quick Meals',
    cuisines: ['American', 'Mediterranean', 'Asian', 'Mexican'],
    recipesTotal: 35,
    mealTypes: { breakfast: 10, lunch: 12, dinner: 10, snack: 3, dessert: 0 },
    specialInstruction: 'This recipe MUST be quick (under 20 minutes total). Simple techniques, minimal ingredients.',
    maxCookTime: 20,
  },
  {
    name: 'Meal Prep Friendly',
    cuisines: ['American', 'Mediterranean', 'Mexican', 'Asian'],
    recipesTotal: 25,
    mealTypes: { breakfast: 4, lunch: 8, dinner: 11, snack: 2, dessert: 0 },
    specialInstruction: 'This recipe is MEAL PREP FRIENDLY. Must reheat well, store 4-5 days, taste good reheated. Scales easily.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PROTEIN DESSERTS (10 recipes) - User's favorite!
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'Protein Desserts',
    cuisines: ['American'],
    recipesTotal: 15,
    mealTypes: { breakfast: 0, lunch: 0, dinner: 0, snack: 5, dessert: 10 },
    macroProfile: {
      calories: { min: 250, max: 450 },
      protein: { min: 25, max: 50 },
      carbs: { min: 25, max: 50 },
      fat: { min: 8, max: 20 },
    },
    specialInstruction: `This is a HIGH-PROTEIN DESSERT (25g+ protein). Create unique variations like:
- Protein ice cream (Greek yogurt + whey protein + almond milk + sweetener + pudding mix + cookie/pretzel crumbles) - Ninja Creami style
- Protein cheesecake, protein brownies, protein mousse
- Anabolic French toast, protein mug cakes
Use: Greek yogurt, cottage cheese, protein powder. Sweeten with monk fruit, stevia, or erythritol.`,
  },
];

const TOTAL_TARGET = CATEGORY_TARGETS.reduce((sum, c) => sum + c.recipesTotal, 0);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomInRange(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

// Enhanced duplicate checking
async function recipeExists(title: string): Promise<boolean> {
  // Get all recipes and do case-insensitive comparison in JavaScript
  const allRecipes = await prisma.recipe.findMany({
    select: { title: true },
  });

  const titleLower = title.toLowerCase();
  const exists = allRecipes.some(r => r.title.toLowerCase() === titleLower);

  return exists;
}

// Check if similar recipe exists (fuzzy match)
async function similarRecipeExists(title: string): Promise<boolean> {
  const commonWords = ['the', 'a', 'an', 'with', 'and', 'or', 'in', 'on', 'for'];
  const titleWords = title.toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word));

  if (titleWords.length === 0) return false;

  // Get all recipes and search in JavaScript for better compatibility
  const allRecipes = await prisma.recipe.findMany({
    select: { title: true },
  });

  const existing = allRecipes.filter(recipe => {
    const recipeTitleLower = recipe.title.toLowerCase();
    return titleWords.some(word => recipeTitleLower.includes(word));
  });

  for (const recipe of existing) {
    const existingWords = recipe.title.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word));

    const overlap = titleWords.filter(word => existingWords.includes(word)).length;
    const similarity = overlap / Math.max(titleWords.length, existingWords.length);

    if (similarity > 0.6) {
      console.log(`  ⚠️  Similar: "${recipe.title}" (${Math.round(similarity * 100)}% match)`);
      return true;
    }
  }

  return false;
}

// ============================================================================
// RECIPE GENERATION
// ============================================================================

async function generateCategoryRecipe(
  category: CategoryTarget,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert',
  attempt: number = 1
): Promise<boolean> {
  const maxAttempts = 3;

  try {
    // Pick random cuisine from category's cuisines
    const cuisine = category.cuisines[Math.floor(Math.random() * category.cuisines.length)];

    // Generate macros (use profile if available, otherwise defaults)
    const macros = category.macroProfile
      ? {
          calories: randomInRange(category.macroProfile.calories.min, category.macroProfile.calories.max),
          protein: randomInRange(category.macroProfile.protein.min, category.macroProfile.protein.max),
          carbs: randomInRange(category.macroProfile.carbs.min, category.macroProfile.carbs.max),
          fat: randomInRange(category.macroProfile.fat.min, category.macroProfile.fat.max),
        }
      : getMealTypeDefaultMacros(mealType);

    console.log(`  🍽️  [${category.name}] ${mealType} (${cuisine})... [Attempt ${attempt}]`);

    const recipe = await aiRecipeService.generateRecipe({
      userId: null,
      macroGoals: macros,
      mealType,
      cuisineOverride: cuisine,
      userPreferences: {
        likedCuisines: [cuisine],
        dietaryRestrictions: category.dietaryRestrictions || [],
        bannedIngredients: [],
        spiceLevel: 'medium',
        cookTimePreference: category.maxCookTime || 45,
      },
      maxCookTimeForMeal: category.maxCookTime,
    });

    // Check for duplicates
    const isExactDuplicate = await recipeExists(recipe.title);
    if (isExactDuplicate) {
      console.log(`  ⚠️  Exact duplicate: "${recipe.title}" - retrying`);
      if (attempt < maxAttempts) {
        await delay(1000);
        return generateCategoryRecipe(category, mealType, attempt + 1);
      }
      return false;
    }

    const isSimilar = await similarRecipeExists(recipe.title);
    if (isSimilar && attempt < maxAttempts) {
      console.log(`  ⚠️  Retrying for more variety`);
      await delay(1000);
      return generateCategoryRecipe(category, mealType, attempt + 1);
    }

    await aiRecipeService.saveGeneratedRecipe(recipe, null);
    console.log(`  ✅ "${recipe.title}" (${recipe.calories} cal, ${recipe.protein}g protein)`);
    return true;
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message?.substring(0, 80)}`);
    if (attempt < maxAttempts) {
      await delay(2000);
      return generateCategoryRecipe(category, mealType, attempt + 1);
    }
    return false;
  }
}

function getMealTypeDefaultMacros(mealType: string) {
  const defaults: Record<string, any> = {
    breakfast: { calories: 500, protein: 35, carbs: 50, fat: 20 },
    lunch: { calories: 600, protein: 45, carbs: 55, fat: 22 },
    dinner: { calories: 700, protein: 50, carbs: 60, fat: 25 },
    snack: { calories: 250, protein: 15, carbs: 25, fat: 12 },
    dessert: { calories: 300, protein: 10, carbs: 45, fat: 12 },
  };
  return defaults[mealType] || defaults.lunch;
}

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function seed500Recipes() {
  console.log('🌱 500-RECIPE COMPREHENSIVE SEEDING');
  console.log('═'.repeat(70));
  console.log(`📊 Target: ${TOTAL_TARGET} diverse recipes`);
  console.log('✅ Adds to existing database (does NOT overwrite)');
  console.log('🔍 Includes duplicate checking (exact + fuzzy matching)');
  console.log('');

  const stats = {
    generated: 0,
    failed: 0,
    byCategory: {} as Record<string, { generated: number; failed: number }>,
  };

  const startTime = Date.now();
  const currentTotal = await prisma.recipe.count({ where: { isUserCreated: false } });

  console.log(`📦 Current recipes in database: ${currentTotal}`);
  console.log(`🎯 After seeding, total will be: ~${currentTotal + TOTAL_TARGET}`);
  console.log('');

  for (const category of CATEGORY_TARGETS) {
    stats.byCategory[category.name] = { generated: 0, failed: 0 };

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📦 ${category.name.toUpperCase()}`);
    console.log(`   Cuisines: ${category.cuisines.join(', ')}`);
    console.log(`   Target: ${category.recipesTotal} recipes`);
    if (category.specialInstruction) {
      console.log(`   Note: ${category.specialInstruction.substring(0, 70)}...`);
    }
    console.log(`${'─'.repeat(60)}`);

    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'] as const;
    let generatedForCategory = 0;

    for (const mealType of mealTypes) {
      const targetForMealType = category.mealTypes[mealType];
      if (targetForMealType === 0) continue;

      for (let i = 0; i < targetForMealType; i++) {
        const success = await generateCategoryRecipe(category, mealType);

        if (success) {
          stats.generated++;
          stats.byCategory[category.name].generated++;
          generatedForCategory++;
        } else {
          stats.failed++;
          stats.byCategory[category.name].failed++;
        }

        // Rate limiting
        await delay(1500);
      }
    }

    console.log(`   📊 ${category.name}: +${generatedForCategory} generated`);
  }

  // Final summary
  const endTime = Date.now();
  const durationMinutes = Math.round((endTime - startTime) / 1000 / 60);
  const finalTotal = await prisma.recipe.count({ where: { isUserCreated: false } });

  console.log('\n' + '═'.repeat(70));
  console.log('📊 SEEDING SUMMARY');
  console.log('═'.repeat(70));
  console.log(`✅ Successfully Generated: ${stats.generated}`);
  console.log(`❌ Failed: ${stats.failed}`);
  console.log(`⏱️  Duration: ${durationMinutes} minutes`);
  console.log(`\n💾 Database State:`);
  console.log(`   Before: ${currentTotal} recipes`);
  console.log(`   After:  ${finalTotal} recipes`);
  console.log(`   Added:  ${finalTotal - currentTotal} new recipes`);

  console.log('\n📦 By Category:');
  for (const [name, counts] of Object.entries(stats.byCategory)) {
    console.log(`   ${name.padEnd(25)}: ${counts.generated} generated, ${counts.failed} failed`);
  }
}

// ============================================================================
// RUN SEEDING
// ============================================================================

seed500Recipes()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\n🎉 500-recipe seeding complete!');
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('\n❌ Seeding error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
