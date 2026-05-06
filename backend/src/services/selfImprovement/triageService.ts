// backend/src/services/selfImprovement/triageService.ts
// Tier M3 — proposal triage helper. Pulls a single proposal block out of
// `.context/proposals/<file>.md`, writes it to one of decisions/{accepted |
// deferred | needs-data | rejected}/, preserves frontmatter, and (on
// accepted) appends a one-liner to a tier-X-candidates.md scratch file
// for paste-in to roadmap. Pattern-flagged rejections append to
// plans/DELETED_FEATURES.md.

import fs from 'fs';
import path from 'path';

export type TriageBucket = 'accepted' | 'deferred' | 'needs-data' | 'rejected';
export type ReasonTag = 'persona' | 'voice' | 'effort' | 'impact' | 'timing' | 'data';

export interface TriageInput {
  proposalsFile: string; // absolute path to .context/proposals/<date>.md
  proposalId: string; // e.g. "P-006"
  bucket: TriageBucket;
  reason: ReasonTag;
  revisitDate?: string; // ISO date, required for deferred
  rationale?: string;
  roadmapTier?: string;
  roadmapId?: string;
  patternFlagged?: boolean; // if true, append to DELETED_FEATURES on rejection
  contextRoot: string;
  plansRoot: string;
}

export interface TriageResult {
  status: 'ok' | 'error';
  decisionPath: string | null;
  candidateAppended?: string;
  deletedFeatureAppended?: boolean;
  reason?: string;
}

interface ProposalBlock {
  id: string;
  slug: string;
  body: string;
}

export function extractProposalBlock(
  fileBody: string,
  proposalId: string,
): ProposalBlock | null {
  const re = new RegExp(
    `^## (${proposalId}) — (\\S+)([\\s\\S]*?)(?=^## P-\\d{3} —|^---\\s*$)`,
    'm',
  );
  const m = fileBody.match(re);
  if (!m) return null;
  return {
    id: m[1],
    slug: m[2].trim(),
    body: m[3].trim(),
  };
}

export function buildDecisionFile(
  block: ProposalBlock,
  input: TriageInput,
  now: Date,
): string {
  const today = now.toISOString().slice(0, 10);
  const lines = [
    `---`,
    `proposal_id: ${block.id}`,
    `slug: ${block.slug}`,
    `date_proposed: ${today}`,
    `date_decided: ${today}`,
    `status: ${input.bucket}`,
    `reason: ${input.reason}`,
  ];
  if (input.roadmapTier) lines.push(`roadmap_tier: ${input.roadmapTier}`);
  if (input.roadmapId) lines.push(`roadmap_id: ${input.roadmapId}`);
  if (input.revisitDate) lines.push(`revisit_date: ${input.revisitDate}`);
  lines.push(`---`, ``, `# ${block.id} — ${block.slug}`, ``, block.body, ``);
  if (input.rationale) {
    lines.push('---', '', '## Decision rationale', '', input.rationale, '');
  }
  return lines.join('\n');
}

export function appendTierCandidate(
  plansRoot: string,
  block: ProposalBlock,
  tier: string | undefined,
): string | undefined {
  if (!tier) return undefined;
  const fp = path.join(plansRoot, `tier-${tier}-candidates.md`);
  const line = `- [ ] **${block.id} — ${block.slug}** (auto-triaged ${new Date().toISOString().slice(0, 10)})`;
  const header = `# Tier ${tier} — Auto-triaged candidates\n\nLines below are queued for paste-in to ROADMAP_4.0.md → Tier ${tier}.\n\n`;
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, header + line + '\n');
  } else {
    fs.appendFileSync(fp, line + '\n');
  }
  return fp;
}

export function appendDeletedFeature(
  plansRoot: string,
  block: ProposalBlock,
  reason: ReasonTag,
): boolean {
  const fp = path.join(plansRoot, 'DELETED_FEATURES.md');
  const stamp = new Date().toISOString().slice(0, 10);
  const entry = `\n## ${block.id} — ${block.slug} (rejected ${stamp}, reason: ${reason})\n\n${block.body}\n`;
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, '# Deleted features\n' + entry);
  } else {
    fs.appendFileSync(fp, entry);
  }
  return true;
}

export function triageProposal(
  input: TriageInput,
  now: Date = new Date(),
): TriageResult {
  if (input.bucket === 'deferred' && !input.revisitDate) {
    return {
      status: 'error',
      decisionPath: null,
      reason: 'deferred bucket requires revisitDate',
    };
  }
  if (!fs.existsSync(input.proposalsFile)) {
    return { status: 'error', decisionPath: null, reason: 'proposals file missing' };
  }
  const fileBody = fs.readFileSync(input.proposalsFile, 'utf-8');
  const block = extractProposalBlock(fileBody, input.proposalId);
  if (!block) {
    return {
      status: 'error',
      decisionPath: null,
      reason: `proposal ${input.proposalId} not found`,
    };
  }

  const decisionsDir = path.join(input.contextRoot, 'decisions', input.bucket);
  fs.mkdirSync(decisionsDir, { recursive: true });
  const decisionPath = path.join(decisionsDir, `${block.id}-${block.slug}.md`);
  fs.writeFileSync(decisionPath, buildDecisionFile(block, input, now), 'utf-8');

  let candidateAppended: string | undefined;
  let deletedFeatureAppended = false;
  if (input.bucket === 'accepted') {
    candidateAppended = appendTierCandidate(input.plansRoot, block, input.roadmapTier);
  } else if (input.bucket === 'rejected' && input.patternFlagged) {
    deletedFeatureAppended = appendDeletedFeature(input.plansRoot, block, input.reason);
  }

  return {
    status: 'ok',
    decisionPath,
    candidateAppended,
    deletedFeatureAppended,
  };
}
