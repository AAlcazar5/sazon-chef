// backend/__tests__/services/selfImprovement/synthesis.test.ts
// Tier M2 — weekly synthesis routine. Validates LLM transport adapter,
// banned-vocab filter, ≤10 proposal cap, kill switch, and output schema.

import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  buildLLMPrompt,
  filterBannedAndCap,
  parseLLMProposals,
  Proposal,
  renderProposalsMarkdown,
  runWeeklySynthesis,
  validateProposal,
  violatesBannedVocab,
} from '../../../src/services/selfImprovement/synthesisService';

function tmpRoot(): { contextRoot: string; plansRoot: string; outputRoot: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sazon-synth-'));
  const contextRoot = path.join(root, '.context');
  const plansRoot = path.join(root, 'plans');
  const outputRoot = path.join(contextRoot, 'proposals');
  fs.mkdirSync(path.join(contextRoot, 'observations', 'inspiration'), { recursive: true });
  fs.mkdirSync(path.join(contextRoot, 'decisions', 'accepted'), { recursive: true });
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.mkdirSync(plansRoot, { recursive: true });
  fs.writeFileSync(
    path.join(contextRoot, 'synthesis-prompt-v1.md'),
    '# Synthesis prompt v1\nYou are the synthesis layer.',
  );
  fs.writeFileSync(path.join(plansRoot, 'persona.md'), 'Persona text.');
  fs.writeFileSync(path.join(plansRoot, 'brand-voice.md'), 'Brand voice text.');
  fs.writeFileSync(path.join(plansRoot, 'DELETED_FEATURES.md'), '_(empty)_');
  fs.writeFileSync(
    path.join(contextRoot, 'observations', 'inspiration', '2026-05-05.md'),
    '## Spotify Wrapped\n\nAnnual ritual.',
  );
  return { contextRoot, plansRoot, outputRoot };
}

const validProposal: Proposal = {
  id: 'P-006',
  slug: 'cuisine-discovery-banner',
  source: 'observations/inspiration/2026-05-05.md',
  pattern: 'Discovery rituals create return rates.',
  proposedChange: 'Show a discovery banner on Sunday morning.',
  personaFit: 5,
  voiceFit: 5,
  effort: 'M',
  impact: 'med',
  targetMetric: 'home.cuisine_discovery_clicked',
  openQuestion: 'Does the banner compete with hero copy?',
};

describe('M2 — banned vocab filter', () => {
  it('flags banned terms', () => {
    expect(violatesBannedVocab('Help users cut weight quickly')).toBe(true);
    expect(violatesBannedVocab('Macro-friendly recipes for the week')).toBe(true);
    expect(violatesBannedVocab('Cookbook redesign')).toBe(true);
  });
  it('passes clean copy', () => {
    expect(violatesBannedVocab('Real-ingredient recipes from around the world')).toBe(false);
  });
});

describe('M2 — proposal validation', () => {
  it('valid proposal passes', () => {
    expect(validateProposal(validProposal)).toBe(true);
  });
  it('rejects out-of-range fit scores', () => {
    expect(validateProposal({ ...validProposal, personaFit: 7 })).toBe(false);
  });
  it('rejects missing fields', () => {
    const broken: Partial<Proposal> = { ...validProposal };
    delete broken.openQuestion;
    expect(validateProposal(broken)).toBe(false);
  });
});

describe('M2 — parseLLMProposals', () => {
  it('parses a clean JSON array', () => {
    const raw = JSON.stringify([validProposal, { ...validProposal, id: 'P-007' }]);
    const parsed = parseLLMProposals(raw);
    expect(parsed).toHaveLength(2);
  });
  it('strips markdown code fences', () => {
    const raw = '```json\n' + JSON.stringify([validProposal]) + '\n```';
    expect(parseLLMProposals(raw)).toHaveLength(1);
  });
  it('drops malformed proposals silently', () => {
    const raw = JSON.stringify([validProposal, { foo: 'bar' }]);
    expect(parseLLMProposals(raw)).toHaveLength(1);
  });
  it('returns empty on invalid JSON', () => {
    expect(parseLLMProposals('not json')).toEqual([]);
  });
});

describe('M2 — filterBannedAndCap', () => {
  it('removes proposals containing banned vocab', () => {
    const dirty = { ...validProposal, id: 'P-009', proposedChange: 'Cut calories aggressively.' };
    const result = filterBannedAndCap([validProposal, dirty]);
    expect(result.kept).toHaveLength(1);
    expect(result.filtered).toBe(1);
  });

  it('caps output at 10', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      ...validProposal,
      id: `P-${100 + i}`,
    }));
    const result = filterBannedAndCap(many);
    expect(result.kept).toHaveLength(10);
  });
});

describe('M2 — buildLLMPrompt', () => {
  it('includes all five input sections', () => {
    const prompt = buildLLMPrompt({
      observations: 'OBS',
      persona: 'PERSONA',
      brandVoice: 'VOICE',
      deletedFeatures: 'DEL',
      recentDecisions: 'DEC',
      promptVersion: 'v1',
      prompt: 'SYS',
    });
    for (const fragment of ['OBS', 'PERSONA', 'VOICE', 'DEL', 'DEC', 'SYS']) {
      expect(prompt).toContain(fragment);
    }
  });
});

describe('M2 — renderProposalsMarkdown', () => {
  it('emits valid frontmatter + per-proposal sections', () => {
    const md = renderProposalsMarkdown([validProposal], 'v1', new Date('2026-05-10T00:00:00Z'));
    expect(md).toMatch(/^---/);
    expect(md).toMatch(/synthesis_prompt_version: v1/);
    expect(md).toMatch(/proposal_count: 1/);
    expect(md).toMatch(/## P-006 — cuisine-discovery-banner/);
    expect(md).toMatch(/\*\*Source:\*\*/);
    expect(md).toMatch(/\*\*Open question:\*\*/);
  });
});

describe('M2 — runWeeklySynthesis', () => {
  beforeEach(() => {
    delete process.env.SELF_IMPROVEMENT_ENGINE_ENABLED;
  });

  it('kill-switch short-circuits before LLM call', async () => {
    process.env.SELF_IMPROVEMENT_ENGINE_ENABLED = 'false';
    const callLLM = jest.fn();
    const result = await runWeeklySynthesis({ callLLM });
    expect(result.status).toBe('kill-switch');
    expect(callLLM).not.toHaveBeenCalled();
  });

  it('writes a proposals file when LLM returns valid JSON', async () => {
    const { contextRoot, plansRoot, outputRoot } = tmpRoot();
    const callLLM = jest.fn(async () => JSON.stringify([validProposal]));
    const result = await runWeeklySynthesis({
      callLLM,
      now: () => new Date('2026-05-10T00:00:00Z'),
      contextRoot,
      plansRoot,
      outputRoot,
    });
    expect(result.status).toBe('ok');
    expect(result.proposalsWritten).toBe(1);
    expect(fs.existsSync(result.outputPath!)).toBe(true);
  });

  it('caps proposals at 10 and reports filtered count', async () => {
    const { contextRoot, plansRoot, outputRoot } = tmpRoot();
    const many = [
      { ...validProposal, id: 'P-200', proposedChange: 'cut and bulk routine' },
      ...Array.from({ length: 12 }, (_, i) => ({ ...validProposal, id: `P-${100 + i}` })),
    ];
    const callLLM = jest.fn(async () => JSON.stringify(many));
    const result = await runWeeklySynthesis({
      callLLM,
      now: () => new Date('2026-05-10T00:00:00Z'),
      contextRoot,
      plansRoot,
      outputRoot,
    });
    expect(result.proposalsWritten).toBe(10);
    expect(result.filteredOut).toBe(1);
  });

  it('returns no-observations status when window is empty', async () => {
    const { contextRoot, plansRoot, outputRoot } = tmpRoot();
    // wipe observations
    const obsFile = path.join(contextRoot, 'observations', 'inspiration', '2026-05-05.md');
    fs.unlinkSync(obsFile);
    const callLLM = jest.fn();
    const result = await runWeeklySynthesis({
      callLLM,
      now: () => new Date('2026-05-10T00:00:00Z'),
      contextRoot,
      plansRoot,
      outputRoot,
    });
    expect(result.status).toBe('no-observations');
    expect(callLLM).not.toHaveBeenCalled();
  });

  it('returns error status when LLM throws', async () => {
    const { contextRoot, plansRoot, outputRoot } = tmpRoot();
    const callLLM = jest.fn(async () => {
      throw new Error('rate limit');
    });
    const result = await runWeeklySynthesis({
      callLLM,
      now: () => new Date('2026-05-10T00:00:00Z'),
      contextRoot,
      plansRoot,
      outputRoot,
    });
    expect(result.status).toBe('error');
    expect(result.proposalsWritten).toBe(0);
  });
});
