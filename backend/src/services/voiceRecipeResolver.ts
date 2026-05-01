// backend/src/services/voiceRecipeResolver.ts
// Fuzzy-match a voice utterance against the user's saved recipes.

import Fuse from 'fuse.js';
import { prisma } from '../lib/prisma';

export interface VoiceResolveResult {
  matchType: 'recipe' | 'literal';
  recipeId?: string;
  confidence: number;
  name: string;
}

const CONFIDENCE_THRESHOLD = 0.7;

/**
 * Resolve a voice utterance to either a saved recipe or a literal item name.
 *
 * @param userId    - The authenticated user's ID.
 * @param utterance - Raw transcribed speech, e.g. "add Spaghetti Carbonara".
 * @returns A result describing the best match type and confidence.
 */
export async function resolveVoiceUtterance(
  userId: string,
  utterance: string
): Promise<VoiceResolveResult> {
  // Edge case: empty utterance
  if (!utterance.trim()) {
    return { matchType: 'literal', confidence: 0, name: utterance };
  }

  const recipes = await prisma.recipe.findMany({
    where: { userId },
    select: { id: true, title: true },
  });

  // Edge case: empty cookbook
  if (recipes.length === 0) {
    return { matchType: 'literal', confidence: 0, name: utterance };
  }

  const fuse = new Fuse(recipes, {
    keys: ['title'],
    threshold: 0.3,
    includeScore: true,
    isCaseSensitive: false,
  });

  const results = fuse.search(utterance);

  if (results.length === 0) {
    return { matchType: 'literal', confidence: 0, name: utterance };
  }

  // Fuse score: 0 = perfect match, 1 = no match.  Invert to get confidence.
  const best = results[0];
  const fuseScore = best.score ?? 1;
  const confidence = Math.max(0, Math.min(1, 1 - fuseScore));

  if (confidence >= CONFIDENCE_THRESHOLD) {
    return {
      matchType: 'recipe',
      recipeId: best.item.id,
      confidence,
      name: best.item.title,
    };
  }

  return { matchType: 'literal', confidence, name: utterance };
}
