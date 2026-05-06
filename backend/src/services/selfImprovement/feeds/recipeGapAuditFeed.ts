// backend/src/services/selfImprovement/feeds/recipeGapAuditFeed.ts
// Tier M1 / Feed 6 — monthly SQL audit of `recipes` table. Surfaces cuisine
// coverage gaps, rating distribution per cuisine, save→cook ratio per
// cuisine, and recipe age. No LLM call — pure aggregation.

import fs from 'fs';
import path from 'path';
import { FeedDeps, FeedRunResult } from './types';

const FEED_ID = 'recipe-gaps';

export interface CuisineRow {
  cuisine: string;
  recipeCount: number;
  avgRating: number | null;
  ratingCount: number;
  saveCount: number;
  cookCount: number;
  saveToCookRatio: number | null;
  oldestAgeDays: number | null;
}

export interface AuditDeps extends FeedDeps {
  prisma?: PrismaLike;
}

interface PrismaLike {
  recipe: {
    groupBy: (args: GroupByArgs) => Promise<Array<{ canonicalCuisine: string | null; _count: { _all: number }; _min?: { createdAt?: Date | null } }>>;
  };
  savedRecipe: {
    groupBy: (args: GroupByArgs) => Promise<Array<{ recipeId: string; _avg: { rating: number | null }; _count: { _all: number } }>>;
  };
  cookingLog: {
    groupBy: (args: GroupByArgs) => Promise<Array<{ recipeId: string; _count: { _all: number } }>>;
  };
  recipe2: {
    findMany: (args: { select: { id: true; canonicalCuisine: true } }) => Promise<Array<{ id: string; canonicalCuisine: string | null }>>;
  };
}

interface GroupByArgs {
  by: string[];
  _count?: Record<string, boolean>;
  _avg?: Record<string, boolean>;
  _min?: Record<string, boolean>;
  where?: Record<string, unknown>;
}

export async function buildCuisineRows(
  prisma: any,
  now: Date,
): Promise<CuisineRow[]> {
  const recipes: Array<{ id: string; canonicalCuisine: string | null; createdAt: Date }> =
    await prisma.recipe.findMany({
      select: { id: true, canonicalCuisine: true, createdAt: true },
    });

  const idToCuisine = new Map<string, string>();
  for (const r of recipes) {
    idToCuisine.set(r.id, r.canonicalCuisine ?? 'unknown');
  }

  // Recipe count + oldest age per cuisine
  const cuisineMap = new Map<
    string,
    {
      recipeCount: number;
      oldestCreatedAt: Date | null;
      ratingSum: number;
      ratingCount: number;
      saveCount: number;
      cookCount: number;
    }
  >();
  for (const r of recipes) {
    const c = r.canonicalCuisine ?? 'unknown';
    const cur = cuisineMap.get(c) ?? {
      recipeCount: 0,
      oldestCreatedAt: null,
      ratingSum: 0,
      ratingCount: 0,
      saveCount: 0,
      cookCount: 0,
    };
    cur.recipeCount += 1;
    if (cur.oldestCreatedAt === null || r.createdAt < cur.oldestCreatedAt) {
      cur.oldestCreatedAt = r.createdAt;
    }
    cuisineMap.set(c, cur);
  }

  const saved: Array<{ recipeId: string; rating: number | null }> =
    await prisma.savedRecipe.findMany({
      select: { recipeId: true, rating: true },
    });
  for (const s of saved) {
    const c = idToCuisine.get(s.recipeId) ?? 'unknown';
    const cur = cuisineMap.get(c);
    if (!cur) continue;
    cur.saveCount += 1;
    if (typeof s.rating === 'number' && s.rating > 0) {
      cur.ratingSum += s.rating;
      cur.ratingCount += 1;
    }
  }

  const cooked: Array<{ recipeId: string }> = await prisma.cookingLog.findMany({
    select: { recipeId: true },
  });
  for (const c of cooked) {
    const cuisine = idToCuisine.get(c.recipeId) ?? 'unknown';
    const cur = cuisineMap.get(cuisine);
    if (!cur) continue;
    cur.cookCount += 1;
  }

  const rows: CuisineRow[] = [];
  for (const [cuisine, v] of cuisineMap) {
    const ageDays =
      v.oldestCreatedAt !== null
        ? Math.floor(
            (now.getTime() - v.oldestCreatedAt.getTime()) / 86_400_000,
          )
        : null;
    rows.push({
      cuisine,
      recipeCount: v.recipeCount,
      avgRating: v.ratingCount > 0 ? v.ratingSum / v.ratingCount : null,
      ratingCount: v.ratingCount,
      saveCount: v.saveCount,
      cookCount: v.cookCount,
      saveToCookRatio: v.saveCount > 0 ? v.cookCount / v.saveCount : null,
      oldestAgeDays: ageDays,
    });
  }
  rows.sort((a, b) => a.recipeCount - b.recipeCount);
  return rows;
}

export function renderRecipeGapMarkdown(
  rows: CuisineRow[],
  asOf: Date,
): string {
  const dateStr = asOf.toISOString().slice(0, 10);
  const lines: string[] = [
    `---`,
    `feed: ${FEED_ID}`,
    `date: ${dateStr}`,
    `item_count: ${rows.length}`,
    `---`,
    ``,
    `# Recipe gap audit — ${dateStr}`,
    ``,
    `| Cuisine | Recipes | Avg ★ | Saves | Cooks | Save→Cook | Oldest (d) |`,
    `|---|---:|---:|---:|---:|---:|---:|`,
  ];
  for (const r of rows) {
    lines.push(
      `| ${r.cuisine} | ${r.recipeCount} | ${r.avgRating !== null ? r.avgRating.toFixed(2) : '—'} | ${r.saveCount} | ${r.cookCount} | ${r.saveToCookRatio !== null ? (r.saveToCookRatio * 100).toFixed(0) + '%' : '—'} | ${r.oldestAgeDays ?? '—'} |`,
    );
  }
  lines.push('');
  // Highlight thinnest 5 cuisines
  const thinnest = rows.slice(0, 5);
  if (thinnest.length > 0) {
    lines.push('## Thinnest cuisines (lowest recipe count)');
    lines.push('');
    for (const r of thinnest) {
      lines.push(`- **${r.cuisine}** — ${r.recipeCount} recipes`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export async function runRecipeGapAuditFeed(
  prisma: any,
  deps: FeedDeps = {},
): Promise<FeedRunResult> {
  const now = deps.now ? deps.now() : new Date();
  const outputRoot =
    deps.outputRoot ?? path.resolve(process.cwd(), '../.context/observations');

  const rows = await buildCuisineRows(prisma, now);
  const dir = path.join(outputRoot, FEED_ID);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${now.toISOString().slice(0, 10)}.md`);
  fs.writeFileSync(filePath, renderRecipeGapMarkdown(rows, now), 'utf-8');

  return {
    feedId: FEED_ID,
    outputPath: filePath,
    itemCount: rows.length,
    tokenCost: 0,
    status: 'ok',
  };
}
