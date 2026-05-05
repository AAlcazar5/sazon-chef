// backend/src/services/adjacencyWritebackService.ts
// ROADMAP 4.0 Tier C3+C4 — Adjacency writeback.
//
// The hand-curated cuisine adjacency graph (utils/cuisineAdjacency.ts) gives
// us a static "Thai is near Burmese" prior. This service layers a dynamic
// signal-driven weight on top, so popular paths reinforce themselves and
// cold paths fade.
//
// Aggregated GLOBALLY first (one weight per source→target edge across all
// users). Per-user weights are v1.1 (F4 backlog).

import { prisma } from '../lib/prisma';

export type AdjacencySignal =
  | 'impression'      // recipe of cuisine X surfaced after user looked at Y
  | 'tap'             // user tapped on cuisine X recipe after viewing Y
  | 'cook'            // user cooked cuisine X after viewing Y (strongest)
  | 'family-tap'      // BrowseByFamily card tap → component cuisines (C4)
  | 'cuisine-tap';    // NewToYou cuisine card tap (C4)

const SIGNAL_WEIGHTS: Record<AdjacencySignal, number> = {
  impression: 0.1,
  tap: 1,
  'cuisine-tap': 1,
  'family-tap': 0.7,
  cook: 5,
};

const ALL_SIGNALS: AdjacencySignal[] = [
  'impression',
  'tap',
  'cook',
  'family-tap',
  'cuisine-tap',
];

interface RecordSignalInput {
  sourceCuisine: string;
  targetCuisine: string;
  signal: AdjacencySignal;
}

function normalizeCuisine(c: string): string {
  return c.trim().toLowerCase();
}

/**
 * Record an adjacency signal. Increments the (source, target) weight by the
 * signal-specific magnitude.
 */
export async function recordAdjacencySignal(input: RecordSignalInput): Promise<void> {
  if (!ALL_SIGNALS.includes(input.signal)) {
    throw new Error(`recordAdjacencySignal: unknown signal "${input.signal}"`);
  }
  if (!input.sourceCuisine || !input.targetCuisine) {
    throw new Error(`recordAdjacencySignal: cuisine name cannot be empty`);
  }
  const source = normalizeCuisine(input.sourceCuisine);
  const target = normalizeCuisine(input.targetCuisine);
  if (source === target) {
    throw new Error(`recordAdjacencySignal: cannot record adjacency between the same cuisine`);
  }

  const w = SIGNAL_WEIGHTS[input.signal];
  await (prisma as any).cuisineAdjacencyWeight.upsert({
    where: {
      sourceCuisine_targetCuisine: { sourceCuisine: source, targetCuisine: target },
    },
    create: {
      sourceCuisine: source,
      targetCuisine: target,
      weight: w,
      signalCount: 1,
    },
    update: {
      weight: { increment: w },
      signalCount: { increment: 1 },
    },
  });
}

/**
 * Apply exponential decay to all stored weights. Run on a periodic cron
 * (weekly). Half-life of 90 days = a weight not reinforced for 90d halves.
 *
 * `minWeight` lets us short-circuit decay on near-zero rows.
 */
export async function applyDecay(opts: {
  halfLifeDays: number;
  sinceDays: number;
  minWeight?: number;
}): Promise<void> {
  const minWeight = opts.minWeight ?? 0.01;
  const factor = Math.pow(0.5, opts.sinceDays / opts.halfLifeDays);

  const rows = (await (prisma as any).cuisineAdjacencyWeight.findMany({})) as Array<{
    id: string;
    weight: number;
  }>;

  for (const row of rows) {
    if (row.weight < minWeight) continue;
    await (prisma as any).cuisineAdjacencyWeight.update({
      where: { id: row.id },
      data: { weight: row.weight * factor },
    });
  }
}

/**
 * Read the persisted dynamic weight for an edge. Returns 0 when no row
 * exists (the static graph in utils/cuisineAdjacency.ts is the prior).
 */
export async function getDynamicAdjacencyWeight(
  sourceCuisine: string,
  targetCuisine: string
): Promise<number> {
  const row = (await (prisma as any).cuisineAdjacencyWeight.findUnique({
    where: {
      sourceCuisine_targetCuisine: {
        sourceCuisine: normalizeCuisine(sourceCuisine),
        targetCuisine: normalizeCuisine(targetCuisine),
      },
    },
  })) as { weight: number } | null;
  return row?.weight ?? 0;
}

// ─── F4: per-user adjacency writeback v2 ─────────────────────────────────────

/** Minimum per-user signal count before per-user weights blend in. */
const PER_USER_BLEND_FLOOR = 3;
/** When the floor is met, blend per-user × this fraction + global × (1−this). */
const PER_USER_BLEND_RATIO = 0.3;

interface RecordPerUserSignalInput extends RecordSignalInput {
  userId: string;
}

/**
 * Record an adjacency signal for a specific user. The same call site that
 * fires `recordAdjacencySignal` (global) should fire this too. The two
 * tables coexist — global is the prior, per-user is the personalization.
 */
export async function recordPerUserAdjacencySignal(
  input: RecordPerUserSignalInput,
): Promise<void> {
  if (!input.userId) {
    throw new Error('recordPerUserAdjacencySignal: userId required');
  }
  if (!ALL_SIGNALS.includes(input.signal)) {
    throw new Error(`recordPerUserAdjacencySignal: unknown signal "${input.signal}"`);
  }
  if (!input.sourceCuisine || !input.targetCuisine) {
    throw new Error('recordPerUserAdjacencySignal: cuisine name cannot be empty');
  }
  const source = normalizeCuisine(input.sourceCuisine);
  const target = normalizeCuisine(input.targetCuisine);
  if (source === target) {
    throw new Error('recordPerUserAdjacencySignal: cannot record self-edge');
  }

  const w = SIGNAL_WEIGHTS[input.signal];
  await (prisma as any).userCuisineAdjacencyWeight.upsert({
    where: {
      userId_sourceCuisine_targetCuisine: {
        userId: input.userId,
        sourceCuisine: source,
        targetCuisine: target,
      },
    },
    create: {
      userId: input.userId,
      sourceCuisine: source,
      targetCuisine: target,
      weight: w,
      signalCount: 1,
    },
    update: {
      weight: { increment: w },
      signalCount: { increment: 1 },
    },
  });
}

/**
 * Read the per-user dynamic weight for an edge. Returns 0 when no row exists.
 */
export async function getPerUserAdjacencyWeight(
  userId: string,
  sourceCuisine: string,
  targetCuisine: string,
): Promise<{ weight: number; signalCount: number }> {
  const row = (await (prisma as any).userCuisineAdjacencyWeight.findUnique({
    where: {
      userId_sourceCuisine_targetCuisine: {
        userId,
        sourceCuisine: normalizeCuisine(sourceCuisine),
        targetCuisine: normalizeCuisine(targetCuisine),
      },
    },
  })) as { weight: number; signalCount: number } | null;
  return { weight: row?.weight ?? 0, signalCount: row?.signalCount ?? 0 };
}

/**
 * Read the *blended* weight for an edge — global prior + per-user personalization.
 *
 *   - per-user signal count < PER_USER_BLEND_FLOOR (3): return global only.
 *   - per-user signal count >= floor: return
 *       global × (1 - PER_USER_BLEND_RATIO) + perUser × PER_USER_BLEND_RATIO
 *
 * This is the function callers (NewToYou ranker, BrowseByFamily) should use
 * when ranking — it handles cold start automatically.
 */
export async function getBlendedAdjacencyWeight(
  userId: string,
  sourceCuisine: string,
  targetCuisine: string,
): Promise<number> {
  const [global, perUser] = await Promise.all([
    getDynamicAdjacencyWeight(sourceCuisine, targetCuisine),
    getPerUserAdjacencyWeight(userId, sourceCuisine, targetCuisine),
  ]);
  if (perUser.signalCount < PER_USER_BLEND_FLOOR) {
    return global;
  }
  return global * (1 - PER_USER_BLEND_RATIO) + perUser.weight * PER_USER_BLEND_RATIO;
}
