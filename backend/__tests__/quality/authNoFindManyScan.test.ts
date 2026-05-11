// U14: authController must not findMany on user.
//
// Pre-U14: every login / register / forgot-password / change-password did
// `prisma.user.findMany({ where: { emailEncrypted: true } })` plus a
// decrypt-and-compare loop — O(N) scan that hits a scaling cliff. U14
// switched to `findUnique({ where: { emailLookupHash } })`. This ratchet
// prevents a regression: no auth file may call `findMany` on the user
// model. Any new auth lookup goes through the hash.

import { readFileSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');

const FILES = [
  'src/modules/auth/authController.ts',
  'src/modules/auth/socialAuthController.ts',
];

// Matches `prisma.user.findMany(` and `tx.user.findMany(` and variants.
// Comment lines (`// ...`) are stripped before scanning so the ratchet's
// own historical references don't trip it.
const FINDMANY_RE = /\b(?:prisma|tx)\.user\.findMany\s*\(/;

function readSource(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8')
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n');
}

describe('U14: auth files do not findMany on user', () => {
  it.each(FILES)('%s — no prisma.user.findMany call', (file) => {
    const src = readSource(file);
    if (FINDMANY_RE.test(src)) {
      throw new Error(
        `${file} contains a prisma.user.findMany call. ` +
          'Use hashEmailForLookup() + findUnique({ where: { emailLookupHash } }) instead.',
      );
    }
    expect(FINDMANY_RE.test(src)).toBe(false);
  });

  it('both files import hashEmailForLookup from @/utils/emailLookup', () => {
    for (const f of FILES) {
      const src = readFileSync(path.join(ROOT, f), 'utf8');
      expect(src).toMatch(/from\s+['"]@\/utils\/emailLookup['"]/);
      expect(src).toMatch(/\bhashEmailForLookup\b/);
    }
  });
});
