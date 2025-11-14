// backend/scripts/test-superfood-detection.ts
/**
 * Test script to verify superfood detection with existing recipes in the database
 */

import { PrismaClient } from '@prisma/client';
import { detectRecipeSuperfoods } from '../src/utils/superfoodDetection';

const prisma = new PrismaClient();

interface RecipeWithSuperfoods {
  id: string;
  title: string;
  cuisine: string;
  ingredients: Array<{ text: string }>;
  detectedSuperfoods: string[];
}

async function testSuperfoodDetection() {
  console.log('🧪 Testing Superfood Detection with Existing Recipes\n');
  console.log('=' .repeat(60));

  try {
    // Fetch a sample of recipes with their ingredients
    const recipes = await prisma.recipe.findMany({
      take: 50, // Test with 50 recipes
      include: {
        ingredients: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`\n📊 Testing ${recipes.length} recipes from database...\n`);

    const results: RecipeWithSuperfoods[] = [];
    let totalSuperfoods = 0;
    let recipesWithSuperfoods = 0;
    const superfoodCounts: Record<string, number> = {};

    // Test each recipe
    for (const recipe of recipes) {
      if (recipe.ingredients.length === 0) {
        continue; // Skip recipes without ingredients
      }

      // Detect superfoods
      const detected = detectRecipeSuperfoods(recipe.ingredients);
      const superfoodArray = Array.from(detected);

      if (superfoodArray.length > 0) {
        recipesWithSuperfoods++;
        totalSuperfoods += superfoodArray.length;

        // Count each superfood category
        superfoodArray.forEach(sf => {
          superfoodCounts[sf] = (superfoodCounts[sf] || 0) + 1;
        });

        results.push({
          id: recipe.id,
          title: recipe.title,
          cuisine: recipe.cuisine,
          ingredients: recipe.ingredients,
          detectedSuperfoods: superfoodArray,
        });
      }
    }

    // Display results
    console.log('✅ Detection Results:\n');
    console.log(`   Total recipes tested: ${recipes.length}`);
    console.log(`   Recipes with superfoods: ${recipesWithSuperfoods} (${Math.round((recipesWithSuperfoods / recipes.length) * 100)}%)`);
    console.log(`   Total superfood detections: ${totalSuperfoods}`);
    console.log(`   Average superfoods per recipe: ${recipesWithSuperfoods > 0 ? (totalSuperfoods / recipesWithSuperfoods).toFixed(2) : 0}\n`);

    // Show top detected superfoods
    console.log('🌟 Top Detected Superfoods:\n');
    const sortedSuperfoods = Object.entries(superfoodCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    sortedSuperfoods.forEach(([category, count], index) => {
      const percentage = Math.round((count / recipesWithSuperfoods) * 100);
      console.log(`   ${index + 1}. ${category.padEnd(20)} - ${count} recipes (${percentage}%)`);
    });

    // Show sample recipes with superfoods
    console.log('\n📝 Sample Recipes with Superfoods:\n');
    const sampleRecipes = results.slice(0, 10);
    
    sampleRecipes.forEach((recipe, index) => {
      console.log(`   ${index + 1}. ${recipe.title} (${recipe.cuisine})`);
      console.log(`      Superfoods: ${recipe.detectedSuperfoods.join(', ')}`);
      
      // Show sample ingredients that triggered detection
      const sampleIngredients = recipe.ingredients
        .slice(0, 3)
        .map(ing => ing.text)
        .join(', ');
      console.log(`      Sample ingredients: ${sampleIngredients}...`);
      console.log('');
    });

    // Test edge cases
    console.log('\n🔍 Testing Edge Cases:\n');
    
    // Test with empty ingredients
    const emptyResult = detectRecipeSuperfoods([]);
    console.log(`   Empty ingredients array: ${emptyResult.size === 0 ? '✅ Pass' : '❌ Fail'}`);

    // Test with common superfood ingredients
    const testIngredients = [
      { text: '2 tbsp extra virgin olive oil' },
      { text: '1 cup black beans' },
      { text: '1/2 cup quinoa' },
      { text: '1 avocado, sliced' },
      { text: '2 cloves garlic, minced' },
      { text: '1 cup spinach' },
    ];
    const testResult = detectRecipeSuperfoods(testIngredients);
    console.log(`   Test ingredients (6 superfoods): ${testResult.size} detected`);
    console.log(`   Detected: ${Array.from(testResult).join(', ')}`);
    console.log(`   Expected: oliveOil, beans, quinoa, avocado, garlic, spinach`);
    const expected = new Set(['oliveOil', 'beans', 'quinoa', 'avocado', 'garlic', 'spinach']);
    const allDetected = Array.from(testResult).every(sf => expected.has(sf));
    const allExpected = Array.from(expected).every(sf => testResult.has(sf));
    console.log(`   All expected detected: ${allDetected && allExpected ? '✅ Pass' : '❌ Fail'}`);

    // Test with false positives (should not match)
    const falsePositiveIngredients = [
      { text: 'olives' }, // Should not match "olive oil"
      { text: 'olive garden dressing' }, // Should not match "olive oil"
      { text: 'black pepper' }, // Should not match "black beans"
    ];
    const falsePositiveResult = detectRecipeSuperfoods(falsePositiveIngredients);
    console.log(`   False positive test: ${falsePositiveResult.size === 0 ? '✅ Pass (no false positives)' : `❌ Fail (detected: ${Array.from(falsePositiveResult).join(', ')})`}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Superfood detection test completed!\n');

  } catch (error) {
    console.error('❌ Error testing superfood detection:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testSuperfoodDetection()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

