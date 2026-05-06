// backend/__tests__/services/migrateCuisineToCanonicalService.test.ts
// ROADMAP 4.0 Tier D3 — Migration script (TDD via in-memory adapter).

import {
  migrateCuisineToCanonical,
  MigrationAdapter,
  RecipeRow,
} from '../../src/services/migrateCuisineToCanonicalService';

class MemoryAdapter implements MigrationAdapter {
  rows: RecipeRow[];
  updates: Array<{ id: string; canonicalCuisine: string | null; subCuisine: string | null }> = [];

  constructor(initial: RecipeRow[]) {
    this.rows = initial.map((r) => ({ ...r }));
  }

  async findMany(): Promise<RecipeRow[]> {
    return this.rows.map((r) => ({ ...r }));
  }

  async update(
    id: string,
    fields: { canonicalCuisine: string | null; subCuisine: string | null },
  ): Promise<void> {
    this.updates.push({ id, ...fields });
    const row = this.rows.find((r) => r.id === id);
    if (row) {
      row.canonicalCuisine = fields.canonicalCuisine;
      row.subCuisine = fields.subCuisine;
    }
  }
}

const fixture = (): RecipeRow[] => [
  { id: 'r1', cuisine: 'Persian', canonicalCuisine: null, subCuisine: null },
  { id: 'r2', cuisine: 'Italian', canonicalCuisine: null, subCuisine: null },
  { id: 'r3', cuisine: 'Sicilian', canonicalCuisine: null, subCuisine: null },
  { id: 'r4', cuisine: 'Soul Food', canonicalCuisine: null, subCuisine: null },
  { id: 'r5', cuisine: 'Tex-Mex', canonicalCuisine: null, subCuisine: null },
  { id: 'r6', cuisine: 'Michoacán', canonicalCuisine: null, subCuisine: null },
  { id: 'r7', cuisine: 'Mediterranean', canonicalCuisine: null, subCuisine: null },
  { id: 'r8', cuisine: 'Klingon Imperial', canonicalCuisine: null, subCuisine: null },
  { id: 'r9', cuisine: null, canonicalCuisine: null, subCuisine: null },
];

describe('migrateCuisineToCanonical', () => {
  it('resolves canonical, sub, and Michoacán correctly', async () => {
    const adapter = new MemoryAdapter(fixture());
    const stats = await migrateCuisineToCanonical(adapter);
    expect(stats.total).toBe(9);
    expect(adapter.rows.find((r) => r.id === 'r1')?.canonicalCuisine).toBe('persian');
    expect(adapter.rows.find((r) => r.id === 'r3')?.canonicalCuisine).toBe('italian');
    expect(adapter.rows.find((r) => r.id === 'r3')?.subCuisine).toBe('sicilian');
    expect(adapter.rows.find((r) => r.id === 'r4')?.canonicalCuisine).toBe('american');
    expect(adapter.rows.find((r) => r.id === 'r4')?.subCuisine).toBe('soul_food');
    expect(adapter.rows.find((r) => r.id === 'r6')?.canonicalCuisine).toBe('mexican');
    expect(adapter.rows.find((r) => r.id === 'r6')?.subCuisine).toBe('michoacan');
  });

  it('marks deprecated umbrellas (Mediterranean) without orphaning', async () => {
    const adapter = new MemoryAdapter(fixture());
    await migrateCuisineToCanonical(adapter);
    expect(adapter.rows.find((r) => r.id === 'r7')?.canonicalCuisine).toBe('mediterranean');
  });

  it('reports unresolved rows with sample list (Klingon + null cuisine)', async () => {
    const adapter = new MemoryAdapter(fixture());
    const stats = await migrateCuisineToCanonical(adapter);
    expect(stats.unresolved).toBe(2); // klingon + null
    expect(stats.unresolvedSamples).toContain('Klingon Imperial');
  });

  it('preserves original cuisine string (reversibility)', async () => {
    const adapter = new MemoryAdapter(fixture());
    await migrateCuisineToCanonical(adapter);
    for (const r of adapter.rows) {
      const orig = fixture().find((f) => f.id === r.id)!;
      expect(r.cuisine).toBe(orig.cuisine);
    }
  });

  it('is idempotent — running twice produces same end state, second run all unchanged', async () => {
    const adapter = new MemoryAdapter(fixture());
    await migrateCuisineToCanonical(adapter);
    const updatesAfterFirst = adapter.updates.length;
    const stats2 = await migrateCuisineToCanonical(adapter);
    expect(stats2.unchanged).toBe(9);
    expect(stats2.updated).toBe(0);
    // Second run should not have appended any new updates
    expect(adapter.updates.length).toBe(updatesAfterFirst);
  });

  it('honors dryRun — computes stats but never calls adapter.update', async () => {
    const adapter = new MemoryAdapter(fixture());
    const stats = await migrateCuisineToCanonical(adapter, { dryRun: true });
    expect(stats.updated).toBe(7); // 7 rows would change (r1-r7), r8/r9 are unresolved → null → unchanged from null
    expect(adapter.updates).toEqual([]);
  });

  it('counts unresolved-and-already-null rows as unchanged (not updated)', async () => {
    const adapter = new MemoryAdapter([
      { id: 'r1', cuisine: 'Klingon', canonicalCuisine: null, subCuisine: null },
      { id: 'r2', cuisine: null, canonicalCuisine: null, subCuisine: null },
    ]);
    const stats = await migrateCuisineToCanonical(adapter);
    expect(stats.unresolved).toBe(2);
    expect(stats.unchanged).toBe(2);
    expect(stats.updated).toBe(0);
  });
});
