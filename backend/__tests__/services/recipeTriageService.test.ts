// backend/__tests__/services/recipeTriageService.test.ts
// ROADMAP 4.0 Tier D7 — Phase 2 triage.

import {
  triageRow,
  triageBatch,
  applyTriage,
  TriageAdapter,
  BackfillKind,
  MIN_PEERS_FOR_DELETE,
  SOFT_DELETE_HOLD_DAYS,
} from '../../src/services/recipeTriageService';
import type { AuditRow } from '../../src/services/auditRunService';

const baseRow = (overrides: Partial<AuditRow> = {}): AuditRow => ({
  recipeId: 'r1',
  canonicalCuisine: 'persian',
  subCuisine: null,
  archetype: 'weekend_project',
  composite: 100,
  imageScore: 5,
  structureScore: 5,
  nutritionScore: 5,
  voiceScore: 5,
  dedupeScore: 5,
  safetyScore: 5,
  failureReasons: [],
  suggestedAction: 'keep',
  isOnlyInstanceOf: false,
  ...overrides,
});

describe('triageRow', () => {
  it('keep → action=keep, no backfills', () => {
    const d = triageRow(baseRow(), 5);
    expect(d.action).toBe('keep');
    expect(d.backfills).toEqual([]);
  });

  it('improve → enqueue backfills based on failure codes', () => {
    const d = triageRow(
      baseRow({
        suggestedAction: 'improve',
        composite: 65,
        failureReasons: [
          { axis: 'image', code: 'low_resolution' },
          { axis: 'voice', code: 'banned_vocabulary' },
        ],
      }),
      5,
    );
    expect(d.action).toBe('improve');
    expect(d.backfills.sort()).toEqual<BackfillKind[]>(['copy', 'image']);
  });

  it('review → no automated action', () => {
    const d = triageRow(
      baseRow({ suggestedAction: 'review', composite: 40 }),
      5,
    );
    expect(d.action).toBe('review');
    expect(d.backfills).toEqual([]);
  });

  it('delete_candidate + isOnlyInstance=true → rebuild_required (never delete)', () => {
    const d = triageRow(
      baseRow({
        suggestedAction: 'delete_candidate',
        composite: 25,
        isOnlyInstanceOf: true,
      }),
      0,
    );
    expect(d.action).toBe('rebuild_required');
  });

  it('delete_candidate + slotPeerCount < MIN_PEERS → rebuild_required (would shrink coverage)', () => {
    const d = triageRow(
      baseRow({ suggestedAction: 'delete_candidate', composite: 25 }),
      MIN_PEERS_FOR_DELETE - 1,
    );
    expect(d.action).toBe('rebuild_required');
    expect(d.reason).toContain('coverage');
  });

  it('delete_candidate + slotPeerCount ≥ MIN_PEERS + isOnlyInstance=false → soft_delete', () => {
    const d = triageRow(
      baseRow({ suggestedAction: 'delete_candidate', composite: 25 }),
      MIN_PEERS_FOR_DELETE,
    );
    expect(d.action).toBe('soft_delete');
  });
});

describe('triageBatch', () => {
  it('computes slot peer counts in-memory and routes deletions correctly', () => {
    // 4 persian × weekend_project recipes; one is delete_candidate.
    // Peer count for the deletion candidate = 3 (the others). Should pass MIN_PEERS_FOR_DELETE.
    const rows: AuditRow[] = [
      baseRow({ recipeId: 'r1' }),
      baseRow({ recipeId: 'r2' }),
      baseRow({ recipeId: 'r3' }),
      baseRow({
        recipeId: 'r4',
        suggestedAction: 'delete_candidate',
        composite: 20,
      }),
    ];
    const decisions = triageBatch(rows);
    expect(decisions.find((d) => d.recipeId === 'r4')!.action).toBe('soft_delete');
  });

  it('protects single-occupant slots from deletion via isOnlyInstance signal', () => {
    const rows: AuditRow[] = [
      baseRow({
        recipeId: 'lone',
        canonicalCuisine: 'senegalese',
        archetype: 'comfort_stew',
        suggestedAction: 'delete_candidate',
        composite: 15,
        isOnlyInstanceOf: true,
      }),
    ];
    const decisions = triageBatch(rows);
    expect(decisions[0].action).toBe('rebuild_required');
  });
});

describe('applyTriage (adapter-injectable)', () => {
  function makeAdapter(): TriageAdapter & {
    softDeleteCalls: any[];
    markCalls: any[];
    backfillCalls: any[];
  } {
    const a: any = {
      softDeleteCalls: [],
      markCalls: [],
      backfillCalls: [],
      softDelete: async (id: string, audit: any) => {
        a.softDeleteCalls.push({ id, audit });
      },
      markRebuildRequired: async (id: string, reason: string) => {
        a.markCalls.push({ id, reason });
      },
      enqueueBackfill: async (id: string, kinds: BackfillKind[]) => {
        a.backfillCalls.push({ id, kinds });
      },
    };
    return a;
  }

  it('counts decisions and dispatches calls per action', async () => {
    const rows: AuditRow[] = [
      baseRow({ recipeId: 'k', suggestedAction: 'keep' }),
      baseRow({
        recipeId: 'i',
        suggestedAction: 'improve',
        composite: 65,
        failureReasons: [{ axis: 'image', code: 'low_resolution' }],
      }),
      baseRow({ recipeId: 'rv', suggestedAction: 'review', composite: 40 }),
    ];
    const decisions = triageBatch(rows);
    const map = new Map(rows.map((r) => [r.recipeId, r]));
    const adapter = makeAdapter();
    const stats = await applyTriage(decisions, map, adapter);
    expect(stats).toEqual({
      kept: 1,
      improved: 1,
      reviewing: 1,
      softDeleted: 0,
      rebuildRequired: 0,
    });
    expect(adapter.backfillCalls).toHaveLength(1);
    expect(adapter.backfillCalls[0].kinds).toEqual(['image']);
  });

  it('soft-delete writes audit with hardDeleteAfter = now + holdDays', async () => {
    const row = baseRow({
      recipeId: 'd1',
      suggestedAction: 'delete_candidate',
      composite: 15,
      failureReasons: [{ axis: 'voice', code: 'banned_vocabulary' }],
    });
    // Need ≥3 peers for soft_delete path
    const rows = [
      row,
      baseRow({ recipeId: 'p1' }),
      baseRow({ recipeId: 'p2' }),
      baseRow({ recipeId: 'p3' }),
    ];
    const decisions = triageBatch(rows);
    const map = new Map(rows.map((r) => [r.recipeId, r]));
    const adapter = makeAdapter();
    const now = new Date('2026-05-05T00:00:00Z');
    await applyTriage(decisions, map, adapter, { now });
    expect(adapter.softDeleteCalls).toHaveLength(1);
    const call = adapter.softDeleteCalls[0];
    expect(call.id).toBe('d1');
    expect(call.audit.composite).toBe(15);
    expect(call.audit.reasonCodes).toEqual(['banned_vocabulary']);
    const expectedHard = new Date(
      now.getTime() + SOFT_DELETE_HOLD_DAYS * 24 * 60 * 60 * 1000,
    );
    expect(call.audit.hardDeleteAfter.getTime()).toBe(expectedHard.getTime());
  });

  it('honors dryRun — never calls adapter', async () => {
    const rows: AuditRow[] = [
      baseRow({
        recipeId: 'd1',
        suggestedAction: 'delete_candidate',
        composite: 15,
      }),
      baseRow({ recipeId: 'p1' }),
      baseRow({ recipeId: 'p2' }),
      baseRow({ recipeId: 'p3' }),
    ];
    const decisions = triageBatch(rows);
    const map = new Map(rows.map((r) => [r.recipeId, r]));
    const adapter = makeAdapter();
    const stats = await applyTriage(decisions, map, adapter, { dryRun: true });
    expect(stats.softDeleted).toBe(1);
    expect(adapter.softDeleteCalls).toEqual([]);
    expect(adapter.markCalls).toEqual([]);
    expect(adapter.backfillCalls).toEqual([]);
  });

  it('rebuild_required calls markRebuildRequired with reason', async () => {
    const rows: AuditRow[] = [
      baseRow({
        recipeId: 'lone',
        canonicalCuisine: 'senegalese',
        archetype: 'comfort_stew',
        suggestedAction: 'delete_candidate',
        composite: 10,
        isOnlyInstanceOf: true,
      }),
    ];
    const decisions = triageBatch(rows);
    const map = new Map(rows.map((r) => [r.recipeId, r]));
    const adapter = makeAdapter();
    await applyTriage(decisions, map, adapter);
    expect(adapter.markCalls).toHaveLength(1);
    expect(adapter.markCalls[0].id).toBe('lone');
  });
});
