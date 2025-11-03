// backend/scripts/refresh-all-images.ts
// Refreshes ALL recipes with production-quality Unsplash images (upgrades to full quality)

import { PrismaClient } from '@prisma/client';
import { imageService } from '../src/services/imageService';

const prisma = new PrismaClient();

async function refreshAllImages() {
  console.log('🖼️  Refreshing ALL recipes with production-quality Unsplash images...\n');
  console.log('📊 Production API: 5000 requests/hour (using ~3600 requests/hour)\n');
  console.log('⚠️  This will update ALL recipes, including ones with existing images.\n');

  try {
    // Get ALL recipes to refresh with higher quality images
    const recipes = await prisma.recipe.findMany({
      include: {
        ingredients: {
          take: 1,
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`📊 Found ${recipes.length} total recipes to refresh\n`);

    if (recipes.length === 0) {
      console.log('❌ No recipes found!\n');
      return;
    }

    let updated = 0;
    let failed = 0;
    let skipped = 0;

    for (const recipe of recipes) {
      try {
        console.log(`\n🍽️  Processing: ${recipe.title}`);
        console.log(`   Cuisine: ${recipe.cuisine}`);
        console.log(`   Current: ${recipe.unsplashPhotoId ? `Has Unsplash image (${recipe.imageUrl?.substring(0, 50)}...)` : 'No Unsplash image'}`);

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
          // Check if this is actually a different/better image
          const isNewImage = !recipe.unsplashPhotoId || recipe.unsplashPhotoId !== photoData.id;
          const wasRegularQuality = recipe.imageUrl?.includes('w=1080'); // Regular quality has w=1080
          const isUpgrade = !recipe.imageUrl || wasRegularQuality;

          if (isNewImage || isUpgrade) {
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

            console.log(`   ✅ ${isNewImage ? 'Updated with new' : 'Upgraded to high-quality'} image by ${photoData.photographer.name}`);
            updated++;
          } else {
            console.log(`   ⏭️  Already has high-quality image, skipping`);
            skipped++;
          }
        } else {
          console.log(`   ⚠️  No image found, skipping`);
          skipped++;
        }

        // Rate limiting - 1 second between requests = 3600 requests/hour (well within 5000/hour limit)
        await new Promise(resolve => setTimeout(resolve, 1000));
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
    console.log(`   ⏭️  Skipped: ${skipped} recipes (already high-quality)`);
    console.log(`   ❌ Failed: ${failed} recipes`);
    console.log(`   🎉 Done!\n`);
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
refreshAllImages();

