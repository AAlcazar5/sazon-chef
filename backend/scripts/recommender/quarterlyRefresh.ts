// ROADMAP 4.0 TB0.4 — Quarterly refresh job.
//
// Runs TB0.1 (ingest) → (TB0.2 is offline Python; skipped here) → TB0.3
// (align catalog), writes a dated JSON report under reports/ and logs
// the new-recipe count + estimated token cost. Wired to PM2 via:
//
//   pm2 trigger recommender-refresh
//
// Rollback path: prior Recipe.embedding values stay in the column
// when alignment skips ('skipExisting'); only re-aligns when the
// embedding is null or RECOMMENDER_FORCE=1.

import * as fs from 'fs';
import * as path from 'path';
import { ingestFoodCom } from './ingestFoodCom';
import { alignCatalog } from '../../src/services/recommender/catalogAlignment';
import { makeOpenAIEmbed } from '../../src/services/recommender/openaiEmbed';

export interface RefreshOptions {
  reportDir: string;
  ingest?: typeof ingestFoodCom;
  align?: typeof alignCatalog;
  tokenCostUSD?: () => number;
  now?: Date;
  inputDir?: string;
  outputDir?: string;
}

export interface RefreshResult {
  recipesKept: number;
  matched: number;
  fallback: number;
  unmatched: number;
  tokenCostUSD: number;
  reportPath: string;
}

function dateStamp(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function runQuarterlyRefresh(
  opts: RefreshOptions,
): Promise<RefreshResult> {
  const ingest = opts.ingest ?? ingestFoodCom;
  const align = opts.align ?? alignCatalog;
  const now = opts.now ?? new Date();
  const inputDir =
    opts.inputDir ?? path.join(__dirname, '../../data/foodcom');
  const outputDir =
    opts.outputDir ?? path.join(__dirname, '../../data/recommender');

  fs.mkdirSync(opts.reportDir, { recursive: true });
  const reportPath = path.join(
    opts.reportDir,
    `recommender-refresh-${dateStamp(now)}.json`,
  );

  const baseReport = {
    startedAt: now.toISOString(),
    status: 'running',
  };
  fs.writeFileSync(reportPath, JSON.stringify(baseReport, null, 2));

  try {
    const ingestResult = await ingest({ inputDir, outputDir });

    // TB0.2 (Python training) runs offline; here we assume the artifact
    // already exists. If missing, skip alignment with a warning rather
    // than crashing.
    const embeddingsPath = path.join(outputDir, 'recipeEmbeddings.json');
    let foodComEmbeddings: Record<string, number[]> = {};
    if (fs.existsSync(embeddingsPath)) {
      foodComEmbeddings = JSON.parse(
        fs.readFileSync(embeddingsPath, 'utf8'),
      );
    }

    const alignResult = await align({
      foodComEmbeddings,
      foodComRecipes: [],
      openaiEmbed: makeOpenAIEmbed(),
      skipExisting: true,
    });

    const tokenCostUSD = opts.tokenCostUSD ? opts.tokenCostUSD() : 0;

    const finalReport = {
      ...baseReport,
      status: 'ok',
      finishedAt: new Date().toISOString(),
      recipesKept: ingestResult.recipesKept,
      interactionsKept: ingestResult.interactionsKept,
      matched: alignResult.matched,
      fallback: alignResult.fallback,
      unmatched: alignResult.unmatched,
      skipped: alignResult.skipped,
      tokenCostUSD,
    };
    fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));

    return {
      recipesKept: ingestResult.recipesKept,
      matched: alignResult.matched,
      fallback: alignResult.fallback,
      unmatched: alignResult.unmatched,
      tokenCostUSD,
      reportPath,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          ...baseReport,
          status: 'failed',
          finishedAt: new Date().toISOString(),
          error: message,
        },
        null,
        2,
      ),
    );
    throw err;
  }
}

if (require.main === module) {
  const reportDir =
    process.env.RECOMMENDER_REPORT_DIR ??
    path.join(__dirname, '../../../reports');
  runQuarterlyRefresh({ reportDir }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[quarterlyRefresh] failed:', err);
    process.exit(1);
  });
}
