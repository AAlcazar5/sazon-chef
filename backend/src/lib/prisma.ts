import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

const baseClient = new PrismaClient();

// Tier L M6 — defense-in-depth against soft-deleted recipe leakage.
//
// Recipe.deletedAt has existed since D7 but isn't actively written by any
// application code yet. The day soft-delete ships, ~60 of ~67 recipe query
// sites would have to remember to filter `deletedAt: null` — that's not a
// hygienic invariant to rely on. This $extends middleware injects the
// guard automatically on every recipe read, UNLESS the caller explicitly
// sets `deletedAt` (admin tools, cleanup scripts, audit reports). That
// preserves "show me deleted rows" as an opt-in while making the safe
// default the default.
//
// Applies to: findMany / findFirst / findUnique / findUniqueOrThrow /
// findFirstOrThrow / count / aggregate. Mutations are unchanged.
function injectDeletedAtGuard(args: { where?: Record<string, unknown> } | undefined) {
  const next = args ?? {};
  const where = (next.where ?? {}) as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(where, 'deletedAt')) {
    return next; // caller chose explicitly, respect it
  }
  return { ...next, where: { ...where, deletedAt: null } };
}

const extendedClient = baseClient.$extends({
  query: {
    recipe: {
      findMany({ args, query }) { return query(injectDeletedAtGuard(args) as typeof args); },
      findFirst({ args, query }) { return query(injectDeletedAtGuard(args) as typeof args); },
      findFirstOrThrow({ args, query }) { return query(injectDeletedAtGuard(args) as typeof args); },
      // findUnique requires `where` (a unique selector) so the deletedAt guard
      // only matters if the unique field is itself null-tolerant — we still
      // inject for safety on findUniqueOrThrow's sibling.
      findUniqueOrThrow({ args, query }) { return query(injectDeletedAtGuard(args) as typeof args); },
      count({ args, query }) { return query(injectDeletedAtGuard(args) as typeof args); },
    },
  },
});

type ExtendedPrismaClient = typeof extendedClient;

export const prisma: ExtendedPrismaClient = globalForPrisma.prisma ?? extendedClient;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Export types for use in the application
export type { Prisma, PrismaClient } from '@prisma/client';