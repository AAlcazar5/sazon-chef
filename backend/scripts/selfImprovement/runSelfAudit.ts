// backend/scripts/selfImprovement/runSelfAudit.ts
// Tier M6 — quarterly self-audit cron entry. Reads proposals-outcomes
// ledger + active synthesis-prompt-vN.md, drafts v(N+1) candidate via
// Opus. Refuses to fire when the ledger has < 8 measured proposals.
//
// Manual rename gate: a human drops the `-candidate` suffix to promote.
// The cron never auto-promotes.

import path from 'path';
import { logger } from '../../src/utils/logger';
import { runSelfAudit, DEFAULT_OPUS_MODEL } from '../../src/services/selfImprovement/selfAuditService';

const CONTEXT_ROOT = path.resolve(__dirname, '../../../.context');

async function callOpus(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set — falling back to non-LLM candidate');
  }
  // Lazy import — keeps the SDK out of the test bundle.
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: process.env.SELF_AUDIT_MODEL ?? DEFAULT_OPUS_MODEL,
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = response.content[0];
  if (block.type !== 'text') {
    throw new Error(`unexpected response block type: ${block.type}`);
  }
  return block.text;
}

async function main(): Promise<void> {
  const result = await runSelfAudit({
    contextRoot: CONTEXT_ROOT,
    callLLM: process.env.ANTHROPIC_API_KEY ? callOpus : undefined,
  });

  logger.info(
    {
      status: result.status,
      activeVersion: result.activeVersion,
      candidateVersion: result.candidateVersion,
      candidatePath: result.candidatePath,
      measuredProposals: result.measuredProposals,
      reason: result.reason,
    },
    'selfImprovement.selfAudit.run',
  );

  if (result.status === 'error') process.exit(1);
}

main().catch((err) => {
  logger.error({ err }, 'selfImprovement.selfAudit.fatal');
  process.exit(1);
});
