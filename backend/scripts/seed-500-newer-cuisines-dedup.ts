// backend/scripts/seed-500-newer-cuisines-dedup.ts
//
// Duplicate-safe variant of seed-500-newer-cuisines.ts. Identical planning /
// provider / budget behavior — the ONLY difference is the "── Dedup guard ──"
// block in the generation loop, which skips persisting a recipe whose
// normalized title (src/utils/recipeTitleKey.ts) already exists in the DB or
// was generated earlier in this same run. Use this instead of the original
// when topping up a catalog that already has content, so a re-run doesn't
// stack a third "Argentinian Chimichurri Steak".
//
// Tier U launch seed run — 500 recipes to fill out the cuisine taxonomy gaps
// exposed by the new region-grouped filter (frontend/utils/cuisineTaxonomy.ts).
//
// Strategy: every canonical cuisine in the new taxonomy should clear a
// minimum floor. Zero-coverage cuisines (Portuguese, Indonesian, Pakistani,
// Argentinian, Hawaiian, Australian, etc.) are the highest priority. Thin
// cuisines (Spanish 11, Turkish 11, Peruvian 10, Levantine 8) get topped up
// to a respectable floor. Already-healthy cuisines (American, Mediterranean,
// Mexican, Japanese, Indian, Chinese, Thai, Korean, Filipino, Italian) are
// skipped — this run is about widening the catalog, not deepening it.
//
// Cost-aware. Defaults to DRY_RUN — set DRY_RUN=0 to execute.
//
// Provider selection (SEED_PROVIDER env, default 'groq'):
//   groq           Default. Llama 3.3 70B. ~$1.50 for 500. Fastest (~250 tok/s,
//                  ~100 min total). Requires GROQ_API_KEY (no ID verification).
//   deepseek       DeepSeek-V3. ~$1.80 for 500. Slightly stronger structured
//                  JSON than Llama. Requires DEEPSEEK_API_KEY.
//   gemini         ~$0.66 for 500 with Flash-Lite. Requires GOOGLE_AI_API_KEY
//                  (note: Google may require account-ID verification).
//   claude         ~$8 for 500 with Haiku 4.5, ~$60 with the legacy Sonnet
//                  estimate. Use only as last-resort fallback.
//   openai_compat  Generic OpenAI-compatible host (Together/DeepInfra/etc.).
//                  Requires OPENAI_COMPAT_API_KEY + OPENAI_COMPAT_BASE_URL.
//   ollama         Local FOSS. $0. Requires `ollama serve` running.
//                  Set OLLAMA_MODEL (default llama3.1:70b). ~7 hrs for 500.
//
// Default provider chain when SEED_PROVIDER is a FOSS option (groq/deepseek/
// openai_compat/ollama) is `groq,deepseek` — Groq primary, DeepSeek fallback.
// Closed providers (gemini/claude) are NOT auto-appended; set
// AI_PROVIDER_ORDER yourself if you want to mix.
//
// Usage examples:
//   GROQ_API_KEY=... DRY_RUN=1 npx ts-node scripts/seed-500-newer-cuisines.ts
//   GROQ_API_KEY=... DEEPSEEK_API_KEY=... DRY_RUN=0 npx ts-node scripts/seed-500-newer-cuisines.ts
//   SEED_PROVIDER=deepseek DEEPSEEK_API_KEY=... DRY_RUN=0 npx ts-node ...
//   SEED_PROVIDER=ollama OLLAMA_MODEL=llama3.1:70b DRY_RUN=0 npx ts-node ...
//   RECIPE_BUDGET=50 ... (smoke-test slice)
//   AI_PROVIDER_ORDER=groq,deepseek,claude DRY_RUN=0 npx ts-node ... (opt-in
//     to Claude as last-resort fallback for the FOSS chain)

// ──────────────────────────────────────────────────────────────────────────
// Provider gating — MUST run before any module that imports
// aiRecipeService / AIProviderManager, because the manager reads
// AI_PROVIDER_ORDER at construction time. Imports of aiRecipeService come
// AFTER this block.
// ──────────────────────────────────────────────────────────────────────────
type SeedProvider =
  | 'groq'
  | 'deepseek'
  | 'gemini'
  | 'claude'
  | 'openai_compat'
  | 'ollama';

const SEED_PROVIDER = (process.env.SEED_PROVIDER ?? 'groq') as SeedProvider;
const DEFAULT_COST_BY_PROVIDER: Record<SeedProvider, number> = {
  groq: 0.003,
  deepseek: 0.0036,
  gemini: 0.0013, // Flash-Lite ballpark; standard Flash is ~10x higher
  claude: 0.016, // Haiku 4.5
  openai_compat: 0.004,
  ollama: 0,
};

// Default chains:
//   - FOSS primary  → groq,deepseek (Groq tries first, DeepSeek covers gaps)
//   - gemini/claude → just that one provider (user pays per request anyway)
// Honor an explicit AI_PROVIDER_ORDER from the shell — that wins outright.
if (!process.env.AI_PROVIDER_ORDER) {
  const fossChain = 'groq,deepseek';
  const isFoss =
    SEED_PROVIDER === 'groq' ||
    SEED_PROVIDER === 'deepseek' ||
    SEED_PROVIDER === 'openai_compat' ||
    SEED_PROVIDER === 'ollama';
  process.env.AI_PROVIDER_ORDER = isFoss
    ? // Seed provider runs first; the rest of the FOSS chain fills in as fallback.
      [SEED_PROVIDER, ...fossChain.split(',').filter((p) => p !== SEED_PROVIDER)].join(
        ',',
      )
    : SEED_PROVIDER;
}
// Make sure ollama reports as available when explicitly chosen.
if (SEED_PROVIDER === 'ollama' && !process.env.OLLAMA_ENABLED) {
  process.env.OLLAMA_ENABLED = '1';
}

const DRY_RUN = process.env.DRY_RUN !== '0'; // default DRY — explicit opt-in to spend
const RECIPE_BUDGET = Number(process.env.RECIPE_BUDGET ?? 500);
const COST_PER_RECIPE_USD = Number(
  process.env.COST_PER_RECIPE_USD ?? DEFAULT_COST_BY_PROVIDER[SEED_PROVIDER] ?? 0.12,
);
// Retry-on-dup (#1): how many extra generations a slot gets when it collides
// with an existing title before it's abandoned. Each retry feeds the colliding
// title back so the model is pushed off the prototypical dish.
const DUP_RETRIES = Number(process.env.DUP_RETRIES ?? 3);
// Diversity axis (#3): rotating window of already-covered same-cuisine titles
// fed into every first attempt; AVOID_CAP bounds the list as retries grow it.
const AVOID_WINDOW = Number(process.env.AVOID_WINDOW ?? 12);
const AVOID_CAP = Number(process.env.AVOID_CAP ?? 16);

// Progress reporting. This run is frequently piped to a background-task
// output file rather than an interactive terminal, so a naive `\r` redraw
// bar smears into one giant line. Detect TTY and only redraw in place when
// interactive; otherwise emit a newline'd progress line every
// PROGRESS_EVERY processed slots (plus always on the final slot).
const IS_TTY = !!process.stdout.isTTY;
const PROGRESS_EVERY = Number(process.env.PROGRESS_EVERY ?? 25);

interface ProgressCounters {
  saved: number;
  dup: number;
  fail: number;
}

// `done` = slots attempted so far (i + 1), denominator = plan.length. The
// saved/dup/fail breakdown is what happened to those attempts — dup/fail
// rows were generated then discarded, NOT seeded, so they're framed as a
// breakdown of "attempted", never folded into a "seeded" total.
function renderProgress(
  done: number,
  total: number,
  c: ProgressCounters,
  label: string,
  opts: { final?: boolean } = {},
): void {
  const line =
    `[${done}/${total} attempted] ` +
    `✓${c.saved} ⊘${c.dup} ✗${c.fail}` +
    (label ? ` · ${label}` : '');
  if (IS_TTY) {
    // \r + clear-to-EOL redraws the single bar in place; newline only when done.
    process.stdout.write(`\r\x1b[K${line}${opts.final ? '\n' : ''}`);
  } else if (opts.final || done === total || done % PROGRESS_EVERY === 0) {
    console.log(line);
  }
}

// Discrete dup/fail events stay newline'd in both modes (rare + worth
// keeping in the log). In TTY mode, break the in-place bar with a newline
// first so the event isn't clobbered by the next redraw.
function logEvent(message: string): void {
  if (IS_TTY) process.stdout.write('\n');
  console.log(message);
}

import { PrismaClient } from '@prisma/client';
import { aiRecipeService } from '../src/services/aiRecipeService';
import { normalizeRecipeTitleKey } from '../src/utils/recipeTitleKey';
import { buildAvoidContext, appendAvoid } from './seedDiversity';

const prisma = new PrismaClient();

// ──────────────────────────────────────────────────────────────────────────
// Target floor per cuisine (in the new taxonomy). After this run every
// listed cuisine should have ≥ target recipes. Cuisines NOT in this list
// are intentionally skipped (already healthy, or umbrella terms being phased
// out like "Asian" / "Mediterranean").
//
// Floor sizes scale with cultural visibility & catalog priority:
//   • Tier U launch cuisines (per ROADMAP_TO_LAUNCH.md §Tier U): 25
//   • Priority new regions (Latin Am., MENA, SE Asia): 12
//   • Long-tail discovery cuisines: 8-10
// ──────────────────────────────────────────────────────────────────────────
// After the first two seed passes brought the long-tail cuisines to 8-12
// each, this pass evens them up with the Tier U launch cuisines at 25.
// Established cuisines (American, Italian, Japanese, …) stay out of scope —
// this is widening, not deepening.
const CUISINE_TARGETS: Record<string, number> = {
  // Established-but-thin (added 2026-05-14): these globally popular cuisines
  // were excluded from earlier passes because they had a head start (28-85
  // recipes vs the long-tail's 0-12). The long-tail has since lapped them,
  // so bring them to floor so users tapping East Asia → Chinese don't see
  // a thinner result than East Asia → Mongolian.
  Italian: 118,
  Chinese: 118,
  Japanese: 118,
  Korean: 118,
  Thai: 118,
  Filipino: 118,
  Indian: 118,

  // Europe
  French: 118,
  Spanish: 118,
  Greek: 118,
  Portuguese: 118,
  British: 118,
  Scandinavian: 118,
  Balkan: 118,
  German: 118,
  Austrian: 118,
  Hungarian: 118,
  Polish: 118,
  Russian: 118,
  Ukrainian: 118,
  Georgian: 118,

  // MENA
  Levantine: 118,
  Lebanese: 118,
  Persian: 118,
  Turkish: 118,
  Moroccan: 118,
  Tunisian: 118,
  Egyptian: 118,
  Yemeni: 118,
  Israeli: 118,

  // Sub-Saharan Africa
  Ethiopian: 118,
  Eritrean: 118,
  Nigerian: 118,
  Ghanaian: 118,
  Senegalese: 118,
  Ivorian: 118,
  'South African': 118,
  Kenyan: 118,
  Somali: 118,

  // East Asia (Chinese, Japanese, Korean added to established-but-thin block above)
  Mongolian: 118,
  Tibetan: 118,

  // SE Asia (Thai, Filipino added to established-but-thin block above)
  Vietnamese: 118,
  Indonesian: 118,
  Malaysian: 118,
  Singaporean: 118,
  Burmese: 118,
  Lao: 118,
  Khmer: 118,

  // South Asia (Indian added to established-but-thin block above)
  Pakistani: 118,
  'Sri Lankan': 118,
  Nepali: 118,

  // Latin America (skip Mexican — healthy)
  Peruvian: 118,
  Brazilian: 118,
  Colombian: 118,
  Argentinian: 118,
  Chilean: 118,
  Cuban: 118,
  'Puerto Rican': 118,
  Dominican: 118,
  Salvadorean: 118,
  Guatemalan: 118,
  Venezuelan: 118,
  Trinidadian: 118,
  Jamaican: 118,

  // North America (skip American — healthy)
  'American Southern': 118,
  Cajun: 118,
  Hawaiian: 118,
  Canadian: 118,

  // Oceania
  Australian: 118,
  'Pacific Islander': 118,
};

// Even meal-type rotation so each cuisine ships breakfast/lunch/dinner/snack
// coverage rather than skewing to dinner. Index by job position within a
// cuisine, not by global plan position.
const MEAL_TYPES: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'> = [
  'dinner', 'lunch', 'dinner', 'breakfast', 'dinner', 'lunch', 'snack', 'dinner',
];

interface PlannedJob {
  cuisine: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

async function buildPlan(): Promise<PlannedJob[]> {
  const plan: PlannedJob[] = [];

  // Fetch existing counts for all targeted cuisines in one query
  const existingCounts = await prisma.recipe.groupBy({
    by: ['cuisine'],
    where: { cuisine: { in: Object.keys(CUISINE_TARGETS) } },
    _count: { _all: true },
  });
  const countByCuisine = new Map<string, number>();
  for (const row of existingCounts) {
    if (row.cuisine) countByCuisine.set(row.cuisine, row._count._all);
  }

  // For each cuisine, compute delta and emit jobs
  const cuisineDeltas: Array<{ cuisine: string; delta: number; have: number }> = [];
  for (const [cuisine, target] of Object.entries(CUISINE_TARGETS)) {
    const have = countByCuisine.get(cuisine) ?? 0;
    const delta = Math.max(0, target - have);
    if (delta > 0) cuisineDeltas.push({ cuisine, delta, have });
  }

  // Priority: zero-coverage first (biggest gaps in the new taxonomy), then
  // top-ups by absolute delta. Within each group the plan stays deterministic.
  cuisineDeltas.sort((a, b) => {
    const aZero = a.have === 0 ? 1 : 0;
    const bZero = b.have === 0 ? 1 : 0;
    if (aZero !== bZero) return bZero - aZero;
    return b.delta - a.delta;
  });

  for (const { cuisine, delta } of cuisineDeltas) {
    for (let i = 0; i < delta; i += 1) {
      plan.push({ cuisine, mealType: MEAL_TYPES[i % MEAL_TYPES.length] });
    }
  }

  // Enforce overall budget — preserve priority order
  return plan.slice(0, RECIPE_BUDGET);
}

function renderBreakdown(plan: PlannedJob[]): void {
  const byCuisine = new Map<string, number>();
  for (const j of plan) byCuisine.set(j.cuisine, (byCuisine.get(j.cuisine) ?? 0) + 1);

  const rows = [...byCuisine.entries()].sort((a, b) => b[1] - a[1]);
  console.log('  Per-cuisine breakdown:');
  for (const [cuisine, count] of rows) {
    console.log(`    ${cuisine.padEnd(22)} ${String(count).padStart(3)}`);
  }
}

async function main(): Promise<void> {
  console.log('▶ Tier U seed run — 500 recipes across newer / thin cuisines');
  console.log('');

  const plan = await buildPlan();
  const projectedCost = (plan.length * COST_PER_RECIPE_USD).toFixed(2);

  console.log(`  Provider (primary):     ${SEED_PROVIDER}`);
  console.log(`  Provider order:         ${process.env.AI_PROVIDER_ORDER}`);
  console.log(`  Planned recipes:        ${plan.length}`);
  console.log(`  Recipe budget cap:      ${RECIPE_BUDGET}`);
  console.log(`  Per-recipe cost (est):  $${COST_PER_RECIPE_USD.toFixed(4)}`);
  console.log(`  Total projected cost:   ~$${projectedCost}`);
  console.log(`  Mode:                   ${DRY_RUN ? 'DRY RUN (no API calls)' : 'LIVE'}`);
  console.log('');

  renderBreakdown(plan);
  console.log('');

  if (DRY_RUN) {
    console.log('Dry run complete. Re-run with DRY_RUN=0 to execute.');
    return;
  }

  // ── Dedup guard — preload every existing normalized title key ──────────
  // One query up front beats a findFirst per recipe. The set grows as the
  // run generates new recipes so an intra-run collision (two jobs yielding
  // the same dish) is also caught without a DB round-trip. cuisine is pulled
  // alongside so the diversity axis can hand each job its own cuisine's
  // already-covered titles as an avoid list.
  const existingTitles = await prisma.recipe.findMany({
    select: { title: true, cuisine: true },
  });
  const seenTitleKeys = new Set<string>();
  const knownTitlesByCuisine = new Map<string, string[]>();
  for (const { title, cuisine } of existingTitles) {
    const key = normalizeRecipeTitleKey(title);
    if (key) seenTitleKeys.add(key);
    if (cuisine) {
      const list = knownTitlesByCuisine.get(cuisine);
      if (list) list.push(title);
      else knownTitlesByCuisine.set(cuisine, [title]);
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
  // Per-cuisine job counter — rotates the avoid window so successive jobs for
  // the same cuisine suppress different prototypes instead of the same head.
  const cuisineJobIndex = new Map<string, number>();
  const startedAt = Date.now();

  for (let i = 0; i < plan.length; i += 1) {
    const job = plan[i];
    const label = `${job.cuisine} ${job.mealType}`;

    const jobIndex = cuisineJobIndex.get(job.cuisine) ?? 0;
    cuisineJobIndex.set(job.cuisine, jobIndex + 1);
    const known = knownTitlesByCuisine.get(job.cuisine) ?? [];
    let avoid = buildAvoidContext(known, { windowSize: AVOID_WINDOW, jobIndex });

    let slotDone = false;
    for (let attempt = 0; attempt <= DUP_RETRIES && !slotDone; attempt += 1) {
      try {
        apiCalls += 1;
        const recipe = await aiRecipeService.generateRecipe({
          userId: null,
          cuisineOverride: job.cuisine,
          mealType: job.mealType,
          previousMeals: avoid.length > 0 ? avoid : undefined,
        });

        // ── Dedup guard ────────────────────────────────────────────────
        // Generation already cost the API call, but skipping the DB write
        // (and its image fetch) is what actually prevents the duplicate row.
        const titleKey = normalizeRecipeTitleKey(recipe.title);
        if (titleKey && seenTitleKeys.has(titleKey)) {
          if (attempt < DUP_RETRIES) {
            retriesUsed += 1;
            avoid = appendAvoid(avoid, recipe.title, AVOID_CAP);
            continue; // retry this slot with the collision fed back
          }
          skippedDuplicate += 1;
          logEvent(`⊘ dup "${recipe.title.slice(0, 48)}" (${label}, after ${attempt} retries)`);
          slotDone = true;
          break;
        }

        await aiRecipeService.saveGeneratedRecipe(recipe, null);
        if (titleKey) {
          seenTitleKeys.add(titleKey);
          known.push(recipe.title);
          knownTitlesByCuisine.set(job.cuisine, known);
        }
        succeeded += 1;
        if (attempt > 0) recoveredByRetry += 1;
        slotDone = true;
      } catch (err) {
        // generateRecipe already retries its own internal failures; a throw
        // here is terminal for the slot — don't burn dup-retries on it.
        failed += 1;
        const msg = err instanceof Error ? err.message : String(err);
        logEvent(`✗ ${label}: ${msg.slice(0, 80)}`);
        slotDone = true;
      }
    }

    renderProgress(
      i + 1,
      plan.length,
      { saved: succeeded, dup: skippedDuplicate, fail: failed },
      label,
      { final: i + 1 === plan.length },
    );
  }

  const elapsedMin = ((Date.now() - startedAt) / 60_000).toFixed(1);
  if (IS_TTY) process.stdout.write('\n');
  console.log('');
  console.log(`Done in ${elapsedMin}m.`);
  console.log(`  ${plan.length} slots attempted — breakdown:`);
  console.log(`    ✓ ${succeeded} saved        (${recoveredByRetry} recovered via retry)`);
  console.log(`    ⊘ ${skippedDuplicate} discarded     (duplicate title, retries exhausted — generated, not seeded)`);
  console.log(`    ✗ ${failed} failed`);
  console.log(`  ↻ ${retriesUsed} dup-retries used across ${apiCalls} API calls`);
  console.log(`  Approx spend: $${(apiCalls * COST_PER_RECIPE_USD).toFixed(2)}`);
}

main()
  .catch((err) => {
    console.error('Seed run failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
