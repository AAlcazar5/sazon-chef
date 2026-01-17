// backend/scripts/update-meal-prep-flags.ts
// Script to analyze recipes and set meal prep suitability flags

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Keywords that indicate meal prep suitability
const MEAL_PREP_POSITIVE_KEYWORDS = [
  // Cooking methods
  'stew', 'soup', 'chili', 'curry', 'casserole', 'lasagna', 'bake', 'roast', 'braise',
  'slow cook', 'crock pot', 'instant pot', 'pressure cook',
  // Meal prep friendly dishes
  'meal prep', 'batch', 'make ahead', 'prep', 'freeze', 'frozen', 'refrigerate',
  // Storage indicators
  'store', 'keep', 'lasts', 'reheat', 'warm up',
  // Dish types that are typically meal prep friendly
  'sauce', 'marinade', 'dressing', 'dip', 'spread',
  // Protein dishes that hold well
  'meatball', 'meatloaf', 'pulled', 'shredded', 'braised',
];

// Keywords that indicate NOT suitable for meal prep
const MEAL_PREP_NEGATIVE_KEYWORDS = [
  // Fresh/delicate items
  'fresh salad', 'raw', 'sushi', 'sashimi', 'ceviche', 'tartare',
  // Items that don't reheat well
  'fried', 'crispy', 'crunchy', 'tempura', 'battered',
  // Items that should be eaten immediately
  'freshly', 'just made', 'serve immediately', 'eat right away',
  // Delicate items
  'souffle', 'meringue', 'whipped cream', 'fresh herbs as garnish',
  // Items that lose texture
  'pasta salad', 'potato salad', 'coleslaw', // (some can work, but many don't)
  // Breakfast/egg dishes that don't meal prep well
  'huevos', 'scrambled eggs', 'fried eggs', 'poached eggs', 'sunny side up', 'over easy',
  'omelet', 'omelette', 'frittata', 'quiche', // (quiche can work, but be conservative)
  'breakfast burrito', 'breakfast taco', 'breakfast bowl',
];

// Keywords that indicate freezable
const FREEZABLE_KEYWORDS = [
  'freeze', 'frozen', 'freezer', 'thaw', 'defrost', 'ice', 'frozen',
  'soup', 'stew', 'chili', 'sauce', 'marinade', 'casserole', 'lasagna',
  'meatball', 'meatloaf', 'pulled', 'braised',
];

// Keywords that indicate NOT freezable (even if other indicators suggest it)
const NOT_FREEZABLE_KEYWORDS = [
  'huevos', 'eggs', 'scrambled', 'fried eggs', 'poached', 'omelet', 'omelette',
  'breakfast', 'fresh', 'raw egg',
];

// Keywords that indicate batch cooking
const BATCH_COOKING_KEYWORDS = [
  'batch', 'large batch', 'double', 'triple', 'multiply', 'scale up',
  'make ahead', 'prep', 'meal prep', 'bulk',
];

// Keywords that indicate weekly prep (refrigerates well)
const WEEKLY_PREP_KEYWORDS = [
  'refrigerate', 'fridge', 'keep in fridge', 'store in refrigerator',
  'lasts', 'good for', 'days', 'week',
];

/**
 * Analyze recipe text for meal prep suitability
 */
function analyzeRecipeText(text: string): {
  mealPrepSuitable: boolean;
  freezable: boolean;
  batchFriendly: boolean;
  weeklyPrepFriendly: boolean;
} {
  const lowerText = text.toLowerCase();
  
  // Check for negative indicators first (strong signal)
  const hasNegativeIndicators = MEAL_PREP_NEGATIVE_KEYWORDS.some(keyword => 
    lowerText.includes(keyword)
  );
  
  if (hasNegativeIndicators) {
    return {
      mealPrepSuitable: false,
      freezable: false,
      batchFriendly: false,
      weeklyPrepFriendly: false,
    };
  }
  
  // Check for positive indicators
  const hasPositiveIndicators = MEAL_PREP_POSITIVE_KEYWORDS.some(keyword => 
    lowerText.includes(keyword)
  );
  
  // Check for negative freezable indicators first
  const hasNotFreezableIndicators = NOT_FREEZABLE_KEYWORDS.some(keyword => 
    lowerText.includes(keyword)
  );
  
  const hasFreezableIndicators = !hasNotFreezableIndicators && FREEZABLE_KEYWORDS.some(keyword => 
    lowerText.includes(keyword)
  );
  
  const hasBatchIndicators = BATCH_COOKING_KEYWORDS.some(keyword => 
    lowerText.includes(keyword)
  );
  
  const hasWeeklyPrepIndicators = WEEKLY_PREP_KEYWORDS.some(keyword => 
    lowerText.includes(keyword)
  );
  
  return {
    mealPrepSuitable: hasPositiveIndicators,
    freezable: hasFreezableIndicators,
    batchFriendly: hasBatchIndicators,
    weeklyPrepFriendly: hasWeeklyPrepIndicators,
  };
}

/**
 * Analyze recipe based on characteristics
 */
function analyzeRecipe(recipe: any): {
  mealPrepSuitable: boolean;
  freezable: boolean;
  batchFriendly: boolean;
  weeklyPrepFriendly: boolean;
} {
  // Combine all text fields for analysis
  const allText = [
    recipe.title || '',
    recipe.description || '',
    ...(recipe.ingredients || []).map((ing: any) => ing.text || ing.name || ''),
    ...(recipe.instructions || []).map((inst: any) => inst.text || inst.instruction || ''),
    recipe.storageInstructions || '',
  ].join(' ').toLowerCase();
  
  // Analyze text
  const textAnalysis = analyzeRecipeText(allText);
  
  // Additional heuristics based on recipe properties
  const heuristics = {
    // If it has storage instructions, it's likely meal prep friendly
    hasStorageInstructions: !!(recipe.storageInstructions || recipe.fridgeStorageDays || recipe.freezerStorageMonths),
    
    // Higher servings often indicate batch cooking
    highServings: (recipe.servings || 1) >= 4,
    
    // Longer cook times often indicate dishes that hold well
    longCookTime: (recipe.cookTime || 0) >= 30,
    
    // Certain cuisines are typically meal prep friendly
    mealPrepFriendlyCuisine: [
      'mexican', 'indian', 'italian', 'mediterranean', 'asian', 'thai', 'chinese',
      'japanese', 'korean', 'american', 'comfort food'
    ].includes((recipe.cuisine || '').toLowerCase()),
  };
  
  // Determine flags
  const mealPrepSuitable = 
    textAnalysis.mealPrepSuitable || 
    heuristics.hasStorageInstructions ||
    (heuristics.highServings && heuristics.longCookTime && heuristics.mealPrepFriendlyCuisine);
  
  const freezable = 
    textAnalysis.freezable || 
    !!recipe.freezerStorageMonths ||
    (mealPrepSuitable && heuristics.hasStorageInstructions);
  
  const batchFriendly = 
    textAnalysis.batchFriendly || 
    heuristics.highServings ||
    (mealPrepSuitable && (recipe.servings || 1) >= 6);
  
  const weeklyPrepFriendly = 
    textAnalysis.weeklyPrepFriendly || 
    !!recipe.fridgeStorageDays ||
    (mealPrepSuitable && !textAnalysis.freezable); // If meal prep suitable but not freezable, likely weekly prep
  
  return {
    mealPrepSuitable,
    freezable,
    batchFriendly,
    weeklyPrepFriendly,
  };
}

/**
 * Main function to update meal prep flags
 */
async function updateMealPrepFlags() {
  try {
    console.log('🍱 Starting meal prep flags update...');
    
    // Get all recipes
    const recipes = await prisma.recipe.findMany({
      include: {
        ingredients: true,
        instructions: true,
      },
    });
    
    console.log(`📊 Found ${recipes.length} recipes to analyze`);
    
    let updated = 0;
    let skipped = 0;
    const updates: Array<{
      id: string;
      title: string;
      flags: { mealPrepSuitable: boolean; freezable: boolean; batchFriendly: boolean; weeklyPrepFriendly: boolean };
    }> = [];
    
    for (const recipe of recipes) {
      // Skip if already has flags set (we'll only update if needed)
      // Actually, let's re-analyze all recipes to ensure accuracy
      
      const analysis = analyzeRecipe(recipe);
      
      // Only update if flags would change
      const needsUpdate = 
        recipe.mealPrepSuitable !== analysis.mealPrepSuitable ||
        recipe.freezable !== analysis.freezable ||
        recipe.batchFriendly !== analysis.batchFriendly ||
        recipe.weeklyPrepFriendly !== analysis.weeklyPrepFriendly;
      
      if (needsUpdate) {
        await prisma.recipe.update({
          where: { id: recipe.id },
          data: {
            mealPrepSuitable: analysis.mealPrepSuitable,
            freezable: analysis.freezable,
            batchFriendly: analysis.batchFriendly,
            weeklyPrepFriendly: analysis.weeklyPrepFriendly,
          },
        });
        
        updated++;
        updates.push({
          id: recipe.id,
          title: recipe.title,
          flags: analysis,
        });
        
        if (updated % 10 === 0) {
          console.log(`✅ Updated ${updated} recipes...`);
        }
      } else {
        skipped++;
      }
    }
    
    console.log(`\n✅ Update complete!`);
    console.log(`📊 Statistics:`);
    console.log(`   - Total recipes: ${recipes.length}`);
    console.log(`   - Updated: ${updated}`);
    console.log(`   - Skipped (no changes): ${skipped}`);
    
    // Show summary of flags
    const mealPrepCount = updates.filter(u => u.flags.mealPrepSuitable).length;
    const freezableCount = updates.filter(u => u.flags.freezable).length;
    const batchCount = updates.filter(u => u.flags.batchFriendly).length;
    const weeklyCount = updates.filter(u => u.flags.weeklyPrepFriendly).length;
    
    console.log(`\n🏷️  Flag summary (updated recipes):`);
    console.log(`   - Meal Prep Suitable: ${mealPrepCount}`);
    console.log(`   - Freezable: ${freezableCount}`);
    console.log(`   - Batch Friendly: ${batchCount}`);
    console.log(`   - Weekly Prep Friendly: ${weeklyCount}`);
    
    // Show some examples
    if (updates.length > 0) {
      console.log(`\n📝 Sample updates:`);
      updates.slice(0, 10).forEach(update => {
        const flags = [];
        if (update.flags.mealPrepSuitable) flags.push('mealPrep');
        if (update.flags.freezable) flags.push('freezable');
        if (update.flags.batchFriendly) flags.push('batch');
        if (update.flags.weeklyPrepFriendly) flags.push('weekly');
        console.log(`   - ${update.title}: ${flags.join(', ') || 'none'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error updating meal prep flags:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateMealPrepFlags()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

