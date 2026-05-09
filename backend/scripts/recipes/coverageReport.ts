// backend/scripts/recipes/coverageReport.ts
// ROADMAP 4.0 Tier D5 — CLI wrapper that runs assignArchetype over the
// catalog + writes reports/recipe-coverage.csv (gitignored).

import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../../src/lib/prisma';
import {
  assignArchetype,
} from '../../src/data/cuisineArchetypeMatrix';
import {
  computeCoverageRows,
  rowsToCsv,
  findGaps,
  RecipeForCoverage,
} from '../../src/services/coverageReportService';

async function main() {
  const recipes = await prisma.recipe.findMany({
    select: {
      id: true,
      title: true,
      cuisine: true,
      canonicalCuisine: true,
      cookTime: true,
      mealType: true,
      ingredients: { select: { text: true } },
    },
  });

  const forCoverage: RecipeForCoverage[] = recipes.map((r) => ({
    canonicalCuisine: r.canonicalCuisine,
    archetype: r.canonicalCuisine
      ? assignArchetype({
          cookTimeMin: r.cookTime,
          courseType: r.mealType,
          ingredientNames: r.ingredients.map((i) => i.text),
          title: r.title,
        })
      : null,
  }));

  const rows = computeCoverageRows(forCoverage);
  const csv = rowsToCsv(rows);

  const reportsDir = path.join(__dirname, '../../../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const outPath = path.join(reportsDir, 'recipe-coverage.csv');
  fs.writeFileSync(outPath, csv);

  const gaps = findGaps(rows);
  console.log(`coverage report: ${rows.length} rows, ${gaps.length} gaps`);
  console.log(`  empty (count=0):    ${rows.filter((r) => r.severity === 'empty').length}`);
  console.log(`  thin  (req, <2):    ${rows.filter((r) => r.severity === 'thin').length}`);
  console.log(`  ok:                 ${rows.filter((r) => r.severity === 'ok').length}`);
  console.log(`  over  (≥6):         ${rows.filter((r) => r.severity === 'over').length}`);
  console.log(`  na:                 ${rows.filter((r) => r.severity === 'na').length}`);
  console.log(`written → ${outPath}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
