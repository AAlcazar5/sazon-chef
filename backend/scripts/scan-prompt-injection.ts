// One-off: scan stored recipe text for prompt-injection payloads that could
// be re-fed into an LLM prompt (previousMeals titles, coach recipe context,
// import enrichment). Read-only; prints offending rows.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RX =
  /\b(ignore|disregard|forget)\b[^.\n]{0,40}\b(previous|prior|above|earlier|all)\b|\bsystem prompt\b|\byou are now\b|\bjailbreak\b|<\/?\s*(system|assistant|user_profile|learned_memories|tool_result|tool_data|constitution)\s*>|\bact as\b[^.\n]{0,30}\b(admin|developer|root|unrestricted)\b|\bnew instructions?\s*:|\breveal (your|the) (system|prompt|instructions)/i;

async function main(): Promise<void> {
  const rows = await prisma.recipe.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      ingredients: true,
    },
  });
  const hits: string[] = [];
  let ingHits = 0;
  for (const r of rows) {
    const blob = `${r.title ?? ''} :: ${r.description ?? ''}`;
    if (RX.test(blob)) {
      hits.push(`${r.id} | ${r.title} | ${(r.description ?? '').slice(0, 90)}`);
    }
    try {
      if (RX.test(JSON.stringify(r.ingredients))) ingHits += 1;
    } catch {
      /* ignore unparseable */
    }
  }
  console.log(
    `SCANNED=${rows.length} titleDescHits=${hits.length} ingredientHits=${ingHits}`,
  );
  hits.slice(0, 25).forEach((h) => console.log('  ' + h));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
