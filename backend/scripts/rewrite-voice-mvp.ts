// backend/scripts/rewrite-voice-mvp.ts
// Tier U voice rewrite pass — MVP-20, the "<4 → rewrite or discard" half.
//
// For every MVP-20 recipe whose persisted voiceScore is < 4:
//   • score < 2  → discard (soft-delete; reversible deletedAt) — DRY_RUN-gated
//   • 2 ≤ score < 4 → rewrite the DESCRIPTION via Claude Haiku, re-score,
//     keep only if it strictly beats the original (Tier D8 rewriteCopy
//     regression guard), then re-persist the improved voiceScore so the
//     grade gate / skip-filter stays truthful.
//
// Title, ingredients, instructions, times are never touched (description-
// only ⇒ dish substance invariant by construction). Idempotent: a recipe
// lifted to ≥4 drops out of the <4 selection on re-run.
//
// Usage:
//   DRY_RUN=1 LIMIT=20 npx ts-node scripts/rewrite-voice-mvp.ts   # smoke
//   DRY_RUN=0 npx ts-node scripts/rewrite-voice-mvp.ts            # full
//
// Env: DRY_RUN (default 1 — set 0 to persist rewrites + apply discards),
//      LIMIT (0=all rewrite candidates), CONCURRENCY (default 6),
//      MAX_ATTEMPTS (rewrite tries per recipe, default 2).

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { scoreVoice } from '../src/services/voiceScorer';
import {
  classifyTone,
  type MessageCreator,
} from '../src/services/voiceToneClassifier';
import { rewriteDescription } from '../src/services/voiceRewriter';
import { deepseekMessageCreator } from '../src/services/deepseekMessageCreator';
import { scoreRecipe } from '../src/services/recipeQualityScoreService';
import {
  rewriteCopy,
  type RewriteCopyDeps,
} from '../src/services/recipeBackfillRunners';
import { MVP_CUISINES, summarize, type ScoredRecipe } from './voiceGrade';
import {
  pickBestAttempt,
  formatRewriteReport,
  type RewriteAttempt,
} from './voiceRewrite';

const prisma = new PrismaClient();

const DRY_RUN = process.env.DRY_RUN !== '0';
const LIMIT = Number.isFinite(Number(process.env.LIMIT))
  ? Number(process.env.LIMIT)
  : 0;
const CONCURRENCY = Math.max(
  1,
  Number.isFinite(Number(process.env.CONCURRENCY))
    ? Number(process.env.CONCURRENCY)
    : 6,
);
const MAX_ATTEMPTS = Math.max(
  1,
  Number.isFinite(Number(process.env.MAX_ATTEMPTS))
    ? Number(process.env.MAX_ATTEMPTS)
    : 2,
);

// PROVIDER=deepseek routes both the rewrite and the tone-scoring through
// Deepseek-V3 (Anthropic-balance-independent). Unset/'claude' → default
// Anthropic path. The Deepseek client is built once and injected into the
// existing MessageCreator seam on both voice services.
const PROVIDER = (process.env.PROVIDER ?? 'claude').toLowerCase();
const voiceClient: MessageCreator | undefined =
  PROVIDER === 'deepseek' ? deepseekMessageCreator() : undefined;

const SHIP_MIN = 4;
const DISCARD_BELOW = 2;
const RETRY_MAX = Math.max(
  0,
  Number.isFinite(Number(process.env.RETRY_MAX))
    ? Number(process.env.RETRY_MAX)
    : 4,
);

/** Transient = worth retrying: rate-limit / overload / 5xx / network. */
function isTransient(e: unknown): boolean {
  const status = (e as { status?: number })?.status;
  if (status === 429 || status === 529 || (status && status >= 500)) {
    return true;
  }
  const msg = String((e as Error)?.message ?? '').toLowerCase();
  return /overloaded|rate limit|timeout|econnreset|etimedout|fetch failed/.test(
    msg,
  );
}

/** Exponential backoff + full jitter around a transient-failing call. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt === RETRY_MAX || !isTransient(e)) throw e;
      const base = Math.min(1000 * 2 ** attempt, 15_000);
      await new Promise((r) => setTimeout(r, Math.random() * base));
    }
  }
  throw lastErr;
}

interface Recipe {
  id: string;
  title: string;
  description: string;
  cuisine: string;
}

async function scoreOf(title: string, description: string): Promise<number> {
  const r = await scoreVoice(
    { title, description },
    { classifyTone: (input) => classifyTone(input, voiceClient) },
  );
  return r.score;
}

async function runPool<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  let done = 0;
  const isTTY = Boolean(process.stdout.isTTY);
  async function drain(): Promise<void> {
    while (cursor < items.length) {
      const i = cursor++;
      await worker(items[i]);
      done += 1;
      if (isTTY || done % 25 === 0 || done === items.length) {
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

function buildDeps(recipe: Recipe): RewriteCopyDeps {
  return {
    fetchRecipe: async () => ({
      title: recipe.title,
      description: recipe.description,
      ingredients: [],
      instructions: [],
      cookTimeMin: 0,
      prepTimeMin: 0,
    }),
    scoreVoice: ({ title, description }) => scoreOf(title, description),
    rewrite: async (before) => {
      const baseline = await scoreOf(before.title, before.description);
      const attempts: RewriteAttempt[] = [];
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        let desc: string;
        try {
          desc = await withRetry(() =>
            rewriteDescription(
              {
                title: before.title,
                description: before.description,
                cuisine: recipe.cuisine,
              },
              voiceClient,
            ),
          );
        } catch (e) {
          if (i === 0) throw e; // total failure → rewriteCopy marks 'failed'
          break; // a later attempt failed — keep earlier ones
        }
        const sc = await scoreOf(before.title, desc);
        attempts.push({ description: desc, score: sc });
        if (sc >= SHIP_MIN) break; // good enough — stop spending
      }
      const best = pickBestAttempt(attempts, baseline);
      if (best) {
        return {
          title: before.title,
          description: best.description,
          voiceScore: best.score,
        };
      }
      // No strict improvement — signal sub-baseline so rewriteCopy's
      // regression guard yields 'skipped' with no write.
      return {
        title: before.title,
        description: before.description,
        voiceScore: baseline - 1,
      };
    },
    updateCopy: async (id, next) => {
      // Description-only: title is unchanged by construction.
      await prisma.recipe.update({
        where: { id },
        data: { description: next.description },
      });
    },
  };
}

async function main(): Promise<void> {
  console.log('▶ Tier U voice rewrite pass — MVP-20 (<4 → rewrite/discard)');
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE (persist + discard)'}`);
  console.log(`  Provider: ${PROVIDER}`);
  console.log(
    `  Concurrency: ${CONCURRENCY} · attempts ${MAX_ATTEMPTS}` +
      (LIMIT ? ` · LIMIT ${LIMIT}` : ''),
  );
  console.log('');

  const recipes = (await prisma.recipe.findMany({
    where: { cuisine: { in: [...MVP_CUISINES] }, deletedAt: null },
    select: { id: true, title: true, description: true, cuisine: true },
  })) as Recipe[];

  // No giant IN — fetch the low scores directly, join in memory.
  const lowScores = await prisma.recipeQualityScore.findMany({
    where: { voiceScore: { lt: SHIP_MIN } },
    select: { recipeId: true, voiceScore: true },
  });
  const scoreById = new Map<string, number>();
  for (const s of lowScores) {
    if (s.voiceScore !== null) scoreById.set(s.recipeId, s.voiceScore);
  }

  const allScored: ScoredRecipe[] = [];
  const discardList: Recipe[] = [];
  let rewriteJobs: Recipe[] = [];

  for (const r of recipes) {
    const sc = scoreById.get(r.id);
    if (sc === undefined) continue; // already ≥4 (shipped) — leave it
    allScored.push({ cuisine: r.cuisine, score: sc });
    if (sc < DISCARD_BELOW) discardList.push(r);
    else rewriteJobs.push(r);
  }

  // `before` baseline must reflect the whole MVP set, not just <4 rows.
  const shipScored = await prisma.recipeQualityScore.findMany({
    where: { voiceScore: { gte: SHIP_MIN } },
    select: { recipeId: true, voiceScore: true },
  });
  const recipeCuisine = new Map(recipes.map((r) => [r.id, r.cuisine]));
  const beforeRows: ScoredRecipe[] = [...allScored];
  for (const s of shipScored) {
    const cuisine = recipeCuisine.get(s.recipeId);
    if (cuisine && s.voiceScore !== null) {
      beforeRows.push({ cuisine, score: s.voiceScore });
    }
  }
  const before = summarize(beforeRows);

  console.log(
    `  ${beforeRows.length} MVP recipes · ${rewriteJobs.length} to rewrite · ` +
      `${discardList.length} to discard · ${before.ship} already ship`,
  );
  console.log('');

  // ── Discards ───────────────────────────────────────────────────────────
  if (discardList.length > 0) {
    console.log(`  Discard (voiceScore < ${DISCARD_BELOW}):`);
    for (const d of discardList) {
      console.log(
        `    ${(scoreById.get(d.id) ?? 0).toFixed(1)}  ${d.cuisine.padEnd(16)} ${d.title}`,
      );
    }
    console.log('');
  }
  let discarded = 0;
  if (!DRY_RUN) {
    for (const d of discardList) {
      await prisma.recipe.update({
        where: { id: d.id },
        data: { deletedAt: new Date() },
      });
      discarded += 1;
    }
  }

  // ── Rewrites ───────────────────────────────────────────────────────────
  if (LIMIT > 0) rewriteJobs = rewriteJobs.slice(0, LIMIT);

  let updated = 0;
  let skippedRegression = 0;
  let failed = 0;
  const failReasons = new Map<string, number>();
  const noteFail = (reason: string): void => {
    const key = reason.slice(0, 120);
    failReasons.set(key, (failReasons.get(key) ?? 0) + 1);
  };

  if (rewriteJobs.length > 0) {
    await runPool(rewriteJobs, async (recipe) => {
      let res;
      try {
        res = await rewriteCopy(recipe.id, buildDeps(recipe));
      } catch (e) {
        noteFail(`threw: ${(e as Error).message}`);
        failed += 1;
        return;
      }
      if (res.outcome === 'updated') {
        updated += 1;
        if (!DRY_RUN && res.newScore !== null) {
          try {
            await scoreRecipe({
              recipeId: recipe.id,
              axes: { voice: res.newScore },
            });
          } catch (e) {
            console.error(`  ✗ re-persist score failed for ${recipe.id}:`, e);
          }
        }
      } else if (res.outcome === 'skipped') {
        skippedRegression += 1;
      } else {
        noteFail(res.reason ?? 'unknown');
        failed += 1;
      }
    });
  }

  if (failReasons.size > 0) {
    console.log('');
    console.log(`  Failure reasons (top ${Math.min(8, failReasons.size)}):`);
    for (const [reason, n] of [...failReasons.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)) {
      console.log(`    ${String(n).padStart(5)}  ${reason}`);
    }
  }

  // ── After ──────────────────────────────────────────────────────────────
  // Re-derive ship-rate from live scores (post-rewrite, post-discard).
  const afterRows: ScoredRecipe[] = [];
  if (!DRY_RUN) {
    const live = await prisma.recipe.findMany({
      where: { cuisine: { in: [...MVP_CUISINES] }, deletedAt: null },
      select: { id: true, cuisine: true },
    });
    const liveCuisine = new Map(live.map((r) => [r.id, r.cuisine]));
    const allScores = await prisma.recipeQualityScore.findMany({
      select: { recipeId: true, voiceScore: true },
    });
    for (const s of allScores) {
      const cuisine = liveCuisine.get(s.recipeId);
      if (cuisine && s.voiceScore !== null) {
        afterRows.push({ cuisine, score: s.voiceScore });
      }
    }
  }
  const after = DRY_RUN ? before : summarize(afterRows);

  console.log('');
  console.log(
    formatRewriteReport({
      before,
      after,
      updated,
      skippedRegression,
      failed,
      discarded,
    }),
  );
  if (DRY_RUN) {
    console.log('\n  DRY RUN — no descriptions rewritten, no recipes discarded.');
  }
}

main()
  .catch((err) => {
    console.error('Voice rewrite pass failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
