// U20 + U25 + U26: Post-launch upgrade freeze ratchet.
//
// Three high-blast-radius upgrades (Anthropic SDK 0.95, Prisma 7,
// production-driven index audit) are deliberately deferred to
// post-launch — see docs/post-launch-upgrades.md for the rationale +
// reversal triggers + upgrade playbooks.
//
// This ratchet PINS the current versions. If anyone bumps them without
// updating the deferral doc, the test fails — forcing the reversal
// rationale to be written before the upgrade lands.

import { readFileSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const PKG = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

// Pinned at 2026-05-11 (Tier U U20 / U25 / U26).
const FROZEN: Record<string, string> = {
  '@anthropic-ai/sdk': '^0.68.0',
  '@prisma/client': '^5.22.0',
  prisma: '^5.7.1',
};

describe('U20 + U25 + U26: post-launch upgrade freeze', () => {
  it.each(Object.entries(FROZEN))(
    'package.json pins %s at %s',
    (dep, expected) => {
      const actual =
        PKG.dependencies?.[dep] ?? PKG.devDependencies?.[dep] ?? null;
      if (actual !== expected) {
        throw new Error(
          `${dep} drifted: package.json says ${actual}, freeze expects ${expected}. ` +
            'Update docs/post-launch-upgrades.md (record the reversal rationale + ' +
            'reversal trigger) before bumping this version.',
        );
      }
      expect(actual).toBe(expected);
    },
  );

  it('the post-launch upgrade doc exists', () => {
    const doc = path.join(ROOT, 'docs', 'post-launch-upgrades.md');
    expect(() => readFileSync(doc, 'utf8')).not.toThrow();
  });

  it('the upgrade doc covers all three deferred items', () => {
    const doc = readFileSync(
      path.join(ROOT, 'docs', 'post-launch-upgrades.md'),
      'utf8',
    );
    expect(doc).toMatch(/Anthropic SDK/i);
    expect(doc).toMatch(/Prisma index audit/i);
    expect(doc).toMatch(/Prisma 5.*→\s*7/);
    expect(doc).toMatch(/Reversal trigger/i);
  });
});
