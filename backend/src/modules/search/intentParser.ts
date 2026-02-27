// backend/src/modules/search/intentParser.ts
// Regex-first filter extraction from natural language search queries.
// "quick chicken dinner under 30 minutes" → { search: "chicken", maxCookTime: 30, mealType: "dinner", difficulty: "easy" }

export interface ExtractedFilters {
  search: string;
  maxCookTime?: number;
  difficulty?: string;
  mealType?: string;
  cuisine?: string;
  dietaryRestrictions?: string[];
  maxCalories?: number;
  minProtein?: number;
  mood?: string;
}

interface PatternRule {
  pattern: RegExp;
  extract: (match: RegExpMatchArray) => Partial<ExtractedFilters>;
}

// Cuisine keywords → cuisine filter value
const CUISINE_MAP: Record<string, string> = {
  italian: 'Italian', mexican: 'Mexican', chinese: 'Chinese',
  japanese: 'Japanese', thai: 'Thai', indian: 'Indian',
  french: 'French', greek: 'Greek', korean: 'Korean',
  vietnamese: 'Vietnamese', mediterranean: 'Mediterranean',
  american: 'American', spanish: 'Spanish', ethiopian: 'Ethiopian',
  moroccan: 'Moroccan', turkish: 'Turkish', caribbean: 'Caribbean',
  brazilian: 'Brazilian', peruvian: 'Peruvian', filipino: 'Filipino',
};

// Dietary keywords
const DIETARY_MAP: Record<string, string> = {
  vegan: 'vegan', vegetarian: 'vegetarian', 'gluten-free': 'gluten-free',
  'gluten free': 'gluten-free', keto: 'keto', paleo: 'paleo',
  'dairy-free': 'dairy-free', 'dairy free': 'dairy-free',
  'nut-free': 'nut-free', 'nut free': 'nut-free',
  'low-carb': 'low-carb', 'low carb': 'low-carb',
  'low-fat': 'low-fat', 'low fat': 'low-fat',
  'sugar-free': 'sugar-free', 'sugar free': 'sugar-free',
  halal: 'halal', kosher: 'kosher', pescatarian: 'pescatarian',
  'whole30': 'whole30',
};

// Patterns ordered by specificity (most specific first)
const PATTERN_RULES: PatternRule[] = [
  // Time: "under 30 minutes", "less than 20 min", "max 15 minutes", "30 minute"
  {
    pattern: /(?:under|less than|max|within|in)\s+(\d+)\s*(?:min(?:utes?)?|mins?)/i,
    extract: (m) => ({ maxCookTime: parseInt(m[1]) }),
  },
  // Time: "30 minute meals", "15-minute dinner"
  {
    pattern: /(\d+)[\s-]*min(?:ute)?s?\s+(?:meals?|recipes?|dinner|lunch|breakfast)/i,
    extract: (m) => ({ maxCookTime: parseInt(m[1]) }),
  },
  // Time: "quick" / "fast" → 20 min
  {
    pattern: /\b(quick|fast)\b/i,
    extract: () => ({ maxCookTime: 20, difficulty: 'easy' }),
  },
  // Difficulty: "easy", "simple", "beginner"
  {
    pattern: /\b(easy|simple|beginner|no-fuss|no fuss)\b/i,
    extract: () => ({ difficulty: 'easy' }),
  },
  // Difficulty: "hard", "challenging", "advanced"
  {
    pattern: /\b(hard|challenging|advanced|complex|gourmet)\b/i,
    extract: () => ({ difficulty: 'hard' }),
  },
  // Meal type
  {
    pattern: /\b(breakfast|brunch|lunch|dinner|snack|dessert)\b/i,
    extract: (m) => ({ mealType: m[1].toLowerCase() === 'brunch' ? 'breakfast' : m[1].toLowerCase() }),
  },
  // Calories: "under 500 calories", "less than 400 cal"
  {
    pattern: /(?:under|less than|max|below)\s+(\d+)\s*(?:cal(?:ories?)?|kcal)/i,
    extract: (m) => ({ maxCalories: parseInt(m[1]) }),
  },
  // Calories: "low calorie", "low-calorie"
  {
    pattern: /\blow[\s-]calorie\b/i,
    extract: () => ({ maxCalories: 400 }),
  },
  // Protein: "high protein", "protein-rich"
  {
    pattern: /\b(?:high[\s-]protein|protein[\s-]rich|protein[\s-]packed)\b/i,
    extract: () => ({ minProtein: 30 }),
  },
  // Protein: "at least 40g protein", "min 25g protein"
  {
    pattern: /(?:at least|min(?:imum)?)\s+(\d+)\s*g?\s*protein/i,
    extract: (m) => ({ minProtein: parseInt(m[1]) }),
  },
  // Mood: "comfort food", "healthy", "adventurous", "indulgent"
  {
    pattern: /\b(comfort(?:\s+food)?|healthy|adventurous|indulgent|lazy|energetic)\b/i,
    extract: (m) => {
      const mood = m[1].toLowerCase().replace(/\s+food$/, '');
      return { mood };
    },
  },
];

/**
 * Parse a natural language search query into structured recipe filters.
 * Extracts known patterns (time, cuisine, difficulty, etc.) and leaves
 * the remaining text as the search term.
 */
export function parseSearchIntent(query: string): ExtractedFilters {
  if (!query || !query.trim()) {
    return { search: '' };
  }

  let remaining = query.trim();
  const filters: Partial<ExtractedFilters> = {};

  // Extract cuisine keywords
  const lowerQuery = remaining.toLowerCase();
  for (const [keyword, cuisine] of Object.entries(CUISINE_MAP)) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(lowerQuery)) {
      filters.cuisine = cuisine;
      remaining = remaining.replace(regex, '');
      break; // Only extract one cuisine
    }
  }

  // Extract dietary restrictions (can have multiple)
  const dietaryRestrictions: string[] = [];
  for (const [keyword, restriction] of Object.entries(DIETARY_MAP)) {
    const regex = new RegExp(`\\b${keyword.replace(/-/g, '[\\s-]')}\\b`, 'i');
    if (regex.test(remaining)) {
      dietaryRestrictions.push(restriction);
      remaining = remaining.replace(regex, '');
    }
  }
  if (dietaryRestrictions.length > 0) {
    filters.dietaryRestrictions = [...new Set(dietaryRestrictions)];
  }

  // Apply pattern rules in two passes:
  // 1. Collect all matches
  // 2. Apply explicit values over defaults (e.g., "under 30 min" overrides "quick" → 20)
  const allExtractions: Array<{ extracted: Partial<ExtractedFilters>; match: RegExpMatchArray; isExplicitTime: boolean }> = [];
  let tempRemaining = remaining;
  for (const rule of PATTERN_RULES) {
    const match = tempRemaining.match(rule.pattern);
    if (match) {
      const extracted = rule.extract(match);
      const isExplicitTime = extracted.maxCookTime !== undefined && /\d/.test(match[0]);
      allExtractions.push({ extracted, match, isExplicitTime });
      tempRemaining = tempRemaining.replace(match[0], '');
    }
  }

  // Apply: explicit time values override implicit ones (e.g., "quick" = 20 overridden by "under 30 min")
  const hasExplicitTime = allExtractions.some(e => e.isExplicitTime);
  for (const { extracted, match, isExplicitTime } of allExtractions) {
    if (hasExplicitTime && !isExplicitTime && extracted.maxCookTime !== undefined) {
      // Skip implicit time (from "quick"/"fast") when explicit time exists
      const { maxCookTime, ...rest } = extracted;
      Object.assign(filters, rest);
    } else {
      Object.assign(filters, extracted);
    }
    remaining = remaining.replace(match[0], '');
  }

  // Clean up remaining text → search term
  const search = remaining
    .replace(/\b(?:recipe|recipes|meal|meals|dish|dishes|food|make|cook|find|show|me|for|a|an|the|with|some|good|best|great|nice|tasty|delicious)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return {
    search,
    ...filters,
  };
}
