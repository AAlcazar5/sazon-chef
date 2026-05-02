// backend/src/services/utteranceComposerService.ts
// Group 10X Phase 7 — voice/utterance composer.
//
// Maps a free-text user utterance ("salmon and brown rice with peanut sauce")
// onto a partially-composed plate by deterministic keyword-to-slot inference.
// The voice transcription itself happens upstream (Group 1's STT pipeline);
// this service receives the resulting transcript.

import { prisma } from '../lib/prisma';

export type ComponentSlot = 'protein' | 'base' | 'vegetable' | 'sauce' | 'garnish';
const ALL_SLOTS: ComponentSlot[] = ['protein', 'base', 'vegetable', 'sauce', 'garnish'];

const MAX_UTTERANCE_LENGTH = 500;

const COOK_METHOD_VERBS: Record<string, string> = {
  roast: 'roast',
  roasted: 'roast',
  bake: 'roast',
  baked: 'roast',
  grill: 'pan_sear',
  grilled: 'pan_sear',
  sear: 'pan_sear',
  pan: 'pan_sear',
  sauteed: 'pan_sear',
  steam: 'simmer',
  steamed: 'simmer',
  boil: 'simmer',
  boiled: 'simmer',
  simmer: 'simmer',
  raw: 'raw',
  fresh: 'raw',
};

const KNOWN_CUISINES = [
  'Mediterranean',
  'Italian',
  'Mexican',
  'Asian',
  'Japanese',
  'Chinese',
  'Korean',
  'Thai',
  'Vietnamese',
  'Indian',
  'Middle Eastern',
  'French',
  'American',
  'Greek',
  'Spanish',
  'African',
];

export interface ComposeFromUtteranceInput {
  userId: string;
  utterance: string;
}

export interface UtteranceComposeResult {
  inferredSlots: Partial<Record<ComponentSlot, string>>;
  cuisineFilter?: string;
  dietaryExcludes: string[];
  cookMethodHints: Partial<Record<ComponentSlot, string>>;
  unmatchedSlots: ComponentSlot[];
}

interface ComponentRow {
  id: string;
  slot: string;
  name: string;
  cuisineTags: string;
  cookMethodHint: string;
}

const normalize = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const extractCuisine = (utterance: string): string | undefined => {
  const lower = utterance.toLowerCase();
  for (const cuisine of KNOWN_CUISINES) {
    if (lower.includes(cuisine.toLowerCase())) return cuisine;
  }
  return undefined;
};

const extractDietaryExcludes = (utterance: string): string[] => {
  const matches = utterance.match(/\bno\s+([a-z][a-z\s-]*?)(?:[,.]|$|\sand\s)/gi) ?? [];
  return matches
    .map((m) => m.replace(/^no\s+/i, '').replace(/[,.]\s*$/, '').trim().toLowerCase())
    .filter((s) => s.length > 0 && s.length < 32);
};

const extractCookMethod = (utterance: string): string | undefined => {
  const tokens = normalize(utterance).split(/\s+/);
  for (const t of tokens) {
    if (t in COOK_METHOD_VERBS) return COOK_METHOD_VERBS[t];
  }
  return undefined;
};

const componentScore = (
  comp: ComponentRow,
  utteranceTokens: Set<string>,
  preferredCookMethod: string | undefined,
  preferredCuisine: string | undefined
): number => {
  const nameTokens = normalize(comp.name).split(/\s+/);
  let nameMatch = 0;
  for (const tok of nameTokens) {
    if (utteranceTokens.has(tok)) nameMatch += 1;
  }
  if (nameMatch === 0) return -1;

  let bonus = 0;
  if (preferredCookMethod && comp.cookMethodHint === preferredCookMethod) bonus += 0.5;
  if (preferredCuisine) {
    try {
      const tags = JSON.parse(comp.cuisineTags) as string[];
      if (tags.includes(preferredCuisine)) bonus += 0.3;
    } catch {
      // ignore malformed tags
    }
  }
  return nameMatch + bonus;
};

export const composePlateFromUtterance = async (
  input: ComposeFromUtteranceInput
): Promise<UtteranceComposeResult> => {
  const utterance = (input.utterance ?? '').slice(0, MAX_UTTERANCE_LENGTH);
  const trimmed = utterance.trim();

  if (trimmed.length === 0) {
    return {
      inferredSlots: {},
      dietaryExcludes: [],
      cookMethodHints: {},
      unmatchedSlots: [...ALL_SLOTS],
    };
  }

  const cuisineFilter = extractCuisine(trimmed);
  const dietaryExcludes = extractDietaryExcludes(trimmed);
  const cookMethod = extractCookMethod(trimmed);
  const utteranceTokens = new Set(normalize(trimmed).split(/\s+/));

  const allComponents = (await (prisma as any).mealComponent.findMany({
    where: { OR: [{ userId: null }, { userId: input.userId }] },
  })) as ComponentRow[];

  const inferredSlots: Partial<Record<ComponentSlot, string>> = {};
  const cookMethodHints: Partial<Record<ComponentSlot, string>> = {};

  for (const slot of ALL_SLOTS) {
    const candidates = allComponents.filter((c) => c.slot === slot);
    if (candidates.length === 0) continue;

    let bestId: string | undefined;
    let bestScore = 0;
    for (const c of candidates) {
      const s = componentScore(c, utteranceTokens, cookMethod, cuisineFilter);
      if (s > bestScore) {
        bestScore = s;
        bestId = c.id;
      }
    }
    if (bestId && bestScore > 0) {
      inferredSlots[slot] = bestId;
      if (cookMethod) cookMethodHints[slot] = cookMethod;
    }
  }

  const unmatchedSlots = ALL_SLOTS.filter((s) => !(s in inferredSlots));

  return {
    inferredSlots,
    cuisineFilter,
    dietaryExcludes,
    cookMethodHints,
    unmatchedSlots,
  };
};
