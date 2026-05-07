// ROADMAP 4.0 N0.3 — Unified retrieval session cursor.
//
// Three independent re-rank surfaces want to operate on the same TB1
// candidate pool without re-fetching:
//   - HX2.1 hero re-roll ("next-ranked candidate")
//   - HX5.1 almost-made-it sheet ("paginated session cursor")
//   - FX3.1 soft-filter fallback ("operates on top-K from a single TB1 call")
//
// Without coordination, each builds its own cache key + the user re-rolls
// once and the almost-made-it sheet shows a stale set. This service: every
// `sazonBrain.recommend` call writes the full ranked candidate list under a
// `retrievalCallId` (UUID, 5-min TTL, scoped to (userId, surface)); subsequent
// re-roll / almost-made-it / soft-fallback calls reference the cursor instead
// of re-retrieving.
//
// In-memory store. 5-min TTL, low-volume — a Map is the right tool.

import { randomUUID } from 'crypto';

export const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface RankedCandidate {
  recipeId: string;
  score: number;
  /** Distance from the cut-off score, populated for near-miss queries. */
  marginVsCut?: number;
}

export interface RetrievalSession {
  retrievalCallId: string;
  userId: string;
  surface: string;
  candidates: RankedCandidate[];
  /** The cut-off score — anything below this would not have made the visible top-K. */
  cutoffScore: number;
  createdAt: number;
  expiresAt: number;
}

interface SessionRecord extends RetrievalSession {
  /** Internal: track which candidates have been served for next-cursor calls. */
  servedThrough: number;
}

/** "Session expired" sentinel — callers should re-run retrieval. */
export const SESSION_EXPIRED = Symbol('retrieval-session-expired');
export type SessionExpired = typeof SESSION_EXPIRED;

const sessions = new Map<string, SessionRecord>();
const indexByOwner = new Map<string, string>(); // (userId|surface) → retrievalCallId

function ownerKey(userId: string, surface: string): string {
  return `${userId}|${surface}`;
}

function nowMs(): number {
  return Date.now();
}

function purgeExpired(): void {
  const t = nowMs();
  for (const [id, rec] of sessions) {
    if (rec.expiresAt <= t) {
      sessions.delete(id);
      indexByOwner.delete(ownerKey(rec.userId, rec.surface));
    }
  }
}

export interface CreateSessionInput {
  userId: string;
  surface: string;
  candidates: RankedCandidate[];
  /** Top-K cut-off (inclusive). Items past this index get marginVsCut populated. */
  cutoffIndex?: number;
}

/**
 * Persist a ranked candidate list under a fresh retrievalCallId.
 * Returns the session record — callers stash `retrievalCallId` on the response
 * so client-side re-rolls / pagination can reference it.
 *
 * Re-creating a session for the same (userId, surface) replaces any prior
 * session for that pair — this is the desired behavior so a fresh "today_hero"
 * recommendation invalidates a stale almost-made-it cursor.
 */
export function createSession(input: CreateSessionInput): RetrievalSession {
  purgeExpired();

  if (!input.userId) {
    throw new Error('createSession: userId required');
  }
  if (!input.surface) {
    throw new Error('createSession: surface required');
  }

  // Replace any existing session for the same (userId, surface) — fresh
  // recommendations invalidate stale cursors.
  const oldId = indexByOwner.get(ownerKey(input.userId, input.surface));
  if (oldId) {
    sessions.delete(oldId);
  }

  const cutoffIndex = Math.max(
    0,
    Math.min(
      input.cutoffIndex ?? input.candidates.length,
      input.candidates.length,
    ),
  );
  const cutoffScore =
    cutoffIndex > 0 && cutoffIndex <= input.candidates.length
      ? (input.candidates[cutoffIndex - 1]?.score ?? 0)
      : 0;

  const id = randomUUID();
  const t = nowMs();
  const record: SessionRecord = {
    retrievalCallId: id,
    userId: input.userId,
    surface: input.surface,
    candidates: input.candidates.map((c, i) => ({
      ...c,
      marginVsCut: i >= cutoffIndex ? cutoffScore - c.score : undefined,
    })),
    cutoffScore,
    createdAt: t,
    expiresAt: t + SESSION_TTL_MS,
    servedThrough: cutoffIndex - 1,
  };
  sessions.set(id, record);
  indexByOwner.set(ownerKey(input.userId, input.surface), id);

  // Return a defensive copy without `servedThrough` (internal).
  return {
    retrievalCallId: record.retrievalCallId,
    userId: record.userId,
    surface: record.surface,
    candidates: record.candidates,
    cutoffScore: record.cutoffScore,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
  };
}

function getActive(retrievalCallId: string): SessionRecord | SessionExpired {
  purgeExpired();
  const rec = sessions.get(retrievalCallId);
  if (!rec) return SESSION_EXPIRED;
  if (rec.expiresAt <= nowMs()) {
    sessions.delete(retrievalCallId);
    indexByOwner.delete(ownerKey(rec.userId, rec.surface));
    return SESSION_EXPIRED;
  }
  return rec;
}

/**
 * Fetch the candidate at a specific 0-indexed position. Used by HX2.1 hero
 * re-roll (`position: 1` for "next") and FX3.1 soft-filter fallback.
 *
 * Returns SESSION_EXPIRED when the call id is unknown or its TTL elapsed.
 * Returns null when `position` is past the end of the candidate pool.
 */
export function nextCandidate(
  retrievalCallId: string,
  position: number,
): RankedCandidate | null | SessionExpired {
  const rec = getActive(retrievalCallId);
  if (rec === SESSION_EXPIRED) return SESSION_EXPIRED;
  if (position < 0 || position >= rec.candidates.length) return null;
  return rec.candidates[position];
}

/**
 * Returns up to `k` candidates that fell just below the cut-off, with
 * `marginVsCut` populated. Used by HX5.1 almost-made-it sheet.
 */
export function getNearMisses(
  retrievalCallId: string,
  k: number,
): RankedCandidate[] | SessionExpired {
  const rec = getActive(retrievalCallId);
  if (rec === SESSION_EXPIRED) return SESSION_EXPIRED;
  // First near-miss is at index `servedThrough + 1` (the first that didn't
  // make the visible top-K).
  const start = rec.servedThrough + 1;
  return rec.candidates
    .slice(start, start + Math.max(0, k))
    .map((c) => ({ ...c, marginVsCut: c.marginVsCut ?? rec.cutoffScore - c.score }));
}

/** Test helper — clear all sessions. NEVER call from production code. */
export function __resetForTests(): void {
  sessions.clear();
  indexByOwner.clear();
}
