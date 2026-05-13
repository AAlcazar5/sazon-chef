/**
 * Clean recipe titles:
 *   - replace hyphens with spaces ("Stir-Fry" -> "Stir Fry")
 *   - drop parenthetical qualifiers ("Tofu Bites (Gluten-Free)" -> "Tofu Bites")
 *   - collapse multiple spaces
 *
 * Usage:
 *   npx ts-node scripts/clean-recipe-titles.ts --dry-run   # preview every change, no writes
 *   npx ts-node scripts/clean-recipe-titles.ts --limit 10  # apply to first 10
 *   npx ts-node scripts/clean-recipe-titles.ts             # apply to all
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Args {
  dryRun: boolean;
  limit?: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') args.dryRun = true;
    if (argv[i] === '--limit') args.limit = Number(argv[++i]);
  }
  return args;
}

const TITLE_CASE_QUALIFIERS = [
  /\bAir Fryer\b/i,
  /\bGluten[-\s]?Free\b/i,
  /\bDairy[-\s]?Free\b/i,
  /\bLow[-\s]?Carb\b/i,
  /\bClassic\b/,
  /\bModern\b/,
  /\bAuthentic\b/,
];

function isQualifier(inner: string): boolean {
  const trimmed = inner.trim();
  if (!trimmed) return true;
  // lowercase content (e.g. "long-braised", "creamy") is always a qualifier
  if (trimmed[0] === trimmed[0].toLowerCase()) return true;
  // Title-case parens are translations by default, except this allow-list
  return TITLE_CASE_QUALIFIERS.some((re) => re.test(trimmed));
}

export function cleanTitle(title: string): string {
  return title
    .replace(/\s*\(([^)]*)\)\s*/g, (_, inner) => (isQualifier(inner) ? ' ' : ` (${inner}) `))
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main(): Promise<void> {
  const { dryRun, limit } = parseArgs(process.argv.slice(2));

  const candidates = await prisma.recipe.findMany({
    where: {
      OR: [{ title: { contains: '-' } }, { title: { contains: '(' } }],
    },
    select: { id: true, title: true },
    take: limit,
    orderBy: { title: 'asc' },
  });

  const changes = candidates
    .map((r) => ({ id: r.id, before: r.title, after: cleanTitle(r.title) }))
    .filter((c) => c.before !== c.after);

  console.log(`\n📝 ${changes.length} titles to change ${dryRun ? '(dry-run)' : ''}\n`);
  for (const c of changes) {
    console.log(`  ${c.before}`);
    console.log(`    → ${c.after}\n`);
  }

  if (dryRun) {
    await prisma.$disconnect();
    return;
  }

  let updated = 0;
  for (const c of changes) {
    await prisma.recipe.update({
      where: { id: c.id },
      data: { title: c.after },
    });
    updated++;
  }
  console.log(`\n✅ Updated ${updated} titles`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
