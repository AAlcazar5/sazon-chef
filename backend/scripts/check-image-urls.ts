// backend/scripts/check-image-urls.ts
// Quick diagnostic script to check imageUrl status in database

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkImageUrls() {
  console.log('🔍 Checking imageUrl status in database...\n');

  try {
    // Get total count
    const total = await prisma.recipe.count({
      where: { isUserCreated: false }
    });

    // Count recipes with and without images
    const withImages = await prisma.recipe.count({
      where: {
        isUserCreated: false,
        imageUrl: { not: null },
        NOT: { imageUrl: '' }
      }
    });

    const withoutImages = await prisma.recipe.count({
      where: {
        isUserCreated: false,
        OR: [
          { imageUrl: null },
          { imageUrl: '' }
        ]
      }
    });

    console.log('📊 Image URL Statistics:');
    console.log('─'.repeat(50));
    console.log(`Total recipes: ${total}`);
    console.log(`✅ With imageUrl: ${withImages} (${((withImages / total) * 100).toFixed(1)}%)`);
    console.log(`❌ Without imageUrl: ${withoutImages} (${((withoutImages / total) * 100).toFixed(1)}%)`);

    // Sample some recipes to see actual URLs
    console.log('\n📝 Sample Recipes WITH Images (first 5):');
    const withImageSamples = await prisma.recipe.findMany({
      where: {
        isUserCreated: false,
        imageUrl: { not: null },
        NOT: { imageUrl: '' }
      },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        cookTime: true
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    withImageSamples.forEach((r, i) => {
      console.log(`\n  ${i + 1}. ${r.title} (${r.cookTime} min)`);
      console.log(`     ImageUrl: ${r.imageUrl?.substring(0, 80)}...`);
    });

    // Sample recipes without images
    console.log('\n📝 Sample Recipes WITHOUT Images (first 5):');
    const withoutImageSamples = await prisma.recipe.findMany({
      where: {
        isUserCreated: false,
        OR: [
          { imageUrl: null },
          { imageUrl: '' }
        ]
      },
      select: {
        id: true,
        title: true,
        cookTime: true
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    withoutImageSamples.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.title} (${r.cookTime} min) - NO IMAGE`);
    });

    // Check URL formats
    console.log('\n🔗 Image URL Format Analysis:');
    const allWithImages = await prisma.recipe.findMany({
      where: {
        isUserCreated: false,
        imageUrl: { not: null },
        NOT: { imageUrl: '' }
      },
      select: { imageUrl: true },
      take: 100
    });

    const urlFormats = {
      'images.unsplash.com': 0,
      'source.unsplash.com': 0,
      'other': 0
    };

    allWithImages.forEach(r => {
      if (!r.imageUrl) return;
      if (r.imageUrl.includes('images.unsplash.com')) {
        urlFormats['images.unsplash.com']++;
      } else if (r.imageUrl.includes('source.unsplash.com')) {
        urlFormats['source.unsplash.com']++;
      } else {
        urlFormats['other']++;
      }
    });

    console.log(`  images.unsplash.com: ${urlFormats['images.unsplash.com']}`);
    console.log(`  source.unsplash.com: ${urlFormats['source.unsplash.com']}`);
    console.log(`  Other formats: ${urlFormats['other']}`);

    if (withoutImages > 0) {
      console.log(`\n⚠️  ${withoutImages} recipes need images!`);
      console.log(`   Run: npm run update:images`);
    } else {
      console.log(`\n✅ All recipes have images!`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkImageUrls();
