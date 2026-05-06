// ROADMAP 4.0 TB0.3 — Catalog alignment.
//
// Joins Sazon's Recipe rows to Food.com embeddings via a TF-IDF
// fingerprint over normalized ingredient tokens. Unmatched rows
// (~30% expected) backfill via a content-only OpenAI embedding.
//
// Writes Recipe.embedding (Bytes, 256B Float32×64) +
// Recipe.embeddingSource ('foodcom' | 'openai') + embeddingUpdatedAt.

import { prisma } from '../../lib/prisma';
import {
  EMBEDDING_DIM,
  encodeEmbedding,
  isValidEmbedding,
} from './embeddingStore';

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'of',
  'and',
  'or',
  'with',
  'for',
  'in',
  'to',
  'fresh',
  'large',
  'small',
  'medium',
  'whole',
  'chopped',
  'diced',
  'sliced',
  'minced',
  'cup',
  'cups',
  'tsp',
  'tbsp',
  'teaspoon',
  'tablespoon',
  'oz',
  'g',
  'kg',
  'ml',
  'l',
  'lb',
  'lbs',
]);

const MATCH_THRESHOLD = 0.35;

export interface FoodComRecipeShape {
  id: number;
  name: string;
  ingredients: string[];
}

export interface AlignOptions {
  foodComEmbeddings: Record<string, number[]>;
  foodComRecipes: FoodComRecipeShape[];
  openaiEmbed:
    | ((text: string) => Promise<number[] | null>)
    | null
    | undefined;
  skipExisting?: boolean;
  matchThreshold?: number;
}

export interface AlignResult {
  matched: number;
  fallback: number;
  unmatched: number;
  skipped: number;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function fingerprintTokens(ingredients: string[]): string[] {
  const out: string[] = [];
  for (const ing of ingredients) {
    out.push(...tokenize(ing));
  }
  return out;
}

interface IDF {
  idf: Record<string, number>;
  totalDocs: number;
}

function buildIdf(docs: string[][]): IDF {
  const docCount: Record<string, number> = {};
  for (const doc of docs) {
    const seen = new Set(doc);
    for (const t of seen) docCount[t] = (docCount[t] ?? 0) + 1;
  }
  const totalDocs = Math.max(1, docs.length);
  const idf: Record<string, number> = {};
  for (const [t, c] of Object.entries(docCount)) {
    idf[t] = Math.log((1 + totalDocs) / (1 + c)) + 1;
  }
  return { idf, totalDocs };
}

function tfidfVec(doc: string[], idf: Record<string, number>): Map<string, number> {
  const tf: Record<string, number> = {};
  for (const t of doc) tf[t] = (tf[t] ?? 0) + 1;
  const v = new Map<string, number>();
  let norm = 0;
  for (const [t, n] of Object.entries(tf)) {
    const w = (n / doc.length) * (idf[t] ?? 0);
    if (w > 0) {
      v.set(t, w);
      norm += w * w;
    }
  }
  norm = Math.sqrt(norm);
  if (norm === 0) return v;
  for (const [t, w] of v) v.set(t, w / norm);
  return v;
}

function tfidfCosine(
  a: Map<string, number>,
  b: Map<string, number>,
): number {
  let dot = 0;
  for (const [t, w] of a) {
    const bw = b.get(t);
    if (bw !== undefined) dot += w * bw;
  }
  return dot;
}

export async function alignCatalog(opts: AlignOptions): Promise<AlignResult> {
  const threshold = opts.matchThreshold ?? MATCH_THRESHOLD;

  const recipes: any[] = await prisma.recipe.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      cuisine: true,
      canonicalCuisine: true,
      embedding: true,
      embeddingSource: true,
      embeddingUpdatedAt: true,
      ingredients: { select: { name: true } },
    },
  } as any);

  if (recipes.length === 0) {
    return { matched: 0, fallback: 0, unmatched: 0, skipped: 0 };
  }

  // Build IDF over the union of catalog + Food.com docs so weights are stable.
  const sazonDocs = recipes.map((r) =>
    fingerprintTokens(r.ingredients.map((i: any) => i.name)),
  );
  const foodComDocs = opts.foodComRecipes.map((r) =>
    fingerprintTokens(r.ingredients),
  );
  const { idf } = buildIdf([...sazonDocs, ...foodComDocs]);

  const foodComVecs = opts.foodComRecipes.map((r, i) => ({
    id: r.id,
    vec: tfidfVec(foodComDocs[i], idf),
  }));

  let matched = 0;
  let fallback = 0;
  let unmatched = 0;
  let skipped = 0;

  for (let i = 0; i < recipes.length; i++) {
    const recipe = recipes[i];
    if (opts.skipExisting && recipe.embedding) {
      skipped++;
      continue;
    }

    const sazonVec = tfidfVec(sazonDocs[i], idf);

    let bestId: number | null = null;
    let bestSim = -Infinity;
    for (const f of foodComVecs) {
      const sim = tfidfCosine(sazonVec, f.vec);
      if (sim > bestSim) {
        bestSim = sim;
        bestId = f.id;
      }
    }

    let chosenVec: number[] | null = null;
    let source: 'foodcom' | 'openai' | null = null;

    if (bestId !== null && bestSim >= threshold) {
      const fcVec = opts.foodComEmbeddings[String(bestId)];
      if (isValidEmbedding(fcVec)) {
        chosenVec = fcVec;
        source = 'foodcom';
        matched++;
      }
    }

    if (!chosenVec) {
      if (opts.openaiEmbed) {
        const text = [
          recipe.title,
          recipe.canonicalCuisine ?? recipe.cuisine,
          recipe.ingredients.map((i: any) => i.name).join(' '),
        ]
          .filter(Boolean)
          .join(' | ');
        const fallbackVec = await opts.openaiEmbed(text);
        if (isValidEmbedding(fallbackVec)) {
          chosenVec = fallbackVec;
          source = 'openai';
          fallback++;
        } else {
          unmatched++;
        }
      } else {
        unmatched++;
      }
    }

    if (chosenVec && source) {
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: {
          embedding: encodeEmbedding(chosenVec),
          embeddingSource: source,
          embeddingUpdatedAt: new Date(),
        } as any,
      });
    }
  }

  return { matched, fallback, unmatched, skipped };
}
