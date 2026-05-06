// ROADMAP 4.0 TB0.1 — Food.com dataset ingestion pipeline.
//
// Reads the Kaggle Food.com Recipes & Interactions CSVs from the input
// directory, normalizes them into a JSON snapshot, filters out:
//   - interactions with rating <3 (positive signal only)
//   - recipes with <5 surviving interactions (cuts the noise tail)
//
// Idempotent: re-running with the same inputs produces the same output
// bytes. Output dir is gitignored.

import * as fs from 'fs';
import * as path from 'path';

export interface IngestOptions {
  inputDir: string;
  outputDir: string;
  minRating?: number;
  minInteractionsPerRecipe?: number;
}

export interface IngestResult {
  recipesKept: number;
  recipesDropped: number;
  interactionsKept: number;
  interactionsDropped: number;
  outputPath: string;
}

interface RawRecipe {
  id: number;
  name: string;
  ingredients: string[];
  minutes: number;
}

interface Interaction {
  userId: number;
  recipeId: number;
  rating: number;
}

// Minimal CSV parser tolerant of quoted fields with commas/newlines.
// Good enough for the Food.com schema; we don't need full RFC 4180.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (ch === '\r') {
        // skip
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

function parseIngredientList(raw: string): string[] {
  // Food.com stores ingredients as a Python-style list literal e.g. "['flour','sugar']"
  const trimmed = raw.trim().replace(/^\[/, '').replace(/\]$/, '');
  if (trimmed === '') return [];
  // Match single-quoted entries (most common Food.com format).
  const matches = trimmed.match(/'([^']*)'/g);
  if (matches) return matches.map((s) => s.slice(1, -1));
  return trimmed.split(',').map((s) => s.replace(/^['"]|['"]$/g, '').trim());
}

export async function ingestFoodCom(
  opts: IngestOptions,
): Promise<IngestResult> {
  const minRating = opts.minRating ?? 3;
  const minPerRecipe = opts.minInteractionsPerRecipe ?? 5;

  const recipesCsv = path.join(opts.inputDir, 'RAW_recipes.csv');
  const interactionsCsv = path.join(opts.inputDir, 'RAW_interactions.csv');

  if (!fs.existsSync(recipesCsv)) {
    throw new Error(`ingestFoodCom: missing RAW_recipes.csv at ${recipesCsv}`);
  }
  if (!fs.existsSync(interactionsCsv)) {
    throw new Error(
      `ingestFoodCom: missing RAW_interactions.csv at ${interactionsCsv}`,
    );
  }

  const recipeRows = parseCsv(fs.readFileSync(recipesCsv, 'utf8'));
  const interactionRows = parseCsv(
    fs.readFileSync(interactionsCsv, 'utf8'),
  );

  const recipeHeader = recipeRows.shift() ?? [];
  const interactionHeader = interactionRows.shift() ?? [];
  const recipeCols = Object.fromEntries(recipeHeader.map((c, i) => [c, i]));
  const interactionCols = Object.fromEntries(
    interactionHeader.map((c, i) => [c, i]),
  );

  const allRecipes: Record<number, RawRecipe> = {};
  for (const row of recipeRows) {
    const id = Number(row[recipeCols.id]);
    if (!Number.isFinite(id)) continue;
    allRecipes[id] = {
      id,
      name: row[recipeCols.name] ?? '',
      ingredients: parseIngredientList(row[recipeCols.ingredients] ?? ''),
      minutes: Number(row[recipeCols.minutes]) || 0,
    };
  }

  // Pass 1: filter ratings ≥ minRating, count per recipe.
  const positive: Interaction[] = [];
  let droppedByRating = 0;
  for (const row of interactionRows) {
    const rating = Number(row[interactionCols.rating]);
    const recipeId = Number(row[interactionCols.recipe_id]);
    const userId = Number(row[interactionCols.user_id]);
    if (!Number.isFinite(rating) || !Number.isFinite(recipeId)) continue;
    if (rating < minRating) {
      droppedByRating++;
      continue;
    }
    positive.push({ userId, recipeId, rating });
  }

  const counts: Record<number, number> = {};
  for (const it of positive) {
    counts[it.recipeId] = (counts[it.recipeId] ?? 0) + 1;
  }

  // Pass 2: drop recipes whose surviving count < minPerRecipe.
  const keepRecipeIds = new Set(
    Object.entries(counts)
      .filter(([, n]) => n >= minPerRecipe)
      .map(([id]) => Number(id)),
  );
  const interactionsKeptList = positive.filter((it) =>
    keepRecipeIds.has(it.recipeId),
  );
  const interactionsDropped =
    droppedByRating + (positive.length - interactionsKeptList.length);

  const recipesKeptList = Array.from(keepRecipeIds)
    .sort((a, b) => a - b)
    .map((id) => allRecipes[id])
    .filter((r): r is RawRecipe => Boolean(r));

  // Sort interactions deterministically for idempotency.
  interactionsKeptList.sort((a, b) =>
    a.recipeId !== b.recipeId
      ? a.recipeId - b.recipeId
      : a.userId - b.userId,
  );

  const output = {
    schemaVersion: 1,
    minRating,
    minInteractionsPerRecipe: minPerRecipe,
    recipes: recipesKeptList,
    interactions: interactionsKeptList,
  };

  fs.mkdirSync(opts.outputDir, { recursive: true });
  const outputPath = path.join(opts.outputDir, 'food_com_interactions.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  return {
    recipesKept: recipesKeptList.length,
    recipesDropped: Object.keys(allRecipes).length - recipesKeptList.length,
    interactionsKept: interactionsKeptList.length,
    interactionsDropped,
    outputPath,
  };
}

// CLI entry — `npm run recommender:ingest` after wiring package.json.
if (require.main === module) {
  const inputDir =
    process.env.FOODCOM_INPUT_DIR ?? path.join(__dirname, '../../data/foodcom');
  const outputDir =
    process.env.FOODCOM_OUTPUT_DIR ??
    path.join(__dirname, '../../data/recommender');
  ingestFoodCom({ inputDir, outputDir })
    .then((r) => {
      // eslint-disable-next-line no-console
      console.log(
        `[ingestFoodCom] kept ${r.recipesKept} recipes / ${r.interactionsKept} interactions; dropped ${r.recipesDropped} / ${r.interactionsDropped}. → ${r.outputPath}`,
      );
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[ingestFoodCom] failed:', err);
      process.exit(1);
    });
}
