// backend/src/services/cravingSearchService.ts
// Maps natural language craving descriptions to recipe search keywords using Claude

import Anthropic from '@anthropic-ai/sdk';

export interface CravingMapping {
  searchTerms: string[];
  flavorTags: string[];
  temperature: 'hot' | 'cold' | 'any';
  texturePrefs: string[];
}

export interface CravingActiveFilters {
  cuisines?: string[];
  maxCookTime?: number | null;
  difficulty?: string;
}

const FALLBACK_CRAVING_MAP: Record<string, Partial<CravingMapping>> = {
  cheesy: { searchTerms: ['cheese', 'mac', 'quesadilla', 'grilled', 'fondue'], flavorTags: ['cheesy', 'rich'], temperature: 'hot' },
  spicy: { searchTerms: ['spicy', 'chili', 'hot', 'pepper', 'sriracha'], flavorTags: ['spicy', 'heat'], temperature: 'hot' },
  sweet: { searchTerms: ['dessert', 'chocolate', 'cake', 'cookie', 'ice cream'], flavorTags: ['sweet'], temperature: 'any' },
  comfort: { searchTerms: ['soup', 'stew', 'casserole', 'pasta', 'chicken'], flavorTags: ['comfort', 'hearty'], temperature: 'hot' },
  fresh: { searchTerms: ['salad', 'bowl', 'ceviche', 'gazpacho', 'spring'], flavorTags: ['fresh', 'light'], temperature: 'cold' },
  crunchy: { searchTerms: ['crispy', 'fried', 'roasted', 'chips', 'tempura'], flavorTags: ['crunchy', 'crispy'], temperature: 'any' },
  light: { searchTerms: ['salad', 'bowl', 'broth', 'steamed', 'grilled'], flavorTags: ['light', 'healthy'], temperature: 'any' },
  noodle: { searchTerms: ['noodle', 'pasta', 'ramen', 'soba', 'pad thai'], flavorTags: ['carb', 'savory'], temperature: 'hot' },
};

function buildFallbackMapping(craving: string): CravingMapping {
  const lower = craving.toLowerCase();
  const terms: string[] = [];
  const tags: string[] = [];
  let temperature: CravingMapping['temperature'] = 'any';

  for (const [keyword, mapping] of Object.entries(FALLBACK_CRAVING_MAP)) {
    if (lower.includes(keyword)) {
      terms.push(...(mapping.searchTerms || []));
      tags.push(...(mapping.flavorTags || []));
      if (mapping.temperature && mapping.temperature !== 'any') {
        temperature = mapping.temperature;
      }
    }
  }

  // Fall back to raw words as search terms if nothing matched
  if (terms.length === 0) {
    terms.push(...lower.split(/\s+/).filter(w => w.length > 3));
    terms.push(lower);
  }

  return { searchTerms: [...new Set(terms)], flavorTags: [...new Set(tags)], temperature, texturePrefs: [] };
}

export async function mapCravingToSearchTerms(craving: string): Promise<CravingMapping> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return buildFallbackMapping(craving);
  }

  const client = new Anthropic({ apiKey });

  const systemPrompt = `You are a food expert that maps craving descriptions to recipe search terms.
Given a craving description, extract searchable keywords and flavor characteristics.
Respond with JSON only — no markdown, no explanation.`;

  const userPrompt = `Map this craving to recipe search terms: "${craving}"

Respond with this exact JSON structure:
{
  "searchTerms": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "flavorTags": ["tag1", "tag2"],
  "temperature": "hot" | "cold" | "any",
  "texturePrefs": ["texture1"]
}

Examples:
- "something cheesy and warm" → {"searchTerms":["cheese","mac","quesadilla","grilled","fondue"],"flavorTags":["cheesy","warm"],"temperature":"hot","texturePrefs":["melty"]}
- "cold and refreshing" → {"searchTerms":["salad","ceviche","gazpacho","poke","slaw"],"flavorTags":["fresh","light"],"temperature":"cold","texturePrefs":[]}
- "spicy noodles" → {"searchTerms":["noodle","spicy","dan dan","ramen","pad thai"],"flavorTags":["spicy","savory"],"temperature":"hot","texturePrefs":[]}
- "comfort food but healthy" → {"searchTerms":["soup","stew","lentil","chicken","congee"],"flavorTags":["comfort","hearty"],"temperature":"hot","texturePrefs":[]}
- "something sweet after dinner" → {"searchTerms":["protein","yogurt","mousse","mochi","dessert"],"flavorTags":["sweet"],"temperature":"any","texturePrefs":[]}`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 300,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return buildFallbackMapping(craving);
    }

    const cleaned = content.text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned) as CravingMapping;

    // Validate shape
    if (!Array.isArray(parsed.searchTerms) || parsed.searchTerms.length === 0) {
      return buildFallbackMapping(craving);
    }

    return {
      searchTerms: parsed.searchTerms.slice(0, 8),
      flavorTags: Array.isArray(parsed.flavorTags) ? parsed.flavorTags : [],
      temperature: parsed.temperature || 'any',
      texturePrefs: Array.isArray(parsed.texturePrefs) ? parsed.texturePrefs : [],
    };
  } catch {
    return buildFallbackMapping(craving);
  }
}

/**
 * Score a recipe against craving search terms.
 * Higher score = better match.
 *
 * Scoring rules:
 * - Title hits: diminishing returns (+5, +3, +1 for 1st, 2nd, 3rd+ term hits)
 * - Description/cuisine match: +2 per term
 * - Ingredient match: +1 per term
 * - Instruction-only match: 0.5x multiplier on final score if no other match found
 * - Hero ingredient (term in title OR in ≥3 ingredients): 2x multiplier
 * - Active filter match: +3 per cuisine match, +2 for cookTime, +2 for difficulty
 */
export function scoreCravingMatch(
  recipe: {
    title: string;
    description?: string | null;
    cuisine?: string | null;
    cookTime?: number | null;
    difficulty?: string | null;
    ingredients?: Array<{ text?: string | null }>;
    instructions?: Array<{ text?: string | null }>;
  },
  mapping: CravingMapping,
  activeFilters?: CravingActiveFilters,
): number {
  const titleLower = recipe.title.toLowerCase();
  const descLower = (recipe.description || '').toLowerCase();
  const cuisineLower = (recipe.cuisine || '').toLowerCase();
  const ingredientLines = (recipe.ingredients || []).map(i => (i.text || '').toLowerCase());
  const ingredientText = ingredientLines.join(' ');
  const instructionText = (recipe.instructions || []).map(i => (i.text || '').toLowerCase()).join(' ');

  const fullText = `${titleLower} ${descLower} ${cuisineLower} ${ingredientText}`;

  // Diminishing returns: track how many terms have hit the title
  const titleHitValues = [5, 3, 1]; // 1st hit = +5, 2nd = +3, 3rd+ = +1
  let titleHitCount = 0;

  let score = 0;
  let hasNonInstructionMatch = false;
  let hasInstructionOnlyTerm = false;
  let isHeroIngredientMatch = false;

  for (const term of mapping.searchTerms) {
    const t = term.toLowerCase();

    const inTitle = titleLower.includes(t);
    const inDesc = descLower.includes(t);
    const inCuisine = cuisineLower.includes(t);
    const inIngredients = ingredientText.includes(t);
    const inInstructions = instructionText.includes(t);
    const ingredientHitCount = ingredientLines.filter(line => line.includes(t)).length;

    if (inTitle) {
      const hitValue = titleHitValues[Math.min(titleHitCount, titleHitValues.length - 1)];
      score += hitValue;
      titleHitCount++;
      hasNonInstructionMatch = true;

      // Hero ingredient: term in title counts as hero
      isHeroIngredientMatch = true;
    } else if (inDesc) {
      score += 2;
      hasNonInstructionMatch = true;
    } else if (inCuisine) {
      score += 2;
      hasNonInstructionMatch = true;
    } else if (inIngredients) {
      score += 1;
      hasNonInstructionMatch = true;
    } else if (inInstructions) {
      // Term found only in instructions — mark for penalty
      hasInstructionOnlyTerm = true;
    }

    // Hero ingredient: term appears in ≥3 ingredient lines
    if (!isHeroIngredientMatch && ingredientHitCount >= 3) {
      isHeroIngredientMatch = true;
    }
  }

  for (const tag of mapping.flavorTags) {
    if (fullText.includes(tag.toLowerCase())) score += 1;
  }

  for (const texture of mapping.texturePrefs) {
    if (fullText.includes(texture.toLowerCase())) score += 1;
  }

  // Apply hero ingredient 2x multiplier
  if (isHeroIngredientMatch && score > 0) {
    score *= 2;
  }

  // Apply instruction-only penalty: if the only matches are in instructions, halve the score
  if (!hasNonInstructionMatch && hasInstructionOnlyTerm && score === 0) {
    // Assign a base score then halve it, so the recipe still appears but ranked low
    score = 1;
    score *= 0.5;
  }

  // Filter-aware ranking boosts
  if (activeFilters && score > 0) {
    if (activeFilters.cuisines && activeFilters.cuisines.length > 0) {
      const recipeCuisine = (recipe.cuisine || '').toLowerCase();
      if (activeFilters.cuisines.some(c => c.toLowerCase() === recipeCuisine)) {
        score += 3;
      }
    }
    if (activeFilters.maxCookTime && recipe.cookTime != null && recipe.cookTime <= activeFilters.maxCookTime) {
      score += 2;
    }
    if (activeFilters.difficulty && recipe.difficulty) {
      if (recipe.difficulty.toLowerCase() === activeFilters.difficulty.toLowerCase()) {
        score += 2;
      }
    }
  }

  return score;
}
