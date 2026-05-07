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

const OPENAI_URL = 'https://api.openai.com/v1/embeddings';
const OPENAI_MODEL = 'text-embedding-3-small';
const OPENAI_DIM = 1536;
const TARGET_DIM = 384;
const PROJECTION_SEED = 0x9e3779b9;

interface CliOptions {
  batchSize: number;
  maxNames: number;
  dryRun: boolean;
  force: boolean;
}

function parseCli(argv: string[]): CliOptions {
  const opts: CliOptions = {
    batchSize: 100,
    maxNames: Number.POSITIVE_INFINITY,
    dryRun: false,
    force: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--force') opts.force = true;
    else if (a === '--batch-size') opts.batchSize = Number.parseInt(argv[++i], 10);
    else if (a === '--max-names') opts.maxNames = Number.parseInt(argv[++i], 10);
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

async function loadCandidateNames(): Promise<MappingRow[]> {
  return (await (prisma as any).ingredientFDCMapping.findMany({
    select: {
      normalizedName: true,
      ingredient: { select: { description: true } },
    },
  })) as MappingRow[];
}

async function embedBatch(
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
  if (!apiKey && !opts.dryRun) {
    logger.error(
      'IG1: OPENAI_API_KEY not set. Add to backend/.env or run with --dry-run.',
    );
    process.exit(1);
  }

  logger.info(
    { batchSize: opts.batchSize, maxNames: opts.maxNames, dryRun: opts.dryRun, force: opts.force },
    'IG1: starting ingredient-embedding training run',
  );

  const candidates = await loadCandidateNames();
  if (candidates.length === 0) {
    logger.warn('IG1: no IngredientFDCMapping rows. Seed the table first.');
    process.exit(0);
  }

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
  for (let i = 0; i < toEmbed.length; i += opts.batchSize) {
    const batch = toEmbed.slice(i, i + opts.batchSize);
    const texts = batch.map(buildText);
    try {
      const vectors = await embedBatch(texts, apiKey!);
      for (let j = 0; j < batch.length; j += 1) {
        const projected = project(vectors[j]);
        await upsertEmbedding({
          name: batch[j].normalizedName,
          embedding: projected,
          model: `${OPENAI_MODEL}+proj-${TARGET_DIM}`,
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
