// frontend/lib/voiceIntentParser.ts
// Client-side intent classifier for voice commands.
// Parses spoken text into actionable intents without a network call.

import { parseShoppingInput, ParsedShoppingItem } from './shoppingItemParser';

export type VoiceIntentType = 'ADD_TO_LIST' | 'SEARCH_RECIPE' | 'LOG_MEAL' | 'UNKNOWN';

export interface VoiceIntent {
  type: VoiceIntentType;
  rawText: string;
}

export interface AddToListIntent extends VoiceIntent {
  type: 'ADD_TO_LIST';
  items: ParsedShoppingItem[];
}

export interface SearchRecipeIntent extends VoiceIntent {
  type: 'SEARCH_RECIPE';
  query: string;
}

export interface LogMealIntent extends VoiceIntent {
  type: 'LOG_MEAL';
  mealName: string;
  calories?: number;
  mealType?: string;
}

export interface UnknownIntent extends VoiceIntent {
  type: 'UNKNOWN';
}

export type ParsedVoiceIntent = AddToListIntent | SearchRecipeIntent | LogMealIntent | UnknownIntent;

// Patterns for intent classification (order matters — first match wins)
const ADD_TO_LIST_PATTERNS = [
  /^add\s+(.+?)(?:\s+to\s+(?:my\s+)?(?:shopping\s+)?list)?$/i,
  /^put\s+(.+?)(?:\s+on\s+(?:my\s+)?(?:the\s+)?list)?$/i,
  /^(?:i\s+)?need\s+(.+)$/i,
  /^buy\s+(.+)$/i,
  /^get\s+(?:me\s+)?(.+)$/i,
];

const SEARCH_RECIPE_PATTERNS = [
  /^(?:find|search|look)\s+(?:me\s+)?(?:a\s+)?(?:recipe\s+)?(?:for\s+)?(.+)$/i,
  /^(?:recipe|recipes)\s+(?:for|with)\s+(.+)$/i,
  /^(?:how\s+(?:do\s+(?:i|you)\s+)?(?:make|cook|prepare|bake))\s+(.+)$/i,
  /^(?:what\s+can\s+i\s+(?:make|cook)\s+with)\s+(.+)$/i,
  /^(?:show\s+me)\s+(.+?)(?:\s+recipes?)?$/i,
];

const LOG_MEAL_PATTERNS = [
  /^(?:i\s+)?(?:ate|had|log)\s+(.+?)(?:\s+(?:for|at)\s+(breakfast|lunch|dinner|snack))?(?:\s+(\d+)\s*(?:cal(?:ories?)?))?$/i,
  /^log\s+(\d+)\s*(?:cal(?:ories?)?)\s+(?:for|of)\s+(.+?)(?:\s+(?:for|at)\s+(breakfast|lunch|dinner|snack))?$/i,
];

/**
 * Parse a voice transcript into a structured intent.
 */
export function parseVoiceIntent(transcript: string): ParsedVoiceIntent {
  const text = transcript.trim();
  if (!text) {
    return { type: 'UNKNOWN', rawText: text };
  }

  // Try ADD_TO_LIST
  for (const pattern of ADD_TO_LIST_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const itemsText = match[1].trim();
      const items = parseShoppingInput(itemsText);
      if (items.length > 0) {
        return { type: 'ADD_TO_LIST', rawText: text, items };
      }
    }
  }

  // Try SEARCH_RECIPE
  for (const pattern of SEARCH_RECIPE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return { type: 'SEARCH_RECIPE', rawText: text, query: match[1].trim() };
    }
  }

  // Try LOG_MEAL
  for (const pattern of LOG_MEAL_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      // Handle both "log 500 cal of pizza" and "ate pizza for lunch 500 calories"
      const isCaloriesFirst = /^\d/.test(match[1]);
      const mealName = isCaloriesFirst ? match[2]?.trim() : match[1]?.trim();
      const calories = isCaloriesFirst ? parseInt(match[1]) : match[3] ? parseInt(match[3]) : undefined;
      const mealType = isCaloriesFirst ? match[3]?.toLowerCase() : match[2]?.toLowerCase();

      if (mealName) {
        return {
          type: 'LOG_MEAL',
          rawText: text,
          mealName,
          calories,
          mealType,
        };
      }
    }
  }

  // Fallback: if the text looks like a list of items (commas, "and"), treat as ADD_TO_LIST
  if (/,/.test(text) || /\band\b/.test(text)) {
    const items = parseShoppingInput(text);
    if (items.length > 1) {
      return { type: 'ADD_TO_LIST', rawText: text, items };
    }
  }

  return { type: 'UNKNOWN', rawText: text };
}
