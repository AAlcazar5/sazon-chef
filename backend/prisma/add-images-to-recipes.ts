// backend/prisma/add-images-to-recipes.ts
// Script to fetch and add images to recipes that don't have images
import { PrismaClient } from '@prisma/client';
import { imageService } from '../src/services/imageService';

const prisma = new PrismaClient();

async function addImagesToRecipes() {
  console.log('🖼️  Starting image fetching for recipes without images...');
  
  try {
    // Find all recipes without images
    const recipesWithoutImages = await prisma.recipe.findMany({
      where: {
        OR: [
          { imageUrl: null },
          { imageUrl: '' }
        ],
        isUserCreated: false // Only system recipes
      },
      include: {
        ingredients: {
          orderBy: { order: 'asc' },
          take: 1 // Only need first ingredient
        }
      },
      take: 200 // Process in batches to avoid rate limits
    });
    
    console.log(`📊 Found ${recipesWithoutImages.length} recipes without images`);
    
    let successCount = 0;
    let failCount = 0;
    
    // Process recipes with a delay to avoid rate limits
    for (let i = 0; i < recipesWithoutImages.length; i++) {
      const recipe = recipesWithoutImages[i];
      
      try {
        console.log(`\n[${i + 1}/${recipesWithoutImages.length}] Fetching image for: ${recipe.title}`);
        
        // Extract main ingredient from first ingredient if available
        let mainIngredient: string | undefined;
        if (recipe.ingredients && recipe.ingredients.length > 0) {
          const firstIngredient = recipe.ingredients[0].text;
          // Extract ingredient name (remove amounts/units)
          mainIngredient = firstIngredient
            .replace(/^\d+\s*(cup|tbsp|tsp|oz|lb|g|kg|ml|l|piece|pieces|slice|slices|clove|cloves|can|cans|package|packages)\s*/i, '')
            .trim()
            .split(',')[0] // Take first part if comma-separated
            .split('(')[0] // Remove parenthetical notes
            .trim();
        }
        
        // Fetch image using the same service as AI-generated recipes
        const photoData = await imageService.searchFoodImage({
          recipeName: recipe.title,
          cuisine: recipe.cuisine || undefined,
          mainIngredient: mainIngredient || undefined,
        });
        
        if (photoData) {
          // Update recipe with image data
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
            }
          });
          
          console.log(`✅ Image added: ${photoData.url}`);
          console.log(`   Photographer: ${photoData.photographer.name}`);
          successCount++;
        } else {
          console.log(`⚠️  No image found for: ${recipe.title}`);
          failCount++;
        }
        
        // Add delay to avoid rate limits (Unsplash allows 50 requests per hour for free tier)
        // Wait 1.5 seconds between requests = ~40 requests per minute max
        if (i < recipesWithoutImages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      } catch (error: any) {
        console.error(`❌ Error fetching image for ${recipe.title}:`, error.message);
        failCount++;
        
        // Continue with next recipe even if one fails
        continue;
      }
    }
    
    console.log(`\n🎉 Image fetching completed!`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📊 Total processed: ${recipesWithoutImages.length}`);
  } catch (error) {
    console.error('❌ Error in addImagesToRecipes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addImagesToRecipes();

