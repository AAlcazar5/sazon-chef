// backend/scripts/normalize-seeded-cuisines.ts
//
// One-shot cleanup for the cuisine label drift introduced by the DeepSeek
// seed run on 2026-05-13. DeepSeek occasionally returned compound or
// qualified cuisine strings ("Georgian-Armenian", "Caribbean (Dominican,
// Puerto Rican, Cuban fusion)") instead of the single canonical name the
// prompt requested. These don't match the filter UI's region picker — which
// only knows the canonicals — so they're invisible to users.
//
// Strategy: explicit allow-listed renames. No algorithmic substring matching
// — too risky on legitimate-but-rare labels (Italian-American, Tex-Mex,
// etc.) that should be preserved.
//
// Usage:
//   DRY_RUN=1 npx ts-node scripts/normalize-seeded-cuisines.ts   # preview
//   DRY_RUN=0 npx ts-node scripts/normalize-seeded-cuisines.ts   # apply

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN = process.env.DRY_RUN !== '0';

// First-listed cuisine wins on fusion strings — it's the dish's primary
// influence. Long parenthetical qualifiers ("with X & Y influences") are
// just promotional copy; strip to the head noun.
const NORMALIZATION_MAP: Record<string, string> = {
  'Georgian-Armenian': 'Georgian',
  'Chilean-Argentinian': 'Chilean',
  'Chilean-Argentinian Fusion': 'Chilean',
  'Chilean/Argentinian': 'Chilean',
  'Tibetan/Nepali': 'Tibetan',
  'Tibetan-Nepali': 'Tibetan',
  'Lao/Thai': 'Lao',
  'Sri Lankan/Indian': 'Sri Lankan',
  'Nepali-inspired': 'Nepali',
  'Nepali-inspired (with Tibetan, Bhutanese, Indian influences)': 'Nepali',
  'Indonesian (with Malaysian & Singaporean influences)': 'Indonesian',
  'Ivorian (with Ghanaian influence)': 'Ivorian',
  'Caribbean (Dominican, Puerto Rican, Cuban fusion)': 'Dominican',
  'Caribbean (Dominican/Puerto Rican/Cuban)': 'Dominican',
  // Top-up run strays (2026-05-13).
  'French-Italian': 'French',
  'French-Italian-Cajun': 'French',
  'Nigerian / West African': 'Nigerian',
  // Even-up run strays (2026-05-13).
  'Chilean with Argentinian influences': 'Chilean',
  'Dominican/Caribbean': 'Dominican',
  'Dominican/Puerto Rican/Cuban': 'Dominican',
  'Georgian (with Armenian influence)': 'Georgian',
  'Georgian-Armenian fusion': 'Georgian',
  'Ivoirienne': 'Ivorian',
  'Lao (with Thai influences)': 'Lao',
  'Lao-Thai Fusion': 'Lao',
  'Senegalese/West African Fusion': 'Senegalese',
  'Somalian': 'Somali',
  'Sri Lankan (with Indian influence)': 'Sri Lankan',
  'Tibetan / Nepali': 'Tibetan',
  'Tibetan-Nepali Fusion': 'Tibetan',
  // Push-up run strays (2026-05-13) — spelling/anglicization drift.
  'Salvadoran': 'Salvadorean',
  'Salvadorian': 'Salvadorean',
  'Southern American': 'American Southern',
};

async function main(): Promise<void> {
  console.log('▶ Normalize seeded cuisine labels');
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log('');

  let totalAffected = 0;
  const plan: Array<{ from: string; to: string; count: number }> = [];

  for (const [from, to] of Object.entries(NORMALIZATION_MAP)) {
    const count = await prisma.recipe.count({ where: { cuisine: from } });
    if (count > 0) {
      plan.push({ from, to, count });
      totalAffected += count;
    }
  }

  if (plan.length === 0) {
    console.log('Nothing to normalize — DB is clean.');
    return;
  }

  console.log('  Plan:');
  for (const { from, to, count } of plan) {
    console.log(`    ${from.padEnd(60)} → ${to.padEnd(14)} (${count})`);
  }
  console.log(`  Total rows affected: ${totalAffected}`);
  console.log('');

  if (DRY_RUN) {
    console.log('Dry run. Re-run with DRY_RUN=0 to apply.');
    return;
  }

  for (const { from, to } of plan) {
    const result = await prisma.recipe.updateMany({
      where: { cuisine: from },
      data: { cuisine: to },
    });
    console.log(`  ✓ ${from} → ${to} (${result.count})`);
  }
  console.log('');
  console.log(`Done. ${totalAffected} rows normalized.`);
}

main()
  .catch((err) => {
    console.error('Normalization failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
