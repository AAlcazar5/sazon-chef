/**
 * Script to ensure all recipes in the database have unique images
 * This is particularly useful after bulk imports or seeding
 *
 * Usage: npx ts-node backend/scripts/ensure-unique-images.ts
 */

import { PrismaClient } from '@prisma/client';
import { assignUniqueImagesToRecipes } from '../src/utils/uniqueImageHelper';

const prisma = new PrismaClient();

async function ensureUniqueImages() {
  try {
    console.log('🔍 Checking for duplicate images in database...\n');

    // Get all recipes
    const allRecipes = await prisma.recipe.findMany({
      where: {
        isUserCreated: false, // Only update system recipes
      },
      orderBy: {
        id: 'asc',
      },
    });

    console.log(`📊 Found ${allRecipes.length} recipes to process\n`);

    // Find duplicates
    const imageUrlCounts = new Map<string, number>();
    allRecipes.forEach((recipe) => {
      if (recipe.imageUrl) {
        const count = imageUrlCounts.get(recipe.imageUrl) || 0;
        imageUrlCounts.set(recipe.imageUrl, count + 1);
      }
    });

    const duplicateUrls = Array.from(imageUrlCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([url]) => url);

    console.log(`⚠️  Found ${duplicateUrls.length} duplicate image URLs\n`);

    if (duplicateUrls.length === 0) {
      console.log('✅ No duplicate images found! All recipes have unique images.');
      return;
    }

    // Process recipes in batches of 20 (one page)
    const BATCH_SIZE = 20;
    const totalBatches = Math.ceil(allRecipes.length / BATCH_SIZE);

    console.log(`🔄 Processing ${totalBatches} batches of ${BATCH_SIZE} recipes...\n`);

    for (let i = 0; i < totalBatches; i++) {
      const startIdx = i * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, allRecipes.length);
      const batch = allRecipes.slice(startIdx, endIdx);

      console.log(`📦 Processing batch ${i + 1}/${totalBatches} (recipes ${startIdx + 1}-${endIdx})...`);

      // Assign unique images to this batch
      const updatedRecipes = await assignUniqueImagesToRecipes(batch, startIdx);

      // Update database
      for (const recipe of updatedRecipes) {
        await prisma.recipe.update({
          where: { id: recipe.id },
          data: {
            imageUrl: recipe.imageUrl,
            unsplashPhotoId: recipe.unsplashPhotoId,
            unsplashDownloadLocation: recipe.unsplashDownloadLocation,
            unsplashPhotographerName: recipe.unsplashPhotographerName,
            unsplashPhotographerUsername: recipe.unsplashPhotographerUsername,
            unsplashAttributionText: recipe.unsplashAttributionText,
            unsplashUrl: recipe.unsplashUrl,
          },
        });
      }

      console.log(`✅ Updated batch ${i + 1}/${totalBatches}\n`);

      // Add a small delay to respect Unsplash API rate limits (50 requests/hour)
      if (i < totalBatches - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log('🎉 Successfully ensured unique images for all recipes!');
  } catch (error) {
    console.error('❌ Error ensuring unique images:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
ensureUniqueImages()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
