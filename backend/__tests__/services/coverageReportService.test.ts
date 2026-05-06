// backend/__tests__/services/coverageReportService.test.ts
// ROADMAP 4.0 Tier D5 — Coverage report.

import {
  computeCoverageRows,
  findGaps,
  rowsToCsv,
  RecipeForCoverage,
} from '../../src/services/coverageReportService';
import { ARCHETYPES } from '../../src/data/cuisineArchetypeMatrix';
import { listAllCanonicals } from '../../src/data/cuisineTaxonomy';

describe('computeCoverageRows', () => {
  it('returns one row per (canonical × archetype) for every known canonical', () => {
    const rows = computeCoverageRows([]);
    const canonicalCount = listAllCanonicals().length;
    expect(rows).toHaveLength(canonicalCount * ARCHETYPES.length);
  });

  it('every row carries canonical, archetype, status, recipeCount, severity', () => {
    const rows = computeCoverageRows([]);
    for (const r of rows.slice(0, 10)) {
      expect(r.canonical).toBeTruthy();
      expect(ARCHETYPES).toContain(r.archetype);
      expect(['required', 'optional', 'n/a']).toContain(r.status);
      expect(typeof r.recipeCount).toBe('number');
      expect(['empty', 'thin', 'ok', 'over', 'na']).toContain(r.severity);
    }
  });

  it('empty catalog → every required slot is severity=empty', () => {
    const rows = computeCoverageRows([]);
    const requiredEmpty = rows.filter(
      (r) => r.status === 'required',
    );
    expect(requiredEmpty.every((r) => r.severity === 'empty')).toBe(true);
  });

  it('counts recipes by (canonical, archetype) — Mexican × breakfast = 3', () => {
    const recipes: RecipeForCoverage[] = [
      { canonicalCuisine: 'mexican', archetype: 'breakfast' },
      { canonicalCuisine: 'mexican', archetype: 'breakfast' },
      { canonicalCuisine: 'mexican', archetype: 'breakfast' },
      { canonicalCuisine: 'mexican', archetype: 'weeknight_main' },
      { canonicalCuisine: 'persian', archetype: 'weekend_project' },
    ];
    const rows = computeCoverageRows(recipes);
    const mexBreakfast = rows.find(
      (r) => r.canonical === 'mexican' && r.archetype === 'breakfast',
    );
    expect(mexBreakfast?.recipeCount).toBe(3);
    expect(mexBreakfast?.severity).toBe('ok');
  });

  it('drops recipes with missing canonicalCuisine or archetype', () => {
    const recipes: RecipeForCoverage[] = [
      { canonicalCuisine: null, archetype: 'breakfast' },
      { canonicalCuisine: 'mexican', archetype: null },
    ];
    const rows = computeCoverageRows(recipes);
    const total = rows.reduce((sum, r) => sum + r.recipeCount, 0);
    expect(total).toBe(0);
  });

  it('severity=thin for required-but-only-1 recipe; severity=empty for required-but-0', () => {
    const recipes: RecipeForCoverage[] = [
      { canonicalCuisine: 'persian', archetype: 'weekend_project' },
    ];
    const rows = computeCoverageRows(recipes);
    const persianWeekend = rows.find(
      (r) => r.canonical === 'persian' && r.archetype === 'weekend_project',
    );
    expect(persianWeekend?.recipeCount).toBe(1);
    expect(persianWeekend?.severity).toBe('thin');

    const persianBreakfast = rows.find(
      (r) => r.canonical === 'persian' && r.archetype === 'breakfast',
    );
    expect(persianBreakfast?.recipeCount).toBe(0);
    // breakfast is optional for persian by default → empty (count=0, optional)
    expect(persianBreakfast?.severity).toBe('empty');
  });

  it('severity=over when recipeCount ≥ 6', () => {
    const recipes: RecipeForCoverage[] = Array.from({ length: 7 }, () => ({
      canonicalCuisine: 'italian',
      archetype: 'weeknight_main' as const,
    }));
    const rows = computeCoverageRows(recipes);
    const italianMain = rows.find(
      (r) => r.canonical === 'italian' && r.archetype === 'weeknight_main',
    );
    expect(italianMain?.severity).toBe('over');
  });

  it('output is deterministic — same input → same row order', () => {
    const recipes: RecipeForCoverage[] = [
      { canonicalCuisine: 'persian', archetype: 'weekend_project' },
      { canonicalCuisine: 'mexican', archetype: 'breakfast' },
    ];
    const a = computeCoverageRows(recipes);
    const b = computeCoverageRows(recipes);
    expect(a).toEqual(b);
  });
});

describe('findGaps', () => {
  it('returns only empty + thin rows', () => {
    const rows = computeCoverageRows([
      { canonicalCuisine: 'persian', archetype: 'weekend_project' },
    ]);
    const gaps = findGaps(rows);
    expect(gaps.every((r) => r.severity === 'empty' || r.severity === 'thin')).toBe(true);
    expect(gaps.length).toBeGreaterThan(0);
  });
});

describe('rowsToCsv', () => {
  it('emits header + per-row CSV with trailing newline', () => {
    const csv = rowsToCsv([
      {
        canonical: 'mexican',
        archetype: 'breakfast',
        status: 'required',
        recipeCount: 3,
        severity: 'ok',
      },
    ]);
    expect(csv).toContain('canonical,archetype,status,recipe_count,severity\n');
    expect(csv).toContain('mexican,breakfast,required,3,ok\n');
  });

  it('handles empty rows array — header only', () => {
    const csv = rowsToCsv([]);
    expect(csv.split('\n')[0]).toBe('canonical,archetype,status,recipe_count,severity');
  });
});
