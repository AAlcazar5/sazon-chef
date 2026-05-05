// backend/src/services/drinkPairingService.ts
// ROADMAP 4.0 F8 — Wine / drink pairing.
//
// Pure-data lookup. Each cuisine maps to three pairing suggestions:
//   - alcoholic   (wine, beer, sake, etc. — skipped if user opts out)
//   - sparkling   (a non-alcoholic alternative — sparkling water + flavor,
//                  shrub, kombucha)
//   - hot         (tea, coffee, mate, etc.)
//
// Lifestyle voice: pairings are *invitations*, never required. Copy on the
// recipe detail card reads "Drinks well with…", not "Pair with…".
//
// The recipe-level pairing extension (e.g., "this Persian fesenjan calls
// for a peppery Côtes-du-Rhône") is a follow-up that needs the recipe's
// dominant flavor profile from `RecipeIngredient.flavorTags`. For now we
// pair on cuisine alone — that's good enough for ~80% of the menu.

export interface DrinkPairing {
  alcoholic: string;
  sparkling: string;
  hot: string;
}

export const DRINK_PAIRINGS: Readonly<Record<string, DrinkPairing>> = {
  persian: {
    alcoholic: 'a peppery Côtes-du-Rhône or a chilled Riesling',
    sparkling: 'sparkling water with mint + dried lime',
    hot: 'saffron-honey tea',
  },
  salvadorean: {
    alcoholic: 'a Bohemia lager or a Sangria with hibiscus',
    sparkling: 'agua de jamaica (cold)',
    hot: 'café de olla',
  },
  burmese: {
    alcoholic: 'an off-dry Gewürztraminer',
    sparkling: 'sparkling water with lemongrass + ginger',
    hot: 'lapet yay (Burmese green tea)',
  },
  lebanese: {
    alcoholic: 'a chilled rosé or arak with water',
    sparkling: 'rose water + sparkling',
    hot: 'mint tea',
  },
  ethiopian: {
    alcoholic: 'a tej (honey wine) or a Belgian dubbel',
    sparkling: 'sparkling water with lemon',
    hot: 'Ethiopian buna (coffee ceremony)',
  },
  thai: {
    alcoholic: 'a Riesling or Singha',
    sparkling: 'sparkling water with kaffir lime',
    hot: 'cha yen (Thai iced tea)',
  },
  ghanaian: {
    alcoholic: 'a Star Beer or a fruity Beaujolais',
    sparkling: 'sobolo (cold)',
    hot: 'ginger tea',
  },
  filipino: {
    alcoholic: 'a San Miguel or a chilled Albariño',
    sparkling: 'calamansi soda',
    hot: 'salabat (ginger tea)',
  },
  okinawan: {
    alcoholic: 'a junmai sake',
    sparkling: 'sparkling water with shiso',
    hot: 'sanpin-cha (jasmine tea)',
  },
  cajun: {
    alcoholic: 'an Abita Amber or a dry rosé',
    sparkling: 'sparkling water with lime',
    hot: 'café au lait',
  },
  italian: {
    alcoholic: 'a Sangiovese or a Barbera',
    sparkling: 'sparkling water with lemon peel',
    hot: 'espresso',
  },
  mexican: {
    alcoholic: 'a mezcal old-fashioned or a chilled Mexican lager',
    sparkling: 'agua fresca de pepino',
    hot: 'champurrado',
  },
  japanese: {
    alcoholic: 'a junmai sake or a yuzu highball',
    sparkling: 'sparkling water with yuzu',
    hot: 'genmaicha',
  },
  indian: {
    alcoholic: 'an off-dry Riesling or a Kingfisher',
    sparkling: 'sparkling water with cardamom + lime',
    hot: 'masala chai',
  },
  vietnamese: {
    alcoholic: 'a Pilsner or a chilled Pinot Gris',
    sparkling: 'sparkling water with lemongrass',
    hot: 'cà phê sữa đá',
  },
  korean: {
    alcoholic: 'a soju cocktail or a makgeolli',
    sparkling: 'sparkling water with citron',
    hot: 'barley tea (boricha)',
  },
  greek: {
    alcoholic: 'a Assyrtiko or a chilled retsina',
    sparkling: 'sparkling water with mountain herbs',
    hot: 'mountain tea (tsai tou vounou)',
  },
  french: {
    alcoholic: 'a Burgundy or a Côtes-du-Rhône',
    sparkling: 'sparkling water with citrus zest',
    hot: 'café noisette',
  },
  spanish: {
    alcoholic: 'a Rioja or a chilled Albariño',
    sparkling: 'sparkling water with orange peel',
    hot: 'café cortado',
  },
  moroccan: {
    alcoholic: 'a Tempranillo or a rosé',
    sparkling: 'sparkling water with rose + orange blossom',
    hot: 'mint tea (atay)',
  },
};

// Default fallback used when the cuisine isn't in the table — generic but
// still lifestyle-voiced.
const DEFAULT_PAIRING: DrinkPairing = {
  alcoholic: 'a light red or a crisp white',
  sparkling: 'sparkling water with citrus',
  hot: 'a herbal tea',
};

export function getDrinkPairing(cuisine: string): DrinkPairing {
  if (!cuisine) return DEFAULT_PAIRING;
  return DRINK_PAIRINGS[cuisine.trim().toLowerCase()] ?? DEFAULT_PAIRING;
}

interface BuildPairingPayloadInput {
  cuisine: string;
  /** When true, the alcoholic line is omitted from the response. */
  excludeAlcoholic?: boolean;
}

export interface DrinkPairingPayload {
  /** Three suggestions in display order; alcoholic is omitted when excluded. */
  suggestions: string[];
}

/**
 * Build the response shape used by the recipe-detail card. Returns 2 lines
 * when alcoholic is excluded, 3 otherwise. Caller renders inline.
 */
export function buildPairingPayload(input: BuildPairingPayloadInput): DrinkPairingPayload {
  const { cuisine, excludeAlcoholic = false } = input;
  const pairing = getDrinkPairing(cuisine);
  const suggestions: string[] = [];
  if (!excludeAlcoholic) suggestions.push(pairing.alcoholic);
  suggestions.push(pairing.sparkling);
  suggestions.push(pairing.hot);
  return { suggestions };
}
