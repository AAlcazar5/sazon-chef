// backend/scripts/backfillEmailLookupHash.ts
// ROADMAP 4.0 U14 — One-time backfill of `emailLookupHash` for existing users.
//
// Run after the schema migration adds the column:
//   ts-node backend/scripts/backfillEmailLookupHash.ts
//
// Idempotent: skips users that already have a hash, decrypts encrypted
// emails to compute the hash, treats unencrypted legacy emails the same.
// Logs progress + a final summary. Safe to re-run.

import { prisma } from '../src/lib/prisma';
import { decrypt } from '../src/utils/encryption';
import { hashEmailForLookup } from '../src/utils/emailLookup';
import { logger } from '../src/utils/logger';

interface Counts {
  total: number;
  alreadyHashed: number;
  hashed: number;
  failed: number;
}

async function main(): Promise<void> {
  const counts: Counts = { total: 0, alreadyHashed: 0, hashed: 0, failed: 0 };

  // Stream in batches to avoid loading the whole table.
  const PAGE = 500;
  let cursor: string | undefined;

  while (true) {
    const batch = await prisma.user.findMany({
      where: { emailLookupHash: null },
      take: PAGE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        email: true,
        emailEncrypted: true,
        providerEmail: true,
        emailLookupHash: true,
      },
    });
    if (batch.length === 0) break;

    for (const u of batch) {
      counts.total++;
      if (u.emailLookupHash) {
        counts.alreadyHashed++;
        continue;
      }
      let plainEmail: string | null = null;
      try {
        plainEmail = u.emailEncrypted ? decrypt(u.email) : u.email;
      } catch (err) {
        // Encrypted email couldn't be decrypted (likely a key rotation
        // artifact). Fall back to providerEmail if available — better
        // partial coverage than zero.
        if (u.providerEmail) {
          plainEmail = u.providerEmail;
        } else {
          counts.failed++;
          logger.warn({ userId: u.id, err }, 'backfillEmailLookupHash: decrypt failed and no providerEmail fallback');
          continue;
        }
      }

      if (!plainEmail) {
        counts.failed++;
        continue;
      }

      const hash = hashEmailForLookup(plainEmail);
      try {
        await prisma.user.update({
          where: { id: u.id },
          data: { emailLookupHash: hash },
        });
        counts.hashed++;
      } catch (err) {
        counts.failed++;
        logger.warn({ userId: u.id, err }, 'backfillEmailLookupHash: update failed (possible hash collision?)');
      }
    }

    cursor = batch[batch.length - 1].id;
    logger.info({ counts }, 'backfillEmailLookupHash progress');
  }

  logger.info({ counts }, 'backfillEmailLookupHash complete');
  console.log('Done. Summary:', counts);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    logger.error({ err }, 'backfillEmailLookupHash failed');
    await prisma.$disconnect();
    process.exit(1);
  });
