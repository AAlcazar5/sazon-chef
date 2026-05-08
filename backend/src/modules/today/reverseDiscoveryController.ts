// backend/src/modules/today/reverseDiscoveryController.ts
// ROADMAP 4.0 I2.4 — reverse-discovery HTTP layer.
//
// GET /api/today/reverse-discovery
//
// Reads the user's locale from the User row (defaults to en-US when null),
// pulls cooking history (canonical ingredient names ever cooked), and asks
// the pure service for today's candidates. Response shape is null-friendly
// so the frontend card can mount conditionally without extra payload.
import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';
import { logger } from '@/utils/logger';
import {
  pickReverseDiscovery,
  composeDiscoveryCopy,
  type ReverseDiscoveryCandidate,
} from '@/services/reverseDiscoveryService';
import { STARTER_LOCAL_EQUIVALENTS } from '@/data/ingredientLocalEquivalents';
import { normalizeIngredientName } from '@/services/ingredientLocalService';

interface CookedRecipeRow {
  recipe: { ingredients: Array<{ text: string }> } | null;
}

interface UserLocaleRow {
  locale: string | null;
}

/** Strip "1 cup", "2 tbsp", trailing prep notes, etc. and lowercase. */
function extractCanonicalsFromText(text: string): string[] {
  // Cheap heuristic: split on commas, take the first chunk, drop a leading
  // quantity ("2 cups") and parens, collapse whitespace, normalize.
  const head = text.split(',')[0] ?? text;
  const noQty = head.replace(/^\s*\d+(\s+\d+\/\d+|\.\d+|\/\d+)?\s*\w*\.?\s*/, '');
  const noParens = noQty.replace(/\(.*?\)/g, '').trim();
  if (!noParens) return [];
  return [normalizeIngredientName(noParens)];
}

/** Derive the user's "ever cooked" canonical-ingredient set. */
async function buildCookedSet(userId: string): Promise<Set<string>> {
  const rows = (await (prisma as any).cookingLog.findMany({
    where: { userId },
    select: {
      recipe: { select: { ingredients: { select: { text: true } } } },
    },
  })) as CookedRecipeRow[];
  const out = new Set<string>();
  for (const r of rows) {
    for (const ing of r.recipe?.ingredients ?? []) {
      for (const c of extractCanonicalsFromText(ing.text)) {
        if (c) out.add(c);
      }
    }
  }
  return out;
}

export const getReverseDiscovery = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const user = (await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { locale: true },
    })) as UserLocaleRow | null;
    const locale = user?.locale ?? 'en';

    // No surface for en-only users — discovery requires the locale layer
    // to add value. This is the n=1 international wedge, not a US feature.
    if (locale === 'en' || locale === 'en-US') {
      res.json({ candidate: null, copy: null });
      return;
    }

    const cooked = await buildCookedSet(userId);
    const candidates = pickReverseDiscovery({
      userId,
      locale,
      catalog: STARTER_LOCAL_EQUIVALENTS,
      cookedCanonicals: cooked,
      asOfDate: new Date(),
      limit: 1,
    });

    if (candidates.length === 0) {
      res.json({ candidate: null, copy: null });
      return;
    }
    const candidate = candidates[0];
    const copy = composeDiscoveryCopy(candidate);
    const payload: { candidate: ReverseDiscoveryCandidate; copy: ReturnType<typeof composeDiscoveryCopy> } = {
      candidate,
      copy,
    };
    res.json(payload);
  } catch (err) {
    logger.error({ err }, 'I2.4 getReverseDiscovery failed');
    res.status(500).json({ error: 'Failed to load reverse-discovery surface' });
  }
};
