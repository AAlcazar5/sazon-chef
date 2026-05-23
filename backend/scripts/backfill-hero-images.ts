// backend/scripts/backfill-hero-images.ts
//
// Tier U item-3a runner (founder roadmap 2026-05-23): backfill hero
// images for catalog recipes that don't have one yet. Uses the
// existing `imageService.searchFoodImage` (Unsplash) — first hit per
// recipe. Cost: free (Unsplash dev tier).
//
// Defaults DRY_RUN — set DRY_RUN=0 to actually persist.
//
// Usage:
//
//   UNSPLASH_ACCESS_KEY=... npx ts-node backend/scripts/backfill-hero-images.ts
//   UNSPLASH_ACCESS_KEY=... LIMIT=100 npx ts-node backend/scripts/backfill-hero-images.ts
//   UNSPLASH_ACCESS_KEY=... DRY_RUN=0 npx ts-node backend/scripts/backfill-hero-images.ts
//
// What's left for the founder (per roadmap):
//   - DALL-E fallback for the long tail Unsplash can't cover (paid +
//     image-policy decision).
//   - Hand-curate the top 50 hero recipes (the carousel covers + the
//     onboarding/promo screens).

import { prisma } from '../src/lib/prisma';
import { imageService } from '../src/services/imageService';

const DRY_RUN = process.env.DRY_RUN !== '0';
const LIMIT = Number(process.env.LIMIT ?? '50');
const RATE_DELAY_MS = Number(process.env.RATE_DELAY_MS ?? '1100'); // Unsplash dev tier: 50 req/hour

const BAR = '━'.repeat(72);

interface Counters {
  examined: number;
  hit: number;
  miss: number;
  errors: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  console.log(`\n▶ Tier U hero-image backfill — LIMIT=${LIMIT}, DRY_RUN=${DRY_RUN}\n${BAR}\n`);

  if (!process.env.UNSPLASH_ACCESS_KEY) {
    console.error(
      '⚠️  UNSPLASH_ACCESS_KEY not set. Get one at https://unsplash.com/developers.',
    );
    process.exit(1);
  }

  const recipes = await prisma.recipe.findMany({
    where: { imageUrl: null },
    select: { id: true, title: true, cuisine: true },
    take: LIMIT,
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Recipes without imageUrl: ${recipes.length}\n`);

  const counters: Counters = { examined: 0, hit: 0, miss: 0, errors: 0 };

  for (const recipe of recipes) {
    counters.examined += 1;
    process.stdout.write(
      `  [${String(counters.examined).padStart(4)}/${recipes.length}] ${recipe.title.padEnd(60).slice(0, 60)} `,
    );

    try {
      const photo = await imageService.searchFoodImage({
        recipeName: recipe.title,
        cuisine: recipe.cuisine ?? undefined,
      });

      if (!photo) {
        counters.miss += 1;
        process.stdout.write('· no match\n');
      } else {
        counters.hit += 1;
        if (DRY_RUN) {
          process.stdout.write(`· would set → ${photo.url.slice(0, 40)}…\n`);
        } else {
          await prisma.recipe.update({
            where: { id: recipe.id },
            data: { imageUrl: photo.url },
          });
          process.stdout.write(`✓ ${photo.url.slice(0, 40)}…\n`);
        }
      }
    } catch (err) {
      counters.errors += 1;
      process.stdout.write(
        `✗ ${err instanceof Error ? err.message.slice(0, 40) : 'error'}\n`,
      );
    }

    // Rate-limit pacing — Unsplash dev tier is 50 req/hr.
    if (counters.examined < recipes.length) {
      await sleep(RATE_DELAY_MS);
    }
  }

  console.log(`\n${BAR}`);
  console.log(`Examined: ${counters.examined}`);
  console.log(`Hit:      ${counters.hit}`);
  console.log(`Miss:     ${counters.miss}`);
  console.log(`Errors:   ${counters.errors}`);
  console.log(
    DRY_RUN
      ? `\nDRY_RUN was set. To persist, re-run with DRY_RUN=0.`
      : `\nPersisted ${counters.hit} hero images.`,
  );
}

main()
  .then(() => prisma.$disconnect().then(() => process.exit(0)))
  .catch((err) => {
    console.error('backfill-hero-images failed:', err);
    void prisma.$disconnect().then(() => process.exit(1));
  });
