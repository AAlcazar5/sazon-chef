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

  // The doc is the canonical post-launch roadmap, not just the U20/U25/U26
  // freeze. Pin coverage of every other roadmap item gated on launch /
  // production data so a future cleanup pass can't drop a section
  // without surfacing the intent in code review.
  it('the doc covers every post-launch-gated roadmap item', () => {
    const doc = readFileSync(
      path.join(ROOT, 'docs', 'post-launch-upgrades.md'),
      'utf8',
    );
    // Tier U items — day-0 / week-1 / month-1 activations
    expect(doc).toMatch(/\bM4\b/); // post-launch feeds activate on launch
    expect(doc).toMatch(/\bQ2\b/); // query-plan audit
    expect(doc).toMatch(/\bQ4\b/); // SLO instrumentation
    expect(doc).toMatch(/\bQ9\b/); // cost telemetry
    expect(doc).toMatch(/\bHX1\.5\b/); // ablation wiring
    // Validation cascade
    expect(doc).toMatch(/\bT4\.2\b/); // dogfood
    expect(doc).toMatch(/\bT5\.1\b/);
    expect(doc).toMatch(/\bT5\.2\b/);
    expect(doc).toMatch(/\bWK12\.1\b/);
    expect(doc).toMatch(/\bR14\b/); // retire 70/30 scorer
    // Strategic decisions
    expect(doc).toMatch(/\bM6\b/); // quarterly self-audit
    expect(doc).toMatch(/\bM7\b/); // Mobbin decision
    // Volume-gated
    expect(doc).toMatch(/\bTB5\.1\b/);
    expect(doc).toMatch(/\bTB5\.2\b/);
    // Calendar
    expect(doc).toMatch(/\bJ13\b/); // Sazon Wrapped
    // Engagement refinements
    expect(doc).toMatch(/\bF1\b/);
    expect(doc).toMatch(/\bF2\b/);
    expect(doc).toMatch(/\bF3\b/);
    expect(doc).toMatch(/\bF7\b/);
  });

  it('the doc has a timeline-overview table so launch-day readers can scan trigger windows', () => {
    const doc = readFileSync(
      path.join(ROOT, 'docs', 'post-launch-upgrades.md'),
      'utf8',
    );
    expect(doc).toMatch(/Timeline overview/i);
    // Standard windows should each appear at least once
    expect(doc).toMatch(/Day 0/i);
    expect(doc).toMatch(/Week 1/i);
    expect(doc).toMatch(/Month 1/i);
  });
});
