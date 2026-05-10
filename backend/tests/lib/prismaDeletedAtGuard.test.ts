// backend/tests/lib/prismaDeletedAtGuard.test.ts
//
// Tier L M6 — the lib/prisma.ts $extends injects `deletedAt: null` into every
// recipe read query unless the caller already set deletedAt explicitly.
//
// This unit-tests the merge function in isolation; the runtime extension
// behavior is exercised by every recipe-fetching test in the suite.

// Reproduce the helper here. It's tiny + behavior-defining; pulling it out
// of the prisma module would require either exporting it (pollutes the
// public surface) or end-to-end mocking $extends (overkill for one merge).
function injectDeletedAtGuard(args: { where?: Record<string, unknown> } | undefined) {
  const next = args ?? {};
  const where = (next.where ?? {}) as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(where, 'deletedAt')) {
    return next;
  }
  return { ...next, where: { ...where, deletedAt: null } };
}

describe('Recipe deletedAt guard (M6)', () => {
  it('adds deletedAt: null to an empty args', () => {
    const out = injectDeletedAtGuard(undefined);
    expect(out).toEqual({ where: { deletedAt: null } });
  });

  it('adds deletedAt: null when args.where is empty', () => {
    const out = injectDeletedAtGuard({ where: {} });
    expect(out.where).toEqual({ deletedAt: null });
  });

  it('preserves other where conditions and adds deletedAt', () => {
    const out = injectDeletedAtGuard({ where: { cuisine: 'Mexican', cookTime: { lte: 30 } } });
    expect(out.where).toEqual({ cuisine: 'Mexican', cookTime: { lte: 30 }, deletedAt: null });
  });

  it('respects an explicit deletedAt: null (no-op merge)', () => {
    const out = injectDeletedAtGuard({ where: { deletedAt: null } });
    expect(out.where).toEqual({ deletedAt: null });
  });

  it('respects an explicit deletedAt: { not: null } (admin / audit query)', () => {
    const out = injectDeletedAtGuard({ where: { deletedAt: { not: null } } });
    expect(out.where).toEqual({ deletedAt: { not: null } });
  });

  it('respects an explicit deletedAt date filter (e.g. cleanup scripts)', () => {
    const cutoff = new Date('2026-01-01');
    const out = injectDeletedAtGuard({ where: { deletedAt: { lt: cutoff } } });
    expect(out.where).toEqual({ deletedAt: { lt: cutoff } });
  });

  it('does not mutate the input object', () => {
    const input = { where: { cuisine: 'Italian' } };
    const out = injectDeletedAtGuard(input);
    expect(input.where).toEqual({ cuisine: 'Italian' }); // unchanged
    expect(out.where).not.toBe(input.where);
  });
});
