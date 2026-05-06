// ROADMAP 4.0 TB3.1 — RecommenderEvent service.
//
// Every Tonight proposal writes one event regardless of outcome.
// `contextSnapshot` and `candidateIds` are JSON-stringified so we can
// re-run retrieval against the same state and reproduce the candidate
// set later (replayability).

import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';

export interface ProposalRecord {
  userId: string;
  asOf: Date;
  contextSnapshot: unknown;
  candidateIds: string[];
  pickedRecipeId: string | null;
  runnerUpIds: string[];
  confidence: number;
  copyLine: string;
  source: 'llm' | 'retrieval_fallback';
}

const MAX_RUNNER_UPS = 3;

export async function recordProposal(
  record: ProposalRecord,
): Promise<string | null> {
  try {
    const event = (await (prisma as any).recommenderEvent.create({
      data: {
        userId: record.userId,
        asOf: record.asOf,
        contextSnapshot: JSON.stringify(record.contextSnapshot),
        candidateIds: JSON.stringify(record.candidateIds),
        pickedRecipeId: record.pickedRecipeId,
        confidence: record.confidence,
        copyLine: record.copyLine,
        source: record.source,
      },
    })) as { id: string };

    const trimmedRunnerUps = record.runnerUpIds.slice(0, MAX_RUNNER_UPS);
    if (trimmedRunnerUps.length > 0) {
      await (prisma as any).recommenderRunnerUp.createMany({
        data: trimmedRunnerUps.map((recipeId, i) => ({
          eventId: event.id,
          recipeId,
          rank: i + 1,
        })),
      });
    }

    return event.id;
  } catch (err) {
    logger.warn({ err, userId: record.userId }, 'TB3.1 recordProposal failed');
    return null;
  }
}
