// backend/scripts/detect-duplicate-recipes.ts
//
// Read-only duplicate-recipe report. Clusters every recipe in the DB by its
// normalized title key (see src/utils/recipeTitleKey.ts) and prints every
// cluster with > 1 member.
//
// Usage:
//   npx ts-node -r tsconfig-paths/register scripts/detect-duplicate-recipes.ts
//   ... --json                # machine-readable output for CI / piping
//   ... --min=3               # only show clusters with ≥ N members
//
// Exit code:
//   0  no duplicates found
//   1  duplicates found (so CI / a post-deploy check can gate on it)
//
// This script never writes. To actually remove duplicates use
// dedupe-recipes-post-run.ts.

import { PrismaClient } from '@prisma/client';
import { normalizeRecipeTitleKey } from '../src/utils/recipeTitleKey';

const prisma = new PrismaClient();

const asJson = process.argv.includes('--json');
const minArg = process.argv.find((a) => a.startsWith('--min='));
const minMembers = Math.max(2, Number(minArg?.split('=')[1] ?? 2));

interface RecipeRow {
  id: string;
  title: string;
  cuisine: string;
  source: string;
  createdAt: Date;
  imageUrl: string | null;
  _count: { savedRecipes: number };
}

async function main(): Promise<void> {
  const recipes = await prisma.recipe.findMany({
    select: {
      id: true,
      title: true,
      cuisine: true,
      source: true,
      createdAt: true,
      imageUrl: true,
      _count: { select: { savedRecipes: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const clusters = new Map<string, RecipeRow[]>();
  for (const r of recipes) {
    const key = normalizeRecipeTitleKey(r.title);
    if (!key) continue; // untitled rows aren't a meaningful dup signal
    const bucket = clusters.get(key);
    if (bucket) bucket.push(r as RecipeRow);
    else clusters.set(key, [r as RecipeRow]);
  }

  const dupClusters = [...clusters.entries()]
    .filter(([, rows]) => rows.length >= minMembers)
    .sort((a, b) => b[1].length - a[1].length);

  const totalDuplicateRows = dupClusters.reduce((sum, [, rows]) => sum + (rows.length - 1), 0);

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          scanned: recipes.length,
          duplicateClusters: dupClusters.length,
          redundantRows: totalDuplicateRows,
          clusters: dupClusters.map(([key, rows]) => ({
            key,
            title: rows[0].title,
            count: rows.length,
            members: rows.map((r) => ({
              id: r.id,
              cuisine: r.cuisine,
              source: r.source,
              createdAt: r.createdAt,
              hasImage: !!r.imageUrl,
              savedByUsers: r._count.savedRecipes,
            })),
          })),
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`Scanned ${recipes.length} recipes.`);
    console.log(
      `Found ${dupClusters.length} duplicate cluster(s) (≥${minMembers} members), ` +
        `${totalDuplicateRows} redundant row(s).`,
    );
    console.log('');
    for (const [, rows] of dupClusters) {
      console.log(`▸ "${rows[0].title}"  ×${rows.length}`);
      for (const r of rows) {
        const flags = [
          r.imageUrl ? 'img' : 'no-img',
          r._count.savedRecipes > 0 ? `saved×${r._count.savedRecipes}` : null,
          r.source,
        ]
          .filter(Boolean)
          .join(' · ');
        console.log(
          `    ${r.id}  ${r.cuisine.padEnd(16)} ${r.createdAt.toISOString().slice(0, 10)}  [${flags}]`,
        );
      }
      console.log('');
    }
  }

  process.exitCode = dupClusters.length > 0 ? 1 : 0;
}

main()
  .catch((err) => {
    console.error('detect-duplicate-recipes failed:', err);
    process.exit(2);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
