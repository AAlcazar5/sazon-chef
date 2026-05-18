// backend/scripts/seedRunner.ts
//
// Shared core for the focused catalog seed runners. seed-snacks-desserts.ts,
// seed-international-snacks.ts and seed-international-desserts.ts were ~95%
// identical (provider gating, env knobs, dedup guard, generation loop, run
// summary) — only the plan and a few labels differed. They are now thin
// entrypoints over runSeed(): each supplies a runLabel, a group noun, and a
// buildPlan callback that yields a SeedJob[]. Behavior is byte-for-byte
// equivalent to the originals (verified via dry-run breakdown parity).
//
// Provider gating MUST execute before aiRecipeService is imported (the manager
// reads AI_PROVIDER_ORDER at construction). This module does that at load, so
// the entrypoints just `import { runSeed }` and call it — no per-file gating.

export type SeedProvider =
  | 'groq'
  | 'deepseek'
  | 'gemini'
  | 'claude'
  | 'openai_compat'
  | 'ollama';

const DEFAULT_COST_BY_PROVIDER: Record<SeedProvider, number> = {
  groq: 0.003,
  deepseek: 0.0036,
  gemini: 0.0013,
  claude: 0.016,
  openai_compat: 0.004,
  ollama: 0,
};

/**
 * Pure provider-chain resolution. An explicit (non-empty) AI_PROVIDER_ORDER
 * wins outright. Otherwise a FOSS seed provider runs first and the rest of the
 * FOSS chain (groq,deepseek) fills in as fallback; a closed provider
 * (gemini/claude) is used alone — the user pays per request anyway, so no
 * FOSS fallback is auto-appended.
 */
export function resolveAiProviderOrder(
  seedProvider: SeedProvider,
  explicit?: string,
): string {
  if (explicit && explicit.trim() !== '') return explicit;
  const fossChain = ['groq', 'deepseek'];
  const isFoss =
    seedProvider === 'groq' ||
    seedProvider === 'deepseek' ||
    seedProvider === 'openai_compat' ||
    seedProvider === 'ollama';
  return isFoss
    ? [seedProvider, ...fossChain.filter((p) => p !== seedProvider)].join(',')
    : seedProvider;
}

const SEED_PROVIDER = (process.env.SEED_PROVIDER ?? 'deepseek') as SeedProvider;
process.env.AI_PROVIDER_ORDER = resolveAiProviderOrder(
  SEED_PROVIDER,
  process.env.AI_PROVIDER_ORDER,
);
if (SEED_PROVIDER === 'ollama' && !process.env.OLLAMA_ENABLED) {
  process.env.OLLAMA_ENABLED = '1';
}

function numEnv(name: string, def: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return def;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : def;
}

const DRY_RUN = process.env.DRY_RUN !== '0';
const RECIPE_BUDGET = numEnv('RECIPE_BUDGET', 200);
const COST_PER_RECIPE_USD = numEnv(
  'COST_PER_RECIPE_USD',
  DEFAULT_COST_BY_PROVIDER[SEED_PROVIDER] ?? 0.12,
);
const DUP_RETRIES = numEnv('DUP_RETRIES', 3);
const AVOID_WINDOW = numEnv('AVOID_WINDOW', 12);
const AVOID_CAP = numEnv('AVOID_CAP', 16);
const TARGET_SAVED = numEnv('TARGET_SAVED', 0);
const MAX_ATTEMPTS = numEnv('MAX_ATTEMPTS', 0);
const ATTEMPT_MULTIPLIER = numEnv('ATTEMPT_MULTIPLIER', 5);

const IS_TTY = !!process.stdout.isTTY;
const PROGRESS_EVERY = numEnv('PROGRESS_EVERY', 25);

interface ProgressCounters {
  saved: number;
  dup: number;
  fail: number;
}

import { PrismaClient } from '@prisma/client';
// NOTE: aiRecipeService is intentionally NOT imported here. Importing it
// constructs AIProviderManager, which reads AI_PROVIDER_ORDER once at
// construction. TypeScript hoists all `import`/`require` calls above the
// provider-gating statements above, so a top-level import would build the
// manager with the DEFAULT order (DeepSeek/Groq never registered → every
// job falls to rate-limited Claude). It is require()'d lazily inside
// runSeed(), by which point the gating env mutation has run.
import { normalizeRecipeTitleKey } from '../src/utils/recipeTitleKey';
import { buildAvoidContext, appendAvoid } from './seedDiversity';
import { formatProgressBar } from './seedProgress';
import { resolveRunBudget, evaluateStop } from './seedBudget';

export interface SeedJob {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'sauce';
  styleHint: string;
  /** Diversity/dedup bucket: a cuisine for pinned runs, a theme key otherwise. */
  groupKey: string;
  /** Passed to generateRecipe as cuisineOverride; omitted when cuisine-free. */
  cuisine?: string;
}

export interface SeedRunConfig {
  /** Banner headline (▶ line). */
  runLabel: string;
  /** Plural noun for the breakdown header + column width. */
  groupNoun: 'theme' | 'cuisine';
  /** Builds the plan given the resolved plan cap (offsets applied by caller). */
  buildPlan: (planCap: number) => SeedJob[];
}

function renderProgress(
  done: number,
  total: number,
  c: ProgressCounters,
  label: string,
  startedAt: number,
  opts: { final?: boolean } = {},
): void {
  const line = formatProgressBar({
    done,
    total,
    saved: c.saved,
    dup: c.dup,
    fail: c.fail,
    elapsedMs: Date.now() - startedAt,
    label,
  });
  if (IS_TTY) {
    process.stdout.write(`\r\x1b[K${line}${opts.final ? '\n' : ''}`);
  } else if (opts.final || done === total || done % PROGRESS_EVERY === 0) {
    console.log(line);
  }
}

function logEvent(message: string): void {
  if (IS_TTY) process.stdout.write('\n');
  console.log(message);
}

function renderBreakdown(plan: SeedJob[], groupNoun: 'theme' | 'cuisine'): void {
  const byGroup = new Map<string, number>();
  for (const j of plan) byGroup.set(j.groupKey, (byGroup.get(j.groupKey) ?? 0) + 1);
  const rows = [...byGroup.entries()].sort((a, b) => b[1] - a[1]);
  const width = groupNoun === 'theme' ? 28 : 16;
  console.log(`  Per-${groupNoun} breakdown:`);
  for (const [group, count] of rows) {
    console.log(`    ${group.padEnd(width)} ${String(count).padStart(3)}`);
  }
}

export async function runSeed(config: SeedRunConfig): Promise<void> {
  // Lazy require — AI_PROVIDER_ORDER is guaranteed set by now (module-top
  // gating statements ran before this function is called), so
  // AIProviderManager constructs with the correct provider chain.
  const { aiRecipeService } = require('../src/services/aiRecipeService') as
    typeof import('../src/services/aiRecipeService');

  const prisma = new PrismaClient();
  try {
    console.log(`▶ ${config.runLabel}`);
    console.log('');

    const runBudget = resolveRunBudget({
      recipeBudget: RECIPE_BUDGET,
      targetSaved: TARGET_SAVED > 0 ? TARGET_SAVED : null,
      maxAttempts: MAX_ATTEMPTS > 0 ? MAX_ATTEMPTS : null,
      attemptMultiplier: ATTEMPT_MULTIPLIER,
    });
    const plan = config.buildPlan(runBudget.planCap);

    console.log(`  Provider (primary):     ${SEED_PROVIDER}`);
    console.log(`  Provider order:         ${process.env.AI_PROVIDER_ORDER}`);
    if (runBudget.targetSaved != null) {
      const expected = (runBudget.targetSaved * COST_PER_RECIPE_USD).toFixed(2);
      const ceiling = (runBudget.maxAttempts * COST_PER_RECIPE_USD).toFixed(2);
      console.log(`  Mode:                   TARGET-SAVED (dups/fails don't count)`);
      console.log(`  Target saved recipes:   ${runBudget.targetSaved}`);
      console.log(`  Attempt cap (spend):    ${runBudget.maxAttempts}  (×${ATTEMPT_MULTIPLIER})`);
      console.log(`  Plan slots available:   ${plan.length}`);
      console.log(`  Per-recipe cost (est):  $${COST_PER_RECIPE_USD.toFixed(4)}`);
      console.log(`  Cost: ~$${expected} expected · up to $${ceiling} at the attempt cap`);
    } else {
      const projectedCost = (plan.length * COST_PER_RECIPE_USD).toFixed(2);
      console.log(`  Planned recipes:        ${plan.length}`);
      console.log(`  Recipe budget cap:      ${RECIPE_BUDGET}`);
      console.log(`  Per-recipe cost (est):  $${COST_PER_RECIPE_USD.toFixed(4)}`);
      console.log(`  Total projected cost:   ~$${projectedCost}`);
    }
    console.log(`  Run mode:               ${DRY_RUN ? 'DRY RUN (no API calls)' : 'LIVE'}`);
    console.log('');

    renderBreakdown(plan, config.groupNoun);
    console.log('');

    if (DRY_RUN) {
      console.log('Dry run complete. Re-run with DRY_RUN=0 to execute.');
      return;
    }

    // ── Dedup guard — preload every existing normalized title key ────────
    // Titles are also bucketed by cuisine so cuisine-pinned runs prime their
    // per-group avoid list from the DB; theme runs whose groupKey is not a
    // cuisine simply start empty and accrue in-run (the original behavior).
    const existingTitles = await prisma.recipe.findMany({
      select: { title: true, cuisine: true },
    });
    const seenTitleKeys = new Set<string>();
    const knownTitlesByGroup = new Map<string, string[]>();
    for (const { title, cuisine } of existingTitles) {
      const key = normalizeRecipeTitleKey(title);
      if (key) seenTitleKeys.add(key);
      if (cuisine) {
        const list = knownTitlesByGroup.get(cuisine);
        if (list) list.push(title);
        else knownTitlesByGroup.set(cuisine, [title]);
      }
    }
    console.log(`  Dedup guard:            ${seenTitleKeys.size} existing title keys loaded`);
    console.log(`  Diversity axis:         window ${AVOID_WINDOW}, ${DUP_RETRIES} retries/slot`);
    console.log('');

    let succeeded = 0;
    let failed = 0;
    let skippedDuplicate = 0;
    let recoveredByRetry = 0;
    let retriesUsed = 0;
    let apiCalls = 0;
    const groupJobIndex = new Map<string, number>();
    const startedAt = Date.now();
    let stopReason: 'target_reached' | 'max_attempts' | 'plan_exhausted' =
      'plan_exhausted';

    for (let i = 0; i < plan.length; i += 1) {
      const decision = evaluateStop({
        succeeded,
        targetSaved: runBudget.targetSaved,
        attempts: i,
        maxAttempts: runBudget.maxAttempts,
        planExhausted: false,
      });
      if (decision.stop) {
        stopReason = decision.reason ?? 'max_attempts';
        break;
      }

      const job = plan[i];
      const label = `${job.groupKey} ${job.mealType}`;

      const jobIndex = groupJobIndex.get(job.groupKey) ?? 0;
      groupJobIndex.set(job.groupKey, jobIndex + 1);
      const known = knownTitlesByGroup.get(job.groupKey) ?? [];
      let avoid = buildAvoidContext(known, { windowSize: AVOID_WINDOW, jobIndex });

      let slotDone = false;
      for (let attempt = 0; attempt <= DUP_RETRIES && !slotDone; attempt += 1) {
        try {
          apiCalls += 1;
          const recipe = await aiRecipeService.generateRecipe({
            userId: null,
            cuisineOverride: job.cuisine,
            mealType: job.mealType,
            styleHint: job.styleHint,
            previousMeals: avoid.length > 0 ? avoid : undefined,
          });

          const titleKey = normalizeRecipeTitleKey(recipe.title);
          if (titleKey && seenTitleKeys.has(titleKey)) {
            if (attempt < DUP_RETRIES) {
              retriesUsed += 1;
              avoid = appendAvoid(avoid, recipe.title, AVOID_CAP);
              continue;
            }
            skippedDuplicate += 1;
            logEvent(`⊘ dup "${recipe.title.slice(0, 48)}" (${label}, after ${attempt} retries)`);
            slotDone = true;
            break;
          }

          await aiRecipeService.saveGeneratedRecipe(recipe, null);
          if (titleKey) {
            seenTitleKeys.add(titleKey);
            knownTitlesByGroup.set(job.groupKey, [...known, recipe.title]);
          }
          succeeded += 1;
          if (attempt > 0) recoveredByRetry += 1;
          slotDone = true;
        } catch (err) {
          failed += 1;
          const msg = err instanceof Error ? err.message : String(err);
          logEvent(`✗ ${label}: ${msg.slice(0, 80)}`);
          slotDone = true;
        }
      }

      const done = runBudget.targetSaved != null ? succeeded : i + 1;
      const total = runBudget.targetSaved != null ? runBudget.targetSaved : plan.length;
      renderProgress(
        done,
        total,
        { saved: succeeded, dup: skippedDuplicate, fail: failed },
        label,
        startedAt,
        { final: done >= total },
      );
    }

    const finalDone = runBudget.targetSaved != null ? succeeded : apiCalls;
    const finalTotal =
      runBudget.targetSaved != null ? runBudget.targetSaved : plan.length;
    renderProgress(
      finalDone,
      finalTotal,
      { saved: succeeded, dup: skippedDuplicate, fail: failed },
      stopReason,
      startedAt,
      { final: true },
    );

    const elapsedMin = ((Date.now() - startedAt) / 60_000).toFixed(1);
    if (IS_TTY) process.stdout.write('\n');
    console.log('');
    console.log(`Done in ${elapsedMin}m — stopped: ${stopReason}.`);
    console.log(`  ${apiCalls} generation attempts — breakdown:`);
    console.log(`    ✓ ${succeeded} saved        (${recoveredByRetry} recovered via retry)`);
    console.log(`    ⊘ ${skippedDuplicate} discarded     (duplicate title, retries exhausted — generated, not seeded)`);
    console.log(`    ✗ ${failed} failed`);
    console.log(`  ↻ ${retriesUsed} dup-retries used across ${apiCalls} API calls`);
    if (runBudget.targetSaved != null) {
      console.log(`  Target was ${runBudget.targetSaved} saved — ${succeeded >= runBudget.targetSaved ? 'MET ✓' : `short by ${runBudget.targetSaved - succeeded}`}`);
    }
    console.log(`  Approx spend: $${(apiCalls * COST_PER_RECIPE_USD).toFixed(2)}`);
  } finally {
    await prisma.$disconnect();
  }
}
