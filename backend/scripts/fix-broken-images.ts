/**
 * Re-fetch images for recipes whose imageUrl is on the deprecated
 * source.unsplash.com endpoint (returns nothing now).
 *
 * Usage:
 *   npx ts-node scripts/fix-broken-images.ts            # all
 *   npx ts-node scripts/fix-broken-images.ts --limit 10 # small batch
 *   npx ts-node scripts/fix-broken-images.ts --dry-run  # preview queries only
 */

import { PrismaClient } from '@prisma/client';
import { imageService } from '../src/services/imageService';

const prisma = new PrismaClient();

interface Args {
  limit?: number;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    if (a === '--limit') args.limit = Number(argv[++i]);
  }
  return args;
}

async function main(): Promise<void> {
  const { limit, dryRun } = parseArgs(process.argv.slice(2));

  const broken = await prisma.recipe.findMany({
    where: { imageUrl: { contains: 'source.unsplash.com' } },
    select: { id: true, title: true, cuisine: true, imageUrl: true },
    take: limit,
  });

  console.log(`\n🔧 Fixing ${broken.length} recipes with dead source.unsplash.com URLs`);
  if (dryRun) console.log('   (dry-run — no DB writes)\n');

  let updated = 0;
  let failed = 0;

  for (const r of broken) {
    process.stdout.write(`\n🍽️  ${r.title}\n   cuisine: ${r.cuisine || '(none)'}\n`);

    if (dryRun) {
      updated++;
      continue;
    }

    const photo = await imageService.searchFoodImage({
      recipeName: r.title,
      cuisine: r.cuisine || undefined,
    });

    if (!photo || !photo.url.includes('images.unsplash.com')) {
      console.log(`   ❌ no working image found`);
      failed++;
      continue;
    }

    await prisma.recipe.update({
      where: { id: r.id },
      data: {
        imageUrl: photo.url,
        unsplashPhotoId: photo.id,
        unsplashDownloadLocation: photo.downloadLocation,
        unsplashPhotographerName: photo.photographer.name,
        unsplashPhotographerUsername: photo.photographer.username,
        unsplashAttributionText: photo.attributionText,
      },
    });

    if (photo.downloadLocation) {
      await imageService.triggerDownload(photo.downloadLocation).catch(() => {});
    }

    console.log(`   ✅ ${photo.photographer.name}`);
    updated++;

    await new Promise((res) => setTimeout(res, 1100));
  }

  console.log(`\n📊 Summary:\n   ✅ Updated: ${updated}\n   ❌ Failed:  ${failed}\n`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
