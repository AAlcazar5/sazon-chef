// backend/src/utils/autoBackup.ts
// Automatic recipe backup on server startup and periodic backups

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const BACKUP_INTERVAL_HOURS = 24; // Backup every 24 hours
const BACKUPS_DIR = path.join(__dirname, '../../backups');
const MAX_BACKUPS = 10; // Keep last 10 backups

interface RecipeBackup {
  recipes: any[];
  timestamp: string;
  count: number;
}

/**
 * Create a backup of all recipes
 */
async function createBackup(): Promise<string | null> {
  try {
    // Create backups directory if it doesn't exist
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

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

    // Save backup with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUPS_DIR, `recipes-backup-${timestamp}.json`);
    
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    
    console.log(`💾 Auto-backup created: ${backupFile} (${recipes.length} recipes)`);

    // Keep only the last MAX_BACKUPS backups
    const backupFiles = fs.readdirSync(BACKUPS_DIR)
      .filter(file => file.startsWith('recipes-backup-') && file.endsWith('.json') && !file.includes('latest'))
      .map(file => ({
        name: file,
        path: path.join(BACKUPS_DIR, file),
        time: fs.statSync(path.join(BACKUPS_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Newest first

    // Delete old backups
    if (backupFiles.length > MAX_BACKUPS) {
      const toDelete = backupFiles.slice(MAX_BACKUPS);
      for (const file of toDelete) {
        fs.unlinkSync(file.path);
        console.log(`🗑️  Deleted old backup: ${file.name}`);
      }
    }

    // Also create a "latest" backup for easy access
    const latestBackup = path.join(BACKUPS_DIR, 'recipes-backup-latest.json');
    fs.writeFileSync(latestBackup, JSON.stringify(backup, null, 2));

    return backupFile;
  } catch (error: any) {
    console.error('❌ Auto-backup error:', error);
    return null;
  }
}

/**
 * Check if backup is needed (based on last backup time)
 */
function shouldBackup(): boolean {
  try {
    const latestBackup = path.join(BACKUPS_DIR, 'recipes-backup-latest.json');
    
    if (!fs.existsSync(latestBackup)) {
      return true; // No backup exists, create one
    }

    const stats = fs.statSync(latestBackup);
    const lastBackupTime = stats.mtime.getTime();
    const now = Date.now();
    const hoursSinceBackup = (now - lastBackupTime) / (1000 * 60 * 60);

    return hoursSinceBackup >= BACKUP_INTERVAL_HOURS;
  } catch (error) {
    return true; // On error, create backup
  }
}

/**
 * Initialize automatic backups
 * - Creates backup on server startup
 * - Sets up periodic backups
 */
export async function initializeAutoBackup(): Promise<void> {
  try {
    console.log('🔄 Initializing automatic recipe backups...');

    // Create initial backup on startup
    if (shouldBackup()) {
      await createBackup();
    } else {
      console.log('ℹ️  Recent backup exists, skipping startup backup');
    }

    // Set up periodic backups
    const backupInterval = BACKUP_INTERVAL_HOURS * 60 * 60 * 1000; // Convert to milliseconds
    
    setInterval(async () => {
      if (shouldBackup()) {
        await createBackup();
      }
    }, backupInterval);

    console.log(`✅ Auto-backup initialized (every ${BACKUP_INTERVAL_HOURS} hours)`);
  } catch (error: any) {
    console.error('❌ Failed to initialize auto-backup:', error);
  }
}

/**
 * Get the latest backup file path
 */
export function getLatestBackup(): string | null {
  try {
    const latestBackup = path.join(BACKUPS_DIR, 'recipes-backup-latest.json');
    if (fs.existsSync(latestBackup)) {
      return latestBackup;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get all backup files
 */
export function getAllBackups(): string[] {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      return [];
    }

    return fs.readdirSync(BACKUPS_DIR)
      .filter(file => file.startsWith('recipes-backup-') && file.endsWith('.json'))
      .map(file => path.join(BACKUPS_DIR, file))
      .sort((a, b) => {
        const statsA = fs.statSync(a);
        const statsB = fs.statSync(b);
        return statsB.mtime.getTime() - statsA.mtime.getTime(); // Newest first
      });
  } catch {
    return [];
  }
}

