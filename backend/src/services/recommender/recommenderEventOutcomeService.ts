// ROADMAP 4.0 TB3.2 — Outcome backfill.
//
// When the user accepts the CTA / swaps to a runner-up / escapes to
// search / abandons mid-cook, write an outcome row keyed by eventId
// (uniquely indexed for idempotency). Surfaces from the existing T4.1
// analytics handler — analytics is fire-and-forget; this is durable.

import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';

export type OutcomeKind = 'accepted' | 'swapped' | 'escaped' | 'abandoned';

const VALID_OUTCOMES: ReadonlySet<string> = new Set([
  'accepted',
  'swapped',
  'escaped',
  'abandoned',
]);

export interface RecordOutcomeArgs {
  eventId: string;
  outcome: OutcomeKind;
  latencyMs: number;
}

export async function recordOutcome(args: RecordOutcomeArgs): Promise<boolean> {
  if (!VALID_OUTCOMES.has(args.outcome)) {
    logger.warn(
      { outcome: args.outcome },
      'TB3.2 recordOutcome: invalid outcome',
    );
    return false;
  }

  try {
    const parent = await (prisma as any).recommenderEvent.findUnique({
      where: { id: args.eventId },
      select: { id: true },
    });
    if (!parent) {
      logger.warn(
        { eventId: args.eventId },
        'TB3.2 recordOutcome: orphan outcome dropped',
      );
      return false;
    }

    await (prisma as any).recommenderEventOutcome.upsert({
      where: { eventId: args.eventId },
      create: {
        eventId: args.eventId,
        outcome: args.outcome,
        latencyMs: args.latencyMs,
      },
      update: {
        outcome: args.outcome,
        latencyMs: args.latencyMs,
      },
    });
    return true;
  } catch (err) {
    logger.warn({ err, eventId: args.eventId }, 'TB3.2 recordOutcome failed');
    return false;
  }
}
