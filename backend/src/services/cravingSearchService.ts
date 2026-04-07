// backend/src/services/cravingSearchService.ts
// Maps natural language craving descriptions to recipe search keywords using Claude

import Anthropic from '@anthropic-ai/sdk';

export interface CravingMapping {
  searchTerms: string[];
  flavorTags: string[];
  temperature: 'hot' | 'cold' | 'any';
  texturePrefs: string[];
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
 */
export function scoreCravingMatch(
  recipe: { title: string; description?: string | null; cuisine?: string | null; ingredients?: Array<{ text?: string | null }> },
  mapping: CravingMapping,
): number {
  const titleLower = recipe.title.toLowerCase();
  const descLower = (recipe.description || '').toLowerCase();
  const cuisineLower = (recipe.cuisine || '').toLowerCase();
  const ingredientText = (recipe.ingredients || [])
    .map(i => (i.text || '').toLowerCase())
    .join(' ');

  const fullText = `${titleLower} ${descLower} ${cuisineLower} ${ingredientText}`;

  let score = 0;

  for (const term of mapping.searchTerms) {
    const t = term.toLowerCase();
    if (titleLower.includes(t)) score += 5;       // Title match is strongest signal
    else if (descLower.includes(t)) score += 2;
    else if (cuisineLower.includes(t)) score += 2;
    else if (ingredientText.includes(t)) score += 1;
  }

  for (const tag of mapping.flavorTags) {
    if (fullText.includes(tag.toLowerCase())) score += 1;
  }

  for (const texture of mapping.texturePrefs) {
    if (fullText.includes(texture.toLowerCase())) score += 1;
  }

  return score;
}
