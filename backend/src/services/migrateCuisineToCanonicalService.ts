// backend/src/services/migrateCuisineToCanonicalService.ts
// ROADMAP 4.0 Tier D3 — Migrate Recipe.cuisine → canonicalCuisine + subCuisine.
//
// Pure function over the resolver (cuisineTaxonomy.ts) and an injectable
// data adapter so the migration is testable without hitting the live DB.
// The CLI wrapper (`scripts/recipes/migrateCuisineToCanonical.ts`) injects
// the real Prisma adapter; tests inject an in-memory adapter.
//
// Reversibility: only writes `canonicalCuisine` + `subCuisine`. The
// original `cuisine` string is preserved untouched.

import { resolveCuisine } from '../data/cuisineTaxonomy';

export interface RecipeRow {
  id: string;
  cuisine: string | null;
  canonicalCuisine: string | null;
  subCuisine: string | null;
}

export interface MigrationAdapter {
  findMany: () => Promise<RecipeRow[]>;
  update: (
    id: string,
    fields: { canonicalCuisine: string | null; subCuisine: string | null },
  ) => Promise<void>;
}

export interface MigrationStats {
  total: number;
  resolved: number;
  unresolved: number;
  unchanged: number;
  updated: number;
  unresolvedSamples: string[]; // up to 10 distinct unresolved cuisine strings
}

export interface MigrationOptions {
  /** When true, compute the plan but do not call adapter.update. */
  dryRun?: boolean;
}

const UNRESOLVED_SAMPLE_CAP = 10;

export async function migrateCuisineToCanonical(
  adapter: MigrationAdapter,
  options: MigrationOptions = {},
): Promise<MigrationStats> {
  const rows = await adapter.findMany();
  const unresolvedSet = new Set<string>();
  let resolved = 0;
  let unresolved = 0;
  let unchanged = 0;
  let updated = 0;

  for (const row of rows) {
    const result = row.cuisine ? resolveCuisine(row.cuisine) : null;
    const nextCanonical = result?.canonical ?? null;
    const nextSub = result?.subCuisine ?? null;

    if (result) {
      resolved++;
    } else {
      unresolved++;
      if (row.cuisine && unresolvedSet.size < UNRESOLVED_SAMPLE_CAP) {
        unresolvedSet.add(row.cuisine);
      }
    }

    const same =
      row.canonicalCuisine === nextCanonical &&
      row.subCuisine === nextSub;
    if (same) {
      unchanged++;
      continue;
    }

    if (!options.dryRun) {
      await adapter.update(row.id, {
        canonicalCuisine: nextCanonical,
        subCuisine: nextSub,
      });
    }
    updated++;
  }

  return {
    total: rows.length,
    resolved,
    unresolved,
    unchanged,
    updated,
    unresolvedSamples: Array.from(unresolvedSet),
  };
}
