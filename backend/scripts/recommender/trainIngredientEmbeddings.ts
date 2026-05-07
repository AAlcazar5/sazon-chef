#!/usr/bin/env ts-node
// ROADMAP 4.0 IG1.1 — Ingredient embedding training script.
//
// Reads canonical ingredient names from `IngredientFDCMapping`, joins each
// with its USDA `IngredientNutrient.description`, embeds the joined string
// via OpenAI `text-embedding-3-small`, projects 1536→384 via the existing
// deterministic projection (`openaiEmbed.getProjection`, generalized below),
// and upserts via `ingredientEmbeddingStore.upsertEmbedding`.
//
// Idempotent: skips names that already have a row unless `--force`.
//
// See backend/scripts/recommender/IG1_RUNBOOK.md for the full walkthrough.

import { prisma } from '../../src/lib/prisma';
import { logger } from '../../src/utils/logger';
import {
  upsertEmbedding,
  getMany,
} from '../../src/services/recommender/ingredientEmbeddingStore';
import { normalizeIngredientName } from '../../src/utils/ingredientNormalizer';

const OPENAI_URL = 'https://api.openai.com/v1/embeddings';
const OPENAI_MODEL = 'text-embedding-3-small';
const OPENAI_DIM = 1536;
const TARGET_DIM = 384;
const PROJECTION_SEED = 0x9e3779b9;

type CandidateSource = 'fdc' | 'recipe_ingredients' | 'auto';
type Provider = 'openai' | 'local';

const LOCAL_MODEL = 'Xenova/all-MiniLM-L6-v2';
const LOCAL_DIM = 384; // native dim, matches TARGET_DIM — no projection needed.

interface CliOptions {
  batchSize: number;
  maxNames: number;
  dryRun: boolean;
  force: boolean;
  source: CandidateSource;
  provider: Provider;
}

function parseCli(argv: string[]): CliOptions {
  const opts: CliOptions = {
    batchSize: 100,
    maxNames: Number.POSITIVE_INFINITY,
    dryRun: false,
    force: false,
    source: 'auto',
    provider: 'openai',
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--force') opts.force = true;
    else if (a === '--batch-size') opts.batchSize = Number.parseInt(argv[++i], 10);
    else if (a === '--max-names') opts.maxNames = Number.parseInt(argv[++i], 10);
    else if (a === '--source') {
      const v = argv[++i];
      if (v === 'fdc' || v === 'recipe_ingredients' || v === 'auto') {
        opts.source = v;
      }
    } else if (a === '--provider') {
      const v = argv[++i];
      if (v === 'openai' || v === 'local') opts.provider = v;
    }
  }
  if (!Number.isFinite(opts.batchSize) || opts.batchSize <= 0) opts.batchSize = 100;
  return opts;
}

// Mulberry32 — same RNG as openaiEmbed.ts so the projection matches the TB0.3
// recipe-embedding pipeline. Keeps recipe + ingredient embeddings in compatible
// 384-d space if downstream wants to mix.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let cachedProjection: number[][] | null = null;

function getProjection(inDim = OPENAI_DIM, outDim = TARGET_DIM): number[][] {
  if (cachedProjection && cachedProjection.length === outDim) return cachedProjection;
  const rng = mulberry32(PROJECTION_SEED);
  const matrix: number[][] = [];
  for (let r = 0; r < outDim; r += 1) {
    const row: number[] = [];
    for (let c = 0; c < inDim; c += 1) {
      // Box-Muller → standard normal — gives a stable Gaussian random projection.
      const u1 = Math.max(rng(), 1e-12);
      const u2 = rng();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      row.push(z / Math.sqrt(inDim));
    }
    matrix.push(row);
  }
  cachedProjection = matrix;
  return matrix;
}

function project(vec: number[]): number[] {
  const proj = getProjection(vec.length, TARGET_DIM);
  const out = new Array<number>(TARGET_DIM).fill(0);
  for (let r = 0; r < TARGET_DIM; r += 1) {
    let acc = 0;
    const row = proj[r];
    for (let c = 0; c < vec.length; c += 1) acc += row[c] * vec[c];
    out[r] = acc;
  }
  return out;
}

interface MappingRow {
  normalizedName: string;
  ingredient: { description: string | null } | null;
}

async function loadCandidateNamesFromFDC(): Promise<MappingRow[]> {
  return (await (prisma as any).ingredientFDCMapping.findMany({
    select: {
      normalizedName: true,
      ingredient: { select: { description: true } },
    },
  })) as MappingRow[];
}

/**
 * Fallback source — distinct normalized names from `recipe_ingredients`.
 * Used when `IngredientFDCMapping` is empty (FDC populates lazily on
 * nutrient lookup, so a fresh DB has no mapping rows). No USDA description
 * is available here; the embedding text is just the canonical name.
 */
// Strips quantity prefixes ("2 cups", "1/2 tsp", "3 large") and trailing
// modifier clauses ("(minced)", ", chopped"). Same shape as
// pantryMatchService.normalizeIngredient but kept inline so this script
// stays single-file.
const QUANTITY_PREFIX =
  /^[\d./½¼¾⅓⅔⅛\s-]+\s*(?:cups?|tbsps?|tsps?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|l|liters?|cloves?|heads?|cans?|medium|large|small|pieces?|slices?|stalks?|sprigs?|bunch(?:es)?|sticks?)?\s*(?:of\s+)?/i;

function stripQuantityAndComments(text: string): string {
  return text
    .toLowerCase()
    .replace(QUANTITY_PREFIX, '')
    .replace(/[,(].*$/, '')
    .replace(/[^a-z\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadCandidateNamesFromRecipes(): Promise<MappingRow[]> {
  const rows = (await (prisma as any).recipeIngredient.findMany({
    select: { text: true },
  })) as Array<{ text: string }>;
  const seen = new Set<string>();
  const out: MappingRow[] = [];
  for (const r of rows) {
    const stripped = stripQuantityAndComments(r.text);
    if (!stripped) continue;
    const norm = normalizeIngredientName(stripped);
    if (!norm || norm.length < 2) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push({ normalizedName: norm, ingredient: null });
  }
  return out;
}

async function loadCandidateNames(
  source: CandidateSource,
): Promise<{ rows: MappingRow[]; resolvedSource: CandidateSource }> {
  if (source === 'fdc') {
    return { rows: await loadCandidateNamesFromFDC(), resolvedSource: 'fdc' };
  }
  if (source === 'recipe_ingredients') {
    return {
      rows: await loadCandidateNamesFromRecipes(),
      resolvedSource: 'recipe_ingredients',
    };
  }
  // auto: prefer FDC; fall through to recipe_ingredients when FDC is empty.
  const fdcRows = await loadCandidateNamesFromFDC();
  if (fdcRows.length > 0) return { rows: fdcRows, resolvedSource: 'fdc' };
  return {
    rows: await loadCandidateNamesFromRecipes(),
    resolvedSource: 'recipe_ingredients',
  };
}

async function embedBatchOpenAI(
  texts: string[],
  apiKey: string,
): Promise<number[][]> {
  const resp = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ input: texts, model: OPENAI_MODEL }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`OpenAI embed failed (${resp.status}): ${body.slice(0, 200)}`);
  }
  const json = (await resp.json()) as {
    data: Array<{ embedding: number[]; index: number }>;
  };
  return json.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

// Local embedding pipeline — Hugging Face transformers.js running in Node.
// Lazy-loaded so OpenAI runs don't pay the import cost. The model
// (`Xenova/all-MiniLM-L6-v2`) is 384-d native — same as TARGET_DIM, so no
// random projection is applied.
let cachedLocalPipeline: any | null = null;
async function getLocalPipeline(): Promise<any> {
  if (cachedLocalPipeline) return cachedLocalPipeline;
  // dynamic import keeps OpenAI-only invocations from loading transformers.
  const transformers = await import('@huggingface/transformers');
  cachedLocalPipeline = await transformers.pipeline(
    'feature-extraction',
    LOCAL_MODEL,
  );
  return cachedLocalPipeline;
}

async function embedBatchLocal(texts: string[]): Promise<number[][]> {
  const pipe = await getLocalPipeline();
  const result = await pipe(texts, { pooling: 'mean', normalize: true });
  // result is a Tensor with shape [N, 384]. tolist() returns nested arrays.
  const arr = result.tolist() as number[][];
  return arr;
}

function buildText(row: MappingRow): string {
  const desc = row.ingredient?.description?.trim();
  if (desc && desc.length > 0) {
    return `${row.normalizedName} — ${desc}`;
  }
  return row.normalizedName;
}

async function main(): Promise<void> {
  const opts = parseCli(process.argv);
  const apiKey = process.env.OPENAI_API_KEY;
  if (opts.provider === 'openai' && !apiKey && !opts.dryRun) {
    logger.error(
      'IG1: OPENAI_API_KEY not set. Add to backend/.env, run with --dry-run, or use --provider local.',
    );
    process.exit(1);
  }

  logger.info(
    {
      batchSize: opts.batchSize,
      maxNames: opts.maxNames,
      dryRun: opts.dryRun,
      force: opts.force,
      source: opts.source,
      provider: opts.provider,
    },
    'IG1: starting ingredient-embedding training run',
  );

  const { rows: candidates, resolvedSource } = await loadCandidateNames(
    opts.source,
  );
  if (candidates.length === 0) {
    logger.warn(
      'IG1: no candidate names found in either IngredientFDCMapping or recipe_ingredients. Seed the catalog first.',
    );
    process.exit(0);
  }
  logger.info(
    { resolvedSource, candidateCount: candidates.length },
    'IG1: candidate source resolved',
  );

  const limited = candidates.slice(0, opts.maxNames);
  const targetNames = limited.map((c) => c.normalizedName);

  // Skip already-embedded names unless --force.
  let toEmbed: MappingRow[] = limited;
  let skipped = 0;
  if (!opts.force) {
    const existing = await getMany(targetNames);
    toEmbed = limited.filter((row) => existing.get(row.normalizedName) == null);
    skipped = limited.length - toEmbed.length;
  }

  logger.info(
    { totalCandidates: candidates.length, willEmbed: toEmbed.length, skipped },
    'IG1: candidate set resolved',
  );

  if (opts.dryRun) {
    logger.info('IG1 dry-run: no API calls; sample inputs:');
    for (const sample of toEmbed.slice(0, 5)) {
      logger.info({ text: buildText(sample) }, '  sample');
    }
    process.exit(0);
  }

  let embedded = 0;
  let failed = 0;
  const modelId =
    opts.provider === 'local'
      ? LOCAL_MODEL
      : `${OPENAI_MODEL}+proj-${TARGET_DIM}`;
  for (let i = 0; i < toEmbed.length; i += opts.batchSize) {
    const batch = toEmbed.slice(i, i + opts.batchSize);
    const texts = batch.map(buildText);
    try {
      const vectors =
        opts.provider === 'local'
          ? await embedBatchLocal(texts)
          : await embedBatchOpenAI(texts, apiKey!);
      for (let j = 0; j < batch.length; j += 1) {
        const vec =
          opts.provider === 'local' ? vectors[j] : project(vectors[j]);
        await upsertEmbedding({
          name: batch[j].normalizedName,
          embedding: vec,
          model: modelId,
        });
        embedded += 1;
      }
    } catch (err) {
      logger.error({ err, batchStart: i }, 'IG1: batch failed; continuing');
      failed += batch.length;
    }
    if ((i + opts.batchSize) % 500 < opts.batchSize) {
      logger.info(
        { progress: `${Math.min(i + opts.batchSize, toEmbed.length)}/${toEmbed.length}` },
        'IG1: progress',
      );
    }
  }

  logger.info(
    { embedded, failed, skipped, total: limited.length },
    'IG1: training run complete',
  );
}

main().catch((err) => {
  logger.error({ err }, 'IG1: training run aborted');
  process.exit(1);
});
