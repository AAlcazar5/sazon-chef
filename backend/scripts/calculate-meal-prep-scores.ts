// backend/scripts/calculate-meal-prep-scores.ts
// Script to calculate meal prep scores for all recipes

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Calculate meal prep score based on recipe properties
 */
function calculateMealPrepScore(recipe: any): number {
  let score = 0;

  // Batch-friendly flag (30 points)
  if (recipe.batchFriendly) {
    score += 30;
  }

  // Freezable (25 points)
  if (recipe.freezable) {
    score += 25;
  }

  // Weekly prep friendly (20 points)
  if (recipe.weeklyPrepFriendly) {
    score += 20;
  }

  // Meal prep suitable (15 points)
  if (recipe.mealPrepSuitable) {
    score += 15;
  }

  // Storage instructions (10 points)
  if (recipe.storageInstructions || recipe.fridgeStorageDays || recipe.freezerStorageMonths) {
    score += 10;
  }

  // Servings (10 points) - more servings = better for batch cooking
  const servings = recipe.servings || 1;
  if (servings >= 6) {
    score += 10;
  } else if (servings >= 4) {
    score += 5;
  }

  return Math.min(100, score);
}

/**
 * Main function to calculate and set meal prep scores
 */
async function calculateMealPrepScores() {
  try {
    console.log('🍱 Starting meal prep score calculation...');
    
    // Get all recipes
    const recipes = await prisma.recipe.findMany({
      select: {
        id: true,
        title: true,
        mealPrepSuitable: true,
        freezable: true,
        batchFriendly: true,
        weeklyPrepFriendly: true,
        mealPrepScore: true,
        storageInstructions: true,
        fridgeStorageDays: true,
        freezerStorageMonths: true,
        servings: true,
      },
    });
    
    console.log(`📊 Found ${recipes.length} recipes to calculate scores for`);
    
    let updated = 0;
    const scoreDistribution = {
      excellent: 0, // 80-100
      good: 0, // 60-79
      okay: 0, // 40-59
      poor: 0, // 0-39
    };
    
    for (const recipe of recipes) {
      const newScore = calculateMealPrepScore(recipe);
      
      // Always update the score (even if it's the same)
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: { mealPrepScore: newScore },
      });
      
      updated++;
      
      // Track score distribution
      if (newScore >= 80) {
        scoreDistribution.excellent++;
      } else if (newScore >= 60) {
        scoreDistribution.good++;
      } else if (newScore >= 40) {
        scoreDistribution.okay++;
      } else {
        scoreDistribution.poor++;
      }
      
      if (updated % 50 === 0) {
        console.log(`✅ Calculated ${updated} recipes...`);
      }
    }
    
    console.log(`\n✅ Calculation complete!`);
    console.log(`📊 Statistics:`);
    console.log(`   - Total recipes: ${recipes.length}`);
    console.log(`   - Updated: ${updated}`);
    console.log(`\n🏆 Score distribution:`);
    console.log(`   - Excellent (80-100): ${scoreDistribution.excellent} recipes`);
    console.log(`   - Good (60-79): ${scoreDistribution.good} recipes`);
    console.log(`   - Okay (40-59): ${scoreDistribution.okay} recipes`);
    console.log(`   - Poor (0-39): ${scoreDistribution.poor} recipes`);
    
    const suitableForMealPrep = scoreDistribution.excellent + scoreDistribution.good;
    console.log(`\n🍱 ${suitableForMealPrep} recipes suitable for meal prep mode (score >= 60)`);
    
  } catch (error) {
    console.error('❌ Error calculating meal prep scores:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
calculateMealPrepScores()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

