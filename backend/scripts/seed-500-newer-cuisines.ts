// backend/scripts/seed-500-newer-cuisines.ts
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

import { PrismaClient } from '@prisma/client';
import { aiRecipeService } from '../src/services/aiRecipeService';

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
  // Europe
  French: 46,
  Spanish: 46,
  Greek: 46,
  Portuguese: 46,
  British: 46,
  Scandinavian: 46,
  Balkan: 46,
  German: 46,
  Austrian: 46,
  Hungarian: 46,
  Polish: 46,
  Russian: 46,
  Ukrainian: 46,
  Georgian: 46,

  // MENA
  Levantine: 46,
  Lebanese: 46,
  Persian: 46,
  Turkish: 46,
  Moroccan: 46,
  Tunisian: 46,
  Egyptian: 46,
  Yemeni: 46,
  Israeli: 46,

  // Sub-Saharan Africa
  Ethiopian: 46,
  Eritrean: 46,
  Nigerian: 46,
  Ghanaian: 46,
  Senegalese: 46,
  Ivorian: 46,
  'South African': 46,
  Kenyan: 46,
  Somali: 46,

  // East Asia (skip Chinese/Japanese/Korean — healthy)
  Mongolian: 46,
  Tibetan: 46,

  // SE Asia (skip Thai/Filipino — healthy)
  Vietnamese: 46,
  Indonesian: 46,
  Malaysian: 46,
  Singaporean: 46,
  Burmese: 46,
  Lao: 46,
  Khmer: 46,

  // South Asia (skip Indian — healthy)
  Pakistani: 46,
  'Sri Lankan': 46,
  Nepali: 46,

  // Latin America (skip Mexican — healthy)
  Peruvian: 46,
  Brazilian: 46,
  Colombian: 46,
  Argentinian: 46,
  Chilean: 46,
  Cuban: 46,
  'Puerto Rican': 46,
  Dominican: 46,
  Salvadorean: 46,
  Guatemalan: 46,
  Venezuelan: 46,
  Trinidadian: 46,
  Jamaican: 46,

  // North America (skip American — healthy)
  'American Southern': 46,
  Cajun: 46,
  Hawaiian: 46,
  Canadian: 46,

  // Oceania
  Australian: 46,
  'Pacific Islander': 46,
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

  let succeeded = 0;
  let failed = 0;
  const startedAt = Date.now();

  for (let i = 0; i < plan.length; i += 1) {
    const job = plan[i];
    const label = `${job.cuisine} ${job.mealType}`;
    process.stdout.write(`[${i + 1}/${plan.length}] ${label}… `);
    try {
      const recipe = await aiRecipeService.generateRecipe({
        userId: null,
        cuisineOverride: job.cuisine,
        mealType: job.mealType,
      });
      await aiRecipeService.saveGeneratedRecipe(recipe, null);
      succeeded += 1;
      console.log('✓');
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`✗ ${msg.slice(0, 80)}`);
    }
  }

  const elapsedMin = ((Date.now() - startedAt) / 60_000).toFixed(1);
  console.log('');
  console.log(`Done in ${elapsedMin}m.`);
  console.log(`  ✓ ${succeeded}/${plan.length} succeeded`);
  console.log(`  ✗ ${failed}/${plan.length} failed`);
  console.log(`  Approx spend: $${(succeeded * COST_PER_RECIPE_USD).toFixed(2)}`);
}

main()
  .catch((err) => {
    console.error('Seed run failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
