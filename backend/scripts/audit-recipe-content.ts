// backend/scripts/audit-recipe-content.ts
//
// Tier U item-1 audit runner (founder roadmap 2026-05-23): reads every
// recipe in the catalog, runs the content-side rules from
// `recipeContentAudit`, and prints a per-cuisine pass-rate table.
//
// Launch gate: ≥85% catalog-wide pass rate. Sub-85% cuisines surface
// at the top of the per-cuisine table (worst-first) so a re-generation
// sprint can target them precisely.
//
// Usage:
//
//   npx ts-node backend/scripts/audit-recipe-content.ts
//   THRESHOLD=0.85 npx ts-node backend/scripts/audit-recipe-content.ts
//   FAIL_BELOW=0.85 npx ts-node backend/scripts/audit-recipe-content.ts
//
// Exit code is 0 when overall pass-rate ≥ FAIL_BELOW; 1 otherwise.
// Makes the script CI-droppable when the threshold becomes a launch gate.

import { prisma } from '../src/lib/prisma';
import {
  auditRecipe,
  rollupAuditResults,
  type AuditedRecipeShape,
} from '../src/services/recipeContentAudit';

const THRESHOLD = Number(process.env.THRESHOLD ?? process.env.FAIL_BELOW ?? '0.85');
const BAR = '━'.repeat(72);

interface RawRow {
  id: string;
  title: string;
  cuisine: string | null;
  calories: number | null;
  cookTime: number | null;
  ingredients: Array<{ name: string; amount?: number | null; unit?: string | null }>;
  instructions: Array<{ text: string; step?: number | null }>;
}

function adapt(row: RawRow): AuditedRecipeShape {
  return {
    id: row.id,
    title: row.title,
    cuisine: row.cuisine,
    calories: row.calories,
    cookTime: row.cookTime,
    ingredients: row.ingredients.map((i) => ({
      name: i.name,
      amount: i.amount ?? undefined,
      unit: i.unit ?? undefined,
    })),
    instructions: row.instructions.map((i) => ({
      text: i.text,
      step: i.step ?? undefined,
    })),
  };
}

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function bar(rate: number, width = 20): string {
  const filled = Math.round(rate * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

async function main(): Promise<number> {
  console.log(`\n▶ Tier U content audit — threshold ${formatPct(THRESHOLD)}\n${BAR}\n`);

  const recipes = await prisma.recipe.findMany({
    select: {
      id: true,
      title: true,
      cuisine: true,
      calories: true,
      cookTime: true,
      ingredients: {
        select: { name: true, amount: true, unit: true },
      },
      instructions: {
        select: { text: true, step: true },
      },
    },
  });

  const results = recipes.map((r) => auditRecipe(adapt(r as RawRow)));
  const rollup = rollupAuditResults(results);

  console.log(`Total recipes:    ${rollup.totalRecipes}`);
  console.log(`Passed:           ${rollup.passed}`);
  console.log(`Failed:           ${rollup.failed}`);
  console.log(`Overall pass:     ${bar(rollup.passRate)}  ${formatPct(rollup.passRate)}\n`);

  if (rollup.perCuisine.length > 0) {
    console.log('Per-cuisine (worst first):');
    console.log('  Cuisine                Pass        Total Passed');
    for (const c of rollup.perCuisine) {
      const flag = c.passRate < THRESHOLD ? ' ⚠️' : '';
      const cuisine = c.cuisine.padEnd(22);
      const pct = formatPct(c.passRate).padStart(7);
      const total = String(c.total).padStart(5);
      const passed = String(c.passed).padStart(6);
      console.log(`  ${cuisine} ${bar(c.passRate, 10)} ${pct} ${total} ${passed}${flag}`);
    }
    console.log('');
  }

  if (Object.keys(rollup.failureCodeCounts).length > 0) {
    console.log('Failure-code counts (broken prompt signals):');
    for (const [code, count] of Object.entries(rollup.failureCodeCounts).sort(
      (a, b) => b[1] - a[1],
    )) {
      console.log(`  ${code.padEnd(25)} ${String(count).padStart(5)}`);
    }
    console.log('');
  }

  console.log(BAR);
  const passedGate = rollup.passRate >= THRESHOLD;
  console.log(
    passedGate
      ? `✓ Overall pass-rate ${formatPct(rollup.passRate)} meets the ${formatPct(THRESHOLD)} launch gate.`
      : `⚠️  Overall pass-rate ${formatPct(rollup.passRate)} BELOW the ${formatPct(THRESHOLD)} launch gate. Fix prompts before generating more.`,
  );
  return passedGate ? 0 : 1;
}

main()
  .then((code) => {
    void prisma.$disconnect().then(() => process.exit(code));
  })
  .catch((err) => {
    console.error('audit-recipe-content failed:', err);
    void prisma.$disconnect().then(() => process.exit(2));
  });
