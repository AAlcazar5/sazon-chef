# Recipe Backup System

## Overview
The Sazon Chef backend includes an automatic recipe backup system to prevent data loss.

## Automatic Backups

### How It Works
- **On Server Startup**: Creates a backup if one doesn't exist or if the last backup is older than 24 hours
- **Periodic Backups**: Automatically creates backups every 24 hours while the server is running
- **Backup Location**: `backend/backups/`
- **Retention**: Keeps the last 10 backups, automatically deletes older ones

### Backup Files
- `recipes-backup-YYYY-MM-DDTHH-MM-SS.json` - Timestamped backups
- `recipes-backup-latest.json` - Always points to the most recent backup

## Manual Backup Commands

### Create a Backup
```bash
npm run backup:create
```

### Restore from Backup
```bash
# Restore from latest backup
npm run backup:restore backups/recipes-backup-latest.json

# Restore from specific backup
npm run backup:restore backups/recipes-backup-2025-11-08T03-04-37-922Z.json

# Clear existing recipes before restore (optional)
CLEAR_BEFORE_RESTORE=true npm run backup:restore backups/recipes-backup-latest.json
```

## Backup File Format
```json
{
  "recipes": [
    {
      "id": "...",
      "title": "...",
      "description": "...",
      "ingredients": [...],
      "instructions": [...],
      ...
    }
  ],
  "timestamp": "2025-11-08T03:04:37.922Z",
  "count": 194
}
```

## Database Seeding

### Safe Seeding (Preserves Existing Data)
```bash
npm run seed
```
This will:
- Only create the test user if it doesn't exist
- **NOT** delete existing recipes
- **NOT** clear any data

### Clear and Reseed (⚠️ Destructive)
```bash
npm run seed:clear
```
This will:
- **DELETE ALL** existing data
- Create fresh test user and 10 basic recipes
- Use only when you want to start completely fresh

## Best Practices

1. **Before Major Changes**: Always create a manual backup
   ```bash
   npm run backup:create
   ```

2. **Before Seeding**: Check if you need to clear data
   - Use `npm run seed` for safe seeding (preserves recipes)
   - Use `npm run seed:clear` only when you want to wipe everything

3. **Regular Backups**: The automatic system handles this, but you can create manual backups anytime

4. **Restore Process**: 
   - Always test restore on a development database first
   - Backups are JSON files - you can inspect them before restoring

## Troubleshooting

### Backup Not Created
- Check that `backend/backups/` directory exists and is writable
- Check server logs for backup errors

### Restore Fails
- Verify backup file exists and is valid JSON
- Check database connection
- Ensure Prisma schema matches backup format

### Too Many Backups
- The system automatically keeps only the last 10 backups
- Old backups are automatically deleted
- You can manually delete backups if needed

