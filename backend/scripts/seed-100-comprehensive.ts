// backend/scripts/seed-100-comprehensive.ts
// Test script to seed 100 diverse recipes across key categories
// ADDS to existing database (does NOT overwrite)
// Includes duplicate checking to ensure no conflicts

import { PrismaClient } from '@prisma/client';
import { AIRecipeService } from '../src/services/aiRecipeService';

const prisma = new PrismaClient();
const aiRecipeService = new AIRecipeService();

// ============================================================================
// 100-RECIPE TEST CONFIGURATION
// ============================================================================

interface RecipeTarget {
  category: string;
  cuisine?: string; // Optional cuisine for variety
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';
  count: number;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  specialInstruction?: string; // Custom AI instruction
  dietaryRestrictions?: string[];
  maxCookTime?: number;
}

// Distribution: 100 recipes across diverse categories
const RECIPE_TARGETS: RecipeTarget[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // POPULAR CUISINES (40 recipes)
  // ─────────────────────────────────────────────────────────────────────────
  { category: 'Mediterranean', cuisine: 'Mediterranean', mealType: 'breakfast', count: 3, macros: { calories: 500, protein: 35, carbs: 50, fat: 20 } },
  { category: 'Mediterranean', cuisine: 'Mediterranean', mealType: 'lunch', count: 4, macros: { calories: 600, protein: 45, carbs: 55, fat: 22 } },
  { category: 'Mediterranean', cuisine: 'Mediterranean', mealType: 'dinner', count: 5, macros: { calories: 700, protein: 50, carbs: 60, fat: 25 } },

  { category: 'American', cuisine: 'American', mealType: 'breakfast', count: 3, macros: { calories: 500, protein: 35, carbs: 50, fat: 20 } },
  { category: 'American', cuisine: 'American', mealType: 'lunch', count: 3, macros: { calories: 600, protein: 45, carbs: 55, fat: 22 } },
  { category: 'American', cuisine: 'American', mealType: 'dinner', count: 4, macros: { calories: 700, protein: 50, carbs: 60, fat: 25 } },

  { category: 'Mexican', cuisine: 'Mexican', mealType: 'breakfast', count: 2, macros: { calories: 500, protein: 35, carbs: 50, fat: 20 } },
  { category: 'Mexican', cuisine: 'Mexican', mealType: 'lunch', count: 3, macros: { calories: 600, protein: 45, carbs: 55, fat: 22 } },
  { category: 'Mexican', cuisine: 'Mexican', mealType: 'dinner', count: 3, macros: { calories: 700, protein: 50, carbs: 60, fat: 25 } },

  { category: 'Japanese', cuisine: 'Japanese', mealType: 'lunch', count: 3, macros: { calories: 600, protein: 45, carbs: 55, fat: 22 } },
  { category: 'Japanese', cuisine: 'Japanese', mealType: 'dinner', count: 3, macros: { calories: 700, protein: 50, carbs: 60, fat: 25 } },

  { category: 'Italian', cuisine: 'Italian', mealType: 'lunch', count: 2, macros: { calories: 600, protein: 45, carbs: 55, fat: 22 } },
  { category: 'Italian', cuisine: 'Italian', mealType: 'dinner', count: 2, macros: { calories: 700, protein: 50, carbs: 60, fat: 25 } },

  // ─────────────────────────────────────────────────────────────────────────
  // FITNESS CATEGORIES (35 recipes)
  // ─────────────────────────────────────────────────────────────────────────
  {
    category: 'High Protein',
    cuisine: 'American',
    mealType: 'breakfast',
    count: 3,
    macros: { calories: 500, protein: 50, carbs: 35, fat: 18 },
    specialInstruction: 'This recipe MUST be high-protein (50g+ protein per serving). Focus on lean meats, eggs, Greek yogurt, or protein powder.'
  },
  {
    category: 'High Protein',
    cuisine: 'Mediterranean',
    mealType: 'lunch',
    count: 4,
    macros: { calories: 600, protein: 55, carbs: 40, fat: 20 },
    specialInstruction: 'This recipe MUST be high-protein (55g+ protein per serving). Use lean chicken, fish, or legumes.'
  },
  {
    category: 'High Protein',
    cuisine: 'Asian',
    mealType: 'dinner',
    count: 4,
    macros: { calories: 700, protein: 60, carbs: 45, fat: 22 },
    specialInstruction: 'This recipe MUST be high-protein (60g+ protein per serving). Perfect for muscle building.'
  },

  {
    category: 'Post-Workout Recovery',
    cuisine: 'American',
    mealType: 'lunch',
    count: 3,
    macros: { calories: 550, protein: 45, carbs: 55, fat: 15 },
    specialInstruction: 'This is a POST-WORKOUT RECOVERY recipe. HIGH protein (45g+) with fast carbs for glycogen replenishment.'
  },
  {
    category: 'Post-Workout Recovery',
    cuisine: 'Mexican',
    mealType: 'dinner',
    count: 3,
    macros: { calories: 600, protein: 50, carbs: 60, fat: 18 },
    specialInstruction: 'This is a POST-WORKOUT RECOVERY recipe. HIGH protein (50g+) for muscle repair.'
  },

  {
    category: 'Low Carb',
    cuisine: 'Mediterranean',
    mealType: 'lunch',
    count: 3,
    macros: { calories: 500, protein: 45, carbs: 20, fat: 30 },
    specialInstruction: 'This recipe MUST be LOW-CARB (under 25g carbs). Avoid pasta, rice, bread. Use cauliflower rice or zucchini noodles.'
  },
  {
    category: 'Low Carb',
    cuisine: 'American',
    mealType: 'dinner',
    count: 4,
    macros: { calories: 600, protein: 50, carbs: 25, fat: 35 },
    specialInstruction: 'This recipe MUST be LOW-CARB (under 30g carbs). Higher fat for satiety.'
  },

  {
    category: 'High Fiber',
    cuisine: 'Mediterranean',
    mealType: 'breakfast',
    count: 3,
    macros: { calories: 450, protein: 30, carbs: 55, fat: 15 },
    specialInstruction: 'This recipe MUST be HIGH-FIBER (12g+ fiber per serving). Include oats, chia seeds, berries, or whole grains.'
  },
  {
    category: 'High Fiber',
    cuisine: 'Mexican',
    mealType: 'lunch',
    count: 3,
    macros: { calories: 550, protein: 35, carbs: 65, fat: 18 },
    specialInstruction: 'This recipe MUST be HIGH-FIBER (12g+ fiber per serving). Focus on beans, vegetables, and whole grains.'
  },
  {
    category: 'High Fiber',
    cuisine: 'Indian',
    mealType: 'dinner',
    count: 3,
    macros: { calories: 600, protein: 40, carbs: 70, fat: 20 },
    specialInstruction: 'This recipe MUST be HIGH-FIBER (12g+ fiber per serving). Use lentils, chickpeas, and vegetables.'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // QUICK & CONVENIENT (10 recipes)
  // ─────────────────────────────────────────────────────────────────────────
  {
    category: 'Quick Meals',
    cuisine: 'American',
    mealType: 'breakfast',
    count: 3,
    macros: { calories: 400, protein: 30, carbs: 40, fat: 15 },
    specialInstruction: 'This recipe MUST be quick (under 15 minutes). Simple ingredients and techniques.',
    maxCookTime: 15
  },
  {
    category: 'Quick Meals',
    cuisine: 'Asian',
    mealType: 'lunch',
    count: 4,
    macros: { calories: 500, protein: 40, carbs: 45, fat: 18 },
    specialInstruction: 'This recipe MUST be quick (under 20 minutes). Perfect for busy weekdays.',
    maxCookTime: 20
  },
  {
    category: 'Quick Meals',
    cuisine: 'Mediterranean',
    mealType: 'dinner',
    count: 3,
    macros: { calories: 550, protein: 45, carbs: 50, fat: 20 },
    specialInstruction: 'This recipe MUST be quick (under 20 minutes). One-pan or minimal prep.',
    maxCookTime: 20
  },

  // ─────────────────────────────────────────────────────────────────────────
  // VEGETARIAN (8 recipes)
  // ─────────────────────────────────────────────────────────────────────────
  {
    category: 'Vegetarian',
    cuisine: 'Indian',
    mealType: 'lunch',
    count: 2,
    macros: { calories: 550, protein: 30, carbs: 65, fat: 20 },
    specialInstruction: 'This recipe MUST be VEGETARIAN. Use legumes, tofu, or paneer for protein.',
    dietaryRestrictions: ['vegetarian']
  },
  {
    category: 'Vegetarian',
    cuisine: 'Mediterranean',
    mealType: 'dinner',
    count: 3,
    macros: { calories: 600, protein: 35, carbs: 70, fat: 22 },
    specialInstruction: 'This recipe MUST be VEGETARIAN. Mediterranean plant-based proteins.',
    dietaryRestrictions: ['vegetarian']
  },
  {
    category: 'Vegetarian',
    cuisine: 'Mexican',
    mealType: 'dinner',
    count: 3,
    macros: { calories: 600, protein: 35, carbs: 70, fat: 22 },
    specialInstruction: 'This recipe MUST be VEGETARIAN. Use beans and plant proteins.',
    dietaryRestrictions: ['vegetarian']
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DESSERTS & SNACKS (7 recipes)
  // ─────────────────────────────────────────────────────────────────────────
  {
    category: 'Protein Desserts',
    cuisine: 'American',
    mealType: 'dessert',
    count: 3,
    macros: { calories: 350, protein: 35, carbs: 35, fat: 12 },
    specialInstruction: `This is a HIGH-PROTEIN DESSERT (35g+ protein). Create variations like:
- Protein ice cream (Greek yogurt + whey protein + almond milk + sweetener + pudding mix + cookie/pretzel crumbles)
- Protein cheesecake, protein brownies, or protein mousse
Use: Greek yogurt, cottage cheese, protein powder, egg whites. Sweeten with monk fruit or stevia.`
  },
  {
    category: 'Healthy Snacks',
    cuisine: 'American',
    mealType: 'snack',
    count: 2,
    macros: { calories: 250, protein: 20, carbs: 25, fat: 10 },
    specialInstruction: 'This is a healthy SNACK recipe. High protein, satisfying between meals.'
  },
  {
    category: 'Healthy Snacks',
    cuisine: 'Mediterranean',
    mealType: 'snack',
    count: 2,
    macros: { calories: 250, protein: 18, carbs: 28, fat: 12 },
    specialInstruction: 'This is a healthy Mediterranean SNACK. Use hummus, yogurt, or nuts.'
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
  // Get all recipes and do case-insensitive comparison in JavaScript
  const allRecipes = await prisma.recipe.findMany({
    select: { title: true },
  });

  const titleLower = title.toLowerCase();
  const exists = allRecipes.some(r => r.title.toLowerCase() === titleLower);

  return exists;
}

// Check if similar recipe exists (fuzzy match on title)
async function similarRecipeExists(title: string): Promise<boolean> {
  // Extract key words from title (ignore common words)
  const commonWords = ['the', 'a', 'an', 'with', 'and', 'or', 'in', 'on'];
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

  // If we found potential matches, check similarity
  for (const recipe of existing) {
    const existingWords = recipe.title.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word));

    // Calculate overlap
    const overlap = titleWords.filter(word => existingWords.includes(word)).length;
    const similarity = overlap / Math.max(titleWords.length, existingWords.length);

    // If more than 60% similar, consider it a duplicate
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
        cookTimePreference: target.maxCookTime || 45,
      },
      maxCookTimeForMeal: target.maxCookTime,
    });

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
      // If we've tried 3 times and still similar, accept it (might be intentional variation)
      console.log(`  ⚠️  Accepting after ${maxAttempts} attempts`);
    }

    await aiRecipeService.saveGeneratedRecipe(recipe, null);
    console.log(`  ✅ "${recipe.title}" (${recipe.calories} cal, ${recipe.protein}g protein)`);
    return true;
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message?.substring(0, 80)}`);
    if (attempt < maxAttempts) {
      await delay(2000);
      return generateTargetRecipe(target, attempt + 1);
    }
    return false;
  }
}

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function seed100Recipes() {
  console.log('🌱 100-RECIPE TEST SEEDING');
  console.log('═'.repeat(70));
  console.log(`📊 Target: ${TOTAL_TARGET} diverse recipes`);
  console.log('✅ Adds to existing database (does NOT overwrite)');
  console.log('🔍 Includes duplicate checking (exact + fuzzy matching)');
  console.log('');

  const stats = {
    generated: 0,
    failed: 0,
    duplicates: 0,
  };

  const startTime = Date.now();

  // Show current database state
  const currentTotal = await prisma.recipe.count({ where: { isUserCreated: false } });
  console.log(`📦 Current recipes in database: ${currentTotal}`);
  console.log(`🎯 After seeding, total will be: ~${currentTotal + TOTAL_TARGET}`);
  console.log('');

  // Generate recipes
  for (const target of RECIPE_TARGETS) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📦 ${target.category.toUpperCase()} - ${target.mealType}`);
    console.log(`   Cuisine: ${target.cuisine || 'any'} | Count: ${target.count}`);
    if (target.specialInstruction) {
      console.log(`   Note: ${target.specialInstruction.substring(0, 60)}...`);
    }
    console.log(`${'─'.repeat(60)}`);

    for (let i = 0; i < target.count; i++) {
      const success = await generateTargetRecipe(target);

      if (success) {
        stats.generated++;
      } else {
        stats.failed++;
      }

      // Rate limiting
      await delay(1500);
    }

    console.log(`   📊 ${target.category}: ${target.count} recipes attempted`);
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
}

// ============================================================================
// RUN SEEDING
// ============================================================================

seed100Recipes()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\n🎉 100-recipe test seeding complete!');
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('\n❌ Seeding error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
