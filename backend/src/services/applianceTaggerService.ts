// backend/src/services/applianceTaggerService.ts
// ROADMAP 4.0 F3 — appliance category tagging.
//
// Heuristic tagger. Scans title + instructions for appliance keywords.
// Stable: same input always produces the same tag list. Idempotent: tag
// twice and you get the same answer.
//
// Post-launch polish: ML-based tagger trained on user-confirmed cookware,
// cuisine-specific vocabulary, brand-name detection beyond the major SKUs.

import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';

export type ApplianceKey =
  | 'ninja_creami'
  | 'air_fryer'
  | 'waffle_maker'
  | 'instant_pot'
  | 'slow_cooker'
  | 'dutch_oven'
  | 'blender'
  | 'food_processor'
  | 'cast_iron'
  | 'sheet_pan'
  | 'rice_cooker'
  | 'sous_vide';

export interface ApplianceMeta {
  key: ApplianceKey;
  label: string;
  /** Lowercased keywords that indicate this appliance is required. */
  triggers: string[];
}

/**
 * Order matters: when keywords overlap (e.g. "Ninja" alone is ambiguous),
 * the more specific phrase should win. Tagger walks this list in order
 * and short-circuits on the first match per appliance.
 */
export const APPLIANCES: ApplianceMeta[] = [
  {
    key: 'ninja_creami',
    label: 'Ninja Creami',
    triggers: ['ninja creami', 'creami', 'protein ice cream', 'creamify'],
  },
  {
    key: 'air_fryer',
    label: 'Air Fryer',
    triggers: ['air fryer', 'air-fry', 'air fry', 'airfryer'],
  },
  {
    key: 'waffle_maker',
    label: 'Waffle Maker',
    triggers: ['waffle iron', 'waffle maker', 'belgian waffle', 'chaffle'],
  },
  {
    key: 'instant_pot',
    label: 'Instant Pot',
    triggers: ['instant pot', 'instapot', 'pressure cooker', 'electric pressure cooker'],
  },
  {
    key: 'slow_cooker',
    label: 'Slow Cooker',
    triggers: ['slow cooker', 'slow-cooker', 'crock pot', 'crockpot'],
  },
  {
    key: 'dutch_oven',
    label: 'Dutch Oven',
    triggers: ['dutch oven', 'le creuset', 'enameled pot'],
  },
  {
    key: 'blender',
    label: 'Blender',
    triggers: ['high-speed blender', 'vitamix', 'nutribullet', 'blender (high speed)', 'blend until smooth in a high-speed blender'],
  },
  {
    key: 'food_processor',
    label: 'Food Processor',
    triggers: ['food processor', 'cuisinart food processor'],
  },
  {
    key: 'cast_iron',
    label: 'Cast Iron',
    triggers: ['cast iron', 'cast-iron skillet', 'lodge skillet'],
  },
  {
    key: 'sheet_pan',
    label: 'Sheet Pan',
    triggers: ['sheet pan', 'sheet-pan', 'baking sheet'],
  },
  {
    key: 'rice_cooker',
    label: 'Rice Cooker',
    triggers: ['rice cooker', 'zojirushi'],
  },
  {
    key: 'sous_vide',
    label: 'Sous Vide',
    triggers: ['sous vide', 'sous-vide', 'immersion circulator', 'anova precision'],
  },
];

const APPLIANCE_BY_KEY: Map<ApplianceKey, ApplianceMeta> = new Map(
  APPLIANCES.map(a => [a.key, a]),
);

export function isValidApplianceKey(key: string): key is ApplianceKey {
  return APPLIANCE_BY_KEY.has(key as ApplianceKey);
}

/**
 * Detect appliances from a recipe's title + instruction text. Returns the
 * matched appliance keys in the canonical order from APPLIANCES.
 */
export function detectAppliances(text: string): ApplianceKey[] {
  if (!text) return [];
  const haystack = text.toLowerCase();
  const matched: ApplianceKey[] = [];
  for (const appliance of APPLIANCES) {
    for (const trigger of appliance.triggers) {
      if (haystack.includes(trigger)) {
        matched.push(appliance.key);
        break;
      }
    }
  }
  return matched;
}

/** Serialize for the Recipe.appliances column. */
export function serializeAppliances(keys: ApplianceKey[]): string | null {
  if (keys.length === 0) return null;
  return JSON.stringify(keys);
}

/** Parse from the column; returns [] for null/empty/malformed. */
export function parseAppliances(json: string | null | undefined): ApplianceKey[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((k: unknown): k is ApplianceKey =>
      typeof k === 'string' && isValidApplianceKey(k),
    );
  } catch {
    return [];
  }
}

/**
 * Bulk-tag recipes that don't yet have an appliances column. Reads
 * title + instruction text, runs detection, writes the JSON column.
 * Idempotent — re-running re-detects, useful when triggers expand.
 */
export async function bulkTagRecipes(opts: { onlyMissing?: boolean } = {}): Promise<{ scanned: number; tagged: number }> {
  const recipes = await prisma.recipe.findMany({
    where: opts.onlyMissing ? { appliances: null } : {},
    include: { instructions: { select: { text: true } } },
  });

  let tagged = 0;
  for (const r of recipes) {
    const text = [r.title ?? '', r.description ?? '', ...r.instructions.map(i => i.text)].join(' ');
    const keys = detectAppliances(text);
    if (keys.length === 0) continue;
    try {
      await prisma.recipe.update({
        where: { id: r.id },
        data: { appliances: serializeAppliances(keys) },
      });
      tagged += 1;
    } catch (err) {
      logger.warn({ err, recipeId: r.id }, 'applianceTagger.update.failed');
    }
  }

  return { scanned: recipes.length, tagged };
}

export const __forTest = {
  APPLIANCE_BY_KEY,
};
