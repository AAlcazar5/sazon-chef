// backend/scripts/backupRecipes.ts
// Automatic recipe backup utility

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface RecipeBackup {
  recipes: any[];
  timestamp: string;
  count: number;
}

/**
 * Backup all recipes to a JSON file
 */
async function backupRecipes(): Promise<void> {
  try {
    console.log('💾 Starting recipe backup...');

    // Get all recipes with full details
    const recipes = await prisma.recipe.findMany({
      include: {
        ingredients: {
          orderBy: { order: 'asc' }
        },
        instructions: {
          orderBy: { step: 'asc' }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const backup: RecipeBackup = {
      recipes,
      timestamp: new Date().toISOString(),
      count: recipes.length
    };

    // Create backups directory if it doesn't exist
    const backupsDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    // Save backup with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupsDir, `recipes-backup-${timestamp}.json`);
    
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    
    console.log(`✅ Backup created: ${backupFile}`);
    console.log(`📊 Backed up ${recipes.length} recipes`);

    // Keep only the last 10 backups
    const backupFiles = fs.readdirSync(backupsDir)
      .filter(file => file.startsWith('recipes-backup-') && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(backupsDir, file),
        time: fs.statSync(path.join(backupsDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Newest first

    // Delete old backups (keep last 10)
    if (backupFiles.length > 10) {
      const toDelete = backupFiles.slice(10);
      for (const file of toDelete) {
        fs.unlinkSync(file.path);
        console.log(`🗑️  Deleted old backup: ${file.name}`);
      }
    }

    // Also create a "latest" backup for easy access
    const latestBackup = path.join(backupsDir, 'recipes-backup-latest.json');
    fs.writeFileSync(latestBackup, JSON.stringify(backup, null, 2));
    console.log(`✅ Latest backup saved: ${latestBackup}`);

  } catch (error: any) {
    console.error('❌ Backup error:', error);
    throw error;
  }
}

/**
 * Restore recipes from a backup file
 */
async function restoreRecipes(backupFile: string): Promise<void> {
  try {
    console.log(`📥 Restoring recipes from ${backupFile}...`);

    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8')) as RecipeBackup;
    
    console.log(`📊 Found ${backupData.count} recipes in backup (from ${backupData.timestamp})`);

    // Clear existing recipes (optional - could also merge)
    const shouldClear = process.env.CLEAR_BEFORE_RESTORE === 'true';
    
    if (shouldClear) {
      console.log('🧹 Clearing existing recipes...');
      await prisma.recipeIngredient.deleteMany();
      await prisma.recipeInstruction.deleteMany();
      await prisma.recipe.deleteMany();
    }

    // Restore recipes
    let restored = 0;
    let skipped = 0;

    for (const recipe of backupData.recipes) {
      try {
        // Check if recipe already exists
        const existing = await prisma.recipe.findFirst({
          where: {
            title: recipe.title,
            cuisine: recipe.cuisine,
            source: recipe.source || null
          }
        });

        if (existing && !shouldClear) {
          skipped++;
          continue;
        }

        // Create recipe with ingredients and instructions
        await prisma.recipe.create({
          data: {
            title: recipe.title,
            description: recipe.description,
            cookTime: recipe.cookTime,
            cuisine: recipe.cuisine,
            difficulty: recipe.difficulty || 'medium',
            calories: recipe.calories,
            protein: recipe.protein,
            carbs: recipe.carbs,
            fat: recipe.fat,
            fiber: recipe.fiber,
            servings: recipe.servings || 1,
            imageUrl: recipe.imageUrl,
            source: recipe.source || 'database',
            isUserCreated: recipe.isUserCreated || false,
            ingredients: {
              create: recipe.ingredients.map((ing: any) => ({
                text: ing.text,
                order: ing.order
              }))
            },
            instructions: {
              create: recipe.instructions.map((inst: any) => ({
                text: inst.text,
                step: inst.step
              }))
            }
          }
        });

        restored++;
      } catch (error: any) {
        console.error(`❌ Error restoring recipe "${recipe.title}":`, error.message);
      }
    }

    console.log(`✅ Restore complete: ${restored} restored, ${skipped} skipped`);
  } catch (error: any) {
    console.error('❌ Restore error:', error);
    throw error;
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const backupFile = process.argv[3];

  try {
    if (command === 'backup') {
      await backupRecipes();
    } else if (command === 'restore') {
      if (!backupFile) {
        console.error('❌ Please provide backup file path');
        console.log('Usage: npm run backup:restore <backup-file-path>');
        process.exit(1);
      }
      await restoreRecipes(backupFile);
    } else {
      console.log('Usage:');
      console.log('  npm run backup:create  - Create a backup');
      console.log('  npm run backup:restore <file>  - Restore from backup');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { backupRecipes, restoreRecipes };

