// backend/__tests__/scripts/triageProposal.test.ts
// Tier M3 — proposal triage helper.

import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  appendDeletedFeature,
  appendTierCandidate,
  buildDecisionFile,
  extractProposalBlock,
  triageProposal,
} from '../../src/services/selfImprovement/triageService';

const SAMPLE_PROPOSALS = `---
date: 2026-05-10
synthesis_prompt_version: v1
proposal_count: 2
---

# Proposals — Week of 2026-05-10

## P-006 — cuisine-discovery-banner

**Source:** observations/inspiration/2026-05-08.md
**Pattern observed:** Discovery rituals create return rates.
**Proposed change:** Show a discovery banner on Sunday morning.
**Persona fit (1–5):** 5
**Voice fit (1–5):** 5
**Estimated effort:** M
**Expected impact:** medium — target metric \`home.cuisine_discovery_clicked\`
**Open question:** Does the banner compete with hero copy?

---

## P-007 — quick-tracker-widget

**Source:** observations/competitor-releases/2026-05-08.md
**Pattern observed:** Yummly added a tracking widget.
**Proposed change:** Add a daily tracking widget on home.
**Persona fit (1–5):** 2
**Voice fit (1–5):** 1
**Estimated effort:** L
**Expected impact:** low — target metric \`tracker_widget_dismissed\`
**Open question:** Does this even fit the persona?

---
`;

function tmpEnv() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sazon-triage-'));
  const contextRoot = path.join(root, '.context');
  const plansRoot = path.join(root, 'plans');
  const proposalsDir = path.join(contextRoot, 'proposals');
  fs.mkdirSync(proposalsDir, { recursive: true });
  fs.mkdirSync(plansRoot, { recursive: true });
  const proposalsFile = path.join(proposalsDir, '2026-05-10.md');
  fs.writeFileSync(proposalsFile, SAMPLE_PROPOSALS);
  return { contextRoot, plansRoot, proposalsFile };
}

describe('M3 — extractProposalBlock', () => {
  it('extracts the named proposal block', () => {
    const block = extractProposalBlock(SAMPLE_PROPOSALS, 'P-006');
    expect(block).not.toBeNull();
    expect(block!.slug).toBe('cuisine-discovery-banner');
    expect(block!.body).toMatch(/Discovery rituals/);
  });

  it('returns null when the proposal is missing', () => {
    expect(extractProposalBlock(SAMPLE_PROPOSALS, 'P-999')).toBeNull();
  });
});

describe('M3 — buildDecisionFile', () => {
  it('preserves frontmatter and body', () => {
    const md = buildDecisionFile(
      { id: 'P-006', slug: 'foo', body: 'Original body.' },
      {
        proposalsFile: 'x',
        proposalId: 'P-006',
        bucket: 'accepted',
        reason: 'impact',
        roadmapTier: 'J',
        roadmapId: 'J19',
        contextRoot: 'x',
        plansRoot: 'x',
      },
      new Date('2026-05-10T00:00:00Z'),
    );
    expect(md).toMatch(/proposal_id: P-006/);
    expect(md).toMatch(/status: accepted/);
    expect(md).toMatch(/reason: impact/);
    expect(md).toMatch(/roadmap_tier: J/);
    expect(md).toMatch(/Original body\./);
  });

  it('includes revisit_date for deferred', () => {
    const md = buildDecisionFile(
      { id: 'P-006', slug: 'foo', body: 'B.' },
      {
        proposalsFile: 'x',
        proposalId: 'P-006',
        bucket: 'deferred',
        reason: 'timing',
        revisitDate: '2026-09-01',
        contextRoot: 'x',
        plansRoot: 'x',
      },
      new Date('2026-05-10T00:00:00Z'),
    );
    expect(md).toMatch(/revisit_date: 2026-09-01/);
  });
});

describe('M3 — triageProposal', () => {
  it('moves an accepted proposal to decisions/accepted and appends to tier candidates', () => {
    const env = tmpEnv();
    const result = triageProposal({
      proposalsFile: env.proposalsFile,
      proposalId: 'P-006',
      bucket: 'accepted',
      reason: 'impact',
      roadmapTier: 'J',
      roadmapId: 'J19',
      rationale: 'High persona fit, supports Tier J.',
      contextRoot: env.contextRoot,
      plansRoot: env.plansRoot,
    });
    expect(result.status).toBe('ok');
    expect(result.decisionPath).toBeTruthy();
    expect(fs.existsSync(result.decisionPath!)).toBe(true);
    expect(result.candidateAppended).toBeTruthy();
    expect(fs.readFileSync(result.candidateAppended!, 'utf-8')).toMatch(/P-006/);
  });

  it('errors when deferred lacks revisit_date', () => {
    const env = tmpEnv();
    const result = triageProposal({
      proposalsFile: env.proposalsFile,
      proposalId: 'P-006',
      bucket: 'deferred',
      reason: 'timing',
      contextRoot: env.contextRoot,
      plansRoot: env.plansRoot,
    });
    expect(result.status).toBe('error');
    expect(result.reason).toMatch(/revisit/);
  });

  it('writes deferred decisions with revisit_date persisted', () => {
    const env = tmpEnv();
    const result = triageProposal({
      proposalsFile: env.proposalsFile,
      proposalId: 'P-006',
      bucket: 'deferred',
      reason: 'timing',
      revisitDate: '2026-09-01',
      contextRoot: env.contextRoot,
      plansRoot: env.plansRoot,
    });
    expect(result.status).toBe('ok');
    const body = fs.readFileSync(result.decisionPath!, 'utf-8');
    expect(body).toMatch(/revisit_date: 2026-09-01/);
    expect(body).toMatch(/status: deferred/);
  });

  it('rejected + patternFlagged appends to DELETED_FEATURES.md', () => {
    const env = tmpEnv();
    const result = triageProposal({
      proposalsFile: env.proposalsFile,
      proposalId: 'P-007',
      bucket: 'rejected',
      reason: 'persona',
      patternFlagged: true,
      contextRoot: env.contextRoot,
      plansRoot: env.plansRoot,
    });
    expect(result.deletedFeatureAppended).toBe(true);
    const deletedPath = path.join(env.plansRoot, 'DELETED_FEATURES.md');
    expect(fs.existsSync(deletedPath)).toBe(true);
    expect(fs.readFileSync(deletedPath, 'utf-8')).toMatch(/P-007/);
  });

  it('rejected without patternFlagged does NOT append to DELETED_FEATURES', () => {
    const env = tmpEnv();
    const result = triageProposal({
      proposalsFile: env.proposalsFile,
      proposalId: 'P-007',
      bucket: 'rejected',
      reason: 'effort',
      patternFlagged: false,
      contextRoot: env.contextRoot,
      plansRoot: env.plansRoot,
    });
    expect(result.deletedFeatureAppended).toBeFalsy();
    expect(fs.existsSync(path.join(env.plansRoot, 'DELETED_FEATURES.md'))).toBe(false);
  });

  it('errors cleanly when proposal id is missing', () => {
    const env = tmpEnv();
    const result = triageProposal({
      proposalsFile: env.proposalsFile,
      proposalId: 'P-999',
      bucket: 'accepted',
      reason: 'impact',
      contextRoot: env.contextRoot,
      plansRoot: env.plansRoot,
    });
    expect(result.status).toBe('error');
    expect(result.reason).toMatch(/not found/);
  });
});

describe('M3 — appendTierCandidate / appendDeletedFeature helpers', () => {
  it('creates the candidates file on first call and appends on the second', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sazon-cand-'));
    appendTierCandidate(root, { id: 'P-001', slug: 'a', body: '' }, 'J');
    appendTierCandidate(root, { id: 'P-002', slug: 'b', body: '' }, 'J');
    const fp = path.join(root, 'tier-J-candidates.md');
    const body = fs.readFileSync(fp, 'utf-8');
    expect(body).toMatch(/P-001/);
    expect(body).toMatch(/P-002/);
  });

  it('appendDeletedFeature creates and then appends', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sazon-del-'));
    appendDeletedFeature(root, { id: 'P-X', slug: 's1', body: 'b1' }, 'persona');
    appendDeletedFeature(root, { id: 'P-Y', slug: 's2', body: 'b2' }, 'voice');
    const body = fs.readFileSync(path.join(root, 'DELETED_FEATURES.md'), 'utf-8');
    expect(body).toMatch(/P-X/);
    expect(body).toMatch(/P-Y/);
  });
});
