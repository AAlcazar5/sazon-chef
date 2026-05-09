// backend/scripts/recipes/migrateCuisineToCanonical.ts
// ROADMAP 4.0 Tier D3 — CLI wrapper for the cuisine migration.
//
// Usage:
//   npx ts-node scripts/recipes/migrateCuisineToCanonical.ts          # apply
//   npx ts-node scripts/recipes/migrateCuisineToCanonical.ts --dry    # plan only
//
// Reversible: only writes Recipe.canonicalCuisine + Recipe.subCuisine.
// Original Recipe.cuisine is preserved.

import { prisma } from '../../src/lib/prisma';
import {
  migrateCuisineToCanonical,
  MigrationAdapter,
} from '../../src/services/migrateCuisineToCanonicalService';

const dryRun = process.argv.includes('--dry');

const prismaAdapter: MigrationAdapter = {
  findMany: async () =>
    prisma.recipe.findMany({
      select: {
        id: true,
        cuisine: true,
        canonicalCuisine: true,
        subCuisine: true,
      },
    }),
  update: async (id, fields) => {
    await prisma.recipe.update({ where: { id }, data: fields });
  },
};

async function main() {
  const stats = await migrateCuisineToCanonical(prismaAdapter, { dryRun });
  console.log(JSON.stringify(stats, null, 2));
  if (stats.unresolved > 0) {
    console.warn(
      `[migrateCuisineToCanonical] ${stats.unresolved} unresolved rows. Sample: ${stats.unresolvedSamples.join(', ')}`,
    );
  }
  if (dryRun) {
    console.log('[migrateCuisineToCanonical] dry-run — no rows updated.');
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
