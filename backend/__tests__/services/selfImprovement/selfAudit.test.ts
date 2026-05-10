// Tier M6 — quarterly self-audit tests.

import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  runSelfAudit,
  countMeasuredProposals,
  findActivePromptVersion,
  buildAuditPrompt,
  renderFallbackCandidate,
  MIN_MEASURED_PROPOSALS,
} from '../../../src/services/selfImprovement/selfAuditService';

let tmpRoot: string;

const LEDGER_HEADER = [
  '# Proposals — Outcomes Ledger',
  '',
  '> Append-only training data.',
  '',
  '| Date shipped | Proposal ID | Slug | Result | Tag |',
  '| --- | --- | --- | --- | --- |',
].join('\n');

function makeLedgerWith(rowCount: number): string {
  const rows = Array.from({ length: rowCount }, (_, i) => {
    const day = String((i % 28) + 1).padStart(2, '0');
    return `| 2026-04-${day} | P-${String(i + 1).padStart(3, '0')} | slug-${i} | +12% | win |`;
  });
  return [LEDGER_HEADER, ...rows].join('\n') + '\n';
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'self-audit-'));
  fs.mkdirSync(path.join(tmpRoot, 'learnings'), { recursive: true });
  delete process.env.SELF_IMPROVEMENT_ENGINE_ENABLED;
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('M6 / countMeasuredProposals', () => {
  it('counts only rows starting with `| 20YY-` date column', () => {
    const ledger = makeLedgerWith(5);
    expect(countMeasuredProposals(ledger)).toBe(5);
  });

  it('returns 0 on header-only ledger', () => {
    expect(countMeasuredProposals(LEDGER_HEADER)).toBe(0);
  });

  it('returns 0 on empty input', () => {
    expect(countMeasuredProposals('')).toBe(0);
  });

  it('ignores comment lines and section headers', () => {
    const ledger = [
      LEDGER_HEADER,
      '> some comment',
      '## Section',
      '| 2026-01-01 | P-001 | slug | +14% | win |',
    ].join('\n');
    expect(countMeasuredProposals(ledger)).toBe(1);
  });
});

describe('M6 / findActivePromptVersion', () => {
  it('returns the highest-numbered synthesis-prompt-vN.md', () => {
    fs.writeFileSync(path.join(tmpRoot, 'synthesis-prompt-v1.md'), 'v1');
    fs.writeFileSync(path.join(tmpRoot, 'synthesis-prompt-v3.md'), 'v3');
    fs.writeFileSync(path.join(tmpRoot, 'synthesis-prompt-v2.md'), 'v2');
    const active = findActivePromptVersion(tmpRoot);
    expect(active?.version).toBe(3);
    expect(active?.path).toBe(path.join(tmpRoot, 'synthesis-prompt-v3.md'));
  });

  it('ignores -candidate.md files', () => {
    fs.writeFileSync(path.join(tmpRoot, 'synthesis-prompt-v1.md'), 'v1');
    fs.writeFileSync(
      path.join(tmpRoot, 'synthesis-prompt-v2-candidate.md'),
      'v2 candidate',
    );
    const active = findActivePromptVersion(tmpRoot);
    expect(active?.version).toBe(1);
  });

  it('returns null when no prompt file exists', () => {
    expect(findActivePromptVersion(tmpRoot)).toBeNull();
  });
});

describe('M6 / runSelfAudit', () => {
  it('refuses to run with < MIN_MEASURED_PROPOSALS rows in the ledger', async () => {
    const ledger = makeLedgerWith(MIN_MEASURED_PROPOSALS - 1);
    fs.writeFileSync(path.join(tmpRoot, 'learnings', 'proposals-outcomes.md'), ledger);
    fs.writeFileSync(path.join(tmpRoot, 'synthesis-prompt-v1.md'), 'active');

    const callLLM = jest.fn();
    const result = await runSelfAudit({
      contextRoot: tmpRoot,
      callLLM: callLLM as any,
    });

    expect(result.status).toBe('insufficient-signal');
    expect(result.measuredProposals).toBe(MIN_MEASURED_PROPOSALS - 1);
    expect(callLLM).not.toHaveBeenCalled();
    // No candidate file produced.
    const files = fs.readdirSync(tmpRoot).filter((f) => f.includes('candidate'));
    expect(files).toEqual([]);
  });

  it('produces a v(N+1) candidate file (never overwrites vN) when ledger meets the gate', async () => {
    const ledger = makeLedgerWith(MIN_MEASURED_PROPOSALS);
    fs.writeFileSync(path.join(tmpRoot, 'learnings', 'proposals-outcomes.md'), ledger);
    fs.writeFileSync(path.join(tmpRoot, 'synthesis-prompt-v1.md'), 'ACTIVE_V1_CONTENT');

    const callLLM = jest.fn(async () => '# Candidate v2\n\nrationale\n\nprompt body\n');
    const result = await runSelfAudit({
      contextRoot: tmpRoot,
      callLLM: callLLM as any,
      now: () => new Date('2026-05-10T00:00:00Z'),
    });

    expect(result.status).toBe('ok');
    expect(result.activeVersion).toBe(1);
    expect(result.candidateVersion).toBe(2);
    expect(result.candidatePath).toBe(
      path.join(tmpRoot, 'synthesis-prompt-v2-candidate.md'),
    );
    expect(callLLM).toHaveBeenCalledTimes(1);

    // Critical: vN is untouched.
    const v1 = fs.readFileSync(path.join(tmpRoot, 'synthesis-prompt-v1.md'), 'utf-8');
    expect(v1).toBe('ACTIVE_V1_CONTENT');
  });

  it('writes -candidate.md, not vN+1.md — auto-promotion is impossible without explicit rename', async () => {
    const ledger = makeLedgerWith(MIN_MEASURED_PROPOSALS);
    fs.writeFileSync(path.join(tmpRoot, 'learnings', 'proposals-outcomes.md'), ledger);
    fs.writeFileSync(path.join(tmpRoot, 'synthesis-prompt-v1.md'), 'v1');

    await runSelfAudit({
      contextRoot: tmpRoot,
      callLLM: async () => 'draft',
    });

    // The "promoted" filename must NOT exist after the audit run.
    expect(fs.existsSync(path.join(tmpRoot, 'synthesis-prompt-v2.md'))).toBe(false);
    expect(fs.existsSync(path.join(tmpRoot, 'synthesis-prompt-v2-candidate.md'))).toBe(true);

    // findActivePromptVersion still returns v1 (candidate is ignored).
    expect(findActivePromptVersion(tmpRoot)?.version).toBe(1);
  });

  it('rationale section is non-empty in the LLM output (we trust the LLM but assert the prompt requested it)', async () => {
    const ledger = makeLedgerWith(MIN_MEASURED_PROPOSALS);
    fs.writeFileSync(path.join(tmpRoot, 'learnings', 'proposals-outcomes.md'), ledger);
    fs.writeFileSync(path.join(tmpRoot, 'synthesis-prompt-v1.md'), 'v1 prompt');

    let capturedPrompt = '';
    const callLLM = jest.fn(async (prompt: string) => {
      capturedPrompt = prompt;
      return 'returned-content';
    });
    await runSelfAudit({ contextRoot: tmpRoot, callLLM: callLLM as any });

    // The audit prompt explicitly asks for a Rationale section.
    expect(capturedPrompt).toMatch(/## Rationale/);
    expect(capturedPrompt).toMatch(/v1 prompt/);
  });

  it('falls back to a non-LLM candidate when callLLM is not provided', async () => {
    const ledger = makeLedgerWith(MIN_MEASURED_PROPOSALS);
    fs.writeFileSync(path.join(tmpRoot, 'learnings', 'proposals-outcomes.md'), ledger);
    fs.writeFileSync(path.join(tmpRoot, 'synthesis-prompt-v1.md'), 'ACTIVE');

    const result = await runSelfAudit({
      contextRoot: tmpRoot,
      now: () => new Date('2026-05-10'),
    });
    expect(result.status).toBe('ok');
    const body = fs.readFileSync(result.candidatePath as string, 'utf-8');
    expect(body).toMatch(/source: fallback/);
    expect(body).toMatch(/version: 2/);
    expect(body).toMatch(/ACTIVE/); // active prompt body preserved verbatim
  });

  it('returns no-active-prompt when no synthesis-prompt-vN.md is present', async () => {
    const ledger = makeLedgerWith(MIN_MEASURED_PROPOSALS);
    fs.writeFileSync(path.join(tmpRoot, 'learnings', 'proposals-outcomes.md'), ledger);

    const result = await runSelfAudit({
      contextRoot: tmpRoot,
      callLLM: async () => 'x',
    });
    expect(result.status).toBe('no-active-prompt');
  });

  it('respects the kill switch — SELF_IMPROVEMENT_ENGINE_ENABLED=false short-circuits before any FS read', async () => {
    process.env.SELF_IMPROVEMENT_ENGINE_ENABLED = 'false';
    const callLLM = jest.fn();

    const result = await runSelfAudit({
      contextRoot: tmpRoot,
      callLLM: callLLM as any,
    });

    expect(result.status).toBe('kill-switch');
    expect(callLLM).not.toHaveBeenCalled();
  });

  it('returns error status (no candidate written) when the LLM throws', async () => {
    const ledger = makeLedgerWith(MIN_MEASURED_PROPOSALS);
    fs.writeFileSync(path.join(tmpRoot, 'learnings', 'proposals-outcomes.md'), ledger);
    fs.writeFileSync(path.join(tmpRoot, 'synthesis-prompt-v1.md'), 'v1');

    const result = await runSelfAudit({
      contextRoot: tmpRoot,
      callLLM: async () => {
        throw new Error('upstream timeout');
      },
    });

    expect(result.status).toBe('error');
    expect(result.reason).toBe('llm-call-failed');
    // No partial candidate written.
    expect(fs.existsSync(path.join(tmpRoot, 'synthesis-prompt-v2-candidate.md'))).toBe(false);
  });
});

describe('M6 / buildAuditPrompt + renderFallbackCandidate', () => {
  it('buildAuditPrompt embeds ledger + active prompt + version number', () => {
    const out = buildAuditPrompt({
      ledger: 'LEDGER_BODY',
      activePrompt: 'ACTIVE_BODY',
      activeVersion: 3,
    });
    expect(out).toMatch(/LEDGER_BODY/);
    expect(out).toMatch(/ACTIVE_BODY/);
    expect(out).toMatch(/v4/); // candidate version
    expect(out).toMatch(/version: 4/);
  });

  it('renderFallbackCandidate produces frontmatter + rationale + prompt', () => {
    const out = renderFallbackCandidate({
      activeVersion: 1,
      activePrompt: 'ACTIVE_PROMPT_BODY',
      measuredProposals: 9,
      now: new Date('2026-05-10'),
    });
    expect(out).toMatch(/^---/);
    expect(out).toMatch(/version: 2/);
    expect(out).toMatch(/status: candidate/);
    expect(out).toMatch(/source: fallback/);
    expect(out).toMatch(/9 measured proposals/);
    expect(out).toMatch(/ACTIVE_PROMPT_BODY/);
  });
});
