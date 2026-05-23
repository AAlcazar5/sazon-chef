// backend/src/services/cookContextExportService.ts
//
// X-B1 (founder roadmap Tier X — Moat Hardening): structured "cook
// context" export. Versioned, PII-aware, deterministic. Users hand
// this to any external kitchen / model so it can "cook like it knows
// them" — flips the dependency: instead of Sazon depending on
// Claude/ChatGPT/etc. to be the cook-mode, we make THEIR cook-modes
// depend on the structured taste/restrictions/history Sazon owns.
//
// Defining the contract:
//   - Versioned (`version: 'v1'`) so future fields can be added
//     additively without breaking consumers.
//   - PII-aware: no email, no display name, no free-text profile, no
//     per-item pantry list (categories + counts only).
//   - Deterministic: same user state + same call → byte-identical
//     output. Lists are sorted alphabetically inside the response so
//     two consecutive exports diff cleanly.
//   - Allowlist schema: only fields enumerated below are returned.
//     Adding a field is a deliberate version bump.

import { z } from 'zod';

/** Structural-only prisma surface — pins the exact methods the service
 *  uses without binding to the global `ExtendedPrismaClient` type. Lets
 *  tests pass the shared `prisma` mock from tests/setup.ts as-is. */
type PrismaLike = {
  userPreferences: {
    findUnique: (args: {
      where: { userId: string };
      include?: Record<string, boolean>;
    }) => Promise<{
      spiceLevel?: string | null;
      cookingSkillLevel?: string | null;
      likedCuisines?: Array<{ name: string }>;
      dietaryRestrictions?: Array<{ name: string }>;
      bannedIngredients?: Array<{ name: string }>;
    } | null>;
  };
  pantryItem: {
    findMany: (args: {
      where: { userId: string };
      select: { category: true };
    }) => Promise<Array<{ category: string | null }>>;
  };
  cookingLog: {
    findMany: (args: {
      where: { userId: string };
      orderBy: { cookedAt: 'desc' };
      take: number;
      select: { cookedAt: true; recipe: { select: { title: true; cuisine: true } } };
    }) => Promise<
      Array<{
        cookedAt: Date;
        recipe: { title: string; cuisine: string | null } | null;
      }>
    >;
  };
};

/** Versioned schema. Bump when fields are added/removed. */
export const cookContextV1Schema = z.object({
  version: z.literal('v1'),
  taste: z.object({
    likedCuisines: z.array(z.string()),
    spiceLevel: z.string().nullable(),
  }),
  restrictions: z.object({
    /** Allergens are NEVER droppable — even when the rest of the
     *  export is empty (new user). */
    allergens: z.array(z.string()),
    dietary: z.array(z.string()),
    bannedIngredients: z.array(z.string()),
  }),
  pantrySummary: z.object({
    itemCount: z.number().int().min(0),
    topCategories: z.array(z.string()),
  }),
  recentCooks: z.array(
    z.object({
      recipeName: z.string(),
      cuisine: z.string().nullable(),
      cookedAt: z.string(), // ISO-8601
    }),
  ),
  skillTier: z
    .enum(['beginner', 'home_cook', 'confident', 'chef'])
    .nullable(),
});

export type CookContextV1 = z.infer<typeof cookContextV1Schema>;

const RECENT_COOKS_LIMIT = 10;
const PANTRY_TOP_CATEGORIES = 5;

/** Sort + dedupe + trim — deterministic ordering for byte-identical
 *  exports across calls. Lowercase comparison; original case preserved
 *  on the way out. */
function normalizeStringList(input: ReadonlyArray<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

interface BuildInput {
  prisma: PrismaLike;
  userId: string;
}

/**
 * Build the v1 export for a single user. Returns the empty-but-valid
 * shape (every field present, lists empty) for a brand-new user — the
 * consumer never has to special-case "user has no data yet".
 *
 * Throws only on database errors; the caller is responsible for
 * mapping those to a 5xx response.
 */
export async function buildCookContextExport({
  prisma,
  userId,
}: BuildInput): Promise<CookContextV1> {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
    include: {
      likedCuisines: true,
      dietaryRestrictions: true,
      bannedIngredients: true,
    },
  });

  // Allergens: backed by the same BannedIngredient table but tagged.
  // For now we treat ALL banned ingredients as allergens since the
  // schema doesn't separate them; this matches the safety-gate
  // contract (over-restrict beats under-restrict on health risk).
  const allergens = normalizeStringList(
    (prefs?.bannedIngredients ?? []).map((b) => b.name),
  );
  const dietary = normalizeStringList(
    (prefs?.dietaryRestrictions ?? []).map((d) => d.name),
  );
  const bannedIngredients = normalizeStringList(
    (prefs?.bannedIngredients ?? []).map((b) => b.name),
  );
  const likedCuisines = normalizeStringList(
    (prefs?.likedCuisines ?? []).map((c) => c.name),
  );

  // Pantry summary — counts + categories, NEVER per-item names.
  const pantryItems = await prisma.pantryItem.findMany({
    where: { userId },
    select: { category: true },
  });
  const categoryCounts = new Map<string, number>();
  for (const item of pantryItems) {
    const cat = item.category?.trim();
    if (!cat || cat.length === 0) continue;
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
  }
  const topCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].toLowerCase().localeCompare(b[0].toLowerCase());
    })
    .slice(0, PANTRY_TOP_CATEGORIES)
    .map(([name]) => name);

  // Recent cooks: last N, recipe NAME + cuisine + ISO timestamp only.
  // No notes, no rating text, no per-cook free-text.
  const recentCookRows = await prisma.cookingLog.findMany({
    where: { userId },
    orderBy: { cookedAt: 'desc' },
    take: RECENT_COOKS_LIMIT,
    select: {
      cookedAt: true,
      recipe: { select: { title: true, cuisine: true } },
    },
  });
  const recentCooks = recentCookRows
    .filter((r) => r.recipe?.title)
    .map((r) => ({
      recipeName: r.recipe!.title,
      cuisine: r.recipe!.cuisine ?? null,
      cookedAt: r.cookedAt.toISOString(),
    }));

  // Skill tier — map the storage enum to the allowlisted set.
  const rawSkill = prefs?.cookingSkillLevel ?? null;
  const skillTier =
    rawSkill === 'beginner' ||
    rawSkill === 'home_cook' ||
    rawSkill === 'confident' ||
    rawSkill === 'chef'
      ? rawSkill
      : null;

  const exportPayload: CookContextV1 = {
    version: 'v1',
    taste: {
      likedCuisines,
      spiceLevel: prefs?.spiceLevel ?? null,
    },
    restrictions: {
      allergens,
      dietary,
      bannedIngredients,
    },
    pantrySummary: {
      itemCount: pantryItems.length,
      topCategories,
    },
    recentCooks,
    skillTier,
  };

  // Belt-and-suspenders: re-validate against the schema before
  // returning. Catches accidental drift (e.g., an enum we forgot to
  // map) at the function boundary instead of in the consumer.
  return cookContextV1Schema.parse(exportPayload);
}
