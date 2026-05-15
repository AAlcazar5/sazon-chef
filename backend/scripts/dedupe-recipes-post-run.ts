// backend/scripts/dedupe-recipes-post-run.ts
//
// Auto-detects duplicate recipes and prunes them, keeping one canonical
// survivor per title cluster. Designed to be chained right after a seed run:
//
//   ts-node ... scripts/seed-500-newer-cuisines.ts && \
//   ts-node ... scripts/dedupe-recipes-post-run.ts --since=120 --apply
//
// Safety model:
//   • DRY RUN by default. Pass --apply to actually delete.
//   • --since=<minutes> restricts the scan to recipes created in the last N
//     minutes (the seed window) so a post-run sweep doesn't touch the
//     established catalog. Omit for a full-DB cleanup.
//   • A cluster with ≥ 2 user-saved members is SKIPPED and reported for
//     manual review — auto-deleting would yank a recipe out of someone's
//     cookbook, and re-pointing SavedRecipe rows is too risky to automate.
//   • Deleting a Recipe cascades to RecipeIngredient + SavedRecipe
//     (onDelete: Cascade in schema.prisma) — that's why a cluster with one
//     saved member keeps the saved one as the survivor.
//
// Survivor selection (first win):
//   1. the member saved by the most users  (don't break cookbooks)
//   2. has an imageUrl
//   3. most ingredients (richest record)
//   4. oldest createdAt  (stable, deterministic tiebreak)

import { PrismaClient } from '@prisma/client';
import { normalizeRecipeTitleKey } from '../src/utils/recipeTitleKey';

const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');
const sinceArg = process.argv.find((a) => a.startsWith('--since='));
const sinceMinutes = sinceArg ? Number(sinceArg.split('=')[1]) : null;

interface RecipeRow {
  id: string;
  title: string;
  createdAt: Date;
  imageUrl: string | null;
  _count: { savedRecipes: number; ingredients: number };
}

function pickSurvivor(rows: RecipeRow[]): RecipeRow {
  return [...rows].sort((a, b) => {
    if (b._count.savedRecipes !== a._count.savedRecipes) {
      return b._count.savedRecipes - a._count.savedRecipes;
    }
    const aImg = a.imageUrl ? 1 : 0;
    const bImg = b.imageUrl ? 1 : 0;
    if (aImg !== bImg) return bImg - aImg;
    if (b._count.ingredients !== a._count.ingredients) {
      return b._count.ingredients - a._count.ingredients;
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  })[0];
}

async function main(): Promise<void> {
  const where =
    sinceMinutes != null
      ? { createdAt: { gte: new Date(Date.now() - sinceMinutes * 60_000) } }
      : {};

  const recipes = await prisma.recipe.findMany({
    where,
    select: {
      id: true,
      title: true,
      createdAt: true,
      imageUrl: true,
      _count: { select: { savedRecipes: true, ingredients: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const clusters = new Map<string, RecipeRow[]>();
  for (const r of recipes) {
    const key = normalizeRecipeTitleKey(r.title);
    if (!key) continue;
    const bucket = clusters.get(key);
    if (bucket) bucket.push(r as RecipeRow);
    else clusters.set(key, [r as RecipeRow]);
  }

  const dupClusters = [...clusters.values()].filter((rows) => rows.length > 1);

  console.log(
    `Scope: ${sinceMinutes != null ? `last ${sinceMinutes} min` : 'entire catalog'} ` +
      `(${recipes.length} recipes)`,
  );
  console.log(`Duplicate clusters: ${dupClusters.length}`);
  console.log(`Mode: ${APPLY ? 'APPLY (will delete)' : 'DRY RUN (no writes)'}`);
  console.log('');

  const toDelete: string[] = [];
  const skipped: Array<{ title: string; reason: string }> = [];

  for (const rows of dupClusters) {
    const savedMembers = rows.filter((r) => r._count.savedRecipes > 0);
    if (savedMembers.length >= 2) {
      skipped.push({
        title: rows[0].title,
        reason: `${savedMembers.length} members saved by users — manual review`,
      });
      continue;
    }
    const survivor = pickSurvivor(rows);
    const losers = rows.filter((r) => r.id !== survivor.id);
    console.log(`▸ "${rows[0].title}"  ×${rows.length}`);
    console.log(
      `    keep   ${survivor.id}  [saved×${survivor._count.savedRecipes}, ` +
        `${survivor.imageUrl ? 'img' : 'no-img'}, ${survivor._count.ingredients} ingr]`,
    );
    for (const l of losers) {
      console.log(`    prune  ${l.id}  [saved×${l._count.savedRecipes}]`);
      toDelete.push(l.id);
    }
    console.log('');
  }

  if (skipped.length > 0) {
    console.log('⚠️  Skipped (manual review needed):');
    for (const s of skipped) console.log(`    "${s.title}" — ${s.reason}`);
    console.log('');
  }

  console.log(`Total prunable: ${toDelete.length}`);

  if (!APPLY) {
    console.log('Dry run — re-run with --apply to delete the pruned rows.');
    process.exitCode = toDelete.length > 0 ? 1 : 0;
    return;
  }

  if (toDelete.length === 0) {
    console.log('Nothing to delete.');
    return;
  }

  // Batched delete — Cascade handles RecipeIngredient + SavedRecipe rows.
  const BATCH = 200;
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += BATCH) {
    const slice = toDelete.slice(i, i + BATCH);
    const res = await prisma.recipe.deleteMany({ where: { id: { in: slice } } });
    deleted += res.count;
    console.log(`  deleted ${deleted}/${toDelete.length}`);
  }
  console.log(`Done. Pruned ${deleted} duplicate recipe row(s).`);
}

main()
  .catch((err) => {
    console.error('dedupe-recipes-post-run failed:', err);
    process.exit(2);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
