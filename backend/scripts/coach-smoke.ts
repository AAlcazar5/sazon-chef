#!/usr/bin/env ts-node
// ROADMAP 4.0 Tier $$ — provider-agnostic smoke test for the Sazon coach.
//
// Hits whichever LLM provider is configured via env (selectLLMClient), streams
// the response to stdout, prints model + token usage at the end. No DB, no
// message history, no tools by default — just verifies the provider answers.
//
// Use to verify Gemini-direct or OpenRouter swaps end-to-end before flipping
// them on for real users.
//
// Usage:
//   cd backend
//   npx ts-node scripts/coach-smoke.ts "what should I cook tonight?"
//   npx ts-node scripts/coach-smoke.ts --tier=premium "plan my week"
//   npx ts-node scripts/coach-smoke.ts --with-tools "what's in my pantry"
//
// Env knobs (the same ones the route reads):
//   COACH_LLM_PROVIDER=anthropic|openrouter-gemini|gemini-direct  (force any tier)
//   COACH_FREE_PROVIDER=openrouter-gemini|gemini-direct           (free tier only)
//   ANTHROPIC_API_KEY / OPENROUTER_API_KEY / GEMINI_API_KEY       (per provider)

import 'dotenv/config';
import { selectLLMClient } from '../src/services/llm';
import { coachToolDefinitions } from '../src/services/coachTools';
import { anthropicToolsToNormalized } from '../src/services/llm/anthropicAdapter';
import {
  buildProfileSnapshot,
  buildSystemPromptParts,
  resolveCoachLocale,
} from '../src/services/coachPromptService';
import type { CoachTier } from '../src/services/coachService';

interface CliOptions {
  message: string;
  tier: CoachTier;
  withTools: boolean;
  locale: string;
}

function parseCli(argv: string[]): CliOptions {
  const opts: CliOptions = {
    message: '',
    tier: 'free',
    withTools: false,
    locale: 'en',
  };
  const positional: string[] = [];
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--tier=premium' || a === '--premium') opts.tier = 'premium';
    else if (a === '--tier=free' || a === '--free') opts.tier = 'free';
    else if (a === '--with-tools') opts.withTools = true;
    else if (a.startsWith('--locale=')) opts.locale = a.slice('--locale='.length);
    else if (a.startsWith('--')) {
      // Ignore unknown flags rather than fail loudly.
    } else {
      positional.push(a);
    }
  }
  opts.message = positional.join(' ').trim();
  return opts;
}

// Build the same systemBlocks the real route would build, for the given
// locale, so the smoke test exercises actual regional personas.
function buildSmokeSystemBlocks(locale: string): { stable: string; dynamic: string } {
  const snapshot = buildProfileSnapshot({
    userId: 'smoke-test',
    pantry: [],
    leftoverInventory: [],
    slotAffinity: [],
    pairAffinity: [],
    remainingMacros: null,
    last7Cooks: [],
    dietaryProfile: [],
    allergens: [],
    cuisineAffinity: [],
    skillTier: 'cook',
    goalPhase: 'maintain',
    currentMealPlanDay: null,
  });
  return buildSystemPromptParts(snapshot, {
    locale: resolveCoachLocale(locale),
  });
}

async function main(): Promise<void> {
  const opts = parseCli(process.argv);
  if (!opts.message) {
    // eslint-disable-next-line no-console
    console.error(
      'Usage: ts-node scripts/coach-smoke.ts [--tier=free|premium] [--with-tools] "<message>"',
    );
    process.exit(1);
  }

  const client = selectLLMClient(opts.tier);
  const resolvedLocale = resolveCoachLocale(opts.locale);
  const systemBlocks = buildSmokeSystemBlocks(opts.locale);
  // eslint-disable-next-line no-console
  console.error(`\n→ provider: ${client.providerId}`);
  // eslint-disable-next-line no-console
  console.error(`→ tier:     ${opts.tier}`);
  // eslint-disable-next-line no-console
  console.error(`→ locale:   ${opts.locale}${resolvedLocale !== opts.locale ? ` (resolved → ${resolvedLocale})` : ''}`);
  // eslint-disable-next-line no-console
  console.error(`→ tools:    ${opts.withTools ? `${coachToolDefinitions.length} tools` : 'none'}`);
  // eslint-disable-next-line no-console
  console.error(`→ message:  ${opts.message}\n`);

  const t0 = Date.now();
  const handle = client.startStream({
    tier: opts.tier,
    intent: 'chat',
    systemBlocks,
    messages: [{ role: 'user', content: opts.message }],
    tools: opts.withTools
      ? anthropicToolsToNormalized(coachToolDefinitions)
      : [],
  });

  let firstByteAt: number | null = null;
  const toolStarts: Array<{ id: string; name: string }> = [];
  process.stdout.write('Sazon: ');
  for await (const event of handle.events) {
    if (event.type === 'text_delta') {
      if (firstByteAt === null) firstByteAt = Date.now();
      process.stdout.write(event.text);
    } else if (event.type === 'tool_use_start') {
      toolStarts.push({ id: event.id, name: event.name });
      process.stdout.write(`\n[tool_use_start: ${event.name}]`);
    }
  }
  process.stdout.write('\n');

  const final = await handle.finalMessage();
  const t1 = Date.now();

  // eslint-disable-next-line no-console
  console.error('\n— summary —');
  // eslint-disable-next-line no-console
  console.error(`model:           ${final.model}`);
  // eslint-disable-next-line no-console
  console.error(`tokens in:       ${final.usage.inputTokens}`);
  // eslint-disable-next-line no-console
  console.error(`tokens out:      ${final.usage.outputTokens}`);
  // eslint-disable-next-line no-console
  console.error(`cache read:      ${final.usage.cacheReadTokens}`);
  // eslint-disable-next-line no-console
  console.error(`cache write:     ${final.usage.cacheWriteTokens}`);
  // eslint-disable-next-line no-console
  console.error(
    `time to first byte: ${firstByteAt !== null ? `${firstByteAt - t0}ms` : 'no text emitted'}`,
  );
  // eslint-disable-next-line no-console
  console.error(`total latency:   ${t1 - t0}ms`);
  if (toolStarts.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`tool calls:      ${toolStarts.length}`);
    for (const tc of toolStarts) {
      const block = final.content.find(
        (b) => b.type === 'tool_use' && b.id === tc.id,
      );
      const args =
        block && block.type === 'tool_use'
          ? JSON.stringify(block.input)
          : '(no args resolved)';
      // eslint-disable-next-line no-console
      console.error(`  • ${tc.name}: ${args}`);
    }
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(`\n✗ smoke test failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
