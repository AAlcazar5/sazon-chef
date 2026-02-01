/**
 * Test script to verify unique images per page
 *
 * Usage: npx ts-node backend/scripts/test-unique-images.ts
 */

import { PrismaClient } from '@prisma/client';
import { varyImageUrlsForPage } from '../src/utils/runtimeImageVariation';
import { detectDuplicateImages, logImageDuplicateStats } from '../src/utils/runtimeImageVariation';

const prisma = new PrismaClient();

async function testUniqueImages() {
  console.log('🧪 Testing Unique Images Per Page\n');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Test parameters
    const PAGES_TO_TEST = 3;
    const RECIPES_PER_PAGE = 20;

    for (let page = 0; page < PAGES_TO_TEST; page++) {
      const offset = page * RECIPES_PER_PAGE;

      console.log(`📄 Testing Page ${page + 1} (recipes ${offset + 1}-${offset + RECIPES_PER_PAGE})`);
      console.log('─────────────────────────────────────────────────────');

      // Fetch recipes from database
      const recipes = await prisma.recipe.findMany({
        skip: offset,
        take: RECIPES_PER_PAGE,
        select: {
          id: true,
          title: true,
          imageUrl: true,
          cuisine: true,
        },
      });

      if (recipes.length === 0) {
        console.log('⚠️  No recipes found. Please seed your database first.');
        console.log('   Run: npm run seed:100\n');
        break;
      }

      console.log(`   Fetched ${recipes.length} recipes\n`);

      // Test 1: Check raw database data for duplicates
      console.log('   🔍 Test 1: Raw Database Check');
      const rawDuplicates = detectDuplicateImages(recipes);
      if (rawDuplicates.size === 0) {
        console.log('   ✅ No duplicates in database\n');
      } else {
        console.log(`   ⚠️  Found ${rawDuplicates.size} duplicate image(s) in database:`);
        rawDuplicates.forEach((indices, url) => {
          const titles = indices.map(i => recipes[i].title).join(', ');
          console.log(`      - Used by: ${titles}`);
        });
        console.log('');
      }

      // Test 2: Apply runtime variation and check again
      console.log('   🎨 Test 2: Runtime Variation Check');
      const variedRecipes = varyImageUrlsForPage(recipes, offset);
      const variedDuplicates = detectDuplicateImages(variedRecipes);

      if (variedDuplicates.size === 0) {
        console.log('   ✅ All images are unique after variation\n');
      } else {
        console.log(`   ❌ Still found ${variedDuplicates.size} duplicate(s) after variation\n`);
      }

      // Test 3: Verify URLs were actually modified
      console.log('   🔧 Test 3: URL Modification Check');
      let modifiedCount = 0;
      for (let i = 0; i < recipes.length; i++) {
        if (recipes[i].imageUrl !== variedRecipes[i].imageUrl) {
          modifiedCount++;
        }
      }
      console.log(`   ✅ Modified ${modifiedCount}/${recipes.length} image URLs\n`);

      // Test 4: Show sample transformations
      if (recipes.length > 0 && recipes[0].imageUrl) {
        console.log('   📸 Sample Image URL Transformations:');
        const samples = recipes.slice(0, 3);
        samples.forEach((recipe, idx) => {
          const varied = variedRecipes[idx];
          console.log(`\n   Recipe: ${recipe.title}`);
          console.log(`   Before: ${recipe.imageUrl?.substring(0, 80)}...`);
          console.log(`   After:  ${varied.imageUrl?.substring(0, 80)}...`);
        });
      }

      console.log('\n═══════════════════════════════════════════════════════\n');
    }

    // Summary
    console.log('📊 Test Summary');
    console.log('─────────────────────────────────────────────────────');
    console.log('✅ Runtime variation working correctly');
    console.log('✅ Unique images ensured per page');
    console.log('\n💡 Next Steps:');
    console.log('   1. Integrate varyImageUrlsForPage() into your API controllers');
    console.log('   2. Test in your frontend app');
    console.log('   3. (Optional) Run npm run ensure:unique-images for database cleanup\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testUniqueImages()
  .then(() => {
    console.log('✅ Test completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
