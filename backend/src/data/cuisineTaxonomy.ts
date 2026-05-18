// backend/src/data/cuisineTaxonomy.ts
// ROADMAP 4.0 Tier D3 — Cuisine taxonomy collapse.
//
// Single source of truth for cuisine identity. Collapses ~134 free-form
// cuisine strings into ~67 canonical cuisines, with regional sub-cuisines
// where they're load-bearing differentiators (Sichuan ≠ Cantonese, Roman ≠
// Sicilian, Oaxacan ≠ Yucatecan ≠ Michoacán, etc.).
//
// Sub-cuisines are optional — most recipes (~70%) ship with a canonical
// only. `subCuisine` is null unless the recipe has a clear regional
// fingerprint.
//
// Canonicals marked `deprecated: true` exist only to migrate legacy
// "Mediterranean", "Asian", "Latin-Inspired" labels without orphaning
// rows. Re-categorize these recipes (D6 audit) before launch.

export type Region =
  | 'europe'
  | 'mena'
  | 'sub_saharan_africa'
  | 'east_asia'
  | 'southeast_asia'
  | 'south_asia'
  | 'latin_america'
  | 'north_america'
  | 'oceania';

export interface SubCuisine {
  slug: string;
  displayName: string;
  parentCanonical: string;
  aliases?: readonly string[];
}

export interface Cuisine {
  canonical: string;
  region: Region;
  displayName: string;
  aliases: readonly string[];
  subCuisines: readonly SubCuisine[];
  deprecated?: boolean;
}

const sub = (
  parent: string,
  slug: string,
  displayName: string,
  aliases?: readonly string[],
): SubCuisine => ({
  slug,
  displayName,
  parentCanonical: parent,
  ...(aliases ? { aliases } : {}),
});

// ──────────────────────────────────────────────────────────────────────────
// EUROPE — 16 canonicals, 33 sub-cuisines
// ──────────────────────────────────────────────────────────────────────────
const EUROPE: Cuisine[] = [
  {
    canonical: 'italian',
    region: 'europe',
    displayName: 'Italian',
    aliases: ['italy'],
    subCuisines: [
      sub('italian', 'roman', 'Roman'),
      sub('italian', 'sicilian', 'Sicilian'),
      sub('italian', 'sardinian', 'Sardinian'),
      sub('italian', 'northern_italian', 'Northern Italian'),
      sub('italian', 'tuscan', 'Tuscan'),
      sub('italian', 'neapolitan', 'Neapolitan'),
    ],
  },
  {
    canonical: 'french',
    region: 'europe',
    displayName: 'French',
    aliases: ['france'],
    subCuisines: [
      sub('french', 'provencal', 'Provençal'),
      sub('french', 'lyonnais', 'Lyonnais'),
      sub('french', 'alsatian', 'Alsatian'),
      sub('french', 'norman', 'Norman'),
    ],
  },
  {
    canonical: 'spanish',
    region: 'europe',
    displayName: 'Spanish',
    aliases: ['spain'],
    subCuisines: [
      sub('spanish', 'andalusian', 'Andalusian'),
      sub('spanish', 'basque', 'Basque'),
      sub('spanish', 'catalan', 'Catalan'),
      sub('spanish', 'galician', 'Galician'),
      sub('spanish', 'valencian', 'Valencian'),
    ],
  },
  {
    canonical: 'greek',
    region: 'europe',
    displayName: 'Greek',
    aliases: ['greece'],
    subCuisines: [
      sub('greek', 'cretan', 'Cretan'),
      sub('greek', 'macedonian', 'Macedonian'),
    ],
  },
  {
    canonical: 'portuguese',
    region: 'europe',
    displayName: 'Portuguese',
    aliases: ['portugal'],
    subCuisines: [
      sub('portuguese', 'alentejo', 'Alentejo'),
      sub('portuguese', 'azorean', 'Azorean'),
    ],
  },
  {
    canonical: 'british',
    region: 'europe',
    displayName: 'British',
    aliases: ['british isles', 'uk'],
    subCuisines: [
      sub('british', 'english', 'English'),
      sub('british', 'scottish', 'Scottish'),
      sub('british', 'welsh', 'Welsh'),
      sub('british', 'irish', 'Irish'),
    ],
  },
  {
    canonical: 'scandinavian',
    region: 'europe',
    displayName: 'Scandinavian',
    aliases: ['nordic'],
    subCuisines: [
      sub('scandinavian', 'swedish', 'Swedish'),
      sub('scandinavian', 'norwegian', 'Norwegian'),
      sub('scandinavian', 'danish', 'Danish'),
      sub('scandinavian', 'finnish', 'Finnish'),
      sub('scandinavian', 'icelandic', 'Icelandic'),
    ],
  },
  {
    canonical: 'balkan',
    region: 'europe',
    displayName: 'Balkan',
    aliases: ['southeastern european'],
    subCuisines: [
      sub('balkan', 'serbian', 'Serbian'),
      sub('balkan', 'croatian', 'Croatian'),
      sub('balkan', 'bulgarian', 'Bulgarian'),
      sub('balkan', 'romanian', 'Romanian'),
      sub('balkan', 'albanian', 'Albanian'),
    ],
  },
  { canonical: 'german', region: 'europe', displayName: 'German', aliases: ['germany'], subCuisines: [] },
  { canonical: 'austrian', region: 'europe', displayName: 'Austrian', aliases: ['austria'], subCuisines: [] },
  { canonical: 'hungarian', region: 'europe', displayName: 'Hungarian', aliases: ['hungary'], subCuisines: [] },
  { canonical: 'polish', region: 'europe', displayName: 'Polish', aliases: ['poland'], subCuisines: [] },
  { canonical: 'russian', region: 'europe', displayName: 'Russian', aliases: ['russia'], subCuisines: [] },
  { canonical: 'ukrainian', region: 'europe', displayName: 'Ukrainian', aliases: ['ukraine'], subCuisines: [] },
  { canonical: 'georgian', region: 'europe', displayName: 'Georgian', aliases: ['georgia (caucasus)'], subCuisines: [] },
  { canonical: 'belgian', region: 'europe', displayName: 'Belgian', aliases: ['belgium'], subCuisines: [] },
];

// ──────────────────────────────────────────────────────────────────────────
// MENA — 7 canonicals, 11 sub-cuisines
// ──────────────────────────────────────────────────────────────────────────
const MENA: Cuisine[] = [
  {
    canonical: 'levantine',
    region: 'mena',
    displayName: 'Levantine',
    aliases: ['levant'],
    subCuisines: [
      sub('levantine', 'lebanese', 'Lebanese'),
      sub('levantine', 'syrian', 'Syrian'),
      sub('levantine', 'palestinian', 'Palestinian'),
      sub('levantine', 'jordanian', 'Jordanian'),
    ],
  },
  { canonical: 'persian', region: 'mena', displayName: 'Persian', aliases: ['iranian'], subCuisines: [] },
  {
    canonical: 'turkish',
    region: 'mena',
    displayName: 'Turkish',
    aliases: ['turkey'],
    subCuisines: [
      sub('turkish', 'anatolian', 'Anatolian'),
      sub('turkish', 'aegean', 'Aegean'),
      sub('turkish', 'black_sea', 'Black Sea'),
    ],
  },
  { canonical: 'moroccan', region: 'mena', displayName: 'Moroccan', aliases: ['morocco'], subCuisines: [] },
  { canonical: 'tunisian', region: 'mena', displayName: 'Tunisian', aliases: ['tunisia'], subCuisines: [] },
  { canonical: 'egyptian', region: 'mena', displayName: 'Egyptian', aliases: ['egypt'], subCuisines: [] },
  { canonical: 'yemeni', region: 'mena', displayName: 'Yemeni', aliases: ['yemen'], subCuisines: [] },
  { canonical: 'israeli', region: 'mena', displayName: 'Israeli', aliases: ['israel'], subCuisines: [] },
];

// ──────────────────────────────────────────────────────────────────────────
// SUB-SAHARAN AFRICA — 9 canonicals, 0 sub-cuisines
// ──────────────────────────────────────────────────────────────────────────
const SUB_SAHARAN_AFRICA: Cuisine[] = [
  { canonical: 'ethiopian', region: 'sub_saharan_africa', displayName: 'Ethiopian', aliases: ['ethiopia'], subCuisines: [] },
  { canonical: 'eritrean', region: 'sub_saharan_africa', displayName: 'Eritrean', aliases: ['eritrea'], subCuisines: [] },
  { canonical: 'nigerian', region: 'sub_saharan_africa', displayName: 'Nigerian', aliases: ['nigeria'], subCuisines: [] },
  { canonical: 'ghanaian', region: 'sub_saharan_africa', displayName: 'Ghanaian', aliases: ['ghana'], subCuisines: [] },
  { canonical: 'senegalese', region: 'sub_saharan_africa', displayName: 'Senegalese', aliases: ['senegal'], subCuisines: [] },
  { canonical: 'ivorian', region: 'sub_saharan_africa', displayName: 'Ivorian', aliases: ["ivory coast", "côte d'ivoire"], subCuisines: [] },
  { canonical: 'south_african', region: 'sub_saharan_africa', displayName: 'South African', aliases: ['south africa'], subCuisines: [] },
  { canonical: 'kenyan', region: 'sub_saharan_africa', displayName: 'Kenyan', aliases: ['kenya'], subCuisines: [] },
  { canonical: 'somali', region: 'sub_saharan_africa', displayName: 'Somali', aliases: ['somalia'], subCuisines: [] },
];

// ──────────────────────────────────────────────────────────────────────────
// EAST ASIA — 5 canonicals, 16 sub-cuisines
// ──────────────────────────────────────────────────────────────────────────
const EAST_ASIA: Cuisine[] = [
  {
    canonical: 'chinese',
    region: 'east_asia',
    displayName: 'Chinese',
    aliases: ['china'],
    subCuisines: [
      sub('chinese', 'sichuan', 'Sichuan'),
      sub('chinese', 'cantonese', 'Cantonese'),
      sub('chinese', 'northern_chinese', 'Northern Chinese'),
      sub('chinese', 'hunan', 'Hunan'),
      sub('chinese', 'shanghainese', 'Shanghainese'),
      sub('chinese', 'taiwanese', 'Taiwanese'),
    ],
  },
  {
    canonical: 'japanese',
    region: 'east_asia',
    displayName: 'Japanese',
    aliases: ['japan'],
    subCuisines: [
      sub('japanese', 'kansai', 'Kansai'),
      sub('japanese', 'kanto', 'Kanto'),
      sub('japanese', 'okinawan', 'Okinawan'),
      sub('japanese', 'hokkaido', 'Hokkaido'),
    ],
  },
  {
    canonical: 'korean',
    region: 'east_asia',
    displayName: 'Korean',
    aliases: ['korea'],
    subCuisines: [
      sub('korean', 'seoul', 'Seoul'),
      sub('korean', 'jeonju', 'Jeonju'),
      sub('korean', 'busan', 'Busan'),
    ],
  },
  { canonical: 'mongolian', region: 'east_asia', displayName: 'Mongolian', aliases: ['mongolia'], subCuisines: [] },
  { canonical: 'tibetan', region: 'east_asia', displayName: 'Tibetan', aliases: ['tibet'], subCuisines: [] },
];

// ──────────────────────────────────────────────────────────────────────────
// SOUTHEAST ASIA — 9 canonicals, 14 sub-cuisines
// ──────────────────────────────────────────────────────────────────────────
const SOUTHEAST_ASIA: Cuisine[] = [
  {
    canonical: 'thai',
    region: 'southeast_asia',
    displayName: 'Thai',
    aliases: ['thailand'],
    subCuisines: [
      sub('thai', 'lanna', 'Lanna (Northern Thai)'),
      sub('thai', 'isaan', 'Isaan'),
      sub('thai', 'southern_thai', 'Southern Thai'),
      sub('thai', 'central_thai', 'Central Thai'),
    ],
  },
  {
    canonical: 'vietnamese',
    region: 'southeast_asia',
    displayName: 'Vietnamese',
    aliases: ['vietnam'],
    subCuisines: [
      sub('vietnamese', 'northern_vietnamese', 'Northern Vietnamese'),
      sub('vietnamese', 'central_vietnamese', 'Central Vietnamese (Huế)'),
      sub('vietnamese', 'southern_vietnamese', 'Southern Vietnamese'),
    ],
  },
  {
    canonical: 'filipino',
    region: 'southeast_asia',
    displayName: 'Filipino',
    aliases: ['philippines', 'pilipino'],
    subCuisines: [
      sub('filipino', 'tagalog', 'Tagalog'),
      sub('filipino', 'visayan', 'Visayan'),
      sub('filipino', 'kapampangan', 'Kapampangan'),
    ],
  },
  {
    canonical: 'indonesian',
    region: 'southeast_asia',
    displayName: 'Indonesian',
    aliases: ['indonesia'],
    subCuisines: [
      sub('indonesian', 'javanese', 'Javanese'),
      sub('indonesian', 'sumatran', 'Sumatran'),
      sub('indonesian', 'balinese', 'Balinese'),
      sub('indonesian', 'padang', 'Padang'),
    ],
  },
  { canonical: 'malaysian', region: 'southeast_asia', displayName: 'Malaysian', aliases: ['malaysia'], subCuisines: [] },
  { canonical: 'singaporean', region: 'southeast_asia', displayName: 'Singaporean', aliases: ['singapore'], subCuisines: [] },
  { canonical: 'burmese', region: 'southeast_asia', displayName: 'Burmese', aliases: ['myanmar'], subCuisines: [] },
  { canonical: 'lao', region: 'southeast_asia', displayName: 'Lao', aliases: ['laotian', 'laos'], subCuisines: [] },
  { canonical: 'khmer', region: 'southeast_asia', displayName: 'Khmer', aliases: ['cambodian', 'cambodia'], subCuisines: [] },
];

// ──────────────────────────────────────────────────────────────────────────
// SOUTH ASIA — 4 canonicals, 8 sub-cuisines
// ──────────────────────────────────────────────────────────────────────────
const SOUTH_ASIA: Cuisine[] = [
  {
    canonical: 'indian',
    region: 'south_asia',
    displayName: 'Indian',
    aliases: ['india'],
    subCuisines: [
      sub('indian', 'north_indian', 'North Indian'),
      sub('indian', 'south_indian', 'South Indian'),
      sub('indian', 'bengali', 'Bengali'),
      sub('indian', 'goan', 'Goan'),
      sub('indian', 'gujarati', 'Gujarati'),
      sub('indian', 'punjabi', 'Punjabi'),
      sub('indian', 'kashmiri', 'Kashmiri'),
      sub('indian', 'hyderabadi', 'Hyderabadi'),
    ],
  },
  { canonical: 'pakistani', region: 'south_asia', displayName: 'Pakistani', aliases: ['pakistan'], subCuisines: [] },
  { canonical: 'sri_lankan', region: 'south_asia', displayName: 'Sri Lankan', aliases: ['sri lanka'], subCuisines: [] },
  { canonical: 'nepali', region: 'south_asia', displayName: 'Nepali', aliases: ['nepalese', 'nepal'], subCuisines: [] },
];

// ──────────────────────────────────────────────────────────────────────────
// LATIN AMERICA — 14 canonicals, 17 sub-cuisines (incl. Michoacán)
// ──────────────────────────────────────────────────────────────────────────
const LATIN_AMERICA: Cuisine[] = [
  {
    canonical: 'mexican',
    region: 'latin_america',
    displayName: 'Mexican',
    aliases: ['mexico'],
    subCuisines: [
      sub('mexican', 'oaxacan', 'Oaxacan'),
      sub('mexican', 'yucatecan', 'Yucatecan'),
      sub('mexican', 'norteno', 'Norteño'),
      sub('mexican', 'mexico_city', 'Mexico City'),
      sub('mexican', 'pueblan', 'Pueblan'),
      sub('mexican', 'veracruzano', 'Veracruzano'),
      sub('mexican', 'michoacan', 'Michoacán'),
    ],
  },
  {
    canonical: 'peruvian',
    region: 'latin_america',
    displayName: 'Peruvian',
    aliases: ['peru'],
    subCuisines: [
      sub('peruvian', 'limeno', 'Limeño'),
      sub('peruvian', 'andean', 'Andean'),
      sub('peruvian', 'amazonian', 'Amazonian'),
      sub('peruvian', 'chifa', 'Chifa'),
      sub('peruvian', 'nikkei', 'Nikkei'),
    ],
  },
  {
    canonical: 'brazilian',
    region: 'latin_america',
    displayName: 'Brazilian',
    aliases: ['brazil'],
    subCuisines: [
      sub('brazilian', 'bahian', 'Bahian'),
      sub('brazilian', 'mineiro', 'Mineiro'),
      sub('brazilian', 'northeastern_brazilian', 'Northeastern Brazilian'),
      sub('brazilian', 'amazonian_brazilian', 'Amazonian Brazilian'),
    ],
  },
  {
    canonical: 'colombian',
    region: 'latin_america',
    displayName: 'Colombian',
    aliases: ['colombia'],
    subCuisines: [
      sub('colombian', 'paisa', 'Paisa'),
      sub('colombian', 'costeno', 'Costeño'),
    ],
  },
  { canonical: 'argentinian', region: 'latin_america', displayName: 'Argentinian', aliases: ['argentina', 'argentine'], subCuisines: [] },
  { canonical: 'chilean', region: 'latin_america', displayName: 'Chilean', aliases: ['chile'], subCuisines: [] },
  { canonical: 'cuban', region: 'latin_america', displayName: 'Cuban', aliases: ['cuba'], subCuisines: [] },
  { canonical: 'puerto_rican', region: 'latin_america', displayName: 'Puerto Rican', aliases: ['puerto rico'], subCuisines: [] },
  { canonical: 'dominican', region: 'latin_america', displayName: 'Dominican', aliases: ['dominican republic'], subCuisines: [] },
  { canonical: 'salvadorean', region: 'latin_america', displayName: 'Salvadorean', aliases: ['salvadoran', 'el salvador'], subCuisines: [] },
  { canonical: 'guatemalan', region: 'latin_america', displayName: 'Guatemalan', aliases: ['guatemala'], subCuisines: [] },
  { canonical: 'venezuelan', region: 'latin_america', displayName: 'Venezuelan', aliases: ['venezuela'], subCuisines: [] },
  { canonical: 'trinidadian', region: 'latin_america', displayName: 'Trinidadian', aliases: ['trinidad', 'caribbean'], subCuisines: [] },
  { canonical: 'jamaican', region: 'latin_america', displayName: 'Jamaican', aliases: ['jamaica'], subCuisines: [] },
];

// ──────────────────────────────────────────────────────────────────────────
// NORTH AMERICA — 3 canonicals, 12 sub-cuisines
// ──────────────────────────────────────────────────────────────────────────
const NORTH_AMERICA: Cuisine[] = [
  {
    canonical: 'american',
    region: 'north_america',
    displayName: 'American',
    aliases: ['united states', 'usa', 'us'],
    subCuisines: [
      sub('american', 'soul_food', 'Soul Food'),
      sub('american', 'cajun_creole', 'Cajun/Creole', ['cajun']),
      sub('american', 'southern', 'Southern', ['american southern']),
      sub('american', 'italian_american', 'Italian-American', ['italian american']),
      sub('american', 'tex_mex', 'Tex-Mex'),
      sub('american', 'new_england', 'New England'),
      sub('american', 'pacific_northwest', 'Pacific Northwest'),
      sub('american', 'midwestern', 'Midwestern'),
      sub('american', 'southern_bbq', 'Southern BBQ'),
      sub('american', 'californian', 'Californian'),
    ],
  },
  { canonical: 'hawaiian', region: 'north_america', displayName: 'Hawaiian', aliases: ['hawaii'], subCuisines: [] },
  {
    canonical: 'canadian',
    region: 'north_america',
    displayName: 'Canadian',
    aliases: ['canada'],
    subCuisines: [
      sub('canadian', 'quebecois', 'Québécois'),
      sub('canadian', 'maritime', 'Maritime'),
    ],
  },
];

// ──────────────────────────────────────────────────────────────────────────
// OCEANIA — 2 canonicals, 0 sub-cuisines
// ──────────────────────────────────────────────────────────────────────────
const OCEANIA: Cuisine[] = [
  { canonical: 'australian', region: 'oceania', displayName: 'Australian', aliases: ['australia'], subCuisines: [] },
  { canonical: 'pacific_islander', region: 'oceania', displayName: 'Pacific Islander', aliases: ['papuan', 'polynesian'], subCuisines: [] },
];

// ──────────────────────────────────────────────────────────────────────────
// DEPRECATED canonicals — exist only to migrate legacy umbrella labels
// without orphaning rows. D6 audit re-categorizes these into specific cuisines.
// ──────────────────────────────────────────────────────────────────────────
const DEPRECATED: Cuisine[] = [
  {
    canonical: 'mediterranean',
    region: 'europe',
    displayName: 'Mediterranean',
    aliases: ['mediterranean diet'],
    subCuisines: [],
    deprecated: true,
  },
  {
    canonical: 'asian',
    region: 'east_asia',
    displayName: 'Asian',
    aliases: ['pan-asian'],
    subCuisines: [],
    deprecated: true,
  },
  {
    canonical: 'middle_eastern',
    region: 'mena',
    displayName: 'Middle Eastern',
    aliases: ['mideast'],
    subCuisines: [],
    deprecated: true,
  },
  {
    canonical: 'north_african',
    region: 'mena',
    displayName: 'North African',
    aliases: ['maghrebi'],
    subCuisines: [],
    deprecated: true,
  },
  {
    canonical: 'latin_american',
    region: 'latin_america',
    displayName: 'Latin American',
    aliases: ['latin', 'latin-inspired', 'latino', 'hispanic'],
    subCuisines: [],
    deprecated: true,
  },
];

export const CUISINES: readonly Cuisine[] = [
  ...EUROPE,
  ...MENA,
  ...SUB_SAHARAN_AFRICA,
  ...EAST_ASIA,
  ...SOUTHEAST_ASIA,
  ...SOUTH_ASIA,
  ...LATIN_AMERICA,
  ...NORTH_AMERICA,
  ...OCEANIA,
  ...DEPRECATED,
];

// ──────────────────────────────────────────────────────────────────────────
// Resolver
// ──────────────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export interface ResolveResult {
  canonical: string;
  subCuisine: string | null;
  deprecated: boolean;
}

const indexByKey: Map<string, ResolveResult> = (() => {
  const m = new Map<string, ResolveResult>();
  for (const c of CUISINES) {
    const dep = c.deprecated === true;
    const canonResult: ResolveResult = {
      canonical: c.canonical,
      subCuisine: null,
      deprecated: dep,
    };
    m.set(normalize(c.canonical), canonResult);
    m.set(normalize(c.displayName), canonResult);
    for (const a of c.aliases) m.set(normalize(a), canonResult);
    for (const s of c.subCuisines) {
      const subResult: ResolveResult = {
        canonical: c.canonical,
        subCuisine: s.slug,
        deprecated: dep,
      };
      m.set(normalize(s.slug), subResult);
      m.set(normalize(s.displayName), subResult);
      for (const a of s.aliases ?? []) m.set(normalize(a), subResult);
    }
  }
  return m;
})();

/**
 * Resolve any cuisine string (canonical, alias, sub-cuisine slug, or
 * display name) to its canonical + sub-cuisine pair. Returns null when
 * the input does not match any known taxonomy entry — caller decides
 * whether to fail closed or default to a deprecated umbrella.
 */
export function resolveCuisine(input: string): ResolveResult | null {
  if (!input) return null;
  const key = normalize(input);
  return indexByKey.get(key) ?? null;
}

export function listCanonicals(): readonly Cuisine[] {
  return CUISINES.filter((c) => !c.deprecated);
}

export function listAllCanonicals(): readonly Cuisine[] {
  return CUISINES;
}

export function findByCanonical(canonical: string): Cuisine | null {
  return CUISINES.find((c) => c.canonical === canonical) ?? null;
}
