// backend/src/services/churnTraceService.ts
// ROADMAP 4.0 Tier B5 — Churn-trace replay.
//
// When a user churns (no app open in 14d), replay their last 14 days of
// personalization signals and identify the moment Sazon failed to adapt.
// Use this to fix the adaptation engine, not the funnel.
//
// PII redaction is non-negotiable — this tool is internal-admin-only and
// must never leak full email/name/contact info even to ourselves.

import { prisma } from '../lib/prisma';

export interface RedactablePii {
  email?: string;
  name?: string;
  ip?: string;
  phone?: string;
}

export function redactPii<T extends RedactablePii>(input: T): Partial<T> {
  const result: any = { ...input };

  if (typeof input.email === 'string') {
    const [local, domain] = input.email.split('@');
    if (!domain) {
      result.email = '***';
    } else if (local.length <= 2) {
      result.email = `***@${domain}`;
    } else {
      result.email = `${local.slice(0, 2)}****@${domain}`;
    }
  }

  if (typeof input.name === 'string') {
    const firstSpace = input.name.indexOf(' ');
    result.name = firstSpace >= 0 ? input.name.slice(0, firstSpace) : input.name;
  }

  delete result.ip;
  delete result.phone;

  return result;
}

export interface ChurnedUserSummary {
  id: string;
  email: string | null;
  name: string | null;
  lastActiveAt: Date | null;
}

/**
 * List users who haven't been active in `churnThresholdDays`. Returned
 * fields are PII-redacted.
 */
export async function findChurnedUsers(opts: {
  asOfDate: Date;
  churnThresholdDays: number;
}): Promise<ChurnedUserSummary[]> {
  const cutoff = new Date(opts.asOfDate.getTime() - opts.churnThresholdDays * 24 * 60 * 60 * 1000);
  const users = (await (prisma as any).user.findMany({
    where: { lastActiveAt: { lt: cutoff } },
    select: { id: true, email: true, name: true, lastActiveAt: true },
  })) as Array<{ id: string; email: string | null; name: string | null; lastActiveAt: Date | null }>;

  return users.map((u) => {
    const redacted = redactPii({
      email: u.email ?? undefined,
      name: u.name ?? undefined,
    });
    return {
      id: u.id,
      email: redacted.email ?? null,
      name: redacted.name ?? null,
      lastActiveAt: u.lastActiveAt,
    };
  });
}

export type TraceEventKind =
  | 'cook'
  | 'rate'
  | 'craving-search'
  | 'surface-event'
  | 'leftover';

export interface TraceEvent {
  kind: TraceEventKind;
  at: Date;
  recipeId?: string | null;
  componentId?: string | null;
  surface?: string | null;
  action?: string | null;
  liked?: boolean;
  disliked?: boolean;
  cravingQuery?: string;
  detail?: string;
}

export type NotAdaptedSignalKind =
  | 'disliked-without-down-rank'
  | 'expired-leftover-not-surfaced'
  | 'craving-search-no-cook';

export interface NotAdaptedSignal {
  kind: NotAdaptedSignalKind;
  at: Date;
  recipeId?: string;
  componentId?: string;
  detail: string;
}

export interface ChurnTrace {
  user: { id: string; email: string | null; name: string | null; lastActiveAt: Date | null };
  asOfDate: Date;
  windowSince: Date;
  lookbackDays: number;
  events: TraceEvent[];
  notAdaptedSignals: NotAdaptedSignal[];
}

/**
 * Replay a single user's personalization signals over a window. Identifies
 * "not adapted" moments — places where the engine should have learned and
 * didn't (yet).
 */
export async function getChurnTrace(opts: {
  userId: string;
  asOfDate: Date;
  lookbackDays?: number;
}): Promise<ChurnTrace> {
  const lookbackDays = opts.lookbackDays ?? 14;
  const windowSince = new Date(opts.asOfDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

  const userRow = (await (prisma as any).user.findUnique({
    where: { id: opts.userId },
    select: { id: true, email: true, name: true, lastActiveAt: true },
  })) as { id: string; email: string | null; name: string | null; lastActiveAt: Date | null } | null;

  if (!userRow) {
    throw new Error(`getChurnTrace: user "${opts.userId}" not found`);
  }

  const userRedact = redactPii({
    email: userRow.email ?? undefined,
    name: userRow.name ?? undefined,
  });

  const range = { gte: windowSince, lte: opts.asOfDate };

  const [cooks, feedback, cravings, surfaceEvents, leftovers] = await Promise.all([
    (prisma as any).cookingLog.findMany({
      where: { userId: opts.userId, cookedAt: range },
      select: { id: true, recipeId: true, cookedAt: true, notes: true },
    }),
    (prisma as any).recipeFeedback.findMany({
      where: { userId: opts.userId, createdAt: range },
      select: { id: true, recipeId: true, liked: true, disliked: true, consumed: true, dislikeReason: true, createdAt: true },
    }),
    (prisma as any).cravingSearchEvent.findMany({
      where: { userId: opts.userId, createdAt: range },
      select: { id: true, cravingQuery: true, recipeId: true, action: true, createdAt: true },
    }),
    (prisma as any).surfaceEvent.findMany({
      where: { userId: opts.userId, createdAt: range },
      select: { id: true, surface: true, action: true, recipeId: true, createdAt: true },
    }),
    (prisma as any).leftoverInventory.findMany({
      where: { userId: opts.userId, createdAt: range },
      select: { id: true, componentId: true, slot: true, portionsRemaining: true, createdAt: true, expiresAt: true },
    }),
  ]);

  const events: TraceEvent[] = [];

  for (const c of cooks as Array<{ recipeId: string; cookedAt: Date; notes: string | null }>) {
    events.push({ kind: 'cook', at: c.cookedAt, recipeId: c.recipeId, detail: c.notes ?? undefined });
  }
  for (const f of feedback as Array<{ recipeId: string; liked: boolean; disliked: boolean; consumed: boolean; createdAt: Date }>) {
    events.push({
      kind: 'rate',
      at: f.createdAt,
      recipeId: f.recipeId,
      liked: f.liked,
      disliked: f.disliked,
    });
  }
  for (const c of cravings as Array<{ cravingQuery: string; recipeId: string; action: string; createdAt: Date }>) {
    events.push({
      kind: 'craving-search',
      at: c.createdAt,
      recipeId: c.recipeId,
      cravingQuery: c.cravingQuery,
      action: c.action,
    });
  }
  for (const s of surfaceEvents as Array<{ surface: string; action: string; recipeId: string | null; createdAt: Date }>) {
    events.push({
      kind: 'surface-event',
      at: s.createdAt,
      surface: s.surface,
      action: s.action,
      recipeId: s.recipeId,
    });
  }
  for (const l of leftovers as Array<{ componentId: string; slot: string; portionsRemaining: number; createdAt: Date; expiresAt: Date }>) {
    events.push({
      kind: 'leftover',
      at: l.createdAt,
      componentId: l.componentId,
      detail: `slot=${l.slot} portions=${l.portionsRemaining} expires=${l.expiresAt.toISOString()}`,
    });
  }

  // Newest first.
  events.sort((a, b) => b.at.getTime() - a.at.getTime());

  // ── "Not adapted" signal detection ──
  const notAdaptedSignals: NotAdaptedSignal[] = [];

  // 1. Disliked feedback without a follow-up down-rank (no taps/cooks of same
  //    cuisine in the trailing window — but we don't have cuisine here yet,
  //    so flag the dislike itself as a candidate for adaptation review).
  for (const f of feedback as Array<{ recipeId: string; disliked: boolean; createdAt: Date }>) {
    if (f.disliked) {
      notAdaptedSignals.push({
        kind: 'disliked-without-down-rank',
        at: f.createdAt,
        recipeId: f.recipeId,
        detail: 'User disliked this recipe — verify cuisine/affinity weight was decremented.',
      });
    }
  }

  // 2. Leftover that expired without being surfaced in the composer.
  for (const l of leftovers as Array<{ componentId: string; expiresAt: Date }>) {
    if (l.expiresAt < opts.asOfDate) {
      notAdaptedSignals.push({
        kind: 'expired-leftover-not-surfaced',
        at: l.expiresAt,
        componentId: l.componentId,
        detail: 'Leftover expired before the user revisited the composer — Stretch card may have failed to surface.',
      });
    }
  }

  // 3. Craving search without a downstream cook (engagement plateau).
  const cravingTaps = (cravings as Array<{ recipeId: string; action: string; createdAt: Date }>).filter((c) => c.action === 'tap');
  const cookedRecipeIds = new Set(
    (cooks as Array<{ recipeId: string }>).map((c) => c.recipeId)
  );
  for (const tap of cravingTaps) {
    if (!cookedRecipeIds.has(tap.recipeId)) {
      notAdaptedSignals.push({
        kind: 'craving-search-no-cook',
        at: tap.createdAt,
        recipeId: tap.recipeId,
        detail: 'User searched, opened a recipe, but never cooked it — craving result quality may be off.',
      });
    }
  }

  return {
    user: {
      id: userRow.id,
      email: userRedact.email ?? null,
      name: userRedact.name ?? null,
      lastActiveAt: userRow.lastActiveAt,
    },
    asOfDate: opts.asOfDate,
    windowSince,
    lookbackDays,
    events,
    notAdaptedSignals,
  };
}
