// backend/scripts/grade-voice-mvp.ts
// Tier U voice-grade pass — MVP-20 cuisines, flag-only (no mutation).
//
// Scores every (non-deleted) recipe in the 20 MVP launch cuisines on the
// 1–5 brand-voice scale via Claude Haiku + heuristic penalties, persists
// the voice axis into recipe_quality_scores (idempotent upsert), and
// prints a ship/rewrite/discard distribution. Nothing is rewritten or
// deleted — failures are surfaced for a later human/rewrite decision.
//
// Usage:
//   DRY_RUN=1 LIMIT=20 npx ts-node scripts/grade-voice-mvp.ts   # smoke
//   DRY_RUN=0 npx ts-node scripts/grade-voice-mvp.ts            # full, persist
//   FORCE=1 ...                                                  # re-grade scored
//
// Env: DRY_RUN (default 1 — set 0 to persist), LIMIT (0=all),
//      FORCE (0/1 re-grade already-scored), CONCURRENCY (default 6).

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { scoreVoice } from '../src/services/voiceScorer';
import {
  classifyTone,
  type MessageCreator,
} from '../src/services/voiceToneClassifier';
import { deepseekMessageCreator } from '../src/services/deepseekMessageCreator';
import {
  scoreRecipe,
  type FailureReason,
} from '../src/services/recipeQualityScoreService';
import {
  MVP_CUISINES,
  summarize,
  formatReport,
  type ScoredRecipe,
} from './voiceGrade';

const prisma = new PrismaClient();

// PROVIDER=deepseek routes the tone classifier through Deepseek-V3 so a
// re-grade is independent of the Anthropic balance. Unset/'claude' →
// default Anthropic path.
const PROVIDER = (process.env.PROVIDER ?? 'claude').toLowerCase();
const voiceClient: MessageCreator | undefined =
  PROVIDER === 'deepseek' ? deepseekMessageCreator() : undefined;

const DRY_RUN = process.env.DRY_RUN !== '0';
const FORCE = process.env.FORCE === '1';
const LIMIT = Number(process.env.LIMIT ?? 0) || 0;
const CONCURRENCY = Math.max(
  1,
  Number.isFinite(Number(process.env.CONCURRENCY))
    ? Number(process.env.CONCURRENCY)
    : 6,
);

interface Job {
  id: string;
  title: string;
  description: string;
  cuisine: string;
}

async function runPool<T>(
  items: T[],
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  let done = 0;
  const isTTY = Boolean(process.stdout.isTTY);

  async function drain(): Promise<void> {
    while (cursor < items.length) {
      const i = cursor++;
      await worker(items[i], i);
      done += 1;
      if (isTTY || done % 50 === 0 || done === items.length) {
        const pct = ((done / items.length) * 100).toFixed(1);
        const line = `  ${pct}%  ${done}/${items.length}`;
        process.stdout.write(isTTY ? `\r${line}` : `${line}\n`);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, drain),
  );
  if (isTTY) process.stdout.write('\n');
}

async function main(): Promise<void> {
  console.log('▶ Tier U voice-grade pass — MVP-20 cuisines');
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no persist)' : 'LIVE (persist)'}`);
  console.log(`  Provider: ${PROVIDER}`);
  console.log(`  Concurrency: ${CONCURRENCY}${LIMIT ? ` · LIMIT ${LIMIT}` : ''}`);
  console.log('');

  const recipes = await prisma.recipe.findMany({
    where: { cuisine: { in: [...MVP_CUISINES] }, deletedAt: null },
    select: { id: true, title: true, description: true, cuisine: true },
  });

  let jobs: Job[] = recipes;

  if (!FORCE) {
    // Query all voice-scored ids directly — the quality table is small and
    // a 2k-id `IN` + `not null` negation blows SQLite's parameter limit (P2029).
    const scored = await prisma.recipeQualityScore.findMany({
      where: { voiceScore: { not: null } },
      select: { recipeId: true },
    });
    const skip = new Set(scored.map((s) => s.recipeId));
    const before = jobs.length;
    jobs = jobs.filter((j) => !skip.has(j.id));
    console.log(
      `  ${before} MVP recipes · ${skip.size} already scored · ${jobs.length} to grade`,
    );
  } else {
    console.log(`  ${jobs.length} MVP recipes · FORCE re-grade all`);
  }

  if (LIMIT > 0) jobs = jobs.slice(0, LIMIT);
  if (jobs.length === 0) {
    console.log('Nothing to grade.');
    return;
  }
  console.log('');

  const results: ScoredRecipe[] = [];
  let persisted = 0;
  let scoreFailures = 0;
  let persistFailures = 0;

  await runPool(jobs, async (job) => {
    let score: number;
    let reasons: FailureReason[];
    try {
      const r = await scoreVoice(
        { title: job.title, description: job.description },
        { classifyTone: (input) => classifyTone(input, voiceClient) },
      );
      score = r.score;
      reasons = r.reasons;
    } catch (err) {
      // scoreVoice degrades classifier failures to heuristics internally,
      // so reaching here means a real bug (bad shape, broken import). Log
      // it — a silent skip count would mask it across a long batch.
      console.error(`  ✗ scoreVoice failed for ${job.id}:`, err);
      scoreFailures += 1;
      return;
    }

    results.push({ cuisine: job.cuisine, score });

    if (!DRY_RUN) {
      try {
        await scoreRecipe({
          recipeId: job.id,
          axes: { voice: score },
          extraReasons: reasons,
        });
        persisted += 1;
      } catch (err) {
        // A transient DB write must not abort the whole run + lose the
        // report. The voiceScore-not-null skip filter makes a re-run resume.
        console.error(`  ✗ persist failed for ${job.id}:`, err);
        persistFailures += 1;
      }
    }
  });

  console.log('');
  console.log(formatReport(summarize(results)));
  console.log('');
  console.log(
    `  Graded ${results.length}` +
      (DRY_RUN ? ' (dry run — nothing persisted)' : ` · persisted ${persisted}`) +
      (scoreFailures ? ` · ${scoreFailures} score-errors` : '') +
      (persistFailures ? ` · ${persistFailures} persist-errors` : ''),
  );
}

main()
  .catch((err) => {
    console.error('Voice-grade pass failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
