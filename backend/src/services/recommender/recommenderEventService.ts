// ROADMAP 4.0 TB3.1 — RecommenderEvent service.
//
// Every Tonight proposal writes one event regardless of outcome.
// `contextSnapshot` and `candidateIds` are JSON-stringified so we can
// re-run retrieval against the same state and reproduce the candidate
// set later (replayability).

import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';
import { serializeJsonColumnSafe } from '../../utils/jsonColumns';

// ROADMAP 4.0 FX3.3 — sentinel embedded in `contextSnapshot` so zero-result
// filter combos can be queried out of the same table until N1.1 introduces
// a proper `surface` discriminator. Keep this string stable — analytics
// queries depend on it.
export const ZERO_RESULT_FILTER_SURFACE = 'filter_zero_result';
export const ZERO_RESULT_EVENT_TYPE = 'zero_result_filter_combo';

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
        contextSnapshot: serializeJsonColumnSafe('contextSnapshot', record.contextSnapshot),
        candidateIds: serializeJsonColumnSafe('candidateIds', record.candidateIds),
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

// ── ROADMAP 4.0 FX3.3 — zero-result filter logging ─────────────────────────

export interface ZeroResultFilterRecord {
  userId: string;
  asOf?: Date;
  /** Structured filter set that produced zero candidates. NEVER include raw
   *  search query strings — guard against PII per FX3.3 spec. */
  filters: Record<string, unknown>;
}

const PII_FILTER_KEYS = new Set(['search', 'searchQuery', 'cravingQuery', 'query']);

/** Removes free-text fields that could leak PII (FX3.3 guard). */
function sanitizeFilters(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (PII_FILTER_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Log a zero-result filter combination so the recommender team can audit
 * which combos are most over-filtered. Sample 100% (low-volume event); the
 * caller is responsible for only invoking this when the post-filter
 * candidate count is 0.
 *
 * Cross-tier dovetail (N1.1 / N1.3): writes via the existing TB3 table with
 * a sentinel `surface` embedded in `contextSnapshot`; will rebind to a
 * top-level `surface` column when N1.1's unified table lands.
 */
export async function recordZeroResultFilter(
  rec: ZeroResultFilterRecord,
): Promise<string | null> {
  try {
    const sanitized = sanitizeFilters(rec.filters);
    const event = (await (prisma as any).recommenderEvent.create({
      data: {
        userId: rec.userId,
        asOf: rec.asOf ?? new Date(),
        contextSnapshot: serializeJsonColumnSafe('contextSnapshot', {
          surface: ZERO_RESULT_FILTER_SURFACE,
          eventType: ZERO_RESULT_EVENT_TYPE,
          filters: sanitized,
        }),
        candidateIds: serializeJsonColumnSafe('candidateIds', []),
        pickedRecipeId: null,
        confidence: 0,
        copyLine: '',
        source: 'retrieval_fallback',
      },
    })) as { id: string };
    return event.id;
  } catch (err) {
    logger.warn(
      { err, userId: rec.userId },
      'FX3.3 recordZeroResultFilter failed',
    );
    return null;
  }
}
