// backend/scripts/update-recipe-images.ts
// Updates all existing recipes with production-quality Unsplash images (1920px full quality)

import { PrismaClient } from '@prisma/client';
import { imageService } from '../src/services/imageService';

const prisma = new PrismaClient();

async function updateRecipeImages() {
  console.log('🖼️  Starting recipe image update with production-quality Unsplash images...\n');
  console.log('📊 Production API: 5000 requests/hour (using ~720 requests/hour for safety)\n');

  try {
    // Get all recipes that need images or want to refresh with higher quality
    // We'll update recipes that either:
    // 1. Don't have Unsplash images yet
    // 2. Have Unsplash images but want higher quality (optional - can skip existing)
    const recipes = await prisma.recipe.findMany({
      where: {
        OR: [
          { unsplashPhotoId: null },
          { unsplashPhotoId: '' },
        ],
      },
      include: {
        ingredients: {
          take: 1,
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`📊 Found ${recipes.length} recipes to update\n`);

    if (recipes.length === 0) {
      console.log('✅ All recipes already have Unsplash images!\n');
      console.log('💡 To refresh existing images with higher quality, modify the script to include all recipes.');
      return;
    }

    let updated = 0;
    let failed = 0;
    let skipped = 0;

    for (const recipe of recipes) {
      try {
        console.log(`\n🍽️  Processing: ${recipe.title}`);
        console.log(`   Cuisine: ${recipe.cuisine}`);
        console.log(`   Current image: ${recipe.imageUrl ? 'Has image' : 'No image'}`);

        // Get main ingredient from first ingredient
        const firstIngredient = recipe.ingredients[0]?.text || '';
        const mainIngredient = firstIngredient.split(' ').slice(1, 3).join(' ') || firstIngredient.split(' ')[1] || '';

        // Fetch relevant high-quality image from Unsplash
        const photoData = await imageService.searchFoodImage({
          recipeName: recipe.title,
          cuisine: recipe.cuisine,
          mainIngredient,
        });

        if (photoData) {
          // Update recipe with new high-quality image and attribution
          await prisma.recipe.update({
            where: { id: recipe.id },
            data: {
              imageUrl: photoData.url,
              unsplashPhotoId: photoData.id,
              unsplashDownloadLocation: photoData.downloadLocation,
              unsplashPhotographerName: photoData.photographer.name,
              unsplashPhotographerUsername: photoData.photographer.username,
              unsplashAttributionText: photoData.attributionText,
              unsplashUrl: photoData.unsplashUrl,
            },
          });

          console.log(`   ✅ Updated with high-quality image by ${photoData.photographer.name}`);
          updated++;

          // Rate limiting - 1 second between requests = 3600 requests/hour (well within 5000/hour limit)
          // Safe margin to avoid rate limits while being efficient
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.log(`   ⚠️  No image found, skipping`);
          skipped++;
        }
      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}`);
        
        // If it's a rate limit, wait longer
        if (error.response?.status === 429 || error.message?.includes('rate limit')) {
          console.log(`   ⏸️  Rate limited, waiting 60 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 60000));
        } else {
          failed++;
        }
      }
    }

    console.log(`\n\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updated} recipes`);
    console.log(`   ⚠️  Skipped: ${skipped} recipes`);
    console.log(`   ❌ Failed: ${failed} recipes`);
    console.log(`   🎉 Done!\n`);
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateRecipeImages();
