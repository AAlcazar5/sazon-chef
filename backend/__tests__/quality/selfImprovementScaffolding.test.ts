// backend/__tests__/quality/selfImprovementScaffolding.test.ts
// Tier M0 — Manual loop scaffolding. Validates that the directory layout,
// synthesis prompt, outcomes ledger, and at least one proposal file exist
// with the required shape before any code automates the loop.

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../..');
const CONTEXT = path.join(ROOT, '.context');

const REQUIRED_DIRS = [
  'observations/competitor-releases',
  'observations/competitor-design',
  'observations/inspiration',
  'observations/reviews',
  'observations/metrics',
  'observations/recipe-gaps',
  'observations/trends',
  'observations/coach-patterns',
  'proposals',
  'decisions/accepted',
  'decisions/deferred',
  'decisions/needs-data',
  'decisions/rejected',
  'learnings',
];

const REQUIRED_PROPOSAL_FIELDS = [
  'Source',
  'Pattern observed',
  'Proposed change',
  'Persona fit',
  'Voice fit',
  // M0 spec uses "Effort" / "Impact"; the seed proposals adopt the slightly
  // longer "Estimated effort" / "Expected impact" headings. Accept either
  // (covered by the regex below).
  'effort',
  'impact',
  'Open question',
];

function exists(rel: string): boolean {
  return fs.existsSync(path.join(CONTEXT, rel));
}

describe('Tier M0 — Self-improvement engine scaffolding', () => {
  it('all required .context subdirectories exist', () => {
    const missing = REQUIRED_DIRS.filter((d) => !exists(d));
    expect(missing).toEqual([]);
  });

  it('synthesis-prompt-v1.md exists with required header', () => {
    const p = path.join(CONTEXT, 'synthesis-prompt-v1.md');
    expect(fs.existsSync(p)).toBe(true);
    const body = fs.readFileSync(p, 'utf-8');
    expect(body).toMatch(/^# Synthesis prompt — v1/m);
    expect(body).toMatch(/\*\*Version:\*\* v1/);
    expect(body).toMatch(/## SYSTEM/);
    expect(body).toMatch(/## OUTPUT REQUIREMENTS/);
  });

  it('learnings/proposals-outcomes.md exists with the schema header', () => {
    const p = path.join(CONTEXT, 'learnings', 'proposals-outcomes.md');
    expect(fs.existsSync(p)).toBe(true);
    const body = fs.readFileSync(p, 'utf-8');
    expect(body).toMatch(/Proposals — Outcomes Ledger/);
    expect(body).toMatch(/\*\*Schema:\*\*/);
    for (const tag of ['win', 'null', 'regression', 'inconclusive']) {
      expect(body).toMatch(new RegExp(`\\b${tag}\\b`));
    }
  });

  it('at least one proposal file exists with required fields', () => {
    const proposalsDir = path.join(CONTEXT, 'proposals');
    const files = fs
      .readdirSync(proposalsDir)
      .filter((f) => f.endsWith('.md'));
    expect(files.length).toBeGreaterThanOrEqual(1);

    const sample = fs.readFileSync(path.join(proposalsDir, files[0]), 'utf-8');
    // YAML frontmatter
    expect(sample).toMatch(/^---\n[\s\S]*?\n---/m);
    // At least one proposal block
    expect(sample).toMatch(/^## P-\d{3}/m);
    // Each required field appears at least once (case-insensitive on the
    // few headings that vary between "Effort" / "Estimated effort").
    for (const field of REQUIRED_PROPOSAL_FIELDS) {
      const re = new RegExp(`\\*\\*[^*]*${field}[^*]*\\*\\*`, 'i');
      expect(sample).toMatch(re);
    }
  });
});
