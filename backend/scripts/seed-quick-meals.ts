// backend/scripts/seed-quick-meals.ts
// Seeding script that prioritizes quick meals under 30 minutes
// ADDS to existing database (does NOT overwrite)
// Includes duplicate checking to ensure no conflicts

import { PrismaClient } from '@prisma/client';
import { AIRecipeService } from '../src/services/aiRecipeService';

const prisma = new PrismaClient();
const aiRecipeService = new AIRecipeService();

// ============================================================================
// QUICK MEALS CONFIGURATION (All recipes ≤ 30 minutes)
// ============================================================================

interface RecipeTarget {
  category: string;
  cuisine?: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';
  count: number;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  specialInstruction?: string;
  dietaryRestrictions?: string[];
  maxCookTime: number; // All recipes must be ≤ 30 minutes
}

// Distribution: 100 quick recipes (all ≤ 30 minutes)
const RECIPE_TARGETS: RecipeTarget[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // ULTRA-QUICK BREAKFASTS (≤15 min) - 20 recipes
  // ─────────────────────────────────────────────────────────────────────────
  {
    category: 'Ultra-Quick Breakfast',
    cuisine: 'American',
    mealType: 'breakfast',
    count: 5,
    macros: { calories: 400, protein: 30, carbs: 40, fat: 15 },
    specialInstruction: 'This recipe MUST be ultra-quick (under 15 minutes). Use simple ingredients, minimal prep, and fast cooking methods like scrambling, toasting, or blending. Perfect for busy mornings.',
    maxCookTime: 15
  },
  {
    category: 'Ultra-Quick Breakfast',
    cuisine: 'Mediterranean',
    mealType: 'breakfast',
    count: 4,
    macros: { calories: 420, protein: 28, carbs: 45, fat: 16 },
    specialInstruction: 'This recipe MUST be ultra-quick (under 15 minutes). Mediterranean breakfast with minimal prep - think Greek yogurt bowls, quick egg dishes, or simple toast.',
    maxCookTime: 15
  },
  {
    category: 'Ultra-Quick Breakfast',
    cuisine: 'Mexican',
    mealType: 'breakfast',
    count: 3,
    macros: { calories: 450, protein: 32, carbs: 48, fat: 18 },
    specialInstruction: 'This recipe MUST be ultra-quick (under 15 minutes). Quick Mexican breakfast like huevos rancheros, breakfast tacos, or simple scrambled eggs with salsa.',
    maxCookTime: 15
  },
  {
    category: 'Ultra-Quick Breakfast',
    cuisine: 'Asian',
    mealType: 'breakfast',
    count: 4,
    macros: { calories: 380, protein: 25, carbs: 42, fat: 14 },
    specialInstruction: 'This recipe MUST be ultra-quick (under 15 minutes). Quick Asian breakfast - think congee, simple fried rice, or quick noodle dishes.',
    maxCookTime: 15
  },
  {
    category: 'Ultra-Quick Breakfast',
    cuisine: 'Italian',
    mealType: 'breakfast',
    count: 4,
    macros: { calories: 400, protein: 28, carbs: 44, fat: 15 },
    specialInstruction: 'This recipe MUST be ultra-quick (under 15 minutes). Quick Italian breakfast - simple frittatas, quick toast with toppings, or simple egg dishes.',
    maxCookTime: 15
  },

  // ─────────────────────────────────────────────────────────────────────────
  // QUICK LUNCHES (≤30 min) - 30 recipes
  // ─────────────────────────────────────────────────────────────────────────
  {
    category: 'Quick Lunch',
    cuisine: 'Mediterranean',
    mealType: 'lunch',
    count: 6,
    macros: { calories: 550, protein: 40, carbs: 50, fat: 20 },
    specialInstruction: 'This recipe MUST be quick (under 30 minutes). One-pan Mediterranean lunch - think quick salads, wraps, or simple grilled dishes. Minimal prep, maximum flavor.',
    maxCookTime: 30
  },
  {
    category: 'Quick Lunch',
    cuisine: 'American',
    mealType: 'lunch',
    count: 5,
    macros: { calories: 580, protein: 42, carbs: 52, fat: 22 },
    specialInstruction: 'This recipe MUST be quick (under 30 minutes). Quick American lunch - sandwiches, wraps, quick bowls, or simple one-pan meals.',
    maxCookTime: 30
  },
  {
    category: 'Quick Lunch',
    cuisine: 'Mexican',
    mealType: 'lunch',
    count: 5,
    macros: { calories: 560, protein: 38, carbs: 55, fat: 20 },
    specialInstruction: 'This recipe MUST be quick (under 30 minutes). Quick Mexican lunch - tacos, burrito bowls, or simple one-pan dishes. Fast and flavorful.',
    maxCookTime: 30
  },
  {
    category: 'Quick Lunch',
    cuisine: 'Asian',
    mealType: 'lunch',
    count: 5,
    macros: { calories: 540, protein: 36, carbs: 58, fat: 18 },
    specialInstruction: 'This recipe MUST be quick (under 30 minutes). Quick Asian lunch - stir-fries, quick noodle dishes, or simple rice bowls. One-pan cooking preferred.',
    maxCookTime: 30
  },
  {
    category: 'Quick Lunch',
    cuisine: 'Italian',
    mealType: 'lunch',
    count: 4,
    macros: { calories: 570, protein: 40, carbs: 54, fat: 21 },
    specialInstruction: 'This recipe MUST be quick (under 30 minutes). Quick Italian lunch - simple pasta dishes, quick pizzas, or one-pan meals.',
    maxCookTime: 30
  },
  {
    category: 'Quick Lunch',
    cuisine: 'Indian',
    mealType: 'lunch',
    count: 5,
    macros: { calories: 560, protein: 35, carbs: 60, fat: 20 },
    specialInstruction: 'This recipe MUST be quick (under 30 minutes). Quick Indian lunch - simple curries, quick dals, or one-pan dishes. Use pre-made spice blends to save time.',
    maxCookTime: 30
  },

  // ─────────────────────────────────────────────────────────────────────────
  // QUICK DINNERS (≤30 min) - 30 recipes
  // ─────────────────────────────────────────────────────────────────────────
  {
    category: 'Quick Dinner',
    cuisine: 'Mediterranean',
    mealType: 'dinner',
    count: 6,
    macros: { calories: 600, protein: 45, carbs: 55, fat: 22 },
    specialInstruction: 'This recipe MUST be quick (under 30 minutes). One-pan Mediterranean dinner - quick grilled dishes, simple pasta, or fast sheet pan meals.',
    maxCookTime: 30
  },
  {
    category: 'Quick Dinner',
    cuisine: 'American',
    mealType: 'dinner',
    count: 5,
    macros: { calories: 620, protein: 48, carbs: 52, fat: 24 },
    specialInstruction: 'This recipe MUST be quick (under 30 minutes). Quick American dinner - one-pan meals, quick skillet dishes, or simple grilled proteins with sides.',
    maxCookTime: 30
  },
  {
    category: 'Quick Dinner',
    cuisine: 'Mexican',
    mealType: 'dinner',
    count: 5,
    macros: { calories: 600, protein: 42, carbs: 58, fat: 22 },
    specialInstruction: 'This recipe MUST be quick (under 30 minutes). Quick Mexican dinner - one-pan fajitas, quick tacos, or simple skillet dishes.',
    maxCookTime: 30
  },
  {
    category: 'Quick Dinner',
    cuisine: 'Asian',
    mealType: 'dinner',
    count: 5,
    macros: { calories: 580, protein: 40, carbs: 60, fat: 20 },
    specialInstruction: 'This recipe MUST be quick (under 30 minutes). Quick Asian dinner - stir-fries, quick noodle dishes, or one-pan meals. Fast wok cooking preferred.',
    maxCookTime: 30
  },
  {
    category: 'Quick Dinner',
    cuisine: 'Italian',
    mealType: 'dinner',
    count: 4,
    macros: { calories: 610, protein: 44, carbs: 56, fat: 23 },
    specialInstruction: 'This recipe MUST be quick (under 30 minutes). Quick Italian dinner - simple pasta dishes, quick risottos, or one-pan meals.',
    maxCookTime: 30
  },
  {
    category: 'Quick Dinner',
    cuisine: 'Indian',
    mealType: 'dinner',
    count: 5,
    macros: { calories: 590, protein: 38, carbs: 62, fat: 21 },
    specialInstruction: 'This recipe MUST be quick (under 30 minutes). Quick Indian dinner - simple curries, quick dals, or one-pan dishes. Use pre-made spice blends.',
    maxCookTime: 30
  },

  // ─────────────────────────────────────────────────────────────────────────
  // QUICK SNACKS & DESSERTS (≤15 min) - 20 recipes
  // ─────────────────────────────────────────────────────────────────────────
  {
    category: 'Quick Snacks',
    cuisine: 'American',
    mealType: 'snack',
    count: 5,
    macros: { calories: 250, protein: 20, carbs: 25, fat: 10 },
    specialInstruction: 'This recipe MUST be ultra-quick (under 15 minutes). Quick healthy snack - no-bake options, simple protein bars, or quick smoothies.',
    maxCookTime: 15
  },
  {
    category: 'Quick Snacks',
    cuisine: 'Mediterranean',
    mealType: 'snack',
    count: 4,
    macros: { calories: 240, protein: 18, carbs: 28, fat: 12 },
    specialInstruction: 'This recipe MUST be ultra-quick (under 15 minutes). Quick Mediterranean snack - simple dips, quick toast, or simple yogurt bowls.',
    maxCookTime: 15
  },
  {
    category: 'Quick Desserts',
    cuisine: 'American',
    mealType: 'dessert',
    count: 5,
    macros: { calories: 300, protein: 8, carbs: 45, fat: 12 },
    specialInstruction: 'This recipe MUST be ultra-quick (under 15 minutes). Quick dessert - no-bake options, simple mousses, or quick fruit desserts.',
    maxCookTime: 15
  },
  {
    category: 'Quick Desserts',
    cuisine: 'Mediterranean',
    mealType: 'dessert',
    count: 3,
    macros: { calories: 280, protein: 6, carbs: 42, fat: 11 },
    specialInstruction: 'This recipe MUST be ultra-quick (under 15 minutes). Quick Mediterranean dessert - simple fruit dishes, quick yogurt desserts, or simple pastries.',
    maxCookTime: 15
  },
  {
    category: 'Quick Desserts',
    cuisine: 'Italian',
    mealType: 'dessert',
    count: 3,
    macros: { calories: 290, protein: 7, carbs: 44, fat: 11 },
    specialInstruction: 'This recipe MUST be ultra-quick (under 15 minutes). Quick Italian dessert - simple tiramisu variations, quick panna cotta, or simple fruit dishes.',
    maxCookTime: 15
  },
];

// Calculate total
const TOTAL_TARGET = RECIPE_TARGETS.reduce((sum, t) => sum + t.count, 0);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Enhanced duplicate checking
async function recipeExists(title: string): Promise<boolean> {
  const allRecipes = await prisma.recipe.findMany({
    select: { title: true },
  });

  const titleLower = title.toLowerCase();
  const exists = allRecipes.some(r => r.title.toLowerCase() === titleLower);

  return exists;
}

// Check if similar recipe exists (fuzzy match on title)
async function similarRecipeExists(title: string): Promise<boolean> {
  const commonWords = ['the', 'a', 'an', 'with', 'and', 'or', 'in', 'on'];
  const titleWords = title.toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word));

  if (titleWords.length === 0) return false;

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
      console.log(`  ⚠️  Similar recipe found: "${recipe.title}" (${Math.round(similarity * 100)}% match)`);
      return true;
    }
  }

  return false;
}

// ============================================================================
// RECIPE GENERATION
// ============================================================================

async function generateTargetRecipe(
  target: RecipeTarget,
  attempt: number = 1
): Promise<boolean> {
  const maxAttempts = 3;

  try {
    console.log(`  🍽️  [${target.category}] ${target.mealType} (${target.cuisine || 'any'})... [Attempt ${attempt}]`);

    const recipe = await aiRecipeService.generateRecipe({
      userId: null,
      macroGoals: target.macros,
      mealType: target.mealType,
      cuisineOverride: target.cuisine,
      userPreferences: {
        likedCuisines: target.cuisine ? [target.cuisine] : [],
        dietaryRestrictions: target.dietaryRestrictions || [],
        bannedIngredients: [],
        spiceLevel: 'medium',
        cookTimePreference: target.maxCookTime,
      },
      maxCookTimeForMeal: target.maxCookTime,
    });

    // Verify cook time is actually ≤ maxCookTime
    if (recipe.cookTime > target.maxCookTime) {
      console.log(`  ⚠️  Recipe cook time (${recipe.cookTime} min) exceeds target (${target.maxCookTime} min) - retrying`);
      if (attempt < maxAttempts) {
        await delay(1000);
        return generateTargetRecipe(target, attempt + 1);
      }
      console.log(`  ⚠️  Accepting recipe despite longer cook time`);
    }

    // Check for exact duplicate
    const isExactDuplicate = await recipeExists(recipe.title);
    if (isExactDuplicate) {
      console.log(`  ⚠️  Exact duplicate: "${recipe.title}" - retrying`);
      if (attempt < maxAttempts) {
        await delay(1000);
        return generateTargetRecipe(target, attempt + 1);
      }
      return false;
    }

    // Check for similar recipe
    const isSimilar = await similarRecipeExists(recipe.title);
    if (isSimilar) {
      console.log(`  ⚠️  Similar recipe exists - retrying for more variety`);
      if (attempt < maxAttempts) {
        await delay(1000);
        return generateTargetRecipe(target, attempt + 1);
      }
      console.log(`  ⚠️  Accepting after ${maxAttempts} attempts`);
    }

    await aiRecipeService.saveGeneratedRecipe(recipe, null);
    console.log(`  ✅ "${recipe.title}" (${recipe.cookTime} min, ${recipe.calories} cal, ${recipe.protein}g protein)`);
    return true;
  } catch (error: any) {
    console.error(`  ❌ Error generating recipe:`, error.message);
    if (attempt < maxAttempts) {
      console.log(`  🔄 Retrying... (${attempt + 1}/${maxAttempts})`);
      await delay(2000);
      return generateTargetRecipe(target, attempt + 1);
    }
    return false;
  }
}

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function main() {
  console.log('⚡ Seeding Quick Meals (All ≤ 30 minutes)...\n');
  console.log(`Target: ${TOTAL_TARGET} quick recipes\n`);

  let totalAdded = 0;
  let totalSkipped = 0;

  for (const target of RECIPE_TARGETS) {
    console.log(`\n📦 ${target.category} - ${target.mealType} (${target.cuisine || 'any'})`);
    console.log(`   Target: ${target.count} recipes (max ${target.maxCookTime} min each)`);

    let added = 0;
    for (let i = 0; i < target.count; i++) {
      const success = await generateTargetRecipe(target);
      if (success) {
        added++;
        totalAdded++;
      } else {
        totalSkipped++;
      }

      // Small delay between recipes to avoid rate limiting
      if (i < target.count - 1) {
        await delay(500);
      }
    }

    console.log(`   ✅ Added ${added}/${target.count} recipes`);
  }

  console.log(`\n🎉 Quick Meals Seeding Complete!`);
  console.log(`   ✅ Added: ${totalAdded} recipes`);
  console.log(`   ⚠️  Skipped: ${totalSkipped} recipes`);

  // Final statistics
  const quickMealsCount = await prisma.recipe.count({
    where: {
      cookTime: {
        lte: 30,
      },
    },
  });

  const totalRecipes = await prisma.recipe.count();
  console.log(`\n📊 Database Statistics:`);
  console.log(`   Total recipes: ${totalRecipes}`);
  console.log(`   Quick meals (≤30 min): ${quickMealsCount} (${((quickMealsCount / totalRecipes) * 100).toFixed(1)}%)`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
