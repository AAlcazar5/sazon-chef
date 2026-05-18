// backend/src/services/cookEventService.ts
//
// W-A1 — Cook Log. The moat substrate: every scale/swap/made-it/note/outcome
// is appended as a structured, user-scoped event so cooking *accumulates*
// (see plans/office-hours/cooking-mode.md + asteroid-claude-cooking-mode.md).
// payload is JSON-serialized (SQLite has no Json column type — the codebase's
// established serializeJsonColumnSafe pattern).

import { prisma } from '../lib/prisma';

export type CookEventType =
  | 'scale'
  | 'swap'
  | 'made_it'
  | 'note'
  | 'outcome';

export interface RecordCookEventInput {
  userId: string;
  /** Omit/null for cooks not tied to a Sazon recipe (the §9a ingest path). */
  recipeId?: string | null;
  type: CookEventType;
  payload: Record<string, unknown>;
}

export interface CookLogEntry {
  id: string;
  type: CookEventType;
  recipeId: string | null;
  payload: Record<string, unknown>;
  createdAt: Date;
}

function safeParsePayload(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw);
    return v !== null && typeof v === 'object' && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Append one immutable Cook Log event. */
export async function recordCookEvent(input: RecordCookEventInput) {
  return prisma.cookEvent.create({
    data: {
      userId: input.userId,
      recipeId: input.recipeId ?? null,
      type: input.type,
      payload: JSON.stringify(input.payload ?? {}),
    },
  });
}

/**
 * Read a user's Cook Log, newest-first. STRICTLY scoped by userId — this is
 * the IDOR guarantee; never widen this where clause.
 */
export async function getCookLog(
  userId: string,
  opts: { limit?: number } = {},
): Promise<CookLogEntry[]> {
  const rows = await prisma.cookEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    ...(opts.limit && opts.limit > 0 ? { take: opts.limit } : {}),
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type as CookEventType,
    recipeId: r.recipeId,
    payload: safeParsePayload(r.payload),
    createdAt: r.createdAt,
  }));
}
