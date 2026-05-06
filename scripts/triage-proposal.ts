#!/usr/bin/env ts-node
// scripts/triage-proposal.ts
// Tier M3 CLI — move a proposal from `.context/proposals/` to one of
// `.context/decisions/{accepted | deferred | needs-data | rejected}/`.
//
// Usage:
//   npx ts-node scripts/triage-proposal.ts \
//     --file .context/proposals/2026-05-10.md \
//     --id P-006 \
//     --bucket accepted \
//     --reason impact \
//     --tier J --rid J19 --rationale "Persona fit + Sunday surface."
//
//   For deferred:  --revisit 2026-09-01
//   For pattern-flagged rejection: --pattern-flagged

import path from 'path';
import {
  triageProposal,
  TriageBucket,
  ReasonTag,
} from '../backend/src/services/selfImprovement/triageService';

interface ParsedArgs {
  file?: string;
  id?: string;
  bucket?: TriageBucket;
  reason?: ReasonTag;
  revisit?: string;
  tier?: string;
  rid?: string;
  rationale?: string;
  patternFlagged?: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case '--file':
        out.file = next;
        i += 1;
        break;
      case '--id':
        out.id = next;
        i += 1;
        break;
      case '--bucket':
        out.bucket = next as TriageBucket;
        i += 1;
        break;
      case '--reason':
        out.reason = next as ReasonTag;
        i += 1;
        break;
      case '--revisit':
        out.revisit = next;
        i += 1;
        break;
      case '--tier':
        out.tier = next;
        i += 1;
        break;
      case '--rid':
        out.rid = next;
        i += 1;
        break;
      case '--rationale':
        out.rationale = next;
        i += 1;
        break;
      case '--pattern-flagged':
        out.patternFlagged = true;
        break;
    }
  }
  return out;
}

const args = parseArgs(process.argv);
if (!args.file || !args.id || !args.bucket || !args.reason) {
  process.stdout.write(
    'usage: triage-proposal --file <proposals.md> --id <P-NNN> --bucket <accepted|deferred|needs-data|rejected> --reason <persona|voice|effort|impact|timing|data> [--revisit YYYY-MM-DD] [--tier X] [--rid X9] [--rationale "..."] [--pattern-flagged]\n',
  );
  process.exit(2);
}

const repoRoot = path.resolve(__dirname, '..');
const result = triageProposal({
  proposalsFile: path.resolve(args.file),
  proposalId: args.id,
  bucket: args.bucket,
  reason: args.reason,
  revisitDate: args.revisit,
  roadmapTier: args.tier,
  roadmapId: args.rid,
  rationale: args.rationale,
  patternFlagged: args.patternFlagged,
  contextRoot: path.join(repoRoot, '.context'),
  plansRoot: path.join(repoRoot, 'plans'),
});

process.stdout.write(JSON.stringify(result, null, 2) + '\n');
process.exit(result.status === 'ok' ? 0 : 1);
