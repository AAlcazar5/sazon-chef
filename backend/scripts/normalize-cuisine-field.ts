// backend/scripts/normalize-cuisine-field.ts
// One-shot cleanup — the AI sometimes returns cuisine values like
// "Persian/Kurdish/Afghan" or "Peruvian-Japanese Fusion" instead of the
// canonical name. Maps every recipe.cuisine value back to the closest
// V1_SCOPE_CUISINES entry by substring match (longest-first to avoid
// "Mexican" eating "Tex-Mex").
//
// Idempotent and safe to re-run. DRY_RUN=1 previews without writing.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === '1';

// All v1-scope cuisines + the legacy buckets already in the DB.
// Order matters — longer / more-specific names first so "Tex-Mex" wins
// over "Mexican" and "Soul Food" wins over partial matches.
const CANONICAL_CUISINES: string[] = [
  'Cajun/Creole', 'Tex-Mex', 'Soul Food', 'North African',
  'Middle Eastern', 'Mediterranean', 'Latin American',
  'Salvadorean', 'Salvadoran', 'Puerto Rican', 'Vietnamese',
  'Brazilian', 'Colombian', 'Ethiopian', 'Filipino', 'Ghanaian',
  'Lebanese', 'Nigerian', 'Okinawan', 'Peruvian', 'Persian',
  'Spanish', 'Turkish',
  'American', 'Chinese', 'French', 'Greek', 'Indian', 'Italian',
  'Japanese', 'Korean', 'Mexican', 'Thai', 'Cuban', 'Asian',
];

// Map alternate spellings to canonical.
const ALIASES: Record<string, string> = {
  'Salvadoran': 'Salvadorean',
};

function normalize(raw: string | null): string | null {
  if (!raw) return raw;
  const value = raw.trim();
  const lower = value.toLowerCase();

  // Find every canonical cuisine that appears in the string + its position.
  // Pick the one with the LOWEST position so "Korean (with Chinese influences)"
  // resolves to Korean. On ties (same position), prefer longer match so
  // "Tex-Mex Mexican" → Tex-Mex.
  let best: { canon: string; index: number; length: number } | null = null;
  for (const canon of CANONICAL_CUISINES) {
    const idx = lower.indexOf(canon.toLowerCase());
    if (idx === -1) continue;
    if (
      best === null ||
      idx < best.index ||
      (idx === best.index && canon.length > best.length)
    ) {
      best = { canon, index: idx, length: canon.length };
    }
  }
  if (!best) return value;
  return ALIASES[best.canon] ?? best.canon;
}

async function main() {
  const recipes = await prisma.recipe.findMany({
    select: { id: true, cuisine: true },
  });
  console.log(`Loaded ${recipes.length} recipes.`);

  const planned: Array<{ id: string; from: string; to: string }> = [];
  for (const r of recipes) {
    if (!r.cuisine) continue;
    const target = normalize(r.cuisine);
    if (target && target !== r.cuisine) {
      planned.push({ id: r.id, from: r.cuisine, to: target });
    }
  }

  // Per-cuisine summary
  const byTransition = new Map<string, number>();
  for (const p of planned) {
    const key = `${p.from}  →  ${p.to}`;
    byTransition.set(key, (byTransition.get(key) ?? 0) + 1);
  }
  const sortedTransitions = [...byTransition.entries()].sort((a, b) => b[1] - a[1]);

  console.log(`Planned updates: ${planned.length}`);
  console.log(`Distinct transitions: ${sortedTransitions.length}`);
  console.log('');
  for (const [transition, count] of sortedTransitions) {
    console.log(`  ${count.toString().padStart(3)}  ${transition}`);
  }
  console.log('');

  if (DRY_RUN) {
    console.log('DRY RUN — no writes. Set DRY_RUN=0 (or unset) to apply.');
    return;
  }

  let applied = 0;
  for (const p of planned) {
    await prisma.recipe.update({ where: { id: p.id }, data: { cuisine: p.to } });
    applied += 1;
  }
  console.log(`Applied ${applied} updates.`);
}

main()
  .catch(err => {
    console.error('normalize-cuisine-field failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
