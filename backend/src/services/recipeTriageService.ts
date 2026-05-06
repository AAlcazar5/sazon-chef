// backend/src/services/recipeTriageService.ts
// ROADMAP 4.0 Tier D7 — Phase 2 triage.
//
// Reads D6 audit rows + applies the triage rule tree:
//   keep             → no action
//   improve          → enqueue per-axis backfill jobs (image/nutrition/copy)
//   review           → human eyes (no automated action)
//   delete_candidate + isOnlyInstance=false + slot has ≥3 peers → soft delete
//   delete_candidate + isOnlyInstance=true                       → rebuild_required
//
// Pure rule engine (`triageRow`) + adapter-injectable applier (`applyTriage`).
// Soft-delete preserves the row for `SOFT_DELETE_HOLD_DAYS` (default 30)
// before a separate hard-delete sweep is allowed to run.

import type { AuditRow } from './auditRunService';

export type TriageAction =
  | 'keep'
  | 'improve'
  | 'review'
  | 'soft_delete'
  | 'rebuild_required';

export type BackfillKind = 'image' | 'nutrition' | 'copy';

export interface TriageDecision {
  recipeId: string;
  action: TriageAction;
  reason: string;
  /** Backfill jobs to enqueue when action='improve'. Empty otherwise. */
  backfills: BackfillKind[];
}

export const SOFT_DELETE_HOLD_DAYS = 30;
export const MIN_PEERS_FOR_DELETE = 3;

const IMAGE_FAIL_CODES = new Set([
  'image_unreachable',
  'low_resolution',
  'bad_aspect_ratio',
  'stock_photo_host',
]);

const NUTRITION_FAIL_CODES = new Set([
  'macro_missing',
  'micros_thin',
  'nutrition_implausible',
]);

const COPY_FAIL_CODES = new Set([
  'title_too_long',
  'title_all_caps',
  'clickbait_title',
  'banned_vocabulary',
]);

function pickBackfills(row: AuditRow): BackfillKind[] {
  const codes = new Set(row.failureReasons.map((r) => r.code));
  const out: BackfillKind[] = [];
  if ([...codes].some((c) => IMAGE_FAIL_CODES.has(c))) out.push('image');
  if ([...codes].some((c) => NUTRITION_FAIL_CODES.has(c))) out.push('nutrition');
  if ([...codes].some((c) => COPY_FAIL_CODES.has(c))) out.push('copy');
  return out;
}

/**
 * Pure decision per audit row. Caller supplies `slotPeerCount` (number
 * of *other* recipes occupying the same canonicalCuisine × archetype
 * slot). Used to gate deletion: never shrink coverage below 3 peers.
 */
export function triageRow(
  row: AuditRow,
  slotPeerCount: number,
): TriageDecision {
  switch (row.suggestedAction) {
    case 'keep':
      return {
        recipeId: row.recipeId,
        action: 'keep',
        reason: 'composite ≥80',
        backfills: [],
      };
    case 'improve': {
      const backfills = pickBackfills(row);
      return {
        recipeId: row.recipeId,
        action: 'improve',
        reason:
          backfills.length > 0
            ? `enqueue ${backfills.join(',')}`
            : 'improve bucket; no specific axis flagged',
        backfills,
      };
    }
    case 'review':
      return {
        recipeId: row.recipeId,
        action: 'review',
        reason: 'composite 30-49 — human triage required',
        backfills: [],
      };
    case 'delete_candidate': {
      if (row.isOnlyInstanceOf) {
        return {
          recipeId: row.recipeId,
          action: 'rebuild_required',
          reason: 'sole instance of cuisine×archetype slot — rebuild before delete',
          backfills: [],
        };
      }
      if (slotPeerCount < MIN_PEERS_FOR_DELETE) {
        return {
          recipeId: row.recipeId,
          action: 'rebuild_required',
          reason: `slot has only ${slotPeerCount} peers (<${MIN_PEERS_FOR_DELETE}) — would shrink coverage`,
          backfills: [],
        };
      }
      return {
        recipeId: row.recipeId,
        action: 'soft_delete',
        reason: `composite <30 + ${slotPeerCount} peers safe to delete`,
        backfills: [],
      };
    }
    default:
      return {
        recipeId: row.recipeId,
        action: 'review',
        reason: `unknown suggestedAction ${row.suggestedAction}`,
        backfills: [],
      };
  }
}

/**
 * Build decisions for an entire audit. Slot-peer counts are computed
 * in-memory across the input batch.
 */
export function triageBatch(rows: AuditRow[]): TriageDecision[] {
  // Count rows per slot (excluding self in the per-row lookup below).
  const slotCounts = new Map<string, number>();
  for (const r of rows) {
    if (!r.canonicalCuisine || !r.archetype) continue;
    const key = `${r.canonicalCuisine} ${r.archetype}`;
    slotCounts.set(key, (slotCounts.get(key) ?? 0) + 1);
  }
  return rows.map((r) => {
    const key =
      r.canonicalCuisine && r.archetype
        ? `${r.canonicalCuisine} ${r.archetype}`
        : null;
    const peerCount = key ? Math.max(0, (slotCounts.get(key) ?? 1) - 1) : 0;
    return triageRow(r, peerCount);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Adapter-injectable applier
// ──────────────────────────────────────────────────────────────────────────

export interface TriageAdapter {
  softDelete: (
    recipeId: string,
    audit: {
      composite: number;
      suggestedAction: string;
      reasonCodes: string[];
      isOnlyInstance: boolean;
      hardDeleteAfter: Date;
    },
  ) => Promise<void>;
  markRebuildRequired: (recipeId: string, reason: string) => Promise<void>;
  enqueueBackfill: (
    recipeId: string,
    kinds: BackfillKind[],
  ) => Promise<void>;
}

export interface ApplyTriageStats {
  kept: number;
  improved: number;
  reviewing: number;
  softDeleted: number;
  rebuildRequired: number;
}

export interface ApplyOptions {
  dryRun?: boolean;
  now?: Date;
  holdDays?: number;
}

export async function applyTriage(
  decisions: TriageDecision[],
  rowsById: Map<string, AuditRow>,
  adapter: TriageAdapter,
  options: ApplyOptions = {},
): Promise<ApplyTriageStats> {
  const stats: ApplyTriageStats = {
    kept: 0,
    improved: 0,
    reviewing: 0,
    softDeleted: 0,
    rebuildRequired: 0,
  };
  const now = options.now ?? new Date();
  const holdDays = options.holdDays ?? SOFT_DELETE_HOLD_DAYS;
  const hardDeleteAfter = new Date(
    now.getTime() + holdDays * 24 * 60 * 60 * 1000,
  );

  for (const d of decisions) {
    switch (d.action) {
      case 'keep':
        stats.kept++;
        break;
      case 'review':
        stats.reviewing++;
        break;
      case 'improve':
        stats.improved++;
        if (!options.dryRun && d.backfills.length > 0) {
          await adapter.enqueueBackfill(d.recipeId, d.backfills);
        }
        break;
      case 'rebuild_required':
        stats.rebuildRequired++;
        if (!options.dryRun) {
          await adapter.markRebuildRequired(d.recipeId, d.reason);
        }
        break;
      case 'soft_delete': {
        stats.softDeleted++;
        if (!options.dryRun) {
          const row = rowsById.get(d.recipeId);
          await adapter.softDelete(d.recipeId, {
            composite: row?.composite ?? 0,
            suggestedAction: 'delete_candidate',
            reasonCodes: row?.failureReasons.map((r) => r.code) ?? [],
            isOnlyInstance: row?.isOnlyInstanceOf ?? false,
            hardDeleteAfter,
          });
        }
        break;
      }
    }
  }
  return stats;
}
