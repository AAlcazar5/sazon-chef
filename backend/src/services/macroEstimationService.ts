// backend/src/services/macroEstimationService.ts
// Group 10X Phase 10 — estimate macros for free-text custom Build-a-Plate items.
// Hybrid path: USDA FoodData Central first, LLM (Anthropic) fallback.

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';
import type { ComponentSlot } from './mealComponentService';

export type MacroSource = 'usda' | 'ai' | 'fallback';
export type MacroConfidence = 'high' | 'estimated' | 'unknown';

export interface EstimateRequest {
  name: string;
  slot: ComponentSlot;
  portionGrams: number;
}

export interface EstimateResult {
  caloriesPerPortion: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  source: MacroSource;
  confidence: MacroConfidence;
  matchedName?: string;
}

const USDA_FUZZY_THRESHOLD = 0.7;
const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const MACRO_BOUNDS = {
  caloriesPerPortion: { min: 0, max: 2000 },
  proteinG: { min: 0, max: 200 },
  carbsG: { min: 0, max: 300 },
  fatG: { min: 0, max: 200 },
  fiberG: { min: 0, max: 100 },
} as const;

interface CacheEntry {
  result: EstimateResult;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

const FALLBACK_RESULT: Omit<EstimateResult, 'source' | 'confidence'> = {
  caloriesPerPortion: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: 0,
};

const normalize = (s: string): string =>
  s.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');

const cacheKey = (name: string, grams: number) => `${normalize(name)}|${grams}`;

const tokens = (s: string): string[] =>
  normalize(s).split(' ').filter(Boolean);

/**
 * Query-precision match score: |query ∩ matched| / |query|.
 * "How much of what the user typed shows up in the matched name."
 * Robust for short queries against verbose USDA descriptions
 * ("avocado" vs "Avocado, raw" → 1.0).
 */
function matchScore(query: string, matched: string): number {
  const q = new Set(tokens(query));
  const m = new Set(tokens(matched));
  if (q.size === 0) return 0;
  let overlap = 0;
  q.forEach((t) => {
    if (m.has(t)) overlap += 1;
  });
  return overlap / q.size;
}

interface UsdaNutrient {
  nutrientName?: string;
  value?: number;
}

interface UsdaFood {
  fdcId: number;
  description: string;
  dataType: string;
  foodNutrients: UsdaNutrient[];
}

function nutrientValue(food: UsdaFood, name: string): number {
  const match = food.foodNutrients.find(
    (n) => (n.nutrientName ?? '').toLowerCase() === name.toLowerCase(),
  );
  return match?.value ?? 0;
}

function scaleToPortion(food: UsdaFood, grams: number) {
  const factor = grams / 100;
  return {
    caloriesPerPortion: nutrientValue(food, 'Energy') * factor,
    proteinG: nutrientValue(food, 'Protein') * factor,
    carbsG: nutrientValue(food, 'Carbohydrate, by difference') * factor,
    fatG: nutrientValue(food, 'Total lipid (fat)') * factor,
    fiberG: nutrientValue(food, 'Fiber, total dietary') * factor,
  };
}

async function searchUSDA(name: string): Promise<UsdaFood | null> {
  const apiKey = process.env.FDC_API_KEY;
  if (!apiKey) return null;

  const params = new URLSearchParams({
    api_key: apiKey,
    query: name,
    dataType: 'Foundation,SR Legacy',
    pageSize: '5',
  });

  try {
    const res = await fetch(`${USDA_SEARCH_URL}?${params.toString()}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { foods?: UsdaFood[] };
    const foods = data.foods ?? [];
    if (foods.length === 0) return null;

    const top = foods[0];
    const score = matchScore(name, top.description);
    if (score < USDA_FUZZY_THRESHOLD) return null;
    return top;
  } catch (err) {
    logger.warn({ err, name }, 'USDA search failed');
    return null;
  }
}

function withinBounds(macros: Omit<EstimateResult, 'source' | 'confidence' | 'matchedName'>): boolean {
  return (
    macros.caloriesPerPortion >= MACRO_BOUNDS.caloriesPerPortion.min &&
    macros.caloriesPerPortion <= MACRO_BOUNDS.caloriesPerPortion.max &&
    macros.proteinG >= MACRO_BOUNDS.proteinG.min &&
    macros.proteinG <= MACRO_BOUNDS.proteinG.max &&
    macros.carbsG >= MACRO_BOUNDS.carbsG.min &&
    macros.carbsG <= MACRO_BOUNDS.carbsG.max &&
    macros.fatG >= MACRO_BOUNDS.fatG.min &&
    macros.fatG <= MACRO_BOUNDS.fatG.max &&
    macros.fiberG >= MACRO_BOUNDS.fiberG.min &&
    macros.fiberG <= MACRO_BOUNDS.fiberG.max
  );
}

interface LlmEstimate {
  caloriesPerPortion: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

function parseLlmJson(text: string): LlmEstimate | null {
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<LlmEstimate>;
    const required: (keyof LlmEstimate)[] = [
      'caloriesPerPortion',
      'proteinG',
      'carbsG',
      'fatG',
      'fiberG',
    ];
    for (const k of required) {
      if (typeof parsed[k] !== 'number' || !Number.isFinite(parsed[k] as number)) {
        return null;
      }
    }
    return parsed as LlmEstimate;
  } catch {
    return null;
  }
}

async function estimateWithLLM(
  name: string,
  slot: ComponentSlot,
  grams: number,
): Promise<LlmEstimate | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });
  const systemPrompt = `You estimate per-portion macronutrients for foods. Respond with JSON only — no markdown, no commentary.`;
  const userPrompt = `Estimate per-portion macronutrients for this food.

Food: "${name}"
Slot: ${slot}
Portion size: ${grams} grams

Respond with this exact JSON structure (numbers only — grams or kcal as labeled):
{
  "caloriesPerPortion": 0,
  "proteinG": 0,
  "carbsG": 0,
  "fatG": 0,
  "fiberG": 0
}

Use realistic values for the given portion. If you cannot reasonably estimate, return all zeros.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const content = response.content[0];
    if (!content || content.type !== 'text') return null;
    return parseLlmJson(content.text);
  } catch (err) {
    logger.warn({ err, name }, 'LLM macro estimation failed');
    return null;
  }
}

export async function estimateMacros(req: EstimateRequest): Promise<EstimateResult> {
  const key = cacheKey(req.name, req.portionGrams);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const usdaFood = await searchUSDA(req.name);
  if (usdaFood) {
    const scaled = scaleToPortion(usdaFood, req.portionGrams);
    const result: EstimateResult = {
      ...scaled,
      source: 'usda',
      confidence: 'high',
      matchedName: usdaFood.description,
    };
    cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  }

  const llm = await estimateWithLLM(req.name, req.slot, req.portionGrams);
  if (llm && withinBounds(llm)) {
    const result: EstimateResult = {
      ...llm,
      source: 'ai',
      confidence: 'estimated',
    };
    cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  }

  return {
    ...FALLBACK_RESULT,
    source: 'fallback',
    confidence: 'unknown',
  };
}

export const __testing__ = {
  cache,
  matchScore,
  scaleToPortion,
  withinBounds,
  parseLlmJson,
  USDA_FUZZY_THRESHOLD,
};
