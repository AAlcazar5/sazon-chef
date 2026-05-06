// backend/scripts/selfImprovement/runSynthesis.ts
// Tier M2 — weekly synthesis cron entry. Calls Sonnet 4.6 with last 7 days
// of observations + persona + brand-voice + recent decisions, writes a new
// proposals file. Kill-switchable via SELF_IMPROVEMENT_ENGINE_ENABLED.

import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../src/utils/logger';
import {
  DEFAULT_SONNET_MODEL,
  runWeeklySynthesis,
} from '../../src/services/selfImprovement/synthesisService';

const CONTEXT_ROOT = path.resolve(__dirname, '../../../.context');
const PLANS_ROOT = path.resolve(__dirname, '../../../plans');

async function callSonnet(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: DEFAULT_SONNET_MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = message.content?.[0];
  if (!block || block.type !== 'text') throw new Error('Empty Sonnet response');
  return block.text;
}

async function main(): Promise<void> {
  const result = await runWeeklySynthesis({
    callLLM: callSonnet,
    contextRoot: CONTEXT_ROOT,
    plansRoot: PLANS_ROOT,
  });
  logger.info({ result }, 'selfImprovement.synthesis.complete');
}

main().catch((err) => {
  logger.error({ err }, 'selfImprovement.synthesis.fatal');
  process.exit(1);
});
