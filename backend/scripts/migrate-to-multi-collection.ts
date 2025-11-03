/**
 * Migration script to move from single collectionId to multi-collection support
 * 
 * This script:
 * 1. Creates RecipeCollection entries for existing SavedRecipe entries with collectionId
 * 2. Should be run AFTER the Prisma migration that creates the RecipeCollection table
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  console.log('🔄 Starting migration to multi-collection support...');

  try {
    // Find all SavedRecipe entries that have a collectionId (old schema)
    // Note: This assumes collectionId still exists temporarily
    const savedRecipes = await (prisma as any).savedRecipe.findMany({
      where: {
        collectionId: { not: null }
      },
      select: {
        id: true,
        collectionId: true
      }
    });

    console.log(`📋 Found ${savedRecipes.length} saved recipes with collections to migrate`);

    // Create RecipeCollection entries
    let migrated = 0;
    for (const saved of savedRecipes) {
      if (saved.collectionId) {
        try {
          await (prisma as any).recipeCollection.create({
            data: {
              savedRecipeId: saved.id,
              collectionId: saved.collectionId,
              addedAt: new Date()
            }
          });
          migrated++;
        } catch (error: any) {
          // Skip duplicates
          if (error.code === 'P2002') {
            console.log(`⏭️  Skipping duplicate: ${saved.id} -> ${saved.collectionId}`);
          } else {
            console.error(`❌ Error migrating ${saved.id}:`, error.message);
          }
        }
      }
    }

    console.log(`✅ Migrated ${migrated} recipe-collection associations`);
    console.log('✅ Migration complete!');
  } catch (error: any) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrate();

